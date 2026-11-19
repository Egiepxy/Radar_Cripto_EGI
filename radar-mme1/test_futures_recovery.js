'use strict';
const assert=require('node:assert/strict');
const {api}=require('./futures-robot');
const pause=async()=>{};
const response=(status,body)=>({status,text:async()=>body});
(async()=>{
 let calls=0;
 const result=await api('/fapi/v1/exchangeInfo',{},async()=>++calls<3?response(202,''):response(200,'{"symbols":[{"symbol":"BTCUSDT"}]}'),pause);
 assert.equal(calls,3);assert.equal(result.symbols[0].symbol,'BTCUSDT');
 for(const status of [451,403,418,429]){
 calls=0;await assert.rejects(api('/fapi/v1/exchangeInfo',{},async()=>{calls++;return response(status,'');},pause),new RegExp(String(status)));assert.equal(calls,1);
 }
 await assert.rejects(api('/fapi/v1/exchangeInfo',{},async()=>response(200,'{}'),pause));
 await assert.rejects(api('/fapi/v1/klines',{},async()=>response(202,''),pause));
 console.log('Recovery tests OK');
})().catch(e=>{console.error(e);process.exitCode=1;});
