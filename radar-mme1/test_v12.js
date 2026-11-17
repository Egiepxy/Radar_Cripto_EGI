'use strict';
const assert=require('node:assert/strict');
const {test,audit3,queueItem,classify,formatAlert}=require('./audit-v12');
test();
const t=()=>({direction:'LONG',stop:99,study3:{status:'ABERTA',target:103,checked_to:100,result_r:null}});
const bar=(h,l,end=900100)=>[101,100,h,l,100,1,end];
let x=t();audit3(x,[bar(104,100)],2000000);assert.equal(x.study3.result_r,3);
x=t();audit3(x,[bar(104,98)],2000000);assert.equal(x.study3.status,'INDETERMINADA');
x=t();audit3(x,[bar(104,100,1800100)],3000000);assert.equal(x.study3.gap,true);
x=t();audit3(x,[bar(104,100)],500000);assert.equal(x.study3.status,'ABERTA');
assert.equal(classify(queueItem('alerta antigo',100),100),'HISTORICO');
assert.equal(classify({msg:'x',created:100},900101),'HISTORICO');
assert.match(formatAlert('📡 RadarMME1 LONG • SOLUSDT 15m', [{id:'1',symbol:'SOLUSDT',status:'2R',result_r:2}]),/1\/1 gains/);
console.log('V1.2: testes adicionais OK');

const {blocked,load,save}=require('./robot');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
assert.equal(blocked(2),false);assert.equal(blocked(3),true);assert.equal(blocked(4),true);
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'egi-v12-'));
try{
 const p=path.join(dir,'state.json');
 const state={trades:Array.from({length:250},(_,id)=>({id})),stop_streak:3,notification_archive:[{msg:'old'}]};
 save(p,state);assert.deepEqual(load(p,{}),state);assert.equal(blocked(load(p,{}).stop_streak),true);
 fs.writeFileSync(p,'{');assert.throws(()=>load(p,{}));
}finally{fs.rmSync(dir,{recursive:true,force:true});}
console.log('Persistência e bloqueio OK');

const {stats3,riskAfterAudit}=require('./audit-v12');
const stop=exit_time=>({status:'STOP',exit_time});
const gain=exit_time=>({status:'2R',exit_time});
assert.deepEqual(riskAfterAudit(2,[stop(1)]),{streak:3,blocked:true});
assert.deepEqual(riskAfterAudit(2,[gain(2),stop(1)]),{streak:0,blocked:true});
assert.deepEqual(riskAfterAudit(0,[stop(3),gain(1),stop(2)]),{streak:2,blocked:false});
assert.equal(riskAfterAudit(3,[]).blocked,true);
assert.equal(riskAfterAudit(-1,[]).blocked,true);
assert.deepEqual(stats3([{id:'old',symbol:'SOL'},{id:'new',symbol:'SOL',study3:{status:'3R',result_r:3}}]).SOL,{tracked:1,untracked:1,hit3r:1,stops:0,open:0,unknown:0});
console.log('Gate intravarredura e cobertura 3R OK');
