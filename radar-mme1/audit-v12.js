'use strict';
const fs=require('node:fs');
const assert=require('node:assert/strict');
function stats(trades){
 const seen=new Set(), out={};
 for(const t of trades){
  if(!t.id||seen.has(t.id)||!t.symbol)continue;
  seen.add(t.id);
  const s=out[t.symbol]??={signals:0,gains:0,stops:0,open:0,unknown:0,hit1r:0,netR:0};
  s.signals++;
  if(t.hit1r===true)s.hit1r++;
  if(t.status==='2R'&&t.result_r===2){s.gains++;s.netR+=2;}
  else if(t.status==='STOP'&&t.result_r===-1){s.stops++;s.netR--;}
  else if(t.status==='ABERTA')s.open++;
  else s.unknown++;
 }
 for(const s of Object.values(out)){const n=s.gains+s.stops;s.winRate=n?s.gains/n*100:null;}
 return out;
}
function delivery(close,now,maxAge=900000){
 if(!Number.isFinite(close)||!Number.isFinite(now)||close>now)return 'SEM_HORARIO_VALIDO';
 return now-close>maxAge?'ATRASADO':'ATUAL';
}
function test(){
 const a={id:'1',symbol:'SOL',status:'2R',result_r:2,hit1r:true};
 const b={id:'2',symbol:'SOL',status:'STOP',result_r:-1,hit1r:true};
 assert.deepEqual(stats([a,a,b]).SOL,{signals:2,gains:1,stops:1,open:0,unknown:0,hit1r:2,netR:1,winRate:50});
 assert.equal(stats([{id:'3',symbol:'X',status:'2R',result_r:null}]).X.unknown,1);
 assert.equal(delivery(0,900001),'ATRASADO');
 assert.equal(delivery(0,900000),'ATUAL');
 assert.equal(delivery(null,1),'SEM_HORARIO_VALIDO');
 console.log('Autotestes V1.2 OK');
}
if(require.main===module){
 test();
 if(process.argv[2]){
 const state=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
 if(!Array.isArray(state.trades))throw Error('Estado inválido');
 console.log(JSON.stringify({scope:'Registros existentes; sem reauditoria OHLC',bySymbol:stats(state.trades),pending:(state.pending||[]).length,stopStreak:state.stop_streak,threeR:null},null,2));
 }
}
module.exports={stats,delivery,test};
