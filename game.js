/* LUMILASH: COLORSTORM — original neon-pastel survivor arcade.
 * Fixed-DT friendly gameplay and independently authored UI, art and music.
 * All kills, score, upgrades and unlocks are deterministic from authoritative state.
 */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const app=$('app'),canvas=$('arena'),ctx=canvas.getContext('2d',{alpha:false});
const overlay=$('gameOverlay'),burstBtn=$('burstButton');
const Audio=window.LumiAudio;
const clamp=(n,l,h)=>Math.max(l,Math.min(h,n));
const rand=(l,h)=>l+Math.random()*(h-l);
const pick=x=>x[(Math.random()*x.length)|0];
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const WORLD=[
 {name:'SUNBLOOM GARDEN',short:'SUNBLOOM',ground:'#defbf2',sky:'#a8f0e7',shadow:'#e2aee7',enemy:['#fc9cb6','#b2e8a1','#a69ceb','#ffd29a'],duration:102,bpm:118},
 {name:'CITRUS DAYDREAM',short:'CITRUS',ground:'#fff5d7',sky:'#aaf3e4',shadow:'#f7b874',enemy:['#ffb06f','#b9de89','#d8a9f6','#f5a6ba'],duration:112,bpm:126},
 {name:'SUGAR CLOUD PARADE',short:'SUGAR CLOUD',ground:'#faedff',sky:'#b4e7ff',shadow:'#efa4db',enemy:['#f8a4d5','#a6d4ff','#bdf1a0','#ffd094'],duration:124,bpm:132},
 {name:'PEACH SUNSET',short:'PEACH',ground:'#ffebdd',sky:'#fdc5b9',shadow:'#dca3e7',enemy:['#fba4a8','#fbc984','#b0d8fc','#b4e5a2'],duration:135,bpm:122},
 {name:'GALAXY CARNIVAL',short:'GALAXY',ground:'#dceafb',sky:'#a5c5f9',shadow:'#d5b3fa',enemy:['#a7bcfc','#feb0dc','#b4f4cf','#ffdb8f'],duration:145,bpm:144}
];
const ENEMY={
 jelly:{r:18,hp:24,spd:57,dmg:7,weight:1,exp:1},
 rush:{r:15,hp:22,spd:88,dmg:6,weight:1,exp:1},
 puff:{r:23,hp:47,spd:40,dmg:9,weight:2,exp:2},
 tank:{r:31,hp:126,spd:32,dmg:13,weight:4,exp:4},
 spitter:{r:21,hp:41,spd:40,dmg:7,weight:2,exp:2},
 splitter:{r:20,hp:52,spd:53,dmg:8,weight:2,exp:2},
 mini:{r:11,hp:17,spd:94,dmg:3,weight:1,exp:1},
 boss:{r:55,hp:580,spd:35,dmg:20,weight:15,exp:35}
};
const UPGRADE=[
 {id:'blade',icon:'✹',name:'PETAL RAMPAGE',sub:'Bigger, wider sweeping slashes',max:6},
 {id:'might',icon:'✧',name:'BRIGHTER STRIKES',sub:'More damage on every hit',max:6},
 {id:'tempo',icon:'⚡',name:'RHYTHM RUSH',sub:'Attack faster and faster',max:6},
 {id:'orbit',icon:'◈',name:'SATELLITE GARDEN',sub:'Add another rotating blade',max:5},
 {id:'spark',icon:'☀',name:'CHAIN REACTION',sub:'More frequent splash explosions',max:5},
 {id:'magnet',icon:'✺',name:'STAR MAGNET',sub:'Collect gems from farther away',max:4},
 {id:'speed',icon:'➤',name:'BREEZE BOOTS',sub:'Move quickly through the crowd',max:4},
 {id:'heal',icon:'♥',name:'HEARTBLOOM',sub:'Heal and gain extra hearts',max:4},
 {id:'burst',icon:'✦',name:'COLORSTORM PLUS',sub:'Stronger, larger Prism Burst',max:5},
 {id:'guard',icon:'⛨',name:'PETAL GUARD',sub:'Take less damage from monsters',max:4}
];
const KEY='lumilash-colorstorm-progress-v1';
function loadProgress(){try{
 const p=JSON.parse(localStorage.getItem(KEY)||'null')||{};
 return {unlocked:clamp(Number(p.unlocked)||1,1,5),selected:clamp(Number(p.selected)||0,0,4),
 wins:typeof p.wins==='object'&&p.wins?p.wins:{},best:typeof p.best==='object'&&p.best?p.best:{},
 total:Math.max(0,Number(p.total)||0),muted:!!p.muted};
}catch(e){return{unlocked:1,selected:0,wins:{},best:{},total:0,muted:false}}}
const profile=loadProgress();
const g={
 scene:'menu',world:0,time:0,duration:102,hp:100,maxHp:100,inv:0,x:0,y:0,rx:0,ry:0,level:1,xp:0,xpNeed:9,
 kills:0,killsStage:0,combo:0,bestCombo:0,lastKill:-100,score:0,bestBurst:0,burst:0,burstActive:0,burstCounter:0,flow:0,flowActive:0,flowProcs:0,
 enemies:[],microSwarm:[],microClock:0,swarmCount:0,swarmCleared:0,swarmHits:0,frontlineWave:0,frontSlashClock:0,frontSlashCount:0,frontAngle:-Math.PI/2,drops:[],projectiles:[],particles:[],arcs:[],rings:[],texts:[],boss:null,bossSpawned:false,
 upgrades:{},upgradeOptions:[],slashClock:.18,orbitClock:0,spawnClock:0,arenaClock:0,elapsed:0,
 spawnWave:0,missionTarget:20,missionDone:false,waveKills:0,waveIndex:0,won:false,shake:0,flash:0,
 viewW:960,viewH:600,dpr:1,camX:0,camY:0,joyX:0,joyY:0,keys:new Set(),pointer:null,movement:{x:0,y:0},
 fps:60,frameAvg:1/60,frameCount:0,gameSeconds:0,lastReal:0,pausedAt:0,stopped:false,
 checks:{}
};
let feedbackAt=0;
function save(){try{localStorage.setItem(KEY,JSON.stringify(profile))}catch(e){}}
function has(id){return g.upgrades[id]||0}
function stageName(){return WORLD[g.world].name}
function power(){return 24*(1+.23*has('might'))*(g.flowActive>0?1.2:1)}
function slashReach(){return (137+28*has('blade'))*(g.flowActive>0?1.22:1)}
function slashInterval(){return Math.max(.14,.53*Math.pow(.84,has('tempo'))*(g.flowActive>0?.68:1))}
function moveSpeed(){return 214*(1+.13*has('speed'))*(g.flowActive>0?1.13:1)}
function orbitCount(){return 2+has('orbit')}
function orbitRadius(){return 86+10*has('blade')}
function magnetRange(){return 172+65*has('magnet')}
function burstRadius(){return 345+65*has('burst')}
function comboFactor(){return 1+Math.min(3,Math.floor(g.combo/12)*.5)}
function stepMission(){return 16+g.world*8+g.waveIndex*11}
function uiToast(txt,x=g.viewW/2,y=g.viewH*.48,kind='good',giant=false){
 if(g.texts.length>15)g.texts.shift();
 g.texts.push({txt,x,y,life:.95,age:0,kind,giant});
}
function sfx(t,p=1){Audio?.sfx(t,p)}
function particle(x,y,color,num=7,intense=1){
 const n=Math.min(45,num);
 for(let i=0;i<n;i++){
  const a=rand(-Math.PI,Math.PI),v=rand(65,240)*intense;
  g.particles.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-25,age:0,life:rand(.24,.83),
    r:rand(1.8,6.7)*intense,color,shape:i%5,angle:rand(0,7)});
 }
 if(g.particles.length>450)g.particles.splice(0,g.particles.length-450);
}
function ring(x,y,r,color='#fff',life=.46,line=6){
 g.rings.push({x,y,r0:8,r,age:0,life,color,line});
 if(g.rings.length>22)g.rings.shift();
}
function heroHit(amount){
 if(g.inv>0||g.scene!=='play')return;
 const mitigated=Math.max(2,Math.round(amount*(1-has('guard')*.095)));
 g.hp=Math.max(0,g.hp-mitigated);g.inv=.78;g.shake=.42;g.flash=.19;g.flow=Math.max(0,g.flow-24);
 particle(g.x,g.y,'#ffaac2',18,1);
 sfx('hurt');uiToast('−'+mitigated+' ♥',g.viewW/2,g.viewH*.51,'bad');
 if(g.hp<=0)endRun(false);
}
function enemy(type,x,y){
 const p=ENEMY[type],boss=type==='boss',world=g.world;
 const hp=p.hp*(boss?(1+world*.32):1+world*.14)*(1+g.elapsed/g.duration*.22);
 const e={id:Math.random(),type,x,y,vx:0,vy:0,r:p.r,hp,maxHp:hp,dmg:p.dmg,
   speed:p.spd*(1+world*.08),color:WORLD[g.world].enemy[(Math.random()*4)|0],
   angle:rand(0,Math.PI*2),wiggle:rand(0,6.283),age:0,hurt:0,shoot:rand(1.2,3),
   orbitHit:-100,dashCooldown:rand(1,3),split:0,smile:Math.random()>.35,dead:false};
 return e;
}
function spawn(type=null,x=null,y=null){
 if(g.enemies.length>=210)return;
 const theta=rand(0,Math.PI*2),rad=rand(440,600);
 let kind=type;
 if(!kind){
  const r=Math.random();
  if(g.world>1&&r<.035)kind='tank';
  else if(g.world>0&&r<.09)kind='spitter';
  else if(g.world>1&&r<.15)kind='splitter';
  else if(r<.45)kind='rush';
  else if(r<.65)kind='puff';
  else kind='jelly';
 }
 g.enemies.push(enemy(kind,x??g.x+Math.cos(theta)*rad,y??g.y+Math.sin(theta)*rad));
}
// FRONTAL GLIMMER TSUNAMI: large, light-weight individual enemies advance from the TOP
// of the arena (the player's forward view). Thousands pass through each short zone.
// Mobile hard cap and aggregate hit accounting make five-digit kills tractable.
function spawnFrontline(dt){
 if(g.scene!=='play')return;
 g.microClock-=dt;
 if(g.microClock>0)return;
 const intensity=clamp(g.elapsed/g.duration,0,1);
 const pack=Math.min(82,Math.round(39+intensity*29+g.world*4));
 const cap=g.viewW<460?850:1280;
 for(let i=0;i<pack&&g.microSwarm.length<cap;i++){
  const row=i%5, width=Math.max(460,g.viewW*.86);
  const x=g.x+(Math.random()-.5)*width;
  const y=g.y-rand(255,520)-row*13;
  const kind=(Math.random()*5)|0;
  g.microSwarm.push({x,y,vx:rand(-17,17),vy:rand(82,135)+intensity*50+g.world*7,
   wob:rand(0,6.28),r:rand(4.3,7.4),kind,age:0});
  g.swarmCount++;
 }
 g.microClock=clamp(.14-intensity*.025-g.world*.007,.088,.14);
}
function hitMicro(x,y,radius,arcAngle=-Math.PI/2,arcWidth=2.6){
 if(!g.microSwarm.length)return 0;
 const r2=radius*radius;
 let killed=0,shards=0;
 for(let i=g.microSwarm.length-1;i>=0;i--){
  const m=g.microSwarm[i],dx=m.x-x,dy=m.y-y,dd=dx*dx+dy*dy;
  if(dd>r2)continue;
  const angle=Math.atan2(dy,dx);
  const diff=Math.atan2(Math.sin(angle-arcAngle),Math.cos(angle-arcAngle));
  if(Math.abs(diff)>arcWidth*.5&&dd>2600)continue;
  const last=g.microSwarm.length-1;
  g.microSwarm[i]=g.microSwarm[last];g.microSwarm.pop();
  killed++;g.swarmCleared++;g.kills++;g.killsStage++;g.waveKills++;
  const fast=g.elapsed-g.lastKill<2.6;
  g.combo=fast?Math.min(9999,g.combo+1):1;g.lastKill=g.elapsed;
  g.bestCombo=Math.max(g.bestCombo,g.combo);
  if(g.burstActive<=0)g.burst=clamp(g.burst+.25,0,100);
  if((++shards%18)===0)particle(m.x,m.y,['#ffc0de','#92ebf3','#fff0af','#d6bcff'][m.kind%4],3,.8);
 }
 if(killed){
  g.score+=Math.round(killed*(3+comboFactor()*1.4));
  // One burst of audio per sweep, not a voice for every tiny target.
  sfx('horde',Math.min(2,1+killed/90));
  if(g.waveKills>=g.missionTarget&&!g.missionDone){
   g.missionDone=true;g.score+=500+g.waveIndex*250;
   ring(g.x,g.y,230,'#ffe5a5',.55,9);
   uiToast('★ FRONTLINE CLEARED!',g.viewW*.5,g.viewH*.39,'gold',true);
  }
  if(g.swarmCleared>0&&g.swarmCleared%1000<killed){
   uiToast('✦ '+Math.floor(g.swarmCleared/1000)+'K FRONTLINE POPS! ✦',g.viewW*.5,g.viewH*.62,'gold',true);
   sfx('combo');
  }
  g.shake=Math.max(g.shake,.085);
 }
 return killed;
}
function sweepFrontline(){
 // Enormous, deliberately forward-facing sweeping strikes feel like mowing down rows.
 if(g.scene!=='play')return;
 const width=3.02+has('blade')*.08,reach=(252+has('blade')*27)*(g.flowActive>0?1.3:1);
 const a=-Math.PI/2 + Math.sin(g.elapsed*2.5)*.16;
 g.frontAngle=a;g.frontSlashCount++;
 g.arcs.push({x:g.x,y:g.y,angle:a,range:reach,width,age:0,life:.24,color:g.flowActive>0?'#ffec9b':'#b4edff'});
 if(g.arcs.length>16)g.arcs.shift();
 const hits=hitMicro(g.x,g.y,reach,a,width);
 if(hits>28&&hits%3===0)ring(g.x,g.y,reach*.54,'#ffe7fa',.21,4);
}
function updateMicroSwarm(dt){
 spawnFrontline(dt);
 let bumps=0;
 for(let i=g.microSwarm.length-1;i>=0;i--){
  const m=g.microSwarm[i];m.age+=dt;
  m.x+=(m.vx+Math.sin(m.wob+m.age*2.7)*10)*dt;
  m.y+=m.vy*dt;
  const d=Math.hypot(m.x-g.x,m.y-g.y);
  if(d<25){bumps++;m.y+=70*dt}
  if(m.y>g.y+Math.max(260,g.viewH*.62)||Math.abs(m.x-g.x)>g.viewW*.9+280){
   g.microSwarm[i]=g.microSwarm[g.microSwarm.length-1];g.microSwarm.pop();
  }
 }
 g.swarmHits+=bumps;
 if(bumps>16&&g.inv<=0)heroHit(3+Math.min(7,Math.floor(bumps/20)));
 g.frontSlashClock-=dt;
 if(g.frontSlashClock<=0){
  sweepFrontline();
  g.frontSlashClock+=Math.max(.115,.235*Math.pow(.91,has('tempo'))*(g.flowActive>0?.65:1));
 }
}
function initializeCrowd(n=35){
 for(let i=0;i<n;i++){
  const a=rand(0,Math.PI*2),r=rand(180,590);
  spawn(null,g.x+Math.cos(a)*r,g.y+Math.sin(a)*r);
 }
}
function popBoss(){
 if(g.bossSpawned)return;
 g.bossSpawned=true;
 const theta=rand(0,6.283),r=410;
 const e=enemy('boss',g.x+Math.cos(theta)*r,g.y+Math.sin(theta)*r);
 g.boss=e;g.enemies.push(e);
 uiToast('✦ THE BIG SPARK ARRIVES! ✦',g.viewW*.5,g.viewH*.35,'bad',true);
 g.shake=.7;g.flash=.3;sfx('boss');
}
function splash(x,y,r,damage,chain=false){
 ring(x,y,r,'#fff6c0',.33,5);particle(x,y,'#ffe5a0',19,1.25);
 for(let i=g.enemies.length-1;i>=0;i--){
  const e=g.enemies[i];if(dist(e,{x,y})<r+e.r)harm(e,damage,chain);
 }
}
function harm(e,damage,chain=false){
 if(!e||e.dead)return;
 e.hp-=damage;e.hurt=.15;
 if(e.hp<=0)kill(e,chain);
}
function kill(e,chain=false){
 if(!e||e.dead)return;
 e.dead=true;
 const index=g.enemies.indexOf(e);
 if(index>=0)g.enemies.splice(index,1);
 if(e===g.boss){
  g.boss=null;
  uiToast('★ BIG SPARK DEFEATED!',g.viewW/2,g.viewH*.37,'gold',true);
  particle(e.x,e.y,'#ffed9c',85,2);ring(e.x,e.y,310,'#fff4c2',.75,15);
  g.score+=4000;sfx('win');
 }else{
  g.kills++;g.killsStage++;g.waveKills++;
  const fast=g.elapsed-g.lastKill<2.6;
  g.combo=fast?Math.min(250,g.combo+1):1;
  g.bestCombo=Math.max(g.bestCombo,g.combo);
  g.lastKill=g.elapsed;
  g.score+=Math.floor((ENEMY[e.type]?.weight||1)*10*comboFactor());
  // Burst kills cannot immediately refill the meter; the player must build another streak.
  if(g.burstActive<=0)g.burst=clamp(g.burst+(e.type==='tank'?7:3.2)*(1+has('burst')*.09),0,100);
  g.burstCounter++;
  if(g.burstActive<=0&&(g.combo===10||g.combo===25||g.combo===50||g.combo===100)){
   uiToast('✦ '+g.combo+' POP RUSH! ✦',g.viewW*.5,g.viewH*.33,'gold',true);
   sfx('combo');g.shake=.36;
  }
  if(has('heal')>0&&g.kills%Math.max(6,16-has('heal')*2)===0)
   g.hp=Math.min(g.maxHp,g.hp+1+Math.floor(has('heal')/2));
  if(!chain&&g.kills%Math.max(12,18-has('spark')*3)===0){
   splash(e.x,e.y,110+has('spark')*18,30+has('spark')*16,true);
   g.shake=Math.max(g.shake,.18);uiToast('CHAIN POP!',g.viewW*.5,g.viewH*.38,'good');
  }
 }
 const amount=e.type==='boss'?12:e.type==='tank'?4:Math.random()<.70?1:0;
 if(amount){
  for(let i=0;i<amount;i++)g.drops.push({x:e.x+rand(-17,17),y:e.y+rand(-17,17),v:ENEMY[e.type]?.exp||1,
    age:0,spin:rand(0,6),color:i%2?'#c2a5fb':'#7bd9ee'});
 }
 const col=e.type==='boss'?'#fff1a6':e.color;
 particle(e.x,e.y,col,e.type==='boss'?40:Math.min(10,5+Math.floor(g.combo/10)),e.type==='boss'?2:1);
 if(e.type!=='boss'&&g.kills%3===0)sfx('kill',1+Math.min(.15,g.combo*.004));
 if(g.drops.length>360)g.drops.splice(0,g.drops.length-360);
 if(g.waveKills>=g.missionTarget&&!g.missionDone){
  g.missionDone=true;g.score+=500+g.waveIndex*250;
  ring(g.x,g.y,260,'#ffda9b',.65,12);
  if(g.burstActive<=0)uiToast('★ BLOOM GOAL COMPLETE!',g.viewW*.5,g.viewH*.46,'gold',true);
  sfx('combo');
 }
}
function attack(){
 if(g.scene!=='play')return;
 let target=null,best=Infinity;
 for(const e of g.enemies){
  const d=Math.hypot(e.x-g.x,e.y-g.y);
  if(d<best){best=d;target=e}
 }
 const radius=slashReach(),direction=target?Math.atan2(target.y-g.y,target.x-g.x):g.orbitClock;
 const arcWidth=2.25+has('blade')*.13+(g.flowActive>0?.92:0);
 const strength=power();
 g.arcs.push({x:g.x,y:g.y,angle:direction,range:radius,width:arcWidth,
   age:0,life:.28,color:g.combo>20?'#ffd374':'#ffffff'});
 if(g.arcs.length>16)g.arcs.shift();
 let hits=0;
 for(const e of [...g.enemies]){
  const dx=e.x-g.x,dy=e.y-g.y,d=Math.hypot(dx,dy);
  if(d>radius+e.r)continue;
  const theta=Math.atan2(dy,dx);
  const diff=Math.atan2(Math.sin(theta-direction),Math.cos(theta-direction));
  if(Math.abs(diff)<arcWidth*.5||d<60){
   harm(e,strength);hits++;
  }
 }
 if(hits){g.shake=Math.max(g.shake,g.flowActive>0?.12:.08);sfx('slash',1+Math.min(hits/15,1))}
}
function orbitDamage(dt){
 const count=orbitCount(),r=orbitRadius();
 if(!g.enemies.length)return;
 const t=g.elapsed*2.8;
 for(let i=0;i<count;i++){
  const a=t+i*6.28318/count;
  const x=g.x+Math.cos(a)*r,y=g.y+Math.sin(a)*r;
  for(const e of [...g.enemies]){
   if(e.orbitHit>g.elapsed-.25)continue;
   const dx=e.x-x,dy=e.y-y;
   if(dx*dx+dy*dy<(e.r+14)*(e.r+14)){
    e.orbitHit=g.elapsed;harm(e,11*(1+has('might')*.18));break;
   }
  }
 }
}
function prismBurst(){
 if(g.scene!=='play'||g.burst<100)return false;
 g.burst=0;g.burstActive=.76;g.flash=.68;g.shake=1.2;
 const radius=burstRadius();
 ring(g.x,g.y,radius,'#fff8b0',.85,22);
 ring(g.x,g.y,radius*.75,'#f8c2ff',.6,12);
 particle(g.x,g.y,'#fff8d9',90,2.3);
 uiToast('✦ PRISM COLORSTORM! ✦',g.viewW*.5,g.viewH*.30,'gold',true);
 let killed=0;
 for(const e of [...g.enemies]){
  if(dist(e,g)<radius+e.r){
   const before=e.dead;
   harm(e,e.type==='boss'?260+has('burst')*90:190+has('burst')*95,true);
   if(!before&&e.dead)killed++;
  }
 }
 killed+=hitMicro(g.x,g.y,radius,0,6.28);
 g.bestBurst=Math.max(g.bestBurst,killed);
 if(killed>=10)uiToast(''+killed+' MONSTERS POPPED!',g.viewW*.5,g.viewH*.67,'good',true);
 g.score+=killed*25;sfx('burst');
 if(navigator.vibrate)try{navigator.vibrate([25,30,42])}catch(e){}
 return true;
}
function updateBoss(dt){
 if(g.boss||g.bossSpawned)return;
 if(g.elapsed>=g.duration*.66)popBoss();
}
function updateEnemies(dt){
 for(const e of [...g.enemies]){
  if(e.dead)continue;
  e.age+=dt;e.hurt=Math.max(0,e.hurt-dt);e.dashCooldown-=dt;
  const dx=g.x-e.x,dy=g.y-e.y,dd=Math.hypot(dx,dy)||1;
  let sp=e.speed*(e.type==='rush'?1+.15*Math.sin(e.age*4):1);
  if(e.type==='spitter'&&dd<215)sp=-sp*.65;
  if(e.type==='tank')sp*=1+.08*Math.cos(e.age*2);
  if(e.type==='rush'&&e.dashCooldown<=0){
   sp*=2.3;e.dashCooldown=rand(1.8,3.0);
   ring(e.x,e.y,48,'#f9b0cb',.3,2);
  }
  if(e.type==='splitter')sp*=1+.25*Math.sin(e.age*5);
  e.x+=(dx/dd*sp+Math.sin(e.wiggle+e.age*3)*4)*dt;
  e.y+=(dy/dd*sp+Math.cos(e.wiggle+e.age*2)*4)*dt;
  e.shoot-=dt;
  if((e.type==='spitter'||e.type==='boss')&&e.shoot<=0){
   if(dd<650){
    const count=e.type==='boss'?8:1;
    for(let i=0;i<count;i++){
     const a=e.type==='boss'?i*6.283/count+e.age*.4:Math.atan2(dy,dx);
     g.projectiles.push({x:e.x,y:e.y,vx:Math.cos(a)*(e.type==='boss'?145:170),
       vy:Math.sin(a)*(e.type==='boss'?145:170),r:e.type==='boss'?9:7,
       age:0,life:3.6,color:e.color,dmg:e.type==='boss'?11:6});
    }
   }
   e.shoot=e.type==='boss'?2.3:rand(2.5,3.8);
  }
  if(dd<e.r+19)heroHit(e.dmg);
  if(dd>1050&&e.type!=='boss')e.dead=true;
 }
 g.enemies=g.enemies.filter(e=>!e.dead);
 if(g.projectiles.length>120)g.projectiles.splice(0,g.projectiles.length-120);
 for(let i=g.projectiles.length-1;i>=0;i--){
  const p=g.projectiles[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.age+=dt;
  if(p.age>p.life){g.projectiles.splice(i,1);continue}
  if(dist(p,g)<p.r+17){heroHit(p.dmg);g.projectiles.splice(i,1)}
 }
}
function updateDrops(dt){
 const mag=magnetRange();
 for(let i=g.drops.length-1;i>=0;i--){
  const o=g.drops[i];o.age+=dt;const dx=g.x-o.x,dy=g.y-o.y,d=Math.hypot(dx,dy);
  if(d<mag){
   const strength=clamp((mag-d)/mag,0,1);
   const speed=270+strength*600;
   if(d>1){o.x+=dx/d*speed*dt;o.y+=dy/d*speed*dt}
  }
  if(d<25){
   g.xp+=o.v;g.score+=o.v*3;g.drops.splice(i,1);
   if(g.xp>=g.xpNeed&&g.scene==='play'){levelUp();return}
  }else if(o.age>25)g.drops.splice(i,1);
 }
}
function levelUp(){
 g.xp-=g.xpNeed;g.level++;g.xpNeed=Math.round(6+g.level*3.2);
 g.upgradeOptions=UPGRADE.filter(x=>(g.upgrades[x.id]||0)<x.max)
  .sort(()=>Math.random()-.5).slice(0,3);
 if(!g.upgradeOptions.length){g.maxHp+=6;g.hp=Math.min(g.maxHp,g.hp+12);return}
 g.scene='upgrade';app.dataset.scene='upgrade';Audio?.stop();window.PALCrazy?.gameStop();
 sfx('upgrade');
 overlay.innerHTML='<section class="glassPanel" aria-label="Choose upgrade"><div class="logoMark">✦ LEVEL '+g.level+' UNLOCKED</div>'+
 '<h2 class="panelHeading">POWER UP!</h2><p class="panelSub">Pick one power to make the colors fly harder.</p>'+
 '<div class="cardGrid">'+g.upgradeOptions.map((u,i)=>'<button class="upgradeCard" data-action="upgrade" data-index="'+i+'">'+
 '<span class="key">PRESS '+(i+1)+'</span><span class="symbol">'+u.icon+'</span><strong>'+u.name+'</strong><small>'+u.sub+'</small></button>').join('')+
 '</div><p class="menuStats">MORE SPARKS. BIGGER SMASHES.</p></section>';
 overlay.classList.remove('hidden');ui();
}
function chooseUpgrade(index){
 if(g.scene!=='upgrade')return false;
 const up=g.upgradeOptions[index];if(!up)return false;
 g.upgrades[up.id]=(g.upgrades[up.id]||0)+1;
 if(up.id==='heal'){g.maxHp+=18;g.hp=Math.min(g.maxHp,g.hp+30)}
 if(up.id==='guard')g.hp=Math.min(g.maxHp,g.hp+8);
 g.scene='play';app.dataset.scene='play';overlay.classList.add('hidden');
 uiToast('✦ '+up.name+'! ✦',g.viewW/2,g.viewH*.33,'good',true);
 Audio?.start(g.world);window.PALCrazy?.gameStart();sfx('upgrade');ui();return true;
}
function startZone(world=profile.selected){
 g.world=clamp(world,0,profile.unlocked-1);
 profile.selected=g.world;save();
 g.scene='play';g.x=0;g.y=0;g.rx=0;g.ry=0;g.hp=100;g.maxHp=100;g.inv=0;
 g.duration=WORLD[g.world].duration;g.time=g.duration;g.elapsed=0;g.gameSeconds=0;g.lastKill=-100;
 g.kills=0;g.killsStage=0;g.score=0;g.combo=0;g.bestCombo=0;g.bestBurst=0;g.burst=0;g.flow=0;g.flowActive=0;g.flowProcs=0;
 g.level=1;g.xp=0;g.xpNeed=9;g.upgrades={};g.slashClock=.15;g.orbitClock=0;
 g.spawnClock=.1;g.arenaClock=0;g.waveIndex=0;g.waveKills=0;g.missionTarget=stepMission();
 g.missionDone=false;g.boss=null;g.bossSpawned=false;g.burstActive=0;g.shake=0;g.flash=0;
 g.enemies=[];g.microSwarm=[];g.microClock=0;g.swarmCount=0;g.swarmCleared=0;g.swarmHits=0;g.frontlineWave=0;g.frontSlashClock=.09;g.frontSlashCount=0;g.drops=[];g.projectiles=[];g.particles=[];g.rings=[];g.arcs=[];g.texts=[];
 g.won=false;g.pointer=null;g.movement={x:0,y:0};g.fps=60;g.frameAvg=1/60;
 initializeCrowd(26+g.world*7);
 overlay.classList.add('hidden');app.dataset.scene='play';
 Audio?.start(g.world,true);window.PALCrazy?.gameStart();ui();
 uiToast('✦ LET THE COLORS FLY!',g.viewW/2,g.viewH*.34,'good',true);
 return true;
}
function endRun(won){
 if(g.scene!=='play')return;
 g.scene='result';app.dataset.scene='result';g.won=won;Audio?.stop();window.PALCrazy?.gameStop();
 if(won){sfx('win');profile.wins[g.world]=Math.max(profile.wins[g.world]||0,1);
   if(profile.unlocked===g.world+1&&profile.unlocked<5)profile.unlocked++;
 }
 const score=g.score,prior=profile.best[g.world]||0;profile.best[g.world]=Math.max(prior,score);
 profile.total+=g.kills;save();
 let stars=won?g.hp>65&&g.kills>g.missionTarget*2?3:g.hp>25?2:1:0;
 const title=won?'COLORSTORM CONQUERED!':'THE COLORSTORM CONTINUES!';
 const next=won&&g.world+1<profile.unlocked;
 overlay.innerHTML='<section class="glassPanel" aria-label="Run results">'+
 '<div class="logoMark">ZONE '+(g.world+1)+' OF 5 · '+WORLD[g.world].name+'</div>'+
 '<h2 class="panelHeading">'+title+'</h2><div class="resultStars">'+('★'.repeat(stars)+'☆'.repeat(3-stars))+'</div>'+
 '<div class="resultScore">'+score.toLocaleString()+'</div><div class="panelSub">COLOR POINTS</div>'+
 '<div class="resultGrid"><div><small>MONSTERS</small><strong>'+g.kills+'</strong></div>'+
 '<div><small>BEST COMBO</small><strong>'+g.bestCombo+'</strong></div>'+
 '<div><small>BIGGEST BURST</small><strong>'+g.bestBurst+'</strong></div></div>'+
 '<div class="panelSub">'+(won?'New zone unlocked! Keep the rainbow rolling.':'Choose a new build, circle the crowd, and try again!')+'</div>'+
 '<div class="panelFooter"><button class="btnPrimary" data-action="'+(next?'nextzone':'retry')+'">'+(next?'▶ NEXT ZONE':'↻ PLAY AGAIN')+'</button>'+
 '<button class="btnSecondary" data-action="menu">ZONE MAP</button></div></section>';
 overlay.classList.remove('hidden');
}
function pause(){
 if(g.scene!=='play')return;
 g.scene='paused';app.dataset.scene='paused';Audio?.stop();window.PALCrazy?.gameStop();
 overlay.innerHTML='<section class="glassPanel" aria-label="Game paused">'+
 '<div class="logoMark">TAKE A LITTLE REST</div><h2 class="panelHeading">PAUSED ✦</h2>'+
 '<p class="panelSub">Your sparkle is right where you left it.</p>'+
 '<div class="stageArt" aria-hidden="true"><div class="miniHero">✦</div><div class="orb orb1">✺</div><div class="orb orb2">✿</div></div>'+
 '<div class="panelFooter"><button class="btnPrimary" data-action="resume">▶ KEEP POPPING</button>'+
 '<button class="btnSecondary" data-action="menu">ZONE MAP</button></div></section>';
 overlay.classList.remove('hidden');
}
function resume(){
 if(g.scene!=='paused')return;
 g.scene='play';app.dataset.scene='play';overlay.classList.add('hidden');
 Audio?.start(g.world);window.PALCrazy?.gameStart();
}
function help(){
 overlay.innerHTML='<section class="glassPanel" aria-label="How to play">'+
 '<div class="logoMark">HOW TO PLAY</div><h2 class="panelHeading">SMASH A RAINBOW!</h2>'+
 '<div class="hintRows"><b>① MOVE</b> with WASD / arrow keys. On touch, drag anywhere to steer.<br>'+
 '<b>② ATTACKS ARE AUTOMATIC</b> — run toward crowds and your petal blades sweep them away.<br>'+
 '<b>③ COLLECT SPARK GEMS</b> to gain levels and choose one of three powerful upgrades.<br>'+
 '<b>④ PRISM BURST</b> — press Space or tap the glowing burst button when charged to clear huge swarms.<br>'+
 '<b>⑤ SURVIVE</b> the timer and defeat the large boss sparkle to unlock the next colorful world.</div>'+
 '<div class="panelFooter"><button class="btnPrimary" data-action="play">▶ LET’S PLAY!</button>'+
 '<button class="btnSecondary" data-action="menu">BACK</button></div></section>';
 overlay.classList.remove('hidden');app.dataset.scene='menu';
}
const baseMenu=overlay.innerHTML;
function renderMenu(){
 g.scene='menu';app.dataset.scene='menu';Audio?.stop();window.PALCrazy?.gameStop();
 overlay.innerHTML=baseMenu;overlay.classList.remove('hidden');
 $('menuZone').textContent=String(profile.selected+1).padStart(2,'0')+' / '+WORLD[profile.selected].name;
 $('zoneCount').textContent=(profile.selected+1)+' OF 5 ZONES';
 $('prevZone').disabled=profile.selected<=0;$('nextZone').disabled=profile.selected>=profile.unlocked-1;
 const totalWins=Object.values(profile.wins).filter(Boolean).length;
 $('menuStats').textContent='BEST '+Math.max(0,...Object.values(profile.best))+' · ZONES CLEARED '+totalWins+'/5';
}
function action(which,index=0){
 Audio?.unlock();sfx('click');
 if(which==='play'){startZone();return}
 if(which==='help'){help();return}
 if(which==='menu'){renderMenu();return}
 if(which==='pause'){pause();return}
 if(which==='resume'){resume();return}
 if(which==='prev'){profile.selected=Math.max(0,profile.selected-1);save();renderMenu();return}
 if(which==='next'){profile.selected=Math.min(profile.unlocked-1,profile.selected+1);save();renderMenu();return}
 if(which==='retry'){startZone(g.world);return}
 if(which==='nextzone'){startZone(Math.min(profile.unlocked-1,g.world+1));return}
 if(which==='upgrade'){chooseUpgrade(index);return}
}
overlay.addEventListener('click',e=>{
 const btn=e.target.closest('button[data-action]');
 if(btn&&!btn.disabled){e.preventDefault();action(btn.dataset.action,Number(btn.dataset.index)||0)}
});
$('pauseBtn').addEventListener('click',()=>pause());
$('muteBtn').addEventListener('click',()=>{
 profile.muted=!profile.muted;save();Audio?.setMuted(profile.muted);
 $('muteBtn').textContent=profile.muted?'♩':'♫';
});
burstBtn.addEventListener('click',e=>{e.preventDefault();Audio?.unlock();prismBurst()});
const stick=$('virtualStick');let pointerId=null;
function setStick(e){
 if(!g.pointer)return;
 const dx=e.clientX-g.pointer.startX,dy=e.clientY-g.pointer.startY;
 const n=Math.hypot(dx,dy),r=clamp(n,0,68),angle=Math.atan2(dy,dx);
 g.movement.x=n>5?Math.cos(angle)*Math.min(1,n/45):0;
 g.movement.y=n>5?Math.sin(angle)*Math.min(1,n/45):0;
 const knob=stick.querySelector('.stickKnob');
 knob.style.transform='translate('+Math.cos(angle)*r*.64+'px,'+Math.sin(angle)*r*.64+'px)';
}
canvas.addEventListener('pointerdown',e=>{
 if(g.scene!=='play'||pointerId!==null)return;
 e.preventDefault();Audio?.unlock();
 pointerId=e.pointerId;g.pointer={startX:e.clientX,startY:e.clientY};
 stick.hidden=false;stick.style.left=e.clientX+'px';stick.style.top=e.clientY+'px';
 setStick(e);try{canvas.setPointerCapture(e.pointerId)}catch(err){}
});
canvas.addEventListener('pointermove',e=>{
 if(g.scene==='play'&&pointerId===e.pointerId){e.preventDefault();setStick(e)}
});
function releasePointer(e){
 if(pointerId!==e.pointerId)return;
 pointerId=null;g.pointer=null;g.movement.x=0;g.movement.y=0;stick.hidden=true;
}
canvas.addEventListener('pointerup',releasePointer);
canvas.addEventListener('pointercancel',releasePointer);
window.addEventListener('blur',()=>{pointerId=null;g.pointer=null;g.movement.x=0;g.movement.y=0;stick.hidden=true;if(g.scene==='play')pause()});
window.addEventListener('keydown',e=>{
 const code=e.code;
 if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(code))e.preventDefault();
 g.keys.add(code);
 if(g.scene==='play'&&code==='Space'){Audio?.unlock();prismBurst()}
 else if(g.scene==='play'&&(code==='Escape'||code==='KeyP'))pause();
 else if(g.scene==='paused'&&(code==='Space'||code==='Escape'||code==='KeyP'||code==='Enter'))resume();
 else if(g.scene==='menu'&&(code==='Enter'||code==='Space'))startZone();
 else if(g.scene==='upgrade'&&['Digit1','Digit2','Digit3','Numpad1','Numpad2','Numpad3'].includes(code))
  chooseUpgrade(Number(code.slice(-1))-1);
});
window.addEventListener('keyup',e=>g.keys.delete(e.code));
function movement(dt){
 let x=g.movement.x,y=g.movement.y;
 if(g.keys.has('KeyW')||g.keys.has('ArrowUp'))y-=1;
 if(g.keys.has('KeyS')||g.keys.has('ArrowDown'))y+=1;
 if(g.keys.has('KeyA')||g.keys.has('ArrowLeft'))x-=1;
 if(g.keys.has('KeyD')||g.keys.has('ArrowRight'))x+=1;
 const mag=Math.hypot(x,y),speed=moveSpeed();
 if(mag>0.09){g.x+=x/Math.max(1,mag)*speed*dt;g.y+=y/Math.max(1,mag)*speed*dt;
  g.rx=x/Math.max(1,mag);g.ry=y/Math.max(1,mag);
 }
}
function updateFlow(dt){
 // Moving tactically earns a timed power spike; idle auto-play never earns it.
 if(g.flowActive>0){g.flowActive=Math.max(0,g.flowActive-dt);return}
 const moving=Math.hypot(g.movement.x,g.movement.y)>.3||
 ['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].some(k=>g.keys.has(k));
 if(!moving){g.flow=Math.max(0,g.flow-dt*3.5);return}
 g.flow=Math.min(100,g.flow+dt*(11+Math.min(9,g.combo*.11)));
 if(g.flow>=100){
  g.flow=0;g.flowActive=4.7;g.flowProcs++;
  g.shake=Math.max(g.shake,.28);
  ring(g.x,g.y,225,'#d8a7ff',.6,10);
  particle(g.x,g.y,'#f6dcff',32,1.35);
  uiToast('✦ FLOW RUSH! ✦',g.viewW*.5,g.viewH*.28,'gold',true);
  sfx('flow');
 }
}
function updateEffects(dt){
 for(let i=g.particles.length-1;i>=0;i--){
  const p=g.particles[i];p.age+=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=Math.pow(.18,dt);p.vy*=Math.pow(.26,dt);
  if(p.age>p.life)g.particles.splice(i,1);
 }
 for(let i=g.rings.length-1;i>=0;i--){g.rings[i].age+=dt;if(g.rings[i].age>g.rings[i].life)g.rings.splice(i,1)}
 for(let i=g.arcs.length-1;i>=0;i--){g.arcs[i].age+=dt;if(g.arcs[i].age>g.arcs[i].life)g.arcs.splice(i,1)}
 for(let i=g.texts.length-1;i>=0;i--){g.texts[i].age+=dt;if(g.texts[i].age>g.texts[i].life)g.texts.splice(i,1)}
 g.shake=Math.max(0,g.shake-dt*2.1);g.flash=Math.max(0,g.flash-dt*1.55);
 g.inv=Math.max(0,g.inv-dt);g.burstActive=Math.max(0,g.burstActive-dt);
}
function tick(dt){
 if(g.scene!=='play')return;
 dt=clamp(dt,0,.055);
 g.elapsed+=dt;g.time=Math.max(0,g.duration-g.elapsed);g.gameSeconds+=dt;
 movement(dt);updateFlow(dt);
 g.slashClock-=dt;if(g.slashClock<=0){attack();g.slashClock+=slashInterval()}
 updateMicroSwarm(dt);
 orbitDamage(dt);
 g.spawnClock-=dt;
 if(g.spawnClock<=0){
  const intensity=g.elapsed/g.duration,pack=Math.min(8,3+Math.floor(intensity*3)+Math.floor(g.world/2));
  for(let i=0;i<pack;i++)spawn();
  g.spawnClock=clamp(.73-intensity*.28-g.world*.035,.29,.75);
 }
 updateBoss(dt);updateEnemies(dt);updateDrops(dt);updateEffects(dt);
 if((g.frameCount++ % 12)===0)Audio?.setActivity?.({
  combo:g.combo,enemies:g.enemies.length+g.microSwarm.length,boss:!!g.boss,
  progress:g.elapsed/g.duration,flow:g.flowActive>0,burstReady:g.burst>=100
 });
 g.arenaClock+=dt;
 if(g.arenaClock>=4.6){g.arenaClock-=4.6;g.waveIndex++;
   if(g.missionDone){g.waveKills=0;g.missionDone=false;g.missionTarget=stepMission()}
 }
 if(g.hp<=0){endRun(false);return}
 if(g.elapsed>=g.duration&&!g.boss)endRun(true);
}
let lastUI=0;
function ui(force=false){
 const now=performance.now();if(!force&&now-lastUI<90)return;lastUI=now;
 $('stageBadge').textContent='ZONE '+String(g.world+1).padStart(2,'0');
 $('zoneName').textContent=WORLD[g.world].name;
 $('healthText').textContent=Math.ceil(g.hp)+'/'+g.maxHp;
 $('healthFill').style.width=clamp(g.hp/g.maxHp*100,0,100)+'%';
 $('xpFill').style.width=clamp(g.xp/g.xpNeed*100,0,100)+'%';
 $('levelText').textContent=g.level;
 $('clockText').textContent=String(Math.floor(g.time/60)).padStart(2,'0')+':'+String(Math.ceil(g.time)%60).padStart(2,'0');
 $('killText').textContent=String(g.kills).padStart(4,'0');
 $('comboText').textContent='x'+Math.min(99,1+Math.floor(g.combo/12)*.5).toFixed(1);
 $('bossWarning').hidden=!g.boss;
 if(g.boss)$('bossFill').style.width=clamp(g.boss.hp/g.boss.maxHp*100,0,100)+'%';
 $('waveBanner').textContent=g.boss?'✦ BEAT THE BIG SPARK!':g.flowActive>0?'✦ FLOW RUSH — EXTRA FAST PETAL SLASHES!':g.elapsed<7?(window.matchMedia('(pointer:coarse)').matches?'✦ DRAG ANYWHERE TO MOVE — AUTO ATTACK!':'✦ WASD / ARROWS TO MOVE — AUTO ATTACK!'):'✦ FRONTLINE SWARM — CUT THROUGH THE RAINBOW!';
 const flowChip=document.querySelector('.modeChip');flowChip.classList.toggle('flowReady',g.flowActive>0);flowChip.style.setProperty('--flow',g.flowActive>0?'100%':Math.floor(g.flow)+'%');
 $('weaponName').textContent=g.flowActive>0?'✦ FLOW RUSH!':'PETAL FLOW '+Math.floor(g.flow)+'%';$('weaponLevel').textContent='LV.'+(1+has('blade')+has('orbit'));
 $('missionText').textContent=g.missionDone?'★ BLOOM CHALLENGE COMPLETE':'POP '+g.missionTarget+' GLIMMERS';
 $('missionFill').style.width=clamp(g.waveKills/g.missionTarget*100,0,100)+'%';
 $('levelChip').textContent='✦ '+g.xp+' / '+g.xpNeed;
 const charge=Math.floor(g.burst);
 $('burstCharge').textContent=charge>=100?'READY!':charge+'%';
 burstBtn.classList.toggle('ready',charge>=100);
 burstBtn.setAttribute('aria-disabled',String(charge<100));
}
function resize(){
 const b=canvas.getBoundingClientRect();
 g.viewW=Math.max(300,b.width);g.viewH=Math.max(320,b.height);
 g.dpr=Math.min(2,window.devicePixelRatio||1);
 canvas.width=Math.round(g.viewW*g.dpr);canvas.height=Math.round(g.viewH*g.dpr);
}
window.addEventListener('resize',resize,{passive:true});
const core={g,WORLD,ENEMY,UPGRADE,profile,ctx,canvas,rand,clamp,dist,pick,power,orbitCount,orbitRadius,
 slashReach,slashInterval,magnetRange,burstRadius,uiToast,particle,ring,sfx,attack,spawn,kill,harm,
 tick,prismBurst,renderMenu,startZone,chooseUpgrade,levelUp,endRun,pause,resume,ui,resize,action,
 readProgress:()=>JSON.parse(JSON.stringify(profile))};
window.LumiCore=core;
let last=0;
function frame(now){
 const dt=last?Math.min(.055,(now-last)/1000):1/60;last=now;
 g.frameAvg=g.frameAvg*.95+dt*.05;g.fps=Math.round(1/Math.max(.001,g.frameAvg));
 tick(dt);ui();
 if(window.LumiRender)window.LumiRender.draw(now);
 requestAnimationFrame(frame);
}
if(new URLSearchParams(location.search).get('qa')==='1'){
 window.LumiQA={
  snapshot:()=>({scene:g.scene,world:g.world,player:{x:g.x,y:g.y},time:g.time,hp:g.hp,maxHp:g.maxHp,kills:g.kills,score:g.score,
   combo:g.combo,bestCombo:g.bestCombo,burst:g.burst,bestBurst:g.bestBurst,enemyCount:g.enemies.length,microCount:g.microSwarm.length,microSpawned:g.swarmCount,microCleared:g.swarmCleared,frontSlashCount:g.frontSlashCount,
   drops:g.drops.length,particles:g.particles.length,arcs:g.arcs.length,level:g.level,xp:g.xp,
   unlocked:profile.unlocked,bossAlive:!!g.boss,bossSpawned:g.bossSpawned,upgradeOptions:g.upgradeOptions.map(x=>x.id),
   fps:g.fps,frameCount:g.frameCount,flow:Math.round(g.flow),flowActive:g.flowActive,flowProcs:g.flowProcs,progress:core.readProgress()}),
  start:(n=0)=>{profile.unlocked=Math.max(profile.unlocked,n+1);startZone(n)},
  spawn:(count=30,type='jelly',radius=150)=>{
   for(let i=0;i<count;i++){const a=i*Math.PI*2/count,r=radius+(i%5)*7;spawn(type,g.x+Math.cos(a)*r,g.y+Math.sin(a)*r)}},
  tick:(sec=1)=>{for(let t=0;t<sec;t+=.033)tick(.033)},
  setCharge:(n=100)=>{g.burst=n;ui(true)},
  burst:()=>prismBurst(),
  upgrade:()=>levelUp(),
  choose:(i)=>chooseUpgrade(i),
  killAll:()=>{for(const e of [...g.enemies])harm(e,9999,true);hitMicro(g.x,g.y,99999,0,6.29);ui(true)},
  spawnBoss:()=>popBoss(),
  win:()=>{g.elapsed=g.duration;g.bossSpawned=true;g.boss=null;endRun(true)},
  lose:()=>endRun(false),
  reset:()=>{profile.unlocked=1;profile.selected=0;profile.wins={};profile.best={};profile.total=0;save();renderMenu()},
  audio:()=>Audio?.status(),
  setWorld:(i)=>{profile.unlocked=5;startZone(i)},
  getEnemy:(i=0)=>g.enemies[i]?{...g.enemies[i]}:null,
  move:(x,y)=>{g.movement.x=x;g.movement.y=y},
  spawnFrontline:(count=350)=>{
   const k=Math.max(1,Math.min(count,1000));
   for(let i=0;i<k;i++)g.microSwarm.push({x:g.x+rand(-240,240),y:g.y-rand(40,315),vx:0,vy:rand(65,110),wob:rand(0,6.28),r:6,kind:i%5,age:0});
   g.swarmCount+=k;
  },
  frontlineHit:()=>hitMicro(g.x,g.y,380,-Math.PI/2,2.95),
  verify:()=>({renderInstalled:!!window.LumiRender,haveAudio:!!Audio,version:'1.0-colorstorm'})
 };
}
Audio?.setMuted(profile.muted);
$('muteBtn').textContent=profile.muted?'♩':'♫';
resize();renderMenu();requestAnimationFrame(frame);
})();