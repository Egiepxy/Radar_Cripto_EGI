#!/usr/bin/env node
'use strict';
// RadarMME1 EGI Multimercados LAB - Binance USD-M Futures, sem ordens.
// O motor MME9/21/IQE/RelOk e o radar Spot original permanecem intactos.
const fs = require('node:fs');
const path = require('node:path');
const {analyze, egiFreshness, egiRiskGate} = require('./engine-original.js');
const ROOT = path.resolve(__dirname, '..');
const DIR = path.join(ROOT, 'data');
const FILE = {
  latest: path.join(DIR, 'radar-mme1-futures-latest.json'),
  history: path.join(DIR, 'radar-mme1-futures-history.json'),
  state: path.join(DIR, 'radar-mme1-futures-state.json')
};
const WATCH = [
  {symbol:'MUUSDT', name:'Micron', group:'ACOES'},
  {symbol:'SNDKUSDT', name:'Sandisk', group:'ACOES'},
  {symbol:'SPCXUSDT', name:'SpaceX', group:'ACOES'},
  {symbol:'NVDAUSDT', name:'Nvidia', group:'ACOES'},
  {symbol:'TSLAUSDT', name:'Tesla', group:'ACOES'},
  {symbol:'BZUSDT', name:'Petróleo Brent', group:'COMMODITIES'},
  {symbol:'XAUUSDT', name:'Ouro', group:'COMMODITIES'},
  {symbol:'BTCUSDT', name:'Bitcoin (referência)', group:'REFERENCIA'}
];
const TF = ['15m','1h','2h','4h'];
const BASES = ['https://fapi.binance.com','https://fapi1.binance.com'];
const MIN_RELOK = 97;
const TOPIC = 'RadarMME1_11';
const sleep = ms => new Promise(r => setTimeout(r,ms));
const load = (p, fallback) => { try {return JSON.parse(fs.readFileSync(p,'utf8'));} catch {return fallback;} };
function save(p,obj) {fs.mkdirSync(path.dirname(p),{recursive:true}); const tmp=p+'.tmp'; fs.writeFileSync(tmp,JSON.stringify(obj,null,2)+'\n');fs.renameSync(tmp,p);}
function n(x) {const v=Number(x); return Number.isFinite(v)?v:null;}
function closedBars(bars,now=Date.now()) {
  return (bars||[]).filter(k => Number(k[6])<=now-1400 && Number(k[6])>0);
}
async function api(endpoint,params={}) {
  const qs=new URLSearchParams(params).toString();
  let last;
  for(const host of BASES) {
    for(let a=0;a<2;a++) {
      try {
        const response=await fetch(host+endpoint+(qs?'?'+qs:''),{signal:AbortSignal.timeout(15000),headers:{'User-Agent':'RadarMME1-EGI-Multimercados-LAB/1.1'}});
        if(response.status===451) throw new Error('HTTP 451: acesso Binance Futures restrito por região');
        if(response.status===429 || response.status===418) {last=new Error('HTTP '+response.status);await sleep(1800);continue;}
        if(!response.ok) throw new Error('HTTP '+response.status);
        // Alguns endpoints retornam HTTP 200 com corpo vazio/truncado.
        // Registrar a falha real e tentar o outro host, sem criar precos ficticios.
        const raw=await response.text();
        if(!raw.trim())throw new Error('Resposta vazia HTTP '+response.status+' de '+host+endpoint);
        try {return JSON.parse(raw);}
        catch {throw new Error('JSON invalido HTTP '+response.status+' de '+host+endpoint+' ('+raw.length+' caracteres)');}
      } catch(err) {last=err; if(String(err.message).includes('451')) break;}
    }
  }
  throw new Error(endpoint+': '+(last?.message||'falha na API'));
}
// A consulta do HTML diagnostico e independente por endpoint. Uma falha em
// exchangeInfo ou nos tickers nao deve impedir a tentativa de candles.
// Sem bid/ask verificado, a regra eligible() continua impedindo alertas.
function marketMetadata(outcomes) {
  const names=['exchangeInfo','ticker/bookTicker','ticker/24hr'];
  const valid=[x=>!!x&&Array.isArray(x.symbols),Array.isArray,Array.isArray];
  const values=[null,[],[]],errors=[];
  for(let i=0;i<names.length;i++) {
    const r=outcomes[i];
    if(r?.status==='fulfilled'&&valid[i](r.value))values[i]=r.value;
    else errors.push({endpoint:'/fapi/v1/'+names[i],
      error:r?.status==='rejected'?String(r.reason?.message||r.reason):'JSON sem estrutura esperada'});
  }
  return {info:values[0],book24:values[1],volume24:values[2],errors};
}
async function gather(jobs,worker,limit=4) {
  const result=[],errors=[]; let i=0;
  await Promise.all(Array.from({length:Math.min(limit,jobs.length)},async()=>{
    while(i<jobs.length) {
      const job=jobs[i++];
      try {result.push(await worker(job));}
      catch(e) {errors.push({symbol:job.symbol,tf:job.tf,error:String(e.message||e).slice(0,180)});}
    }
  }));
  return {result,errors};
}
function pearson(a,b) {
  if(a.length<20 || a.length!==b.length) return null;
  const am=a.reduce((s,v)=>s+v,0)/a.length,bm=b.reduce((s,v)=>s+v,0)/b.length;
  let ab=0,aa=0,bb=0;
  for(let i=0;i<a.length;i++){const x=a[i]-am,y=b[i]-bm;ab+=x*y;aa+=x*x;bb+=y*y;}
  return aa>0&&bb>0?ab/Math.sqrt(aa*bb):null;
}
function correlate1h(bars,benchmark) {
  if(!bars?.length||!benchmark?.length)return {rho:null,pairs:0};
  const btc=new Map(closedBars(benchmark).map(k=>[Number(k[6]),Number(k[4])]));
  const paired=closedBars(bars).map(k=>[Number(k[6]),Number(k[4]),btc.get(Number(k[6]))])
    .filter(x=>x[1]>0&&x[2]>0).sort((a,b)=>a[0]-b[0]);
  const x=[],y=[];
  for(let i=1;i<paired.length;i++){
    if(paired[i][0]-paired[i-1][0]!==3600000)continue;
    x.push(Math.log(paired[i][1]/paired[i-1][1]));
    y.push(Math.log(paired[i][2]/paired[i-1][2]));
  }
  return {rho:pearson(x,y),pairs:x.length};
}
function eligible(r,bookOK) {
  return !!(r&&bookOK&&['LONG','SHORT'].includes(r.state)&&
    r.parecerCode==='APROVADO'&&r.parecerScore>=MIN_RELOK&&
    egiFreshness(r,'15m').code==='ATUAL'&&egiRiskGate(r,0.13).ok);
}
function evaluateStudy(t,bars) {
  if(t.status!=='ABERTA')return [];
  const messages=[];
  for(const k of closedBars(bars).filter(x=>Number(x[6])>t.checked_to&&Number(x[6])>t.signal_close).sort((a,b)=>Number(a[6])-Number(b[6]))) {
    const h=Number(k[2]),l=Number(k[3]),close=Number(k[6]),long=t.direction==='LONG';
    const stop=long?l<=t.stop:h>=t.stop;
    const one=long?h>=t.r1:l<=t.r1;
    const two=long?h>=t.r2:l<=t.r2;
    t.checked_to=close;
    if(stop&&(one||two)){t.status='INDETERMINADA';t.result_r=null;t.exit_time=close;messages.push('⚠️ '+t.symbol+' '+t.direction+' STOP e alvo na mesma vela: INDETERMINADO');break;}
    if(stop){t.status='STOP';t.result_r=-1;t.exit_time=close;messages.push('⛔ '+t.symbol+' '+t.direction+' STOP (estudo)');break;}
    if(two){if(!t.hit1r){t.hit1r=true;messages.push('🎯 '+t.symbol+' 1R (estudo)');}t.status='2R';t.result_r=2;t.exit_time=close;messages.push('✅ '+t.symbol+' 2R (estudo)');break;}
    if(one&&!t.hit1r){t.hit1r=true;messages.push('🎯 '+t.symbol+' 1R (estudo)');}
  }
  return messages;
}
async function notify(message) {
  if(process.env.NTFY_ENABLED==='false')return false;
  const topic=process.env.NTFY_TOPIC||TOPIC;
  if(!/^[A-Za-z0-9_-]{4,70}$/.test(topic))throw Error('Tópico ntfy inválido');
  const r=await fetch('https://ntfy.sh/'+topic,{
    method:'POST',headers:{'Content-Type':'text/plain; charset=utf-8','Title':'RadarMME1 MULTIMERCADOS LAB','Priority':'3'},
    body:message,signal:AbortSignal.timeout(12000)});
  if(!r.ok)throw Error('ntfy HTTP '+r.status);
  return true;
}
function describe(r,meta,bookOK) {
  const guard=egiRiskGate(r,0.13);
  return {symbol:r.symbol,name:meta.name,group:meta.group,source:'Binance Futures USD-M',
    state:r.state,label:r.label,price:r.price,close_time:r.signalCandleClose,quality:r.quality,
    iqe:r.iqe,relok:r.parecerScore,relok_status:r.parecerCode,relok_reasons:r.parecerReasons,
    stop:r.stopValid?r.stop:null,r1:r.stopValid?r.r1:null,r2:r.stopValid?r.r2:null,
    stop_valid:r.stopValid,fast:r.fast,slow:r.slow,vol_ratio:n(r.volRatio),sep:r.sep,
    slope9:r.slope9,slope21:r.slope21,cross_recent:r.crossRecent,obs:r.obs,
    freshness:egiFreshness(r,'15m').code,risk_ok:guard.ok,risk_issues:guard.issues,
    book_ok:bookOK,eligible:eligible(r,bookOK)};
}
async function run() {
  const now=new Date().toISOString();
  const state=load(FILE.state,{initialized:false,status:{},pending:[],trades:[],events:[]});
  const previous=load(FILE.latest,null);
  const errors=[],notes=[];
  // Nao depender de exchangeInfo nem de tickers em bloco para estudar candles.
  // HTTP 202 vazio pode ocorrer em um endpoint mesmo quando outro responde.
  const meta=marketMetadata(await Promise.allSettled([
    api('/fapi/v1/exchangeInfo'),
    api('/fapi/v1/ticker/bookTicker'),
    api('/fapi/v1/ticker/24hr')
  ]));
  errors.push(...meta.errors);
  const info=meta.info,book24=meta.book24,volume24=meta.volume24;
  const listed=new Map((info?.symbols||[]).map(x=>[x.symbol,x]));
  const books=new Map(book24.map(x=>[x.symbol,x]));
  const volumes=new Map(volume24.map(x=>[x.symbol,x]));
  // Quando exchangeInfo falha, consultar candles individualmente: sem presumir
  // que um contrato existe. Somente os que retornarem klines validos serao analisados.
  const available=WATCH.filter(x=>!info||listed.get(x.symbol)?.status==='TRADING');
  if(!info)notes.push('exchangeInfo indisponivel; validando contratos por candles.');
  for(const x of WATCH)if(!available.includes(x))notes.push(x.symbol+' não está TRADING na API; sem sinal.');
  const jobs=available.flatMap(x=>TF.map(tf=>({...x,tf})));
  const result=await gather(jobs,async job=>{
    const bars=await api('/fapi/v1/klines',{symbol:job.symbol,interval:job.tf,limit:100});
    if(!Array.isArray(bars)||bars.length<45)throw Error('Candles incompletos');
    return {job,bars};
  });
  errors.push(...result.errors);
  const grouped={};
  for(const item of result.result){(grouped[item.job.symbol]??={})[item.job.tf]=item.bars;}
  const readings=[],events=[],status={};
  const studies=Array.isArray(state.trades)?state.trades:[];
  for(const item of WATCH) {
    const bars=grouped[item.symbol];
    if(!bars?.['15m'])continue;
    const book=books.get(item.symbol)||{},ticker=volumes.get(item.symbol)||{};
    const bid=Number(book.bidPrice),ask=Number(book.askPrice),bookOK=bid>0&&ask>bid;
    const qv=Number(ticker.quoteVolume)||0;
    let r;
    try{r=analyze(item.symbol,qv,bars['15m'],0.35,1.5,bid,ask);}
    catch(e){notes.push('Erro análise '+item.symbol+': '+e.message);continue;}
    if(!r)continue;
    const row=describe(r,item,bookOK);
    row.context={};
    for(const tf of ['1h','2h','4h']) {
      try {
        const cr=bars[tf]?analyze(item.symbol,qv,bars[tf],0.35,1.5,bid,ask):null;
        row.context[tf]=cr?{state:cr.state,price:cr.price,quality:cr.quality,relok:cr.parecerScore,close_time:cr.signalCandleClose}:null;
      }catch {row.context[tf]=null;}
    }
    row.correlation_btc_1h=correlate1h(bars['1h'],grouped.BTCUSDT?.['1h']);
    const prepare=r.state==='PREPARAR'&&r.crossRecent&&r.quality>=70&&row.freshness==='ATUAL';
    const newStatus=row.eligible?'SINAL_'+r.state:prepare?'PREPARAR_'+(r.fast>r.slow?'LONG':'SHORT'):r.state;
    const old=state.status?.[item.symbol]?.state||'';
    status[item.symbol]={state:newStatus,close_time:r.signalCandleClose};
    if(state.initialized && old!==newStatus && row.eligible &&
        !studies.some(t=>t.symbol===item.symbol&&t.status==='ABERTA')) {
      const id=item.symbol+':15m:'+r.signalCandleClose+':'+r.state;
      if(!state.events.some(e=>e.id===id)) {
        events.push('📡 MULTI '+item.symbol+' '+r.state+' 15m | RelOk '+r.parecerScore+
          ' IQE '+r.iqe+' | Entrada hipotética '+r.price+' Stop '+r.stop+' 1R '+r.r1+
          ' 2R '+r.r2+' | 1h '+(row.context['1h']?.state||'?')+
          ' 2h '+(row.context['2h']?.state||'?')+' 4h '+(row.context['4h']?.state||'?')+
          ' | Apenas estudo. Sem ordem ou aprovação humana/GPT.');
        state.events.push({id,symbol:item.symbol,at:now,direction:r.state,kind:'SINAL'});
        studies.push({id,symbol:item.symbol,direction:r.state,entry:r.price,stop:r.stop,r1:r.r1,r2:r.r2,
          signal_close:r.signalCandleClose,checked_to:r.signalCandleClose,status:'ABERTA',
          hit1r:false,result_r:null,opened_at:now});
      }
    } else if(state.initialized && old!==newStatus && prepare && !row.eligible) {
      events.push('🟡 MULTI '+item.symbol+' PREPARAR '+(r.fast>r.slow?'LONG':'SHORT')+
        ' | Score '+r.quality+' | Não é entrada.');
    }
    readings.push(row);
  }
  for(const t of studies) {
    if(t.status!=='ABERTA')continue;
    const bars=grouped[t.symbol]?.['15m'];
    if(bars)events.push(...evaluateStudy(t,bars));
  }
  const pending=[...(Array.isArray(state.pending)?state.pending:[]),...events];
  const unsent=[];
  for(let i=0;i<pending.length;i++) {
    if(i>=4){unsent.push(...pending.slice(i));break;}
    try{if(!await notify(pending[i]))unsent.push(pending[i]);}
    catch(e){unsent.push(pending[i]);notes.push('ntfy: '+e.message);}
    if(i<3&&i<pending.length-1)await sleep(1100);
  }
  const btc=readings.find(x=>x.symbol==='BTCUSDT')||null;
  const equities=readings.filter(x=>x.group==='ACOES');
  const stockUp=equities.filter(x=>x.context['1h']?.state==='LONG').length;
  const stockDown=equities.filter(x=>x.context['1h']?.state==='SHORT').length;
  const snapshot={app:'RadarMME1 Multimercados LAB V1.1',generated_at_utc:now,
    source:'Binance USD-M Futures /fapi/v1',status:!readings.length?'FONTE_INDISPONIVEL':readings.length===WATCH.length&&!errors.length?'OK':'PARCIAL',
    tf:'15m',contexts:['1h','2h','4h'],topic:TOPIC,expected_assets:WATCH.length,
    analyzed_assets:readings.length,watchlist:WATCH,readings,btc,
    stock_basket_1h:{total:equities.length,long:stockUp,short:stockDown,
      note:'Quantidade de estados LONG/SHORT em 1h; não é o índice Nasdaq.'},
    candidates:readings.filter(x=>x.eligible).length,prepared:readings.filter(x=>x.state==='PREPARAR').length,
    open_studies:studies.filter(x=>x.status==='ABERTA').length,trades:studies.slice(-100),
    errors,notes,warning:'Contratos derivados. Correlação histórica não é previsão. Sinais simulados, sem ordens ou garantia de ganho.'};
  if(readings.length)state.initialized=true;state.status={...(state.status||{}),...status};
  state.pending=unsent.slice(-40);state.trades=studies.slice(-200);state.events=state.events.slice(-250);
  state.last_checked=now;
  if(!readings.length)notes.push('Nenhum candle validado; verificar bloqueio regional da Binance Futures no runner GitHub.');
  snapshot.last_good_utc=snapshot.status==='OK'?now:(previous?.status==='OK'?previous.generated_at_utc:previous?.last_good_utc||null);
  save(FILE.latest,snapshot);
  save(FILE.history,{events:state.events,trades:state.trades});
  save(FILE.state,state);
  console.log('MULTIMERCADOS',snapshot.status,readings.length+'/'+WATCH.length,
    'candidatos',snapshot.candidates,'preparar',snapshot.prepared,'API erros',errors.length);
  if(!readings.length)process.exitCode=1;
}
if(require.main===module)run().catch(e=>{console.error(e);process.exitCode=1;});
module.exports={WATCH,TF,pearson,correlate1h,eligible,evaluateStudy,closedBars,marketMetadata};
