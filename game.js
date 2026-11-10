/* LUMILASH SKY RAID v7 — true tenfold enemy population / single straight cannon.
 * The cannon NEVER shoots without pointer-down or a held fire key.
 * A visible enemy is counted as defeated ONLY when a player-fired shot or manually
 * activated special hits it. This is a ground-up remake of the prior auto-survivor.
 */
(()=>{'use strict';
const $=s=>document.getElementById(s),canvas=$('arena'),ctx=canvas.getContext('2d',{alpha:false});
const Audio=window.LumiAudio||null,TAU=Math.PI*2;
const min=Math.min,max=Math.max,abs=Math.abs,rand=(a,b)=>a+Math.random()*(b-a),clamp=(v,a,b)=>max(a,min(b,v));
const COLORS=['#3b253e','#542633','#292a42','#394632','#502c3e','#313d42'];
const ACCENTS=['#fc4a5f','#ff7451','#d461ef','#a9e04e','#ed5f8e','#58d9c7'];
const WAVES=['COASTLINE PATROL','FOREST SQUADRON','RIVER CROSSING','MOUNTAIN ASSAULT','FINAL SKY RAID'];
const UPGRADES=[
 {id:'power',icon:'◆',name:'CANNON POWER',text:'More impact damage on the same straight line.',max:8},
 {id:'rate',icon:'⚡',name:'RAPID TRIGGER',text:'Fire one straight projectile faster.',max:8},
 {id:'pierce',icon:'➤',name:'PENETRATION',text:'The single shot pierces deeper into formations.',max:8},
 {id:'blast',icon:'✹',name:'CHAIN REACTION',text:'Shots trigger wider group detonations.',max:7},
 {id:'focus',icon:'◎',name:'WIDER SHOT',text:'Thicken the same straight firing lane.',max:6},
 {id:'beam',icon:'✦',name:'AIR RAID',text:'Charge the optional manual special faster.',max:4},
 {id:'wall',icon:'♥',name:'REPAIR',text:'Recover the airfield.',max:4}
];
const KEY='lumilash-frontline-v4-progress';
function readSave(){try{const d=JSON.parse(localStorage.getItem(KEY)||'null')||{};return {best:d.best||0,maxKO:d.maxKO||0,runs:d.runs||0,muted:!!d.muted}}catch(e){return{best:0,maxKO:0,runs:0,muted:false}}}
const save=readSave();
function persist(){try{localStorage.setItem(KEY,JSON.stringify(save))}catch(e){}}
const g={
 scene:'menu',W:960,H:600,dpr:1,shipX:480,shipY:520,aimX:480,aimY:160,keys:new Set(),pointer:null,fireKey:false,fireDelay:0,
 elapsed:0,duration:210,wave:1,base:100,baseMax:100,fireMode:0,kills:0,score:0,combo:0,bestCombo:0,lastKO:-99,charge:0,specials:0,shotCount:0,hitCount:0,
 level:1,nextUpgrade:450,upgrades:{},upgradeChoices:[],enemyPool:[],bullets:[],particles:[],rings:[],texts:[],beams:[],boss:null,bossesDefeated:0,
 spawnTimer:0,spawned:0,leaked:0,spawnSeed:0,formation:0,firstSwarm:true,totalFront:0,shake:0,flash:0,freeze:0,superFlash:0,now:0,fps:60,frameDt:1/60,frameCount:0,musicTime:0,renderedEnemies:0,sceneReason:''
};
function snd(kind,v=1){Audio?.sfx(kind,v)}
function owned(up){return g.upgrades[up]||0}
function scoreSave(){save.best=max(save.best,g.score);save.maxKO=max(save.maxKO,g.kills);save.runs++;persist()}
function dimension(){const b=canvas.getBoundingClientRect(),oldW=g.W;g.W=max(290,b.width);g.H=max(420,b.height);g.dpr=min(2,window.devicePixelRatio||1);canvas.width=Math.round(g.W*g.dpr);canvas.height=Math.round(g.H*g.dpr);g.shipY=g.H-87;if(oldW>0){g.shipX=clamp(g.shipX/oldW*g.W,27,g.W-27)}else g.shipX=g.W/2;g.aimX=clamp(g.aimX,10,g.W-10);g.aimY=clamp(g.aimY,110,g.shipY-45)}
function choose3(){const options=UPGRADES.filter(u=>owned(u.id)<u.max);return options.sort(()=>Math.random()-.5).slice(0,3)}
function panel(content){$('overlay').innerHTML='<section class="panel">'+content+'</section>';$('overlay').classList.remove('hidden')}
function menu(){
 g.scene='menu';$('app').dataset.scene='menu';window.PALCrazy?.gameStop();Audio?.stop();
 panel('<div class="eyelabel">CLASSIC VERTICAL ARCADE SHOOTER</div><h1>LUMILASH<span>CLASSIC SKY RAID</span></h1>'+
 '<p>FLY YOUR FIGHTER OVER GREEN VALLEYS AND RIVERS.<br><b>HOLD TO FIRE. DODGE THE RAID. DEFEND THE AIRFIELD.</b></p>'+
 '<div class="featureStrip"><span>HOLD TO SHOOT</span><span>STRAIGHT CANNON</span><span>10X SWARMS</span><span>AUTO POWER-UPS</span></div>'+
 '<p class="instruction">MOUSE / TOUCH: hold and drag left or right to shoot & steer<br>KEYBOARD: A/D to move · SPACE to shoot · Q super</p>'+
 '<div class="panelFooter"><button class="btnMain" data-action="start">▶ START SHOOTING</button><button class="btnAlt" data-action="help">CONTROLS</button></div>'+
 '<p class="instruction">PERSONAL BEST '+save.best.toLocaleString()+' · MOST KOs '+save.maxKO.toLocaleString()+'</p>');
 hud(true);
}
function help(){panel('<div class="eyelabel">HOW TO PLAY</div><h2>AIM AND DESTROY</h2>'+
 '<p><b>1.</b> Hold your finger or mouse button and slide left/right: your fighter fires while held.<br><b>2.</b> On keyboard use A/D and hold Space to shoot.<br><b>3.</b> Your cannon always shoots one straight stream; upgrades improve speed, impact and penetration.<br><b>4.</b> Upgrade weapons automatically as you score actual hits. No upgrade popups.<br><b>5.</b> Press Q or tap the glowing special button when fully charged. Protect the airfield from waves and bosses. Pause only by holding the pause button for 0.7 seconds (or Esc/P).</p>'+
 '<div class="panelFooter"><button class="btnMain" data-action="start">▶ START SHOOTING</button><button class="btnAlt" data-action="menu">BACK</button></div>')}
function reset(){
 g.scene='play';g.elapsed=0;g.wave=1;g.base=100;g.fireMode=0;g.kills=0;g.score=0;g.combo=0;g.bestCombo=0;g.lastKO=-99;g.charge=0;g.specials=0;g.shotCount=0;g.hitCount=0;
 g.level=1;g.nextUpgrade=450;g.upgrades={};g.upgradeChoices=[];g.enemyPool=[];g.bullets=[];g.particles=[];g.rings=[];g.texts=[];g.beams=[];g.boss=null;g.bossesDefeated=0;g.spawnTimer=.03;g.spawned=0;g.leaked=0;g.spawnSeed=0;g.formation=0;g.firstSwarm=true;g.totalFront=0;g.shake=0;g.flash=0;g.freeze=0;g.superFlash=0;g.musicTime=0;
 g.shipX=g.W*.5;g.shipY=g.H-87;g.aimX=g.W*.5;g.aimY=g.H*.3;g.pointer=null;g.fireKey=false;g.fireDelay=0;g.keys.clear();
 $('overlay').classList.add('hidden');$('app').dataset.scene='play';Audio?.start(0,true);window.PALCrazy?.gameStart();hud(true);toast('HOLD TO FIRE — DEFEND THE AIRFIELD!',g.W/2,g.H*.4,'#fff4bf',1.3);
}
function setScene(scene){g.scene=scene;$('app').dataset.scene=scene}
function pause(){if(g.scene!=='play')return;setScene('paused');window.PALCrazy?.gameStop();Audio?.stop();g.pointer=null;g.fireKey=false;panel('<div class="eyelabel">TAKE AIM</div><h2>PAUSED</h2><p>The swarm is frozen. Your score is safe.</p><div class="panelFooter"><button data-action="resume" class="btnMain">▶ CONTINUE</button><button data-action="menu" class="btnAlt">MAIN MENU</button></div>')}
function resume(){if(g.scene!=='paused')return;setScene('play');$('overlay').classList.add('hidden');Audio?.start(min(4,g.wave-1));window.PALCrazy?.gameStart()}
function finish(victory){
 if(g.scene!=='play')return;
 setScene('result');g.pointer=null;g.fireKey=false;window.PALCrazy?.gameStop();Audio?.stop();scoreSave();if(victory)snd('win');else snd('hurt');
 panel('<div class="eyelabel">FRONTLINE REPORT</div><h2>'+(victory?'SKY RAID CLEARED!':'AIRFIELD LOST!')+'</h2>'+
 '<div class="scoreBig">'+g.score.toLocaleString()+'</div><p>COLOR POINTS</p>'+
 '<div class="resultGrid"><div>ACTUAL KOs<strong>'+g.kills.toLocaleString()+'</strong></div><div>BEST COMBO<strong>'+g.bestCombo.toLocaleString()+'</strong></div><div>BOSSES<strong>'+g.bossesDefeated+'/3</strong></div></div>'+
 '<p>'+(victory?'Five waves stopped. Master tougher weapon builds to beat your record.':'Steer into open lanes, hold fire to clear the enemy planes, and use AIR RAID when a dense formation approaches.')+'</p>'+
 '<div class="panelFooter"><button data-action="start" class="btnMain">↻ TRY AGAIN</button><button data-action="menu" class="btnAlt">MAIN MENU</button></div>');
}
function levelUp(){
  // Never stop the action to show an upgrade modal.
  g.level++;
  const sequence=['power','rate','pierce','blast','focus','rate','power','pierce','blast','beam','wall','power','pierce','rate'];
  const wanted=sequence[(g.level-2)%sequence.length];
  let u=UPGRADES.find(x=>x.id===wanted&&owned(x.id)<x.max);
  if(!u)u=UPGRADES.find(x=>owned(x.id)<x.max);
  if(u){
    g.upgrades[u.id]=(g.upgrades[u.id]||0)+1;
    if(u.id==='wall')g.base=min(g.baseMax,g.base+14);
    toast('✦ POWER UP — '+u.name+'!',g.W*.5,g.H*.33,'#ffe09a',1.15);
    snd('upgrade');
  }
  g.base=min(g.baseMax,g.base+4);
  g.nextUpgrade+=Math.round(520+g.level*240);
}
function selectUpgrade(i){
 if(g.scene!=='upgrade')return;const u=g.upgradeChoices[i];if(!u)return;
 g.upgrades[u.id]=(g.upgrades[u.id]||0)+1;
 if(u.id==='wall')g.base=min(g.baseMax,g.base+24);
 g.nextUpgrade+=Math.round(580+g.level*260);
 setScene('play');$('overlay').classList.add('hidden');Audio?.start(min(4,g.wave-1));window.PALCrazy?.gameStart();snd('upgrade');toast('✦ '+u.name+'!',g.W*.5,g.H*.4,'#d6f7ff',.9);
}
const addPart=(x,y,vx,vy,color,r=3,life=.55)=>{if(g.particles.length<330)g.particles.push({x,y,vx,vy,color,r,life,age:0})};
function blastRing(x,y,r,c){g.rings.push({x,y,r,age:0,life:.40,color:c});if(g.rings.length>35)g.rings.shift()}
function toast(str,x,y,color='#fff',life=.65){if(g.texts.length>16)g.texts.shift();g.texts.push({str,x,y,color,life,age:0})}
function summonBoss(){
 if(g.boss||g.scene!=='play')return;
 const hp=115+g.wave*33;
 g.boss={x:g.W/2,y:-95,w:135+g.wave*12,hp,maxHp:hp,vy:18,alive:true,phase:rand(0,TAU)};
 toast('⚠ ENEMY ACE BOMBER!',g.W/2,g.H*.25,'#fff5a1',1.6);
 snd('boss');g.shake=8;
}
// Actual enemies, 10x V6 (previous cap 550 phone / 930 desktop).
// Start with an authentic visible screenful; subsequent troops enter from TOP.
const SWARM_MOBILE_CAP=5500,SWARM_DESKTOP_CAP=9300;
function enemyCap(){return g.W<480?SWARM_MOBILE_CAP:SWARM_DESKTOP_CAP}
function spawnGroup(){
 const w=g.W,cap=enemyCap();
 if(g.enemyPool.length>=cap)return;
 const first=g.firstSwarm;g.firstSwarm=false;
 const target=first?cap:Math.min(560,cap-g.enemyPool.length);
 const number=Math.min(target,cap-g.enemyPool.length);
 const lanes=w<480?30:Math.floor(w/13);
 for(let i=0;i<number;i++){
  const lane=(i*17+g.spawnSeed*23)%lanes;
  const x=clamp((lane+.25+Math.random()*.5)*(w/lanes),6,w-6);
  // First formation blankets the *visible playfield*; later waves fly from above.
  const y=first?rand(76,g.shipY-82):rand(-135,65);
  const xref=Math.random();
  const type=xref<.065&&g.wave>1?'armor':xref<.2?'volatile':xref<.29&&g.wave>2?'zig':'glimmer';
  const leading=(i%31===0);
  const e={
   x,y,r:leading?rand(7.7,10.4):rand(2.7,4.3),
   hp:type==='armor'?2+g.wave:1,maxHp:type==='armor'?2+g.wave:1,
   type,vy:rand(66,99)+g.wave*5,
   age:rand(0,6.3),sway:rand(0,TAU),variant:i%COLORS.length,
   dead:false
  };
  e.color=COLORS[e.variant];
  g.enemyPool.push(e);g.spawned++;
 }
 g.spawnSeed++;
}
function leak(n=1){g.leaked+=n;g.combo=0;const threshold=2600+owned('wall')*520;if(g.leaked%threshold< n){g.base=max(0,g.base-1);g.flash=.13;g.shake=3;snd('hurt')}}
function breakEnemy(e,big=false,fromBlast=false){
 if(e.dead)return;
 e.dead=true;g.kills++;g.score+=Math.floor((e.type==='armor'?11:2)*(1+Math.min(8,g.combo/70)));
 g.combo=g.elapsed-g.lastKO<1.8?g.combo+1:1;g.lastKO=g.elapsed;g.bestCombo=max(g.bestCombo,g.combo);
 g.charge=clamp(g.charge+(e.type==='armor'?.18:.016)*(1+owned('beam')*.2),0,100);
 if(g.kills%80===0){toast('+'+g.combo+' COMBO!',g.W*.5,g.H*.43,'#ffecae',.48);snd('combo')}
 if(g.kills>0&&g.kills%1000===0){toast('✦ '+(g.kills/1000)+'K TRUE KOs! ✦',g.W*.5,g.H*.35,'#ffe49d',1.1);g.shake=8}
 if((big&&g.kills%16===0)||g.kills%39===0){for(let j=0;j<2;j++)addPart(e.x,e.y,rand(-130,130),rand(-140,130),ACCENTS[(j+g.kills)%ACCENTS.length],rand(2,4),rand(.2,.36))}
 if(g.kills%70===0)snd('horde',1.2);
 if(e.type==='volatile'&&!fromBlast&&g.kills%7===0)explode(e.x,e.y,28+owned('blast')*7,1+owned('power'),2);
}
const GRID=28;
const enemyGrid=new Map();
let gridEpoch=0;
const key=(ix,iy)=>ix+iy*2048;
function rebuildEnemyGrid(){
 gridEpoch++;
 for(const e of g.enemyPool){
  if(e.dead)continue;
  const k=key(Math.floor(e.x/GRID),Math.floor(e.y/GRID));
  let bucket=enemyGrid.get(k);
  if(!bucket){bucket={epoch:gridEpoch,entities:[]};enemyGrid.set(k,bucket)}
  if(bucket.epoch!==gridEpoch){bucket.epoch=gridEpoch;bucket.entities.length=0}
  bucket.entities.push(e);
 }
}
function nearby(x1,y1,x2,y2,pad,cb){
 const minX=Math.floor((min(x1,x2)-pad)/GRID),maxX=Math.floor((max(x1,x2)+pad)/GRID);
 const minY=Math.floor((min(y1,y2)-pad)/GRID),maxY=Math.floor((max(y1,y2)+pad)/GRID);
 for(let gx=minX;gx<=maxX;gx++)for(let gy=minY;gy<=maxY;gy++){
  const bucket=enemyGrid.get(key(gx,gy));
  if(!bucket||bucket.epoch!==gridEpoch)continue;
  for(const e of bucket.entities){
   if(!e.dead&&cb(e)===false)return;
  }
 }
}
function explode(x,y,r,damage,depth=0){
 if(g.rings.length<20)blastRing(x,y,r,depth?'#ffb75f':'#ff7058');
 for(let i=0;i<4;i++)addPart(x,y,rand(-170,170),rand(-155,145),ACCENTS[i%ACCENTS.length],rand(2,4),rand(.18,.43));
 if(depth>3)return 0;
 let hits=0;
 nearby(x,y,x,y,r+18,e=>{
  const dx=e.x-x,dy=e.y-y;
  if(dx*dx+dy*dy<=(r+e.r)*(r+e.r)){
   e.hp-=damage;
   if(e.hp<=0){breakEnemy(e,depth<2,true);hits++}
  }
 });
 return hits;
}
function chooseMode(){ /* Single fixed straight-ahead shot; no spread modes. */ }
function shoot(){
 if(g.scene!=='play')return;
 const pierce=48+owned('pierce')*18;
 const damage=1+Math.floor(owned('power')*.55);
 const radius=6.5+owned('focus')*1.65;
 g.bullets.push({x:g.shipX,y:g.shipY-36,vx:0,vy:-1120,
  r:radius,damage,pierce,age:0,life:1.55,
  color:'#fff0b8',seen:new Set(),explosive:owned('blast')});
 if(g.bullets.length>115)g.bullets.splice(0,g.bullets.length-115);
 g.shotCount++;g.fireDelay=Math.max(.047,.072*Math.pow(.9,owned('rate')));
 if(g.shotCount%4===0)addPart(g.shipX,g.shipY-37,0,-95,'#ffe3a3',3,.12);
 snd('cannon');g.shake=max(g.shake,.45);
}
function special(){
 if(g.scene!=='play'||g.charge<100)return false;
 g.charge=0;g.specials++;g.superFlash=.65;g.shake=12;
 const width=(100+owned('beam')*30)*(g.W<490?.82:1),cx=g.shipX;
 g.beams.push({x:cx,w:width,age:0,life:.52});
 let hits=0;
 for(const e of g.enemyPool){
  if(e.dead)continue;
  if(abs(e.x-cx)<width*.5+e.r){e.hp=0;e.type=e.type==='volatile'?'glimmer':e.type;breakEnemy(e,true);hits++}
 }
 if(g.boss&&abs(g.boss.x-cx)<width*.75){g.boss.hp-=110+owned('beam')*45;bossCheck()}
 toast('✦ AIR RAID! '+hits+' KOs!',g.W*.5,g.H*.33,'#fff4b2',1.1);
 snd('burst');if(navigator.vibrate)try{navigator.vibrate([25,30,50])}catch(e){}
 return true;
}
function bossCheck(){
 if(!g.boss||g.boss.hp>0)return;
 const b=g.boss;g.boss=null;g.bossesDefeated++;g.base=min(g.baseMax,g.base+12);
 g.score+=3000;snd('win');toast('★ ACE BOMBER DOWN! ★',g.W*.5,g.H*.34,'#ffe1a2',1.25);
 explode(b.x,b.y,125,3,3);g.shake=13;g.superFlash=.6;
}
function collisionShots(dt){
 rebuildEnemyGrid();
 for(let i=g.bullets.length-1;i>=0;i--){
  const b=g.bullets[i],ox=b.x,oy=b.y;
  b.x+=b.vx*dt;b.y+=b.vy*dt;b.age+=dt;
  if(b.x<-25||b.x>g.W+25||b.y<-45||b.age>b.life||b.pierce<=0){
   g.bullets[i]=g.bullets[g.bullets.length-1];g.bullets.pop();continue
  }
  if(g.boss){
   const boss=g.boss,dx=b.x-boss.x,dy=b.y-boss.y;
   if(abs(dx)<boss.w*.5+6&&abs(dy)<48){
    boss.hp-=b.damage*6.5;b.pierce=0;g.hitCount++;bossCheck();continue
   }
  }
  const ddx=b.x-ox,ddy=b.y-oy,dd=ddx*ddx+ddy*ddy;
  nearby(ox,oy,b.x,b.y,b.r+19,e=>{
   if(b.seen.has(e))return;
   const proj=dd?clamp(((e.x-ox)*ddx+(e.y-oy)*ddy)/dd,0,1):0;
   const dx=e.x-(ox+proj*ddx),dy=e.y-(oy+proj*ddy),r=e.r+b.r;
   if(dx*dx+dy*dy>r*r)return;
   b.seen.add(e);e.hp-=b.damage;b.pierce--;g.hitCount++;
   if(e.hp<=0)breakEnemy(e);
   // Shot-triggered blast can mow down a full formation; no idle kills.
   explode(e.x,e.y,20+b.explosive*8,b.damage,1);
   if(b.pierce<=0)return false;
  });
 }
 if(g.bullets.length>135)g.bullets.splice(0,g.bullets.length-135);
}
function tick(dt){
 if(g.scene!=='play')return;
 dt=clamp(dt,0,.045);if(dt<=0)return;
 g.elapsed+=dt;
 const previousWave=g.wave;g.wave=min(5,1+Math.floor(g.elapsed/42));
 if(g.wave!==previousWave){Audio?.start(min(4,g.wave-1));snd('flow');toast('✦ WAVE '+g.wave+' · '+WAVES[g.wave-1]+'!',g.W/2,g.H*.32,'#ffefad',1.05)}
 const k=g.keys;
 let dir=(k.has('ArrowRight')||k.has('KeyD')?1:0)-(k.has('ArrowLeft')||k.has('KeyA')?1:0);
 if(dir){g.shipX=clamp(g.shipX+dir*470*dt,24,g.W-24);g.aimX=g.shipX;g.aimY=g.shipY-280}
 else if(g.pointer){g.shipX+=clamp(g.pointer.x-g.shipX,-1280*dt,1280*dt);g.aimX=g.pointer.x;g.aimY=g.pointer.y}
 // No pointer and no key: ship remains still and no gunshot is created.
 g.shipX=clamp(g.shipX,24,g.W-24);
 g.fireDelay-=dt;
 if((g.pointer?.down||g.fireKey)&&g.fireDelay<=0)shoot();
 g.spawnTimer-=dt;
 if(g.spawnTimer<=0){spawnGroup();g.spawnTimer=.105}
 if((g.elapsed>=72&&g.bossesDefeated===0&&!g.boss)||(g.elapsed>=140&&g.bossesDefeated===1&&!g.boss)||(g.elapsed>=182&&g.bossesDefeated===2&&!g.boss))summonBoss();
 for(let i=g.enemyPool.length-1;i>=0;i--){
  const e=g.enemyPool[i];if(e.dead){g.enemyPool[i]=g.enemyPool[g.enemyPool.length-1];g.enemyPool.pop();continue}
  e.age+=dt;e.y+=e.vy*dt;
  if(e.type==='zig')e.x+=((g.frameCount%4<2)?1:-1)*24*dt;
  e.x=clamp(e.x,5,g.W-5);
  if(e.y>=g.shipY+13){g.enemyPool[i]=g.enemyPool[g.enemyPool.length-1];g.enemyPool.pop();leak()}
 }
 if(g.boss){g.boss.phase+=dt;g.boss.y=min(114,g.boss.y+g.boss.vy*dt);g.boss.x=clamp(g.W*.5+Math.sin(g.boss.phase*1.4)*g.W*.24,100,g.W-100)}
 collisionShots(dt);
 for(let i=g.particles.length-1;i>=0;i--){const p=g.particles[i];p.age+=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;if(p.age>p.life)g.particles.splice(i,1)}
 for(let i=g.rings.length-1;i>=0;i--){g.rings[i].age+=dt;if(g.rings[i].age>g.rings[i].life)g.rings.splice(i,1)}
 for(let i=g.texts.length-1;i>=0;i--){g.texts[i].age+=dt;if(g.texts[i].age>g.texts[i].life)g.texts.splice(i,1)}
 for(let i=g.beams.length-1;i>=0;i--){g.beams[i].age+=dt;if(g.beams[i].age>g.beams[i].life)g.beams.splice(i,1)}
 g.shake=max(0,g.shake-dt*22);g.flash=max(0,g.flash-dt*3);g.superFlash=max(0,g.superFlash-dt*2.1);
 g.musicTime+=dt;
 if(g.musicTime>.35){g.musicTime=0;Audio?.setActivity?.({enemies:g.enemyPool.length,combo:g.combo,boss:!!g.boss,progress:g.elapsed/g.duration,flow:(g.pointer?.down||g.fireKey)&&g.combo>50,burstReady:g.charge>=100})}
 if(g.base<=0){finish(false);return}
 if(g.elapsed>=g.duration){finish(!g.boss&&g.bossesDefeated>=3);return}
 if(g.kills>=g.nextUpgrade&&g.scene==='play')levelUp();
}
function hud(force=false){
 $('baseHP').textContent=Math.ceil(g.base);$('baseFill').style.width=clamp(g.base/g.baseMax*100,0,100)+'%';
 $('wave').textContent=String(g.wave).padStart(2,'0');$('kills').textContent=String(g.kills).padStart(5,'0');
 $('combo').textContent='x'+clamp(1+g.combo/120,1,99).toFixed(1);
 const t=max(0,g.duration-g.elapsed);$('clock').textContent=String(Math.floor(t/60)).padStart(2,'0')+':'+String(Math.ceil(t%60)).padStart(2,'0');
 $('status').textContent=g.scene==='play'?(g.boss?'★ SHOOT THE ACE BOMBER!':'✦ '+WAVES[g.wave-1]+' · HOLD TO FIRE'):'HOLD TO FIRE • AIM AT THE SWARM';
 $('weaponLevel').textContent='LV '+g.level+' · STRAIGHT';
 $('superFill').style.width=Math.floor(g.charge)+'%';$('superText').textContent=Math.floor(g.charge)+'%';$('superReady').textContent=g.charge>=100?'READY!':'CHARGE';
 $('superBtn').classList.toggle('ready',g.charge>=100);$('superBtn').setAttribute('aria-disabled',String(g.charge<100));
 $('bossHUD').hidden=!g.boss;if(g.boss){$('bossLabel').textContent='ACE BOMBER '+g.bossesDefeated+'/3';$('bossFill').style.width=clamp(g.boss.hp/g.boss.maxHp*100,0,100)+'%'}
 $('flashLayer').style.opacity=clamp(g.superFlash*.36+g.flash*.36,0,.37);
}
function rounded(x,y,w,h,r,color){ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill()}
function ring(x,y,r,color='#fff'){ctx.strokeStyle=color;ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.stroke()}
// V5 CLASSIC SKY RAID VISUALS
// Smooth, hand-shaped arcade aircraft and a living green/river landscape.
// All artwork is original Canvas vector painting — not pixel art or sci-fi.
function hash2(a,b){let n=(Math.imul(a+19,374761393)^Math.imul(b+17,668265263))|0;n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295}
function terrain(t,painter=ctx){const ctx=painter;
 const W=g.W,H=g.H,scroll=g.elapsed*80;
 const earth=ctx.createLinearGradient(0,0,W,H);
 earth.addColorStop(0,'#accb80');earth.addColorStop(.47,'#81b67a');earth.addColorStop(1,'#bcd58c');
 ctx.fillStyle=earth;ctx.fillRect(0,0,W,H);
 // Diagonal farmland terraces, scrolling south beneath the formation.
 const dy=126,lowest=Math.floor(scroll/dy)-2;
 for(let row=lowest;row<lowest+Math.ceil(H/dy)+5;row++){
  const y=row*dy-scroll;
  const tint=['#8cbd79','#b5d58a','#e3d58a','#96ba81','#b6ca7c','#bbda92'][((row%6)+6)%6];
  for(let col=0;col<5;col++){
   const x=col*W/5-10,w=W/5+18,sd=hash2(row,col);
   ctx.fillStyle=sd>.72?'#f4e6a23b':tint+'77';
   ctx.fillRect(x,y+(sd-.5)*12,w,dy-6);
   ctx.strokeStyle='#eff7b44d';ctx.lineWidth=2;
   ctx.strokeRect(x,y+3+(sd-.5)*12,w,dy-10);
  }
  if(row%3===0){
   ctx.strokeStyle='#d8e6a777';ctx.lineWidth=2;
   for(let q=0;q<6;q++){const fy=y+12+q*16;ctx.beginPath();ctx.moveTo(W*.50,fy);ctx.lineTo(W*.98,fy);ctx.stroke()}
  }
 }
 // Curved river, lined with reeds. Opposite banks add strong depth cues.
 const riverX=y=>W*.24+Math.sin((y+scroll)*.0034)*W*.045+Math.cos((y+scroll)*.0021)*W*.029;
 const riverW=max(70,W*.16);
 ctx.beginPath();
 for(let y=-55;y<=H+100;y+=32){let x=riverX(y)-riverW*.5;if(y===-55)ctx.moveTo(x,y);else ctx.lineTo(x,y)}
 for(let y=H+100;y>=-55;y-=32){ctx.lineTo(riverX(y)+riverW*.5,y)}
 ctx.closePath();ctx.fillStyle='#d2d1a0';ctx.fill();
 ctx.beginPath();
 for(let y=-55;y<=H+100;y+=32){let x=riverX(y)-riverW*.39;if(y===-55)ctx.moveTo(x,y);else ctx.lineTo(x,y)}
 for(let y=H+100;y>=-55;y-=32){ctx.lineTo(riverX(y)+riverW*.39,y)}
 ctx.closePath();
 const water=ctx.createLinearGradient(0,0,W,0);
 water.addColorStop(0,'#4b999f');water.addColorStop(.4,'#8ac9c4');water.addColorStop(1,'#3f97a7');
 ctx.fillStyle=water;ctx.fill();
 ctx.strokeStyle='#dff6e176';ctx.lineWidth=2;
 for(let j=0;j<11;j++){const y=(j*114+scroll*.3)%(H+120)-40,x=riverX(y)+Math.sin(j*6)*riverW*.2;
 ctx.beginPath();ctx.moveTo(x-10,y);ctx.quadraticCurveTo(x+3,y-5,x+15,y);ctx.stroke()}
 // Vintage country road, a second clear route through the valley.
 const roadX=y=>W*.77+Math.sin((y+scroll)*.0028+.7)*W*.022;
 ctx.lineWidth=max(24,W*.056);ctx.lineCap='round';ctx.strokeStyle='#d5bb83';
 ctx.beginPath();for(let y=-45;y<=H+75;y+=24){if(y===-45)ctx.moveTo(roadX(y),y);else ctx.lineTo(roadX(y),y)}ctx.stroke();
 ctx.lineWidth=max(16,W*.040);ctx.strokeStyle='#847e67';ctx.stroke();
 ctx.lineWidth=2;ctx.strokeStyle='#f9ecbaaa';ctx.setLineDash([12,14]);ctx.stroke();ctx.setLineDash([]);
 // Small bridges, country houses, and non-identical vegetation on repeated cells.
 const grid=104,first=Math.floor(scroll/grid)-2,cols=Math.ceil(W/grid)+2;
 for(let row=first;row<first+Math.ceil(H/grid)+4;row++)for(let col=0;col<cols;col++){
  const y=row*grid-scroll+50,x=col*grid+grid*.4,seed=hash2(col,row);
  if(y<-40||y>H+45)continue;
  if(Math.abs(x-riverX(y))<riverW*.85||Math.abs(x-roadX(y))<32)continue;
  if(seed>.23&&seed<.80){
    const crowns=seed>.56?4:2;
    for(let k=0;k<crowns;k++){
     const a=k*2.399,dx=Math.cos(a)*15,dy=Math.sin(a)*13,r=9+hash2(row+k,col)*5;
     ctx.fillStyle='#254e3072';ctx.beginPath();ctx.ellipse(x+dx+2,y+dy+6,r+3,r*.56,0,0,TAU);ctx.fill();
     ctx.fillStyle=['#3c8752','#367c47','#4e9657','#659b59'][k%4];ctx.beginPath();ctx.arc(x+dx,y+dy,r,0,TAU);ctx.fill();
     ctx.fillStyle='#a7d48b99';ctx.beginPath();ctx.arc(x+dx-r*.28,y+dy-r*.27,r*.43,0,TAU);ctx.fill();
    }
  }else if(seed>.87){
    ctx.fillStyle='#e7dca6';ctx.fillRect(x-12,y-10,25,22);
    ctx.fillStyle='#ad6f4b';ctx.beginPath();ctx.moveTo(x-17,y-9);ctx.lineTo(x,y-22);ctx.lineTo(x+17,y-9);ctx.closePath();ctx.fill();
    ctx.fillStyle='#6c8472';ctx.fillRect(x-3,y+3,6,9);
  }
 }
 // Wooden bridge crosses the river every so often (not space-platform lines).
 const bridgeY=((scroll*.94+250)%(H+480))-240,bx=riverX(bridgeY),bw=riverW+46;
 ctx.fillStyle='#aa7d54';ctx.fillRect(bx-bw*.5,bridgeY-8,bw,16);
 ctx.strokeStyle='#dbb382';ctx.lineWidth=2;
 for(let x=bx-bw*.5;x<bx+bw*.5;x+=12){ctx.beginPath();ctx.moveTo(x,bridgeY-8);ctx.lineTo(x,bridgeY+8);ctx.stroke()}
 // Soft, translucent cloud layers give altitude without hiding enemies.
 for(let i=0;i<4;i++){
  const x=(W*(i*.37+.1)+Math.sin(i*2)*25)%W,y=(i*250+scroll*.42)%(H+290)-130;
  const cloud=ctx.createRadialGradient(x,y,2,x,y,92);
  cloud.addColorStop(0,'#ffffff2f');cloud.addColorStop(1,'#ffffff00');
  ctx.fillStyle=cloud;ctx.beginPath();ctx.ellipse(x,y,93,47,0,0,TAU);ctx.fill();
 }
}
const spriteBank=new Map();
function buildEnemySprite(kind,variant){
 const paint=COLORS[variant],accent=ACCENTS[variant];
 const size=96,c=document.createElement('canvas');c.width=size;c.height=size;
 const cx=c.getContext('2d');
 cx.translate(size*.5,size*.5);
 const heavy=kind==='armor',zig=kind==='zig',volatile=kind==='volatile';
 const span=heavy?43:zig?37:35;
 cx.shadowColor='#180c20';cx.shadowBlur=4;cx.lineWidth=2.5;cx.strokeStyle=['#f34a64','#df544e','#bc66e6','#a4d65f','#f075aa','#6dd7cd'][variant];
 // Fighter silhouettes, broad serrated wings, forward (down) arrows, wicked tail fins.
 cx.fillStyle=paint;cx.beginPath();
 cx.moveTo(0,36);cx.lineTo(12,9);cx.lineTo(span*.92,3);
 cx.lineTo(span,-14);cx.lineTo(span*.40,-9);
 cx.lineTo(15,-15);cx.lineTo(12,-39);
 cx.lineTo(3,-33);cx.lineTo(0,-24);cx.lineTo(-3,-33);
 cx.lineTo(-12,-39);cx.lineTo(-15,-15);
 cx.lineTo(-span*.40,-9);cx.lineTo(-span,-14);
 cx.lineTo(-span*.92,3);cx.lineTo(-12,9);cx.closePath();cx.fill();cx.stroke();
 cx.shadowBlur=0;
 cx.fillStyle='#100f1c';cx.beginPath();
 cx.moveTo(-7,30);cx.lineTo(-7,-22);cx.lineTo(0,-31);cx.lineTo(7,-22);cx.lineTo(7,30);
 cx.closePath();cx.fill();
 // Evil glowing red eye-slits, angular not cute.
 cx.fillStyle=accent;cx.beginPath();
 cx.moveTo(-21,1);cx.lineTo(-6,6);cx.lineTo(-8,13);cx.lineTo(-22,8);cx.closePath();
 cx.moveTo(21,1);cx.lineTo(6,6);cx.lineTo(8,13);cx.lineTo(22,8);cx.closePath();cx.fill();
 cx.strokeStyle='#fff2d180';cx.lineWidth=1.5;
 for(const sign of [-1,1]){cx.beginPath();cx.moveTo(sign*22,-3);cx.lineTo(sign*12,3);cx.stroke()}
 // Predatory shark teeth / skull insignia as distinctive visual sign.
 cx.fillStyle='#efe5d5';
 cx.beginPath();cx.moveTo(-6,17);cx.lineTo(-2,22);cx.lineTo(0,17);cx.lineTo(2,22);cx.lineTo(6,17);cx.closePath();cx.fill();
 if(volatile){
  cx.strokeStyle='#f5bd5a';cx.lineWidth=3;cx.beginPath();cx.arc(0,3,24,Math.PI*.18,Math.PI*.82);cx.stroke();
  cx.fillStyle='#e7cf6e';cx.beginPath();cx.arc(0,-4,6,0,TAU);cx.fill();
 }
 if(heavy){
  cx.fillStyle='#121923';cx.fillRect(-30,-5,13,14);cx.fillRect(17,-5,13,14);
  cx.strokeStyle='#f84a63';cx.lineWidth=3;cx.strokeRect(-27,-1,7,8);cx.strokeRect(20,-1,7,8)
 }
 if(zig){
  cx.strokeStyle='#b8f667';cx.lineWidth=2;cx.beginPath();cx.moveTo(-31,-12);cx.lineTo(-39,1);
  cx.moveTo(31,-12);cx.lineTo(39,1);cx.stroke();
 }
 return c;
}
function drawEnemy(e){
 if(e.y<-32||e.y>g.H+34)return;
 const variant=e.variant??max(0,COLORS.indexOf(e.color)),kind=e.type;
 const k=kind+variant;let sprite=spriteBank.get(k);
 if(!sprite){sprite=buildEnemySprite(kind,variant);spriteBank.set(k,sprite)}
 const size=e.r*(kind==='armor'?3.15:2.75);
 if(kind==='zig'){
  ctx.save();ctx.translate(e.x,e.y);ctx.rotate(Math.sin(e.age*5+e.sway)*.14);
  ctx.drawImage(sprite,-size*.5,-size*.5,size,size);ctx.restore()
 }else ctx.drawImage(sprite,e.x-size*.5,e.y-size*.5,size,size);
 g.renderedEnemies++;
}
function drawHordeEnemy(hc,e){
 const variant=e.variant??0,kind=e.type,k=kind+variant;
 let sprite=spriteBank.get(k);
 if(!sprite){sprite=buildEnemySprite(kind,variant);spriteBank.set(k,sprite)}
 const size=e.r*(kind==='armor'?3.15:2.75);
 hc.drawImage(sprite,e.x-size*.5,e.y-size*.5,size,size);
 g.renderedEnemies++;
}
function drawBoss(b,t){
 const x=b.x,y=b.y,rad=b.w*.5;
 ctx.save();ctx.translate(x,y);ctx.rotate(Math.sin(b.phase*1.5)*.09);
 ctx.fillStyle='#22463f55';ctx.beginPath();ctx.ellipse(7,13,rad*1.24,rad*.66,0,0,TAU);ctx.fill();
 const body=ctx.createLinearGradient(-rad,-rad,rad,rad);
 body.addColorStop(0,'#241a27');body.addColorStop(.55,'#553039');body.addColorStop(1,'#191d25');
 ctx.fillStyle=body;ctx.strokeStyle='#f9eac2';ctx.lineWidth=3;
 ctx.beginPath();ctx.moveTo(-rad*1.13,-rad*.18);ctx.lineTo(-rad*.5,-rad*.50);
 ctx.lineTo(-rad*.22,-rad*.55);ctx.lineTo(-rad*.2,-rad*1.08);ctx.lineTo(rad*.22,-rad*1.08);
 ctx.lineTo(rad*.3,-rad*.56);ctx.lineTo(rad*.51,-rad*.48);ctx.lineTo(rad*1.13,-rad*.17);
 ctx.lineTo(rad*1.23,rad*.17);ctx.lineTo(rad*.44,rad*.4);ctx.lineTo(rad*.3,rad*1.11);
 ctx.lineTo(rad*.64,rad*1.24);ctx.lineTo(rad*.4,rad*1.45);ctx.lineTo(0,rad*1.15);
 ctx.lineTo(-rad*.4,rad*1.45);ctx.lineTo(-rad*.64,rad*1.24);ctx.lineTo(-rad*.3,rad*1.11);
 ctx.lineTo(-rad*.44,rad*.4);ctx.lineTo(-rad*1.23,rad*.17);ctx.closePath();ctx.fill();ctx.stroke();
 for(const sign of [-1,1]){
  ctx.fillStyle='#494e3f';ctx.beginPath();ctx.arc(sign*rad*.80,-rad*.19,rad*.22,0,TAU);ctx.fill();
  ctx.strokeStyle='#e6efcba9';ctx.lineWidth=5;ctx.beginPath();
  ctx.moveTo(sign*rad*.52,-rad*.2);ctx.lineTo(sign*rad*1.10,-rad*.2);ctx.stroke();
  ctx.fillStyle='#f7d2a0';ctx.fillRect(sign*rad*.57-rad*.08,0,rad*.18,rad*.25);
 }
 ctx.fillStyle='#c31b41';ctx.beginPath();ctx.ellipse(0,-rad*.08,rad*.21,rad*.53,0,0,TAU);ctx.fill();
 ctx.fillStyle='#14131d';ctx.beginPath();ctx.ellipse(0,-rad*.32,rad*.16,rad*.26,0,0,TAU);ctx.fill();
 ctx.restore();
}
function ship(t){
 const x=g.shipX,y=g.shipY,r=29;
 ctx.save();ctx.translate(x,y);
 ctx.fillStyle='#24423a55';ctx.beginPath();ctx.ellipse(4,13,36,17,0,0,TAU);ctx.fill();
 // Distinctly classic navy-blue propeller fighter, nose pointing upward.
 ctx.fillStyle='#41697d';ctx.strokeStyle='#e7f0de';ctx.lineWidth=2.1;
 ctx.beginPath();ctx.moveTo(0,-43);ctx.lineTo(10,-29);ctx.lineTo(14,-8);
 ctx.lineTo(38,8);ctx.lineTo(36,18);ctx.lineTo(14,13);ctx.lineTo(10,30);
 ctx.lineTo(24,36);ctx.lineTo(18,40);ctx.lineTo(0,34);ctx.lineTo(-18,40);
 ctx.lineTo(-24,36);ctx.lineTo(-10,30);ctx.lineTo(-14,13);ctx.lineTo(-36,18);
 ctx.lineTo(-38,8);ctx.lineTo(-14,-8);ctx.lineTo(-10,-29);ctx.closePath();ctx.fill();ctx.stroke();
 ctx.fillStyle='#a8d6d4';ctx.beginPath();ctx.moveTo(0,-38);ctx.lineTo(6,-19);ctx.lineTo(7,23);ctx.lineTo(0,29);
 ctx.lineTo(-7,23);ctx.lineTo(-6,-19);ctx.closePath();ctx.fill();
 ctx.fillStyle='#446478';ctx.beginPath();ctx.ellipse(0,-13,7,14,0,0,TAU);ctx.fill();
 ctx.fillStyle='#e6f1cf';ctx.beginPath();ctx.arc(-24,12,3.5,0,TAU);ctx.arc(24,12,3.5,0,TAU);ctx.fill();
 ctx.fillStyle='#e8a56f';ctx.fillRect(-37,12,8,6);ctx.fillRect(29,12,8,6);
 // Period-style propeller, subtle transparency and white motion arcs.
 ctx.strokeStyle='#e4efc89c';ctx.lineWidth=3;ctx.lineCap='round';
 const swing=Math.sin(t*.03)*.3;
 ctx.beginPath();ctx.moveTo(-18,-40+swing);ctx.lineTo(18,-40-swing);ctx.stroke();
 ctx.fillStyle='#efbf80';ctx.beginPath();ctx.arc(0,-41,4,0,TAU);ctx.fill();
 ctx.restore();
}
const terrainCache=document.createElement('canvas');
const terrainContext=terrainCache.getContext('2d',{alpha:false});
const hordeLayer=document.createElement('canvas');
const hordeContext=hordeLayer.getContext('2d',{alpha:true});
let lastTerrainFrame=-100,lastHordeFrame=-100;
function draw(t){
 ctx.setTransform(g.dpr,0,0,g.dpr,0,0);
 const W=g.W,H=g.H;
 if(terrainCache.width!==Math.round(W)||terrainCache.height!==Math.round(H)){
  terrainCache.width=Math.round(W);terrainCache.height=Math.round(H);
  lastTerrainFrame=-100;
 }
 if(g.frameCount-lastTerrainFrame>=3){
  terrain(t,terrainContext);
  lastTerrainFrame=g.frameCount;
 }
 ctx.drawImage(terrainCache,0,0,W,H);
 // Every other frame repaint all 5k–9k foes; 60Hz controls, bullets and pilot remain live.
 const hordeScale=W<480?.75:.85;
 const hw=Math.max(1,Math.ceil(W*hordeScale)),hh=Math.max(1,Math.ceil(H*hordeScale));
 if(hordeLayer.width!==hw||hordeLayer.height!==hh){
  hordeLayer.width=hw;hordeLayer.height=hh;lastHordeFrame=-100;
 }
 if(g.frameCount-lastHordeFrame>=2){
  hordeContext.setTransform(1,0,0,1,0,0);
  hordeContext.clearRect(0,0,hw,hh);
  hordeContext.setTransform(hordeScale,0,0,hordeScale,0,0);
  g.renderedEnemies=0;
  // keep original logical world coordinates under scaled offscreen rendering.
  for(const e of g.enemyPool){
   if(e.dead||e.y<-24||e.y>H+23)continue;
   drawHordeEnemy(hordeContext,e);
  }
  lastHordeFrame=g.frameCount;
 }
 ctx.drawImage(hordeLayer,0,0,W,H);
 ctx.save();
 if(g.shake>0)ctx.translate(Math.sin(t*.11)*g.shake*.55,Math.cos(t*.13)*g.shake*.55);
 // Subtle perspective shadow and boundary at the defended airfield.
 const grass=ctx.createLinearGradient(0,g.shipY-30,0,H);
 grass.addColorStop(0,'#486e4780');grass.addColorStop(1,'#345840b6');
 ctx.fillStyle=grass;ctx.fillRect(0,g.shipY+36,W,H-g.shipY+5);
 ctx.strokeStyle='#f4e8b4b8';ctx.lineWidth=3;ctx.setLineDash([16,9]);
 ctx.beginPath();ctx.moveTo(0,g.shipY+38);ctx.lineTo(W,g.shipY+38);ctx.stroke();ctx.setLineDash([]);
 if(g.boss)drawBoss(g.boss,t);
 // Each warm muzzle trail is a player-triggered cannon round.
 ctx.lineCap='round';
 for(const b of g.bullets){
  ctx.lineWidth=b.r*.83;ctx.strokeStyle='#fff5ba';ctx.shadowColor='#ffedb7';ctx.shadowBlur=12;
  ctx.beginPath();ctx.moveTo(b.x,b.y);ctx.lineTo(b.x-b.vx*.018,b.y-b.vy*.018);ctx.stroke();
 }
 ctx.shadowBlur=0;
 for(const z of g.beams){const a=1-z.age/z.life;ctx.save();ctx.globalAlpha=a*.7;
  ctx.fillStyle='#fff7d0ad';ctx.fillRect(z.x-z.w*.5,0,z.w,g.shipY);
  ctx.fillStyle='#f5d795';ctx.fillRect(z.x-z.w*.18,0,z.w*.36,g.shipY);ctx.restore()}
 for(const o of g.rings){ctx.save();ctx.globalAlpha=1-o.age/o.life;ctx.lineWidth=5;
  ring(o.x,o.y,o.r*(.4+.6*o.age/o.life),o.color);ctx.restore()}
 for(const p of g.particles){ctx.save();ctx.globalAlpha=1-p.age/p.life;ctx.fillStyle=p.color;
  ctx.beginPath();ctx.arc(p.x,p.y,p.r*(1-p.age/p.life*.3),0,TAU);ctx.fill();ctx.restore()}
 ship(t);
 if((g.pointer?.down||g.fireKey)&&g.scene==='play'){
  // Pilot shoots straight ahead; visual reticle is visible only while holding fire.
  ctx.strokeStyle='#f9edb2bb';ctx.setLineDash([6,9]);ctx.lineWidth=1.7;
  ctx.beginPath();ctx.moveTo(g.shipX,g.shipY-44);ctx.lineTo(g.shipX,g.shipY-175);ctx.stroke();ctx.setLineDash([]);
 }
 for(const txt of g.texts){const fade=1-txt.age/txt.life;ctx.save();ctx.globalAlpha=fade;ctx.textAlign='center';
  ctx.font='1000 '+Math.round(clamp(W*.037,17,29))+'px ui-rounded,system-ui';
  ctx.lineWidth=5;ctx.strokeStyle='#395140';ctx.strokeText(txt.str,txt.x,txt.y-txt.age*34);
  ctx.fillStyle=txt.color;ctx.fillText(txt.str,txt.x,txt.y-txt.age*34);ctx.restore()}
 ctx.restore();
}
$('overlay').addEventListener('click',e=>{const btn=e.target.closest('button[data-action]');if(!btn)return;Audio?.unlock();snd('click');switch(btn.dataset.action){case'start':reset();break;case'menu':menu();break;case'help':help();break;case'resume':resume();break;case'upgrade':selectUpgrade(Number(btn.dataset.index)||0);break}});
$('muteBtn').addEventListener('click',()=>{save.muted=!save.muted;persist();Audio?.setMuted(save.muted);$('muteBtn').textContent=save.muted?'♩':'♫'});
// A deliberate 700 ms hold is required for touch pause. Accidental taps are ignored.
let pauseHold=null,holdTriggered=false;
const pauseButton=$('pauseBtn');
pauseButton.setAttribute('title','Hold 0.7 seconds to pause');
pauseButton.addEventListener('pointerdown',e=>{
 holdTriggered=false;
 if(pauseHold!==null)clearTimeout(pauseHold);
 pauseHold=setTimeout(()=>{
   holdTriggered=true;
   if(g.scene==='play')pause();
   else if(g.scene==='paused')resume();
   pauseHold=null;
 },700);
});
for(const ev of ['pointerup','pointercancel','pointerleave']){
 pauseButton.addEventListener(ev,()=>{if(pauseHold!==null){clearTimeout(pauseHold);pauseHold=null}});
}
pauseButton.addEventListener('click',e=>e.preventDefault());
$('superBtn').addEventListener('click',()=>{Audio?.unlock();special()});
// No fire-mode switch: user requested exactly ONE straight cannon.
const pointerX=clientX=>{
 const r=canvas.getBoundingClientRect();
 return clamp(clientX-r.left,24,g.W-24);
};
function trackPointer(e){
 const x=pointerX(e.clientX);
 return{x,y:g.shipY-190,down:true,id:e.pointerId};
}
canvas.addEventListener('pointerdown',e=>{
 if(e.pointerType==='touch'||g.scene!=='play'||g.pointer)return;
 e.preventDefault();Audio?.unlock();
 g.pointer=trackPointer(e);g.shipX=g.pointer.x;g.aimX=g.pointer.x;
 g.aimY=g.pointer.y;g.fireDelay=0;shoot();
 try{canvas.setPointerCapture(e.pointerId)}catch(err){}
});
window.addEventListener('pointermove',e=>{
 if(e.pointerType==='touch'||g.scene!=='play')return;
 const x=pointerX(e.clientX);
 if(g.pointer&&g.pointer.id===e.pointerId){
  g.pointer={x,y:g.shipY-190,down:true,id:e.pointerId};
 }else if(!g.pointer&&e.pointerType==='mouse'){
  g.shipX=x;g.aimX=x;g.aimY=g.shipY-190;
 }
},{passive:true});
function stopPointer(e){
 if(e.pointerType==='touch')return;
 if(g.pointer&&g.pointer.id===e.pointerId){g.pointer=null;g.fireDelay=0}
}
window.addEventListener('pointerup',stopPointer);
window.addEventListener('pointercancel',stopPointer);
let activeTouch=null,touchReleaseTimer=null;
function recordTouch(t,first){
 if(g.scene!=='play')return;
 const x=pointerX(t.clientX);
 g.pointer={x,y:g.shipY-190,down:true,id:'touch'+t.identifier};
 if(first){
  Audio?.unlock();g.shipX=x;g.aimX=x;g.aimY=g.shipY-190;
  g.fireDelay=0;shoot();
 }
}
canvas.addEventListener('touchstart',e=>{
 if(g.scene!=='play')return;
 e.preventDefault();
 if(touchReleaseTimer!==null){clearTimeout(touchReleaseTimer);touchReleaseTimer=null}
 if(activeTouch===null&&e.changedTouches.length){
  activeTouch=e.changedTouches[0].identifier;recordTouch(e.changedTouches[0],true)
 }
},{passive:false});
window.addEventListener('touchmove',e=>{
 if(activeTouch===null||g.scene!=='play')return;
 const t=Array.from(e.touches).find(t=>t.identifier===activeTouch);
 if(t){e.preventDefault();recordTouch(t,false)}
},{passive:false});
window.addEventListener('touchend',e=>{
 if(activeTouch===null)return;
 const t=Array.from(e.changedTouches).find(t=>t.identifier===activeTouch);
 if(t){activeTouch=null;g.pointer=null;g.fireDelay=0}
},{passive:true});
window.addEventListener('touchcancel',e=>{
 if(activeTouch===null)return;
 const id=activeTouch;
 if(!Array.from(e.changedTouches).some(t=>t.identifier===id))return;
 // iOS can transiently cancel during gesture arbitration: brief recovery
 // interval; no permanent firing after an actual touch ends.
 if(touchReleaseTimer!==null)clearTimeout(touchReleaseTimer);
 touchReleaseTimer=setTimeout(()=>{
   if(activeTouch===id){activeTouch=null;g.pointer=null;g.fireDelay=0}
   touchReleaseTimer=null;
 },120);
},{passive:true});
function clearHeldInputs(){
 g.pointer=null;g.fireKey=false;g.keys.clear();activeTouch=null;
 if(touchReleaseTimer!==null){clearTimeout(touchReleaseTimer);touchReleaseTimer=null}
}
// Do not pause on blur, visibility change, upgrade, or drag.
window.addEventListener('blur',()=>{g.keys.clear();g.fireKey=false;if(document.hidden)clearHeldInputs()});
document.addEventListener('visibilitychange',()=>{if(document.hidden)clearHeldInputs()});
window.addEventListener('keydown',e=>{
 if(['Space','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.code))e.preventDefault();
 g.keys.add(e.code);
 if(g.scene==='play'){
  if(e.code==='Space'||e.code==='KeyJ'){if(!g.fireKey){Audio?.unlock();g.fireDelay=0;shoot()}g.fireKey=true}
  if(e.code==='KeyQ'&&!e.repeat){Audio?.unlock();special()}
  // All inputs use the same single straight stream.
  if(e.code==='Escape'||e.code==='KeyP')pause();
 }else if(g.scene==='upgrade'&&/^Digit[123]$/.test(e.code))selectUpgrade(Number(e.code.at(-1))-1);
 else if(g.scene==='menu'&&e.code==='Enter')reset();
 else if(g.scene==='paused'&&(e.code==='Escape'||e.code==='Enter'||e.code==='KeyP'))resume();
});
window.addEventListener('keyup',e=>{g.keys.delete(e.code);if(e.code==='Space'||e.code==='KeyJ')g.fireKey=false});
let last=0,lastHud=0;function frame(now){const dt=last?min(.045,(now-last)/1000):1/60;last=now;g.now=now;g.fps=Math.round(g.fps*.95+.05/dt);g.frameDt=dt;g.frameCount++;tick(dt);draw(now);if(now-lastHud>95){hud();lastHud=now}requestAnimationFrame(frame)}
if(new URLSearchParams(location.search).get('qa')==='1'){
 window.LumiQA={
  snapshot:()=>({scene:g.scene,fireMode:g.fireMode,time:g.elapsed,wave:g.wave,base:g.base,kills:g.kills,score:g.score,combo:g.combo,shots:g.shotCount,hits:g.hitCount,bulletCount:g.bullets.length,bulletVXMax:g.bullets.reduce((a,b)=>Math.max(a,Math.abs(b.vx)),0),spawned:g.spawned,leaked:g.leaked,enemies:g.enemyPool.length,enemyCap:enemyCap(),renderedEnemies:g.renderedEnemies,spatialBuckets:enemyGrid.size,level:g.level,super:g.charge,boss:!!g.boss,bosses:g.bossesDefeated,shipX:g.shipX,shipY:g.shipY,weapon:{...g.upgrades},music:Audio?.status(),fps:g.fps}),
  start:()=>reset(),tick:(sec=1)=>{for(let t=0;t<sec;t+=.04){tick(.04);if(g.scene!=='play')break}},
  setBase:(n=100000)=>{g.base=n;g.baseMax=n},
  manualFire:(x=g.W/2,y=170)=>{g.aimX=x;g.aimY=y;g.shipX=clamp(x,24,g.W-24);shoot()},
  holdFire:(on=true)=>{g.fireKey=on;g.fireDelay=0},holdPointer:(x,y,on=true)=>{g.pointer=on?{x,y:clamp(y,100,g.shipY-55),down:true,id:999}:null;g.fireDelay=0},
  summonBoss:()=>summonBoss(),setCharge:(n=100)=>{g.charge=n},special:()=>special(),upgrade:(i=0)=>selectUpgrade(i),
  addEnemies:(n=400)=>{for(let i=0;i<n;i++){const x=clamp(g.W*.5+rand(-110,110),12,g.W-12);g.enemyPool.push({x,y:rand(112,260),r:rand(4,7),hp:1,maxHp:1,type:'glimmer',vy:90,age:0,sway:rand(0,7),color:COLORS[i%COLORS.length],dead:false});g.spawned++}},
  forceUpgrade:()=>levelUp(),mode:()=>chooseMode(),win:()=>{g.boss=null;g.bossesDefeated=3;g.elapsed=g.duration;finish(true)},lose:()=>{g.base=0;finish(false)},
  resize:()=>dimension(),audio:()=>Audio?.status(),getDimension:()=>({W:g.W,H:g.H}),render:()=>draw(performance.now())
 };
}
Audio?.setMuted(save.muted);$('muteBtn').textContent=save.muted?'♩':'♫';window.addEventListener('resize',dimension,{passive:true});dimension();g.shipX=g.W/2;g.aimX=g.W/2;menu();requestAnimationFrame(frame);
})();
