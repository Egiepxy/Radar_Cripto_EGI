#!/usr/bin/env python3
"""Detector AMD EGI Robô V1.0 LAB. Monitoramento educativo; nunca envia ordens."""
import concurrent.futures
import datetime as dt
import json
import math
import os
import pathlib
import time
import urllib.error
import urllib.parse
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
LATEST = DATA / "detector-amd-latest.json"
STATE = DATA / "detector-amd-state.json"
HISTORY = DATA / "detector-amd-history.json"
SYMBOLS = ("BTCUSDT", "XRPUSDT", "SOLUSDT", "ETHUSDT", "LINKUSDT", "PEPEUSDT")
FRAMES = ("15m", "1h", "2h", "4h", "1d")
WEIGHTS = {"15m": 1, "1h": 1.5, "2h": 2.5, "4h": 3, "1d": 2}
HOSTS = ("https://data-api.binance.vision", "https://api.binance.com")
THRESHOLD = 0.5  # pontos percentuais
NOW = lambda: int(time.time() * 1000)


def load(path, default):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (FileNotFoundError, ValueError):
        return default


def write(path, obj):
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_name(path.name + ".tmp")
    temp.write_text(json.dumps(obj, ensure_ascii=False, indent=2, allow_nan=False) + "\n", encoding="utf-8")
    temp.replace(path)


def fetch(symbol, frame):
    limit = 240 if frame == "1d" else (160 if frame == "15m" else 95)
    args = urllib.parse.urlencode({"symbol": symbol, "interval": frame, "limit": limit})
    errors = []
    for host in HOSTS:
        try:
            req = urllib.request.Request(host + "/api/v3/klines?" + args, headers={"User-Agent": "Detector-AMD-EGI/1.0"})
            with urllib.request.urlopen(req, timeout=13) as res:
                raw = json.load(res)
            if not isinstance(raw, list):
                raise ValueError("retorno não é lista")
            # Não analisar a vela ainda aberta.
            rows = [{"time": int(k[6]), "open": float(k[1]), "high": float(k[2]),
                     "low": float(k[3]), "close": float(k[4]), "volume": float(k[5])}
                    for k in raw if int(k[6]) <= NOW() - 1000]
            if len(rows) < 45:
                raise ValueError("menos de 45 candles fechados")
            return rows
        except (ValueError, TypeError, urllib.error.URLError, TimeoutError, OSError) as exc:
            errors.append(type(exc).__name__ + ":" + str(exc)[:100])
    raise RuntimeError(symbol + " " + frame + " " + " | ".join(errors))


def ema(values, n=200):
    if len(values) < n:
        return None
    value = sum(values[:n]) / n
    for price in values[n:]:
        value = price * 2 / (n + 1) + value * (n - 1) / (n + 1)
    return value


def rsi(values, n=14):
    if len(values) <= n:
        return None
    gains = [max(values[i] - values[i - 1], 0) for i in range(1, n + 1)]
    losses = [max(values[i - 1] - values[i], 0) for i in range(1, n + 1)]
    g, l = sum(gains) / n, sum(losses) / n
    for i in range(n + 1, len(values)):
        delta = values[i] - values[i - 1]
        g = (g * (n - 1) + max(delta, 0)) / n
        l = (l * (n - 1) + max(-delta, 0)) / n
    return 50 if l == 0 and g == 0 else 100 if l == 0 else 100 - 100 / (1 + g / l)


def amd(candles):
    last, prev, before = candles[-1], candles[-21:-1], candles[-41:-21]
    high, low = max(k["high"] for k in prev), min(k["low"] for k in prev)
    average = sum(k["volume"] for k in prev) / 20
    volrel = last["volume"] / average if average > 0 else None
    old_range = max(k["high"] for k in before) - min(k["low"] for k in before)
    compressed = old_range > 0 and (high - low) / old_range <= 0.75
    t = "NONE"
    if last["close"] > high and volrel is not None and volrel >= 1.3:
        t = "BREAK_UP"
    elif last["close"] < low and volrel is not None and volrel >= 1.3:
        t = "BREAK_DOWN"
    elif last["low"] < low and last["close"] >= low:
        t = "SWEEP_LOW"
    elif last["high"] > high and last["close"] <= high:
        t = "SWEEP_HIGH"
    elif compressed:
        t = "ACCUMULATION"
    return {"type": t, "close_time": last["time"], "price": last["close"],
            "support": low, "resistance": high, "volume_relative": volrel,
            "compressed": compressed, "distance_to_resistance_pct": (high / last["close"] - 1) * 100}


def strength(alt, btc):
    if len(alt) < 2 or len(btc) < 2:
        return None
    if alt[-1]["time"] != btc[-1]["time"] or alt[-2]["time"] != btc[-2]["time"]:
        return None
    ap, bp = alt[-1]["close"] / alt[-2]["close"] - 1, btc[-1]["close"] / btc[-2]["close"] - 1
    return {"alt_pct": ap * 100, "btc_pct": bp * 100, "relative_pp": (ap - bp) * 100}


def classification(value):
    if value is None:
        return "SEM DADOS"
    return "FORTE" if value >= THRESHOLD else "FRACO" if value <= -THRESHOLD else "NEUTRO"


def regime(btc):
    if not btc or btc["ema200_daily"] is None:
        return {"name": "SEM DADOS", "reason": "BTC ou EMA200 ausente"}
    above = btc["daily_close"] >= btc["ema200_daily"]
    two, four = btc["rsi"]["2h"], btc["rsi"]["4h"]
    if above and two is not None and four is not None and two >= 50 and four >= 50:
        return {"name": "FAVORÁVEL", "reason": "Diário acima EMA200, RSI 2h/4h >= 50"}
    if not above and two is not None and four is not None and two < 50 and four < 50:
        return {"name": "DEFENSIVO", "reason": "Diário abaixo EMA200, RSI 2h/4h < 50"}
    return {"name": "MISTO", "reason": "Tendência diária e momentum 2h/4h divergentes"}


def build(raw):
    output = {}
    btc = raw.get("BTCUSDT")
    if not btc or not all(tf in btc for tf in FRAMES):
        raise RuntimeError("BTC incompleto: não há contexto seguro para ranking")
    for symbol in SYMBOLS:
        series = raw.get(symbol, {})
        if not all(tf in series for tf in FRAMES):
            continue
        base = series["4h"][-1]
        rel = {}
        score_sum = weight_sum = 0.0
        for tf in FRAMES:
            metric = ({"alt_pct": 0, "btc_pct": 0, "relative_pp": 0} if symbol == "BTCUSDT"
                      else strength(series[tf], btc[tf]))
            rel[tf] = metric
            if metric:
                score_sum += metric["relative_pp"] * WEIGHTS[tf]
                weight_sum += WEIGHTS[tf]
        output[symbol] = {
            "price": base["close"], "close_2h": series["2h"][-1]["time"],
            "close_4h": base["time"], "daily_close": series["1d"][-1]["close"],
            "ema200_daily": ema([k["close"] for k in series["1d"]]),
            "rsi": {tf: rsi([k["close"] for k in series[tf]]) for tf in FRAMES},
            "amd": {tf: amd(series[tf]) for tf in ("2h", "4h")},
            "strength": rel, "score_pp": score_sum / weight_sum if weight_sum else None}
    ranking = sorted(({"symbol": s, "score_pp": d["score_pp"],
                       "class": classification(d["score_pp"])}
                      for s, d in output.items() if s != "BTCUSDT"),
                     key=lambda x: x["score_pp"] if x["score_pp"] is not None else -999, reverse=True)
    return output, ranking, regime(output.get("BTCUSDT"))


def event_record(symbol, frame, item):
    typ = item["type"]
    direction = 1 if typ in ("BREAK_UP", "SWEEP_LOW") else -1
    return {"id": symbol + ":" + frame + ":" + str(item["close_time"]) + ":" + typ,
            "symbol": symbol, "timeframe": frame, "phase": typ,
            "close_time": item["close_time"], "reference_price": item["price"],
            "volume_relative": item["volume_relative"],
            "support": item["support"], "resistance": item["resistance"],
            "hypothesis": "ALTA" if direction == 1 else "BAIXA",
            "audit": {}}


def update_audits(history, raw):
    changes = False
    for event in history:
        candles = raw.get(event["symbol"], {}).get("15m", [])
        if not candles:
            continue
        sign = 1 if event["hypothesis"] == "ALTA" else -1
        for label, hours in (("2h", 2), ("4h", 4), ("24h", 24)):
            if label in event["audit"]:
                continue
            target = event["close_time"] + hours * 3600000
            if NOW() < target:
                continue
            eligible = next((k for k in candles if k["time"] >= target), None)
            if eligible is None:
                # Não substituir o horário solicitado pelo preço de hoje.
                if candles[-1]["time"] > target + 3600000:
                    event["audit"][label] = {"status": "SEM AMOSTRA"}
                    changes = True
                continue
            delta = (eligible["close"] / event["reference_price"] - 1) * 100
            event["audit"][label] = {"status": "MEDIDO", "observed_close": eligible["time"],
                                     "change_pct": round(delta, 5),
                                     "direction_favorable": delta * sign > 0}
            changes = True
    return changes


def send_ntfy(message):
    if os.getenv("NTFY_ENABLED", "true").lower() != "true":
        print("ntfy desligado: " + message[:90])
        return False
    topic = os.getenv("NTFY_TOPIC", "DetectorAmd_11").strip()
    if not topic or len(topic) > 120 or any(c not in "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-" for c in topic):
        raise ValueError("nome de tópico ntfy inválido")
    url = "https://ntfy.sh/" + urllib.parse.quote(topic)
    payload = message.encode("utf-8")
    req = urllib.request.Request(url, data=payload, method="POST",
                                 headers={"Content-Type": "text/plain; charset=utf-8",
                                          "Title": "Detector AMD EGI - alerta técnico"})
    with urllib.request.urlopen(req, timeout=12) as result:
        if result.status >= 300:
            raise RuntimeError("ntfy HTTP " + str(result.status))
    return True


def run():
    jobs = [(s, tf) for s in SYMBOLS for tf in FRAMES]
    raw = {s: {} for s in SYMBOLS}
    errors = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
        future_map = {pool.submit(fetch, s, tf): (s, tf) for s, tf in jobs}
        for future in concurrent.futures.as_completed(future_map):
            symbol, frame = future_map[future]
            try:
                raw[symbol][frame] = future.result()
            except Exception as exc:
                errors.append(str(exc)[:230])
    readings, ranking, btc_regime = build(raw)
    state = load(STATE, {"bootstrapped": False, "regime": None, "strength_classes": {},
                         "pending": [], "last_bucket": None})
    history = load(HISTORY, [])
    if not isinstance(history, list):
        history = []
    seen = {e["id"] for e in history}
    initial = not state.get("bootstrapped", False)
    changes = update_audits(history, raw)
    alerts = []
    for symbol, row in readings.items():
        for frame in ("2h", "4h"):
            a = row["amd"][frame]
            if a["type"] not in ("BREAK_UP", "BREAK_DOWN", "SWEEP_LOW", "SWEEP_HIGH"):
                continue
            event = event_record(symbol, frame, a)
            if event["id"] in seen:
                continue
            history.append(event)
            seen.add(event["id"])
            changes = True
            if not initial:
                alerts.append("EGI AMD " + symbol.replace("USDT", "") + " " + frame +
                              ": " + a["type"] + "\nPreço " + str(a["price"]) +
                              " | Vol. rel " + str(round(a["volume_relative"] or 0, 2)) +
                              "x\nCandle fechado. Hipótese; não é ordem.")
    if not initial and state.get("regime") and state["regime"] != btc_regime["name"]:
        alerts.insert(0, "EGI BTC: semáforo " + state["regime"] + " -> " + btc_regime["name"] +
                      ". Verifique 2h, 4h, diário e volume.")
    new_classes = {}
    for symbol, row in readings.items():
        if symbol == "BTCUSDT":
            continue
        s2 = row["strength"]["2h"]
        category = classification(s2["relative_pp"] if s2 else None)
        new_classes[symbol] = {"class": category, "closed": row["close_2h"]}
        previous = state.get("strength_classes", {}).get(symbol)
        if (not initial and previous and previous.get("class") != category
                and previous.get("closed") != row["close_2h"]
                and category in ("FORTE", "FRACO")):
            alerts.append("EGI Força " + symbol.replace("USDT", "") + " 2h: " +
                          category + " vs BTC (" + str(round(s2["relative_pp"], 3)) +
                          " p.p.). Avaliar BTC e estrutura AMD.")
    # Limitar fila; garantir que falhas de envio sejam reapresentadas, sem duplicar eventos.
    pending = list(state.get("pending", []))
    for msg in alerts:
        if msg not in pending:
            pending.append(msg)
    pending = pending[-25:]
    remaining = []
    for msg in pending:
        try:
            if not send_ntfy(msg):
                remaining.append(msg)
        except (urllib.error.URLError, TimeoutError, OSError, ValueError, RuntimeError) as exc:
            print("Falha ntfy (será repetida):", exc)
            remaining.append(msg)
    bucket = NOW() // 3600000
    should_publish = initial or bucket != state.get("last_bucket") or changes or alerts or bool(pending)
    state.update({"bootstrapped": True, "regime": btc_regime["name"],
                  "strength_classes": new_classes, "pending": remaining,
                  "last_bucket": bucket})
    history = history[-250:]
    if should_publish:
        snapshot = {"app": "Robô Detector AMD EGI V1.0 LAB",
                    "generated_at_utc": dt.datetime.now(dt.timezone.utc).isoformat(),
                    "source": "Binance Spot - candles fechados",
                    "timeframes": list(FRAMES), "btc_regime": btc_regime,
                    "readings": readings, "ranking": ranking,
                    "events": history[-30:], "event_count": len(history),
                    "errors": errors, "note": "AMD heurística. Força é retorno do candle menos BTC; diário UTC. Sem ordens."}
        write(LATEST, snapshot)
        write(HISTORY, history)
        write(STATE, state)
        print("Snapshot:", len(readings), "ativos,", len(history), "eventos,", len(remaining), "ntfy pendentes")
    else:
        print("Sem alteração relevante; arquivos mantidos.")
    if errors:
        print("Falhas parciais:", "; ".join(errors))


if __name__ == "__main__":
    run()
