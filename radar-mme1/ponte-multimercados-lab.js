#!/usr/bin/env node
'use strict';
// RadarMME1 Multimercados PONTE LAB — somente leitura e sem ordens.
// Motor EGI original importado sem alteracoes. Fonte sempre identificada.
const fs=require('node:fs'),path=require('node:path');
const {analyze,egiFreshness,egiRiskGate}=require('./engine-original.js');
const {correlate1h}=require('./futures-robot.js');
const ROOT=path.resolve(__dirname,'..'),DIR=path.join(ROOT,'data');
const OUTPUT=path.join(DIR,'radar-mme1-ponte-lab-latest.json');
const STATE=path.join(DIR,'radar-mme1-ponte-lab-state.json');
const TFMS={'15m':900000,'1h':3600000,'2h':7200000,'4h':14400000};
const CONFIG=[
 {id:'BTC',symbol:'BTCUSDT',name:'BTC referencia',group:'REFERENCIA',provider:'BINANCE_SPOT'},
 {id:'MU',symbol:'MUSTOCK_USDT',name:'Micron (derivativo)',group:'ACOES',provider:'MEXC'},
 {id:'SNDK',symbol:'SNDKSTOCK_USDT',name:'Sandisk (derivativo)',group:'ACOES',provider:'MEXC'},
 {id:'SPCX',symbol:'SPCXSTOCK_USDT',name:'SpaceX (derivativo)',group:'ACOES',provider:'MEXC'},
 {id:'NVDA',symbol:null,name:'Nvidia',group:'ACOES',provider:'PENDENTE'},
 {id:'TSLA',symbol:null,name:'Tesla',group:'ACOES',provider:'PENDENTE'},
 {id:'OIL',symbol:'UKOIL_USDT',name:'Petroleo Brent (derivativo)',group:'COMMODITIES',provider:'MEXC'},
 {id:'XAU',symbol:'XAU_USDT',name:'Ouro (derivativo)',group:'COMMODITIES',provider:'MEXC'}
];
function read(p,def){try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch{return def;}}
function save(p,data){fs.mkdirSync(path.dirname(p),{recursive:true});const tmp=p+'.tmp';fs.writeFileSync(tmp,JSON.stringify(data,null,2)+'\n');fs.renameSync(tmp,p);}
const num=x=>x===null||x===undefined||x===''?NaN:Number(x);
function isValid(k){return k[0]>0&&k[1]>0&&k[3]>0&&k[5]>=0&&
 [k[0],k[1],k[2],k[3],k[4],k[5],k[6]].every(Number.isFinite)&&
 k[2]>=Math.max(k[1],k[4])&&k[3]<=Math.min(k[1],k[4]);}
function parseMexc(data,tf,now=Date.now()){
 const obj=data?.data;
 if(data?.success!==true||!Array.isArray(obj?.time)||!['open','high','low','close'].every(k=>Array.isArray(obj?.[k])))
   throw Error('MEXC: formato invalido');
 if(!TFMS[tf])throw Error('Intervalo nao suportado');
 const rows=obj.time.map((sec,i)=>{
   const start=num(sec)*1000;
   return [start,num(obj.open[i]),num(obj.high[i]),num(obj.low[i]),num(obj.close[i]),num(obj.vol?.[i]??0),start+TFMS[tf]-1];
 }).filter(isValid).sort((a,b)=>a[0]-b[0]);
 if(rows.filter(r=>r[6]<=now-1400).length<40)throw Error('MEXC: candles fechados insuficientes');
 return rows.slice(-220);
}
function parseBinance(data,tf,now=Date.now()){
 if(!Array.isArray(data))throw Error('Binance Spot: formato invalido');
 const rows=data.map(k=>[num(k?.[0]),num(k?.[1]),num(k?.[2]),num(k?.[3]),num(k?.[4]),num(k?.[5]),num(k?.[6])])
   .filter(isValid).sort((a,b)=>a[0]-b[0]);
 if(rows.filter(r=>r[6]<=now-1400).length<40)throw Error('Binance Spot: candles fechados insuficientes');
 return rows.slice(-220);
}
function synth2h(rows,now=Date.now()){
 const buckets=new Map();
 for(const k of rows){
  if(k[6]>now-1400)continue;
  const b=Math.floor(k[0]/TFMS['2h'])*TFMS['2h'];
  if(!buckets.has(b))buckets.set(b,[]);
  buckets.get(b).push(k);
 }
 return [...buckets].sort((a,b)=>a[0]-b[0]).flatMap(([b,items])=>{
  items.sort((x,y)=>x[0]-y[0]);
  if(items.length!==2||items[0][0]!==b||items[1][0]!==b+TFMS['1h'])return [];
  return [[b,items[0][1],Math.max(items[0][2],items[1][2]),Math.min(items[0][3],items[1][3]),
   items[1][4],items[0][5]+items[1][5],b+TFMS['2h']-1]];
 });
}
async function getJSON(url){
 const response=await fetch(url,{headers:{Accept:'application/json','User-Agent':'RadarMME1-Multi-LAB/1.0'},
  signal:AbortSignal.timeout(13000)});
 const body=await response.text();
 if(!response.ok)throw Error('HTTP '+response.status);
 if(!body.trim())throw Error('HTTP '+response.status+' sem corpo');
 try{return JSON.parse(body);}catch{throw Error('JSON invalido');}
}
async function candles(cfg,tf){
 if(cfg.provider==='BINANCE_SPOT'){
   const u='https://data-api.binance.vision/api/v3/klines?'+new URLSearchParams({symbol:cfg.symbol,interval:tf,limit:'220'});
   return parseBinance(await getJSON(u),tf);
 }
 if(cfg.provider==='MEXC'){
   const map={'15m':'Min15','1h':'Min60','4h':'Hour4'};
   if(!map[tf])throw Error('TF MEXC invalido');
   return parseMexc(await getJSON('https://contract.mexc.com/api/v1/contract/kline/'+cfg.symbol+'?interval='+map[tf]),tf);
 }
 throw Error('FONTE_PENDENTE');
}
async function getQuote(cfg){
 try{
  if(cfg.provider==='BINANCE_SPOT'){
   const [b,t]=await Promise.all([
    getJSON('https://data-api.binance.vision/api/v3/ticker/bookTicker?symbol='+cfg.symbol),
    getJSON('https://data-api.binance.vision/api/v3/ticker/24hr?symbol='+cfg.symbol)]);
   return {bid:num(b.bidPrice),ask:num(b.askPrice),volume:num(t.quoteVolume)||0};
  }
  if(cfg.provider==='MEXC'){
    const t=await getJSON('https://contract.mexc.com/api/v1/contract/ticker?symbol='+cfg.symbol);
    if(t?.success!==true)throw Error('MEXC ticker invalido');
    const q=t.data||{};
    return {bid:num(q.bid1??q.bidPrice),ask:num(q.ask1??q.askPrice),
      volume:num(q.amount24??q.turnover24??q.holdVol)||0};
  }
 }catch(e){return {bid:NaN,ask:NaN,volume:0,error:String(e.message||e)};}
 return {bid:NaN,ask:NaN,volume:0,error:'FONTE_PENDENTE'};
}
function evaluateSignal(r,quote,now=Date.now()){
 const fresh=egiFreshness(r,'15m',now);
 const risk=egiRiskGate(r,0.13);
 const bookOK=quote?.bid>0&&quote?.ask>quote?.bid;
 const valid=!!(r&&bookOK&&['LONG','SHORT'].includes(r.state)&&r.parecerCode==='APROVADO'&&
   r.parecerScore>=97&&fresh.code==='ATUAL'&&risk.ok);
 return {eligible:valid,freshness:fresh.code,risk_ok:risk.ok,book_ok:bookOK};
}
function normalize(cfg,r,quote,contexts,btc){
 const gate=evaluateSignal(r,quote);
 return {id:cfg.id,symbol:cfg.symbol,source:cfg.provider+' '+cfg.symbol,group:cfg.group,name:cfg.name,
   price:r.price,close_time:r.signalCandleClose,state:r.state,label:r.label,
   fast:r.fast,slow:r.slow,iqe:r.iqe,quality:r.quality,relok:r.parecerScore,
   relok_status:r.parecerCode,stop:r.stopValid?r.stop:null,r1:r.stopValid?r.r1:null,r2:r.stopValid?r.r2:null,
   ...gate,eligible:gate.eligible,context:contexts,
   correlation_btc_1h:btc?correlate1h(contexts._bars1h,btc):{rho:null,pairs:0}};
}
async function analyzeAsset(cfg){
 if(cfg.provider==='PENDENTE')return {id:cfg.id,symbol:null,source:'PENDENTE',status:'FONTE_PENDENTE',
   readings:null,errors:['Fonte ainda nao validada']};
 const errors=[],series={};
 const tasks=['15m','1h','4h'];
 for(const tf of tasks)try{series[tf]=await candles(cfg,tf);}catch(e){errors.push(tf+': '+String(e.message||e));}
 if(series['1h'])series['2h']=synth2h(series['1h']);
 if(!series['15m'])return {id:cfg.id,symbol:cfg.symbol,source:cfg.provider+' '+cfg.symbol,
   status:'SEM_DADOS',readings:null,errors};
 const quote=await getQuote(cfg);
 if(quote.error)errors.push('ticker: '+quote.error);
 let r;
 try{r=analyze(cfg.symbol,quote.volume,series['15m'],0.35,1.5,quote.bid,quote.ask);}
 catch(e){errors.push('motor 15m: '+String(e.message||e));}
 if(!r)return {id:cfg.id,symbol:cfg.symbol,source:cfg.provider+' '+cfg.symbol,status:'SEM_ANALISE',
   readings:null,errors};
 const contexts={};
 for(const tf of ['1h','2h','4h'])try{
  const bars=series[tf];
  const ctx=bars?.length>=40?analyze(cfg.symbol,quote.volume,bars,0.35,1.5,quote.bid,quote.ask):null;
  contexts[tf]=ctx?{state:ctx.state,price:ctx.price,relok:ctx.parecerScore,close_time:ctx.signalCandleClose}:null;
 }catch(e){contexts[tf]=null;errors.push('context '+tf+': '+String(e.message||e));}
 const gate=evaluateSignal(r,quote);
 return {id:cfg.id,symbol:cfg.symbol,name:cfg.name,group:cfg.group,source:cfg.provider+' '+cfg.symbol,
   status:gate.freshness==='ATUAL'?'OK':'DEFASADO',errors,readings:{
    id:cfg.id,name:cfg.name,symbol:cfg.symbol,group:cfg.group,source:cfg.provider+' '+cfg.symbol,
    state:r.state,label:r.label,price:r.price,close_time:r.signalCandleClose,quality:r.quality,
    iqe:r.iqe,relok:r.parecerScore,relok_status:r.parecerCode,
    fast:r.fast,slow:r.slow,vol_ratio:Number.isFinite(r.volRatio)?r.volRatio:null,
    stop:r.stopValid?r.stop:null,r1:r.stopValid?r.r1:null,r2:r.stopValid?r.r2:null,
    context:contexts,...gate},
   _bars1h:series['1h']};
}
function planMessages(results,previous){
 const current={},msgs=[];
 for(const x of results){
  if(!x.readings)continue;
  const r=x.readings,id=x.id+':'+r.source+':'+r.state+':'+r.close_time;
  current[x.id]={state:r.state,close_time:r.close_time,source:r.source};
  const was=previous?.status?.[x.id];
  if(previous?.initialized && r.eligible && !(was&&was.state===r.state&&was.close_time===r.close_time)){
   if(!previous.events?.includes(id))msgs.push({id,text:
     'RadarMME1 MULTI LAB '+x.id+' '+r.state+' | '+r.source+' | 15m fechado '+new Date(r.close_time).toISOString()+
     ' | RelOk '+r.relok+' IQE '+r.iqe+' | stop '+r.stop+' | 1R '+r.r1+' | 2R '+r.r2+
     ' | estudo, nao e ordem.'});
  }
 }
 return {status:current,messages:msgs};
}
async function run(){
 const started=new Date().toISOString(),previous=read(STATE,{initialized:false,status:{},events:[]});
 const results=[];
 for(const cfg of CONFIG)results.push(await analyzeAsset(cfg));
 const btc=results.find(r=>r.id==='BTC');
 const btcBars=btc?btc._bars1h:null;
 for(const x of results)if(x.readings){
  const own=x._bars1h;
  x.readings.correlation_btc_1h=x.id==='BTC'?null:
    (own&&btcBars?correlate1h(own,btcBars):{rho:null,pairs:0});
 }
 const {status,messages}=planMessages(results,previous);
 const rows=results.map(({_bars1h,...x})=>x);
 const good=rows.filter(x=>x.readings?.freshness==='ATUAL'),eligible=rows.filter(x=>x.readings?.eligible);
 const snapshot={app:'RadarMME1 PONTE Multimercados LAB',version:'1.0-lab',generated_at_utc:started,
  status:good.length?'PARCIAL':'SEM_DADOS_VALIDOS',expected_assets:CONFIG.length,
  studied_assets:rows.filter(x=>x.readings).length,fresh_assets:good.length,
  candidates:eligible.length,watchlist:CONFIG,assets:rows,
  alerts_simulated:messages,
  warning:'Apenas observacao; instrumentos de corretoras diferentes nao sao equivalentes. Nao executa ordens e nao envia ntfy.'};
 save(OUTPUT,snapshot);
 save(STATE,{initialized:good.length>0,status:{...(previous.status||{}),...status},
  events:[...(previous.events||[]),...messages.map(m=>m.id)].slice(-500),updated_at_utc:started});
 console.log(JSON.stringify({status:snapshot.status,studied_assets:snapshot.studied_assets,
   fresh_assets:snapshot.fresh_assets,candidates:snapshot.candidates,
   alerts_simulated:messages.length,errors:rows.filter(x=>x.errors.length).map(x=>({asset:x.id,errors:x.errors.slice(0,3)}))},null,2));
 // Sem ntfy neste LAB. Exige revisao e estado persistente antes de ativacao.
 if(!good.length)process.exitCode=1;
}
if(require.main===module)run().catch(e=>{console.error(e);process.exitCode=1;});
module.exports={CONFIG,parseMexc,parseBinance,synth2h,evaluateSignal,planMessages};
