#!/usr/bin/env node
'use strict';
// Diagnostico independente das fontes. Nenhum sinal, nenhuma ordem, nenhum ntfy.
// A resposta de uma fonte nao autoriza trocar o contrato Binance por outro ativo.
const SOURCES=[
  {key:'binance_spot_btc',source:'Binance Spot BTCUSDT',url:'https://data-api.binance.vision/api/v3/klines?symbol=BTCUSDT&interval=15m&limit=60',kind:'binance'},
  {key:'binance_futures_btc',source:'Binance Futures BTCUSDT',url:'https://fapi.binance.com/fapi/v1/klines?symbol=BTCUSDT&interval=15m&limit=60',kind:'binance'},
  {key:'mexc_brent',source:'MEXC UKOIL_USDT (contrato distinto de BZUSDT)',url:'https://contract.mexc.com/api/v1/contract/kline/UKOIL_USDT?interval=Min15',kind:'mexc'},
  {key:'yahoo_brent',source:'Yahoo Finance Brent BZ=F (futuro distinto de BZUSDT)',url:'https://query1.finance.yahoo.com/v8/finance/chart/BZ%3DF?interval=15m&range=5d',kind:'yahoo'}
];
function valid(source,j) {
  if(source.kind==='binance'){
    if(!Array.isArray(j)||j.length<30)throw Error('candles insuficientes');
    const c=j.filter(k=>Array.isArray(k)&&Number(k[6])<=Date.now()-1400&&Number(k[6])>0);
    if(!c.length)throw Error('sem candle fechado');
    return {candles:c.length,last_close_ms:Number(c[c.length-1][6])};
  }
  if(source.kind==='mexc'){
    const d=j&&j.data;
    if(j.success!==true||!Array.isArray(d?.time)||d.time.length<30)throw Error('historico MEXC invalido');
    const arr=d.time.filter(x=>Number(x)*1000+899999<Date.now()-1400);
    if(!arr.length)throw Error('sem candle fechado');
    return {candles:arr.length,last_close_ms:Number(arr[arr.length-1])*1000+899999};
  }
  const res=j?.chart?.result?.[0];
  const quote=res?.indicators?.quote?.[0];
  const stamps=Array.isArray(res?.timestamp)?res.timestamp:[];
  const candles=stamps.filter((t,i)=>Number(t)*1000+899999<Date.now()-1400&&
    Number.isFinite(Number(quote?.close?.[i]))&&quote.close[i]!==null);
  if(!candles.length)throw Error('sem candle fechado no Yahoo');
  return {candles:candles.length,last_close_ms:Number(candles[candles.length-1])*1000+899999};
}
async function probe(s) {
  const ctl=AbortSignal.timeout(16000);
  try{
    const r=await fetch(s.url,{signal:ctl,headers:{Accept:'application/json','User-Agent':'RadarMME1-EGI-Source-Test-LAB/1.0'}});
    const body=await r.text();
    if(!r.ok||!body.trim())return {key:s.key,source:s.source,ok:false,http:r.status,bytes:body.length,reason:!body.trim()?'corpo vazio':'HTTP nao OK'};
    let j;
    try{j=JSON.parse(body)}catch{return {key:s.key,source:s.source,ok:false,http:r.status,bytes:body.length,reason:'JSON invalido'};}
    try{return {key:s.key,source:s.source,ok:true,http:r.status,bytes:body.length,...valid(s,j)};}
    catch(e){return {key:s.key,source:s.source,ok:false,http:r.status,bytes:body.length,reason:e.message};}
  }catch(e){return {key:s.key,source:s.source,ok:false,reason:'erro de acesso: '+String(e.message||e).slice(0,130)};}
}
async function main(){
  const results=[];
  for(const s of SOURCES){results.push(await probe(s));}
  const result={app:'RadarMME1 LAB - teste de fontes sem sinais',generated_at_utc:new Date().toISOString(),results,
    warning:'UKOIL_USDT, BZ=F e BZUSDT sao instrumentos distintos: nunca compartilhar candles ou sinal sem fonte identificada.'};
  console.log(JSON.stringify(result,null,2));
}
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});
module.exports={valid};
