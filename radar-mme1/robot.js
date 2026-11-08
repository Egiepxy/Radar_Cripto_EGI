#!/usr/bin/env node
'use strict';
/*
  RadarMME1 EGI Robô V1.0 LAB.
  Motor de análise extraído do RadarMME1 Light V9.1.1,
  publicado separadamente, sem execução de ordens.
*/
const fs=require('fs'),path=require('path');
const {analyze,egiFreshness,egiRiskGate}=require('./engine-original.js');
const ROOT=path.resolve(__dirname,'..'), DATA=path.join(ROOT,'data');
const FILES={snapshot:path.join(DATA,'radar-mme1-latest.json'),state:path.join(DATA,'radar-mme1-state.json'),history:path.join(DATA,'radar-mme1-history.json')};
const TOP_N=50, TF='15m', TFS=['15m','1h','4h'], MIN_RELOK=97, TOL=0.35, STRETCH=1.5, NTFY_TOPIC='RadarMME1_11';
const HOSTS=['https://data-api.binance.vision','https://api.binance.com'];
const STABLE=new Set(['USDC','FDUSD','TUSD','USDP','DAI','EUR','TRY','BRL','AEUR','EURI','USD1','USDE','PYUSD','BFUSD']);
const load=(p,defaultValue)=>{try{return JSON.parse(fs.readFileSync(p,'utf8'))}catch{return defaultValue}};
const save=(p,v)=>{fs.mkdirSync(path.dirname(p),{recursive:true});const s=p+'.tmp';fs.writeFileSync(s,JSON.stringify(v,null,2)+'\n');fs.renameSync(s,p)};
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const num=x=>Number.isFinite(Number(x))?Number(x):null;
const pct=(a,b)=>!b?null:(a/b-1)*100;
function isLeveraged(base){return /(UP|DOWN|BULL|BEAR)$/.test(base);}
function describe(r){
 if(!r)return null;
 const guard=egiRiskGate(r,0.13);
 const fresh=egiFreshness(r,'15m');
 return {symbol:r.symbol,tf:'15m',state:r.state,label:r.label,price:r.price,close_time:r.signalCandleClose,
   quality:r.quality,iqe:r.iqe,relok:r.parecerScore,relok_status:r.parecerCode,
   relok_grade:r.parecerGrade,relok_reasons:r.parecerReasons,stop_valid:r.stopValid,
   stop_error:r.stopError,stop:r.stopValid?r.stop:null,r1:r.stopValid?r.r1:null,
   r2:r.stopValid?r.r2:null,fast:r.fast,slow:r.slow,sep:r.sep,dist9:r.dist9,
   slope9:r.slope9,slope21:r.slope21,vol_ratio:r.volRatio,
   cross_recent:r.crossRecent,obs:r.obs,freshness:fresh.code,
   risk_ok:guard.ok,risk_issues:guard.issues};
}
function eligible(r,bookOK){
 if(!r||!bookOK)return false; // Sem spread observado, não aprovar automaticamente.
 const guard=egiRiskGate(r,0.13);
 return ['LONG','SHORT'].includes(r.state)&&r.parecerCode==='APROVADO' &&
   Number.isFinite(r.parecerScore)&&r.parecerScore>=MIN_RELOK &&
   egiFreshness(r,'15m').code==='ATUAL'&&guard.ok;
}
function prepareCandidate(r){
 return !!r&&r.state==='PREPARAR'&&r.crossRecent&&r.quality>=70&&
   egiFreshness(r,'15m').code==='ATUAL';
}
async function api(endpoint,params={}){
 const query=new URLSearchParams(params).toString();
 let error;
 for(const base of HOSTS){
  for(let attempt=0;attempt<2;attempt++){
   try{
    const res=await fetch(base+endpoint+(query?'?'+query:''),{headers:{'User-Agent':'RadarMME1-EGI-Monitor/1.0'},signal:AbortSignal.timeout(17000)});
    if(res.status===429||res.status===418){const retry=Math.min(30000,Math.max(4000,(Number(res.headers.get('retry-after'))||5)*1000));await sleep(retry);error=new Error('Binance rate limit '+res.status);continue;}
    if(!res.ok)throw Error('Binance HTTP '+res.status);
    return await res.json();
   }catch(e){error=e;}
  }
 }
 throw new Error(endpoint+' '+(error?.message||'sem resposta'));
}
async function universe(){
 const [info,allTickers,books]=await Promise.all([
   api('/api/v3/exchangeInfo'),api('/api/v3/ticker/24hr'),api('/api/v3/ticker/bookTicker')]);
 if(!Array.isArray(info?.symbols)||!Array.isArray(allTickers)||!Array.isArray(books))throw Error('Dados Binance inválidos');
 const allowed=new Set(info.symbols.filter(s=>s.status==='TRADING'&&s.quoteAsset==='USDT'&&s.isSpotTradingAllowed!==false).map(s=>s.symbol));
 const bookBy=Object.fromEntries(books.map(t=>[t.symbol,t]));
 const picked=allTickers.filter(t=>{
  if(!allowed.has(t.symbol)||!t.symbol?.endsWith('USDT'))return false;
  const base=t.symbol.slice(0,-4);
  return !STABLE.has(base)&&!isLeveraged(base)&&Number.isFinite(Number(t.quoteVolume));
 }).sort((a,b)=>Number(b.quoteVolume)-Number(a.quoteVolume)).slice(0,TOP_N);
 // BTC é referência fixa, independentemente de sua classificação no ranking.
 const btc=allTickers.find(t=>t.symbol==='BTCUSDT');
 if(btc&&!picked.some(t=>t.symbol==='BTCUSDT'))picked.unshift(btc);
 return picked.slice(0,TOP_N).map(t=>({
  symbol:t.symbol,quoteVolume:Number(t.quoteVolume),bid:Number(bookBy[t.symbol]?.bidPrice),
  ask:Number(bookBy[t.symbol]?.askPrice)}));
}
async function candles(symbol,tf){
 const raw=await api('/api/v3/klines',{symbol,interval:tf,limit:80});
 if(!Array.isArray(raw)||raw.length<45||!raw.every(x=>Array.isArray(x)&&x.length>=7))throw Error('Candles incompletos '+symbol+'/'+tf);
 return raw;
}
async function gather(items,worker,concurrency=5){
 const results=new Array(items.length),errors=[];
 let cursor=0;
 await Promise.all(Array.from({length:Math.min(concurrency,items.length)},async()=>{
  while(cursor<items.length){const i=cursor++;const item=items[i];
   try{results[i]=await worker(item)}
   catch(err){errors.push({item,error:String(err.message||err).slice(0,170)})}
  }
 }));
 return {results,errors};
}
function evaluateTrade(trade,bars){
 if(trade.status!=='ABERTA')return {trade,events:[]};
 const fresh=bars.filter(k=>Number(k[6])>trade.checked_to&&Number(k[6])>trade.signal_close&&Number(k[6])<=Date.now()-1400)
   .sort((a,b)=>Number(a[6])-Number(b[6]));
 const events=[];
 for(const k of fresh){
  const high=Number(k[2]),low=Number(k[3]),t=Number(k[6]);
  const up=trade.direction==='LONG';
  const stopHit=up?low<=trade.stop:high>=trade.stop;
  const oneHit=up?high>=trade.r1:low<=trade.r1;
  const twoHit=up?high>=trade.r2:low<=trade.r2;
  trade.checked_to=t;
  if(stopHit&&(oneHit||twoHit)){
   trade.status='INDETERMINADA';trade.exit_time=t;trade.exit_reason='STOP e alvo na mesma vela: ordem intravela desconhecida';trade.result_r=null;
   events.push('⚠️ '+trade.symbol+' '+trade.direction+' • STOP e alvo no mesmo candle 15m. Resultado INDETERMINADO.');break;
  }
  if(stopHit){
   trade.status='STOP';trade.exit_time=t;trade.result_r=-1;
   events.push('⛔ STOP (estudo) • '+trade.symbol+' '+trade.direction+' 15m | entrada '+trade.entry+' | stop '+trade.stop);break;
  }
  if(twoHit){
   if(!trade.hit1r){trade.hit1r=true;events.push('🎯 1R (estudo) • '+trade.symbol+' '+trade.direction+' 15m');}
   trade.status='2R';trade.exit_time=t;trade.result_r=2;
   events.push('✅ 2R (estudo) • '+trade.symbol+' '+trade.direction+' 15m | alvo '+trade.r2);break;
  }
  if(oneHit&&!trade.hit1r){trade.hit1r=true;events.push('🎯 1R (estudo) • '+trade.symbol+' '+trade.direction+' 15m | alvo '+trade.r1);}
 }
 return {trade,events};
}
async function push(msg){
 if(process.env.NTFY_ENABLED==='false'){console.log('ntfy desativado, evento ficou em fila');return false;}
 const topic=process.env.NTFY_TOPIC||NTFY_TOPIC;
 if(!/^[A-Za-z0-9_-]{4,70}$/.test(topic))throw Error('tópico ntfy inválido');
 const url='https://ntfy.sh/'+topic;
 const response=await fetch(url,{method:'POST',headers:{'Content-Type':'text/plain; charset=utf-8',
   'Title':'RadarMME1 EGI LAB',Priority:'3','Tags':'chart_with_upwards_trend'},
   body:msg,signal:AbortSignal.timeout(12000)});
 if(response.status===429)throw Error('ntfy HTTP 429 — reduzir frequência');
 if(!response.ok)throw Error('ntfy HTTP '+response.status);
 return true;
}
async function main(){
 const started=new Date().toISOString(),previous=load(FILES.state,{initialized:false,status:{},pending:[],trades:[],events:[],stop_streak:0});
 let symbols;
 try{symbols=await universe()}catch(e){console.error('Falha na seleção do universo; não sobrescrever snapshot:',e);process.exitCode=1;return;}
 const jobs=symbols.flatMap(s=>TFS.map(tf=>({...s,tf})));
 const {results,errors}=await gather(jobs,async job=>({job,klines:await candles(job.symbol,job.tf)}));
 const groups={};
 for(const x of results.filter(Boolean)){(groups[x.job.symbol]??={meta:x.job,klines:{}}).klines[x.job.tf]=x.klines;}
 const readings=[],eventMessages=[],newStatus={},runtimeTrades=Array.isArray(previous.trades)?previous.trades:[];
 const notes=[],pending=Array.isArray(previous.pending)?previous.pending:[];
 for(const symbol of symbols){
  const data=groups[symbol.symbol], k15=data?.klines?.['15m'];
  if(!k15){notes.push('Sem 15m: '+symbol.symbol);continue;}
  const meta=data.meta;
  let r;
  try{r=analyze(symbol.symbol,meta.quoteVolume,k15,TOL,STRETCH,meta.bid,meta.ask);}
  catch(e){notes.push('Falha análise '+symbol.symbol+': '+e.message);continue;}
  if(!r)continue;
  const bookOK=Number.isFinite(meta.bid)&&Number.isFinite(meta.ask)&&meta.bid>0&&meta.ask>meta.bid;
  const dataComplete=!!(data.klines['1h']&&data.klines['4h']);
  const entryEligible=eligible(r,bookOK)&&dataComplete;
  const prepare=prepareCandidate(r);
  const raw=describe(r);
  const context={};
  for(const tf of ['1h','4h']){
   if(!data.klines[tf]){context[tf]=null;continue;}
   try{
    const rr=analyze(symbol.symbol,meta.quoteVolume,data.klines[tf],TOL,STRETCH,meta.bid,meta.ask);
    context[tf]=rr?{state:rr.state,price:rr.price,quality:rr.quality,close_time:rr.signalCandleClose,
      ema9:rr.fast,ema21:rr.slow,relok:rr.parecerScore}:null;
   }catch{context[tf]=null;}
  }
  raw.context=context;raw.eligible=entryEligible;raw.book_ok=bookOK;raw.context_complete=dataComplete;
  // Regra do RadarMME1: 1h/4h são contexto, sem bloquear 15m pelo sentido oposto.
  const old=previous.status?.[symbol.symbol]||{};
  const status=entryEligible?'SINAL_'+r.state:prepare?'PREPARAR_'+(r.fast>r.slow?'LONG':'SHORT'):r.state;
  newStatus[symbol.symbol]={state:status,close_time:r.signalCandleClose};
  const previously=old.state||'';
  const transitioning=status!==previously;
  if(previous.initialized&&transitioning&&entryEligible&&
     !runtimeTrades.some(t=>t.symbol===r.symbol&&t.status==='ABERTA')){
   const id=[r.symbol,TF,r.signalCandleClose,r.state].join(':');
   if(!previous.events?.some(e=>e.id===id)){
    const contextText='1h '+(context['1h']?.state||'?')+' | 4h '+(context['4h']?.state||'?');
    const msg='📡 RadarMME1 '+r.state+' • '+r.symbol+' 15m\nCandle fechado: '+new Date(r.signalCandleClose).toISOString()+
      '\nRelOk '+r.parecerScore+'/100 • IQE '+r.iqe+'/100 • Score '+r.quality+
      '\nPreço '+r.price+' | Stop '+r.stop+' | 1R '+r.r1+' | 2R '+r.r2+
      '\n'+contextText+'\nCandidato técnico, sem ordem. GPT/humano ainda não aprovou.';
    eventMessages.push(msg);
    previous.events.push({id,time:r.signalCandleClose,symbol:r.symbol,type:'SINAL',direction:r.state,relok:r.parecerScore});
    runtimeTrades.push({id,symbol:r.symbol,tf:TF,direction:r.state,signal_close:r.signalCandleClose,
      entry:r.price,stop:r.stop,r1:r.r1,r2:r.r2,relok:r.parecerScore,iqe:r.iqe,
      status:'ABERTA',checked_to:r.signalCandleClose,hit1r:false,result_r:null,exit_time:null});
   }
  }else if(previous.initialized&&transitioning&&prepare&&
    !entryEligible && r.crossRecent && r.quality>=70){
    eventMessages.push('🟡 RadarMME1 PREPARAR '+(r.fast>r.slow?'LONG':'SHORT')+' • '+r.symbol+
      ' 15m | Score '+r.quality+' | Candle fechado. Esperar pullback + confirmação. NÃO É ENTRADA.');
  }
  readings.push(raw);
 }
 // Atualizar auditoria virtual com o OHLC de candles já encerrados.
 let streak=Number(previous.stop_streak)||0;
 for(const trade of runtimeTrades){
  if(trade.status!=='ABERTA')continue;
  const kl=groups[trade.symbol]?.klines?.['15m'];
  if(!kl)continue;
  const seen=evaluateTrade(trade,kl);
  for(const msg of seen.events)eventMessages.push(msg);
  if(trade.status==='STOP')streak++;
  if(trade.status==='2R')streak=0;
 }
 // Parar novos sinais após três STOPs consecutivos, mas jamais parar auditoria dos abertos.
 // Este LAB apenas identifica bloqueio na leitura; o bloqueio é aplicado na próxima varredura.
 const alertCandidates=eventMessages.filter(Boolean);
 for(const message of alertCandidates)if(!pending.includes(message))pending.push(message);
 const unsent=[];
 for(let i=0;i<pending.length;i++){
  const msg=pending[i];if(i>=4){unsent.push(msg);continue;}
  try{if(!await push(msg))unsent.push(msg);}
  catch(e){console.log('ntfy pendente:',e.message);unsent.push(msg);}
  if(i<Math.min(3,pending.length-1))await sleep(6500);
 }
 const records=readings.sort((a,b)=>Number(b.relok||0)-Number(a.relok||0));
 const signals=records.filter(r=>r.eligible);
 const ready=records.filter(r=>r.state==='PREPARAR');
 const valid=records.filter(r=>r.freshness==='ATUAL');
 const snapshot={app:'Robô RadarMME1 EGI V1.0 LAB',generated_at_utc:started,
  source:'Binance Spot / RadarMME1 Light V9.1.1',tf:TF,contexts:['1h','4h'],
  topics:{ntfy:NTFY_TOPIC},configuration:{top_n:TOP_N,relok_min:MIN_RELOK,
  pullback_tolerance_pct:TOL,stretch_pct:STRETCH},
  expected_assets:symbols.length,analyzed_assets:readings.length,fresh_assets:valid.length,
  alerts_candidates:signals.length,prepared_count:ready.length,
  btc:records.find(x=>x.symbol==='BTCUSDT')||null,
  top10:records.slice(0,10),readings:records,
  open_studies:runtimeTrades.filter(x=>x.status==='ABERTA').length,
  trades:runtimeTrades.slice(-100),events:(previous.events||[]).slice(-100),
  errors:errors.slice(0,30),notes:notes.slice(0,30),
  warning:'Estudo. RelOk automático não substitui aprovação humana/GPT; não há negociação nem taxas/slippage reais.'};
 previous.initialized=true;previous.status={...previous.status,...newStatus};
 previous.events=(previous.events||[]).slice(-250);
 previous.trades=runtimeTrades.slice(-200);
 previous.pending=unsent.slice(-40);
 previous.stop_streak=streak;
 previous.last_checked=started;
 save(FILES.snapshot,snapshot);save(FILES.history,{events:previous.events,trades:previous.trades});save(FILES.state,previous);
 console.log('RADARMME1',symbols.length,'selecionados',readings.length,'analisados',signals.length,'candidatos',
   ready.length,'preparar',unsent.length,'ntfy pendentes',errors.length,'erros API');
 if(!readings.length)process.exitCode=1;
}
if(require.main===module)main().catch(e=>{console.error('Erro geral RadarMME1:',e);process.exitCode=1;});
module.exports={describe,eligible,prepareCandidate,evaluateTrade,isLeveraged};
