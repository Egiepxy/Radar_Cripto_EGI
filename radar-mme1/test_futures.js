'use strict';
const assert=require('node:assert/strict');
const {WATCH,TF,pearson,correlate1h,eligible,evaluateStudy,marketMetadata}=require('./futures-robot.js');
// Regressao: exchangeInfo 202/vazio nao deve interromper a coleta dos candles.
const parcial=marketMetadata([
  {status:'rejected',reason:new Error('Resposta vazia HTTP 202')},
  {status:'fulfilled',value:[{symbol:'BTCUSDT',bidPrice:'100',askPrice:'101'}]},
  {status:'rejected',reason:new Error('HTTP 451')}
]);
assert.equal(parcial.info,null);
assert.equal(parcial.book24.length,1);
assert.equal(parcial.volume24.length,0);
assert.equal(parcial.errors.length,2);
assert.match(parcial.errors[0].error,/202/);
const completo=marketMetadata([
  {status:'fulfilled',value:{symbols:[{symbol:'BTCUSDT',status:'TRADING'}]}},
  {status:'fulfilled',value:[]},
  {status:'fulfilled',value:[]}
]);
assert.equal(completo.errors.length,0);
assert.equal(completo.info.symbols[0].symbol,'BTCUSDT');
assert.equal(WATCH.length,8);
assert.equal(WATCH.filter(x=>x.group==='ACOES').length,5);
assert.deepEqual(TF,['15m','1h','2h','4h']);
assert.equal(Math.round(pearson([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20],
  [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20])),1);
assert.equal(pearson([1,2,3],[2,3,4]),null);
const start=(Math.floor(Date.now()/3600000)-40)*3600000;
const make=(factor)=>Array.from({length:35},(_,i)=>{
  const price=100+factor*i*i*.01;
  return [start+i*3600000,price,price+2,price-2,price,1,start+(i+1)*3600000-1];
});
assert.ok(Math.abs(correlate1h(make(1),make(1)).rho-1)<1e-12);
const close=(Math.floor(Date.now()/900000)*900000)-1;
const good={state:'LONG',parecerCode:'APROVADO',parecerScore:98,
  signalCandleClose:close,stopValid:true,stopAtrMult:1.2,
  entry:100,stop:99,r1:101,r2:102};
assert.equal(eligible(good,true),true);
assert.equal(eligible({...good,parecerScore:96},true),false);
assert.equal(eligible(good,false),false);
const t={symbol:'TESTUSDT',direction:'LONG',entry:100,stop:99,r1:101,r2:102,
  signal_close:1,checked_to:1,status:'ABERTA',hit1r:false,result_r:null};
const bar=(h,l)=>[100,100,h,l,100,1,Date.now()-5000];
const amb={...t};evaluateStudy(amb,[bar(103,98)]);assert.equal(amb.status,'INDETERMINADA');assert.equal(amb.result_r,null);
const stop={...t};evaluateStudy(stop,[bar(100.5,98.5)]);assert.equal(stop.status,'STOP');assert.equal(stop.result_r,-1);
const target={...t};evaluateStudy(target,[bar(102.5,99.5)]);assert.equal(target.status,'2R');assert.equal(target.result_r,2);
console.log('✓ RadarMME1 Futures: símbolos, correlação, candle, risco e auditoria virtual OK');
