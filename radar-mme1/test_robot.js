'use strict';
const assert=require('node:assert/strict');
const {ema,qualityScore,egiRiskGate,egiClosedIndex}=require('./engine-original.js');
const {eligible,evaluateTrade,isLeveraged}=require('./robot.js');
assert.equal(ema(Array.from({length:30},()=>10),9)[29],10);
assert.equal(ema(Array.from({length:30},()=>10),21)[29],10);
assert.equal(isLeveraged('BTCUP'),true);
assert.equal(isLeveraged('BTC'),false);
assert.equal(egiClosedIndex([[1,'1','1','1','1','5',Date.now()+999999]]),-1);
assert.equal(egiRiskGate({state:'LONG',stopValid:false,entry:100}).ok,false);
const trade={id:'X',symbol:'XUSDT',direction:'LONG',signal_close:100,checked_to:100,
   entry:100,stop:99,r1:101,r2:102,status:'ABERTA',hit1r:false,result_r:null};
let one=evaluateTrade({...trade},[[101,100,101.2,99.5,101,4,500]]);
assert.equal(one.trade.hit1r,true);assert.equal(one.trade.status,'ABERTA');
let ambiguous=evaluateTrade({...trade},[[101,100,103,98,101,4,500]]);
assert.equal(ambiguous.trade.status,'INDETERMINADA');
assert.equal(ambiguous.trade.result_r,null);
let stop=evaluateTrade({...trade},[[101,100,100.1,98.9,99,4,500]]);
assert.equal(stop.trade.status,'STOP');assert.equal(stop.trade.result_r,-1);
let target=evaluateTrade({...trade},[[101,100,102.5,99.5,102,4,500]]);
assert.equal(target.trade.status,'2R');assert.equal(target.trade.result_r,2);
assert.equal(eligible(null,true),false);
assert.equal(typeof qualityScore({longBias:true,slope9:1,slope21:1,sep:.5,dist9:.1,
 pullLong:true,rejLong:true,crossRecent:false,lateral:false,extended:false,deepRisk:false,stretchPct:1.5,shortBias:false,pullShort:false,rejShort:false}), 'number');
console.log('✓ RadarMME1: engine, candle fechado, bloqueios e auditoria virtual OK');
