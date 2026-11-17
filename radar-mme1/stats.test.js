'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {coinStats,freshClose}=require('./robot.js');
test('per coin, duplicate IDs and uncertain results',()=>{
 const a={id:'a',symbol:'ZECUSDT',status:'STOP',result_r:-1};
 const rows=[a,a,{id:'b',symbol:'ZECUSDT',status:'2R',result_r:2,hit1r:true},{id:'c',symbol:'ZECUSDT',status:'INDETERMINADA'},{id:'d',symbol:'BTCUSDT',status:'STOP',result_r:-1}];
 const s=coinStats(rows,'ZECUSDT');assert.equal(s.closed,2);assert.equal(s.win_pct,50);assert.equal(s.net_r,1);assert.equal(s.unknown,1);
 assert.equal(coinStats(rows,'SOLUSDT').win_pct,null);
});
test('closed candle freshness and stale alert regression',()=>{
 const now=Date.parse('2026-11-17T08:35:43Z');
 assert.equal(freshClose(Date.parse('2026-11-16T00:14:59.999Z'),now),false);
 assert.equal(freshClose(now-300000,now),true);
 assert.equal(freshClose(now+1,now),false);
 assert.equal(freshClose(null,now),false);
});
