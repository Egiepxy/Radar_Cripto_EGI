'use strict';
const assert=require('node:assert/strict');
const {CONFIG,parseMexc,parseBinance,synth2h,evaluateSignal,planMessages}=require('./ponte-multimercados-lab.js');
assert.equal(CONFIG.length,8);
assert.equal(CONFIG.filter(x=>x.provider==='PENDENTE').length,2);
assert.equal(CONFIG.find(x=>x.id==='OIL').symbol,'UKOIL_USDT');
const now=Date.now(),dur=900000;
const start=(Math.floor(now/dur)-80)*dur;
const candles=Array.from({length:70},(_,i)=>[start+i*dur,100,102,99,101,10,start+(i+1)*dur-1]);
const mexc={success:true,data:{
 time:candles.map(x=>x[0]/1000),open:candles.map(x=>x[1]),
 high:candles.map(x=>x[2]),low:candles.map(x=>x[3]),
 close:candles.map(x=>x[4]),vol:candles.map(x=>x[5])
}};
const parsed=parseMexc(mexc,'15m',now);
assert.equal(parsed.length,70);
assert.equal(parsed[0][6],candles[0][6]);
assert.equal(parseBinance(candles,'15m',now).length,70);
assert.throws(()=>parseMexc({success:false},'15m',now),/formato/);
const future=structuredClone(mexc);future.data.time=Array.from({length:70},(_,i)=>(start+i*dur+5*dur)/1000);
assert.equal(parseMexc(future,'15m',now).filter(x=>x[6]<=now-1400).length>=40,true);
const oneHour=Array.from({length:70},(_,i)=>{
 const b=(Math.floor(now/3600000)-80+i)*3600000;
 return [b,100,102,99,101,4,b+3600000-1];
});
const twoHours=synth2h(oneHour,now);
assert.ok(twoHours.length>=30);
assert.ok(twoHours.every(x=>x[6]%7200000===7199999));
const broken=oneHour.filter((_,i)=>i!==20); // nao agregar pares de 1h incompletos
assert.equal(synth2h(broken,now).length,twoHours.length-1);
const signalTime=Math.floor(now/dur)*dur-1;
const signal={state:'LONG',parecerCode:'APROVADO',parecerScore:98,
 signalCandleClose:signalTime,stopValid:true,stopAtrMult:1.2,
 entry:100,stop:99,r1:101,r2:102};
const quote={bid:99.99,ask:100.01};
assert.equal(evaluateSignal(signal,quote,now).eligible,true);
assert.equal(evaluateSignal(signal,{bid:NaN,ask:NaN},now).eligible,false);
assert.equal(evaluateSignal({...signal,signalCandleClose:signalTime-2*dur},quote,now).eligible,false);
const item={id:'OIL',readings:{eligible:true,source:'MEXC UKOIL_USDT',state:'LONG',
 close_time:signalTime,relok:98,iqe:98,stop:99,r1:101,r2:102}};
assert.equal(planMessages([item],{initialized:false,status:{},events:[]}).messages.length,0);
const first=planMessages([item],{initialized:true,status:{},events:[]});
assert.equal(first.messages.length,1);
assert.equal(planMessages([item],{initialized:true,status:{OIL:{state:'LONG',close_time:signalTime}},events:[]}).messages.length,0);
assert.equal(planMessages([item],{initialized:true,status:{},events:[first.messages[0].id]}).messages.length,0);
console.log('✓ PONTE LAB: contratos, timeframes, 2h, candle fechado, bid/ask, risco e deduplicacao OK');
