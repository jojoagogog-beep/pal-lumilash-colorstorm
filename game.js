/* LUMILASH FRONTLINE COLORSTORM v4 — original manual-input vertical arcade shooter.
 * The cannon NEVER shoots without pointer-down or a held fire key.
 * A visible enemy is counted as defeated ONLY when a player-fired shot or manually
 * activated special hits it. This is a ground-up remake of the prior auto-survivor.
 */
(()=>{'use strict';
const $=s=>document.getElementById(s),canvas=$('arena'),ctx=canvas.getContext('2d',{alpha:false});
const Audio=window.LumiAudio||null,TAU=Math.PI*2;
const min=Math.min,max=Math.max,abs=Math.abs,rand=(a,b)=>a+Math.random()*(b-a),clamp=(v,a,b)=>max(a,min(b,v));
const COLORS=['#ff76bc','#64dff6','#ffd66f','#c3a2ff','#8be3a6','#ff9d7b'];
const WAVES=['CONFETTI RUSH','SUGAR STORM','CRYSTAL COLUMN','NEON TSUNAMI','FINAL COLORSTORM'];
const UPGRADES=[
 {id:'fan',icon:'✺',name:'TRIPLE BARRAGE',text:'Extra parallel cannons. Every shot controls a larger lane.',max:3},
 {id:'rate',icon:'⚡',name:'RAPID TRIGGER',text:'Fire significantly faster while holding.',max:5},
 {id:'pierce',icon:'➤',name:'PIERCING RAIL',text:'Plasma shots tear through more enemies.',max:5},
 {id:'blast',icon:'✹',name:'CHAIN EXPLOSION',text:'Each impact detonates a wider cluster.',max:5},
 {id:'power',icon:'◆',name:'HEAVY PLASMA',text:'Higher damage and better armored-enemy removal.',max:5},
 {id:'beam',icon:'✦',name:'RAINBOW SUPERNOVA',text:'More charge per kill and a wider special cannon.',max:4},
 {id:'wall',icon:'♥',name:'REPAIR DRONE',text:'Restore base health and reinforce against leaks.',max:3},
 {id:'focus',icon:'◎',name:'PRECISION LENS',text:'Wider bullets and tighter piercing volleys.',max:4}
];
const KEY='lumilash-frontline-v4-progress';
function readSave(){try{const d=JSON.parse(localStorage.getItem(KEY)||'null')||{};return {best:d.best||0,maxKO:d.maxKO||0,runs:d.runs||0,muted:!!d.muted}}catch(e){return{best:0,maxKO:0,runs:0,muted:false}}}
const save=readSave();
function persist(){try{localStorage.setItem(KEY,JSON.stringify(save))}catch(e){}}
const g={
 scene:'menu',W:960,H:600,dpr:1,shipX:480,shipY:520,aimX:480,aimY:160,keys:new Set(),pointer:null,fireKey:false,fireDelay:0,
 elapsed:0,duration:160,wave:1,base:100,baseMax:100,kills:0,score:0,combo:0,bestCombo:0,lastKO:-99,charge:0,specials:0,shotCount:0,hitCount:0,
 level:1,nextUpgrade:450,upgrades:{},upgradeChoices:[],enemyPool:[],bullets:[],particles:[],rings:[],texts:[],beams:[],boss:null,bossesDefeated:0,
 spawnTimer:0,spawned:0,leaked:0,spawnSeed:0,formation:0,shake:0,flash:0,freeze:0,superFlash:0,now:0,fps:60,frameDt:1/60,frameCount:0,musicTime:0
};
function snd(kind,v=1){Audio?.sfx(kind,v)}
function owned(up){return g.upgrades[up]||0}
function scoreSave(){save.best=max(save.best,g.score);save.maxKO=max(save.maxKO,g.kills);save.runs++;persist()}
function dimension(){const b=canvas.getBoundingClientRect(),oldW=g.W;g.W=max(290,b.width);g.H=max(420,b.height);g.dpr=min(2,window.devicePixelRatio||1);canvas.width=Math.round(g.W*g.dpr);canvas.height=Math.round(g.H*g.dpr);g.shipY=g.H-87;if(oldW>0){g.shipX=clamp(g.shipX/oldW*g.W,27,g.W-27)}else g.shipX=g.W/2;g.aimX=clamp(g.aimX,10,g.W-10);g.aimY=clamp(g.aimY,110,g.shipY-45)}
function choose3(){const options=UPGRADES.filter(u=>owned(u.id)<u.max);return options.sort(()=>Math.random()-.5).slice(0,3)}
function panel(content){$('overlay').innerHTML='<section class="panel">'+content+'</section>';$('overlay').classList.remove('hidden')}
function menu(){
 g.scene='menu';$('app').dataset.scene='menu';window.PALCrazy?.gameStop();Audio?.stop();
 panel('<div class="eyelabel">AN ORIGINAL MANUAL-FIRE ARCADE SHOOTER</div><h1>LUMILASH<span>FRONTLINE COLORSTORM</span></h1>'+
 '<p>YOU ARE THE LAST CANNON. A RAINBOW ARMY IS COMING FROM ABOVE.<br><b>AIM. FIRE. BREAK THE WAVE. SAVE THE BASE.</b></p>'+
 '<div class="featureStrip"><span>ZERO AUTO-FIRE</span><span>MANUAL AIM & HOLD</span><span>CHAIN EXPLOSIONS</span><span>BIG BOSSES</span></div>'+
 '<p class="instruction">MOUSE: aim & hold button to fire · MOBILE: touch, aim & hold<br>KEYBOARD: A/D or arrows to move · SPACE/J to fire · Q for PRISM CANNON</p>'+
 '<div class="panelFooter"><button class="btnMain" data-action="start">▶ START SHOOTING</button><button class="btnAlt" data-action="help">CONTROLS</button></div>'+
 '<p class="instruction">PERSONAL BEST '+save.best.toLocaleString()+' · MOST KOs '+save.maxKO.toLocaleString()+'</p>');
 hud(true);
}
function help(){panel('<div class="eyelabel">HOW TO PLAY</div><h2>AIM AND DESTROY</h2>'+
 '<p><b>1.</b> Stay on the bottom rail. Move the mouse or drag to steer the cannon sideways.<br><b>2.</b> HOLD left click, touch or SPACE to fire. No input means no shots — enemies break through.<br><b>3.</b> Aim at dense groups to trigger explosive chain reactions and earn upgrades.<br><b>4.</b> Charge the PRISM CANNON with real hits, then activate it manually with Q or the round button.<br><b>5.</b> Keep the base alive through 5 surging waves and 3 giant bosses.</p>'+
 '<div class="panelFooter"><button class="btnMain" data-action="start">▶ START SHOOTING</button><button class="btnAlt" data-action="menu">BACK</button></div>')}
function reset(){
 g.scene='play';g.elapsed=0;g.wave=1;g.base=100;g.kills=0;g.score=0;g.combo=0;g.bestCombo=0;g.lastKO=-99;g.charge=0;g.specials=0;g.shotCount=0;g.hitCount=0;
 g.level=1;g.nextUpgrade=450;g.upgrades={};g.upgradeChoices=[];g.enemyPool=[];g.bullets=[];g.particles=[];g.rings=[];g.texts=[];g.beams=[];g.boss=null;g.bossesDefeated=0;g.spawnTimer=.2;g.spawned=0;g.leaked=0;g.spawnSeed=0;g.formation=0;g.shake=0;g.flash=0;g.freeze=0;g.superFlash=0;g.musicTime=0;
 g.shipX=g.W*.5;g.shipY=g.H-87;g.aimX=g.W*.5;g.aimY=g.H*.3;g.pointer=null;g.fireKey=false;g.fireDelay=0;g.keys.clear();
 $('overlay').classList.add('hidden');$('app').dataset.scene='play';Audio?.start(0,true);window.PALCrazy?.gameStart();hud(true);toast('HOLD TO FIRE! DEFEND THE BASE!',g.W/2,g.H*.4,'#fff4bf',1.3);
}
function setScene(scene){g.scene=scene;$('app').dataset.scene=scene}
function pause(){if(g.scene!=='play')return;setScene('paused');window.PALCrazy?.gameStop();Audio?.stop();g.pointer=null;g.fireKey=false;panel('<div class="eyelabel">TAKE AIM</div><h2>PAUSED</h2><p>The swarm is frozen. Your score is safe.</p><div class="panelFooter"><button data-action="resume" class="btnMain">▶ CONTINUE</button><button data-action="menu" class="btnAlt">MAIN MENU</button></div>')}
function resume(){if(g.scene!=='paused')return;setScene('play');$('overlay').classList.add('hidden');Audio?.start(min(4,g.wave-1));window.PALCrazy?.gameStart()}
function finish(victory){
 if(g.scene!=='play')return;
 setScene('result');g.pointer=null;g.fireKey=false;window.PALCrazy?.gameStop();Audio?.stop();scoreSave();if(victory)snd('win');else snd('hurt');
 panel('<div class="eyelabel">FRONTLINE REPORT</div><h2>'+(victory?'COLORSTORM CLEARED!':'THE BASE WAS OVERRUN')+'</h2>'+
 '<div class="scoreBig">'+g.score.toLocaleString()+'</div><p>COLOR POINTS</p>'+
 '<div class="resultGrid"><div>ACTUAL KOs<strong>'+g.kills.toLocaleString()+'</strong></div><div>BEST COMBO<strong>'+g.bestCombo.toLocaleString()+'</strong></div><div>BOSSES<strong>'+g.bossesDefeated+'/3</strong></div></div>'+
 '<p>'+(victory?'Five waves stopped. Master tougher weapon builds to beat your record.':'Re-aim at dense columns. Use chain blasts, upgrade the cannon, and fire your special before the wall breaks.')+'</p>'+
 '<div class="panelFooter"><button data-action="start" class="btnMain">↻ TRY AGAIN</button><button data-action="menu" class="btnAlt">MAIN MENU</button></div>');
}
function levelUp(){
 g.level++;g.upgradeChoices=choose3();if(!g.upgradeChoices.length){g.base=min(g.baseMax,g.base+15);g.nextUpgrade+=1000;return}
 setScene('upgrade');g.pointer=null;g.fireKey=false;window.PALCrazy?.gameStop();Audio?.stop();snd('upgrade');
 panel('<div class="eyelabel">WEAPON ENGINEERING · LEVEL '+g.level+'</div><h2>CHOOSE YOUR POWER</h2>'+
 '<p>Three different builds. Aim for the biggest chain reactions.</p>'+
 '<div class="upgradeGrid">'+g.upgradeChoices.map((u,i)=>'<button class="upgrade" data-action="upgrade" data-index="'+i+'"><i>'+u.icon+'</i><b>'+(i+1)+'. '+u.name+'</b><small>'+u.text+'</small></button>').join('')+'</div>'+
 '<p class="instruction">CLICK / TAP OR PRESS 1, 2, 3</p>');
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
 const hp=250+g.wave*120;
 g.boss={x:g.W/2,y:-95,w:135+g.wave*12,hp,maxHp:hp,vy:13,alive:true,phase:rand(0,TAU)};
 toast('⚠ COLOSSAL COLOR BOSS!',g.W/2,g.H*.25,'#fff5a1',1.6);
 snd('boss');g.shake=8;
}
function spawnGroup(){
 const w=g.W,stage=g.wave,cap=w<480?900:1250;
 if(g.enemyPool.length>=cap)return;
 const laneCount=w<500?5:9;
 g.formation=(g.formation+1)%7;
 const offset=g.formation%laneCount;
 const n=min(cap-g.enemyPool.length,Math.round(20+stage*5+Math.random()*16));
 for(let i=0;i<n;i++){
  const lane=((offset+((i%4)-1)+laneCount)%laneCount);
  const width=w/laneCount;
  const clusterX=width*(lane+.5);
  const x=clamp(clusterX+rand(-width*.36,width*.36),10,w-10);
  const y=-rand(12,135)-(i%4)*10;
  const type=Math.random()<.065&&stage>1?'armor':Math.random()<.08?'volatile':Math.random()<.10&&stage>2?'zig':'glimmer';
  const hp=type==='armor'?5+stage:type==='zig'?2:1;
  g.enemyPool.push({x,y,r:type==='armor'?9:rand(4.3,7.8),hp,maxHp:hp,type,vy:rand(78,130)+stage*13,age:0,sway:rand(0,TAU),color:COLORS[Math.floor(rand(0,COLORS.length))],dead:false});
  g.spawned++;
 }
}
function leak(n=1){g.leaked+=n;g.combo=0;const threshold=18+owned('wall')*5;if(g.leaked%threshold< n){g.base=max(0,g.base-1);g.flash=.13;g.shake=3;snd('hurt')}}
function breakEnemy(e,big=false,fromBlast=false){
 if(e.dead)return;
 e.dead=true;g.kills++;g.score+=Math.floor((e.type==='armor'?11:2)*(1+Math.min(8,g.combo/70)));
 g.combo=g.elapsed-g.lastKO<1.8?g.combo+1:1;g.lastKO=g.elapsed;g.bestCombo=max(g.bestCombo,g.combo);
 g.charge=clamp(g.charge+(e.type==='armor'?1.15:.19)*(1+owned('beam')*.2),0,100);
 if(g.kills%60===0){toast('+'+g.combo+' COMBO!',g.W*.5,g.H*.43,'#ffecae',.48);snd('combo')}
 if(g.kills>0&&g.kills%1000===0){toast('✦ '+(g.kills/1000)+'K TRUE KOs! ✦',g.W*.5,g.H*.35,'#ffe49d',1.1);g.shake=8}
 if(big||Math.random()<.07){for(let j=0;j<4;j++)addPart(e.x,e.y,rand(-130,130),rand(-140,130),e.color,rand(2,5),rand(.2,.48))}
 if(e.type==='volatile'&&!fromBlast)explode(e.x,e.y,48+owned('blast')*10,1+owned('power'),2);
}
function explode(x,y,r,damage,depth=0){
 blastRing(x,y,r,depth?'#fff5a9':'#a8f4ff');
 for(let i=0;i<10;i++)addPart(x,y,rand(-230,230),rand(-180,170),COLORS[i%COLORS.length],rand(2,5),rand(.19,.48));
 if(depth>3)return 0;
 let hits=0;
 for(const e of g.enemyPool){if(e.dead)continue;const dx=e.x-x,dy=e.y-y;if(dx*dx+dy*dy<=(r+e.r)*(r+e.r)){e.hp-=damage;if(e.hp<=0){breakEnemy(e,depth<2,true);hits++}}}
 return hits;
}
function shoot(){
 if(g.scene!=='play')return;
 const vx=g.aimX-g.shipX,vy=g.aimY-g.shipY;
 let a=Math.atan2(min(-35,vy),vx);a=clamp(a,-Math.PI+.13,-.13);
 const fan=1+owned('fan')*2,pierce=8+owned('pierce')*6,damage=1+Math.floor(owned('power')*.7);
 for(let i=0;i<fan;i++){
  const spread=fan===1?0:(i-(fan-1)/2)*(.105+owned('fan')*.008);
  const theta=a+spread;
  g.bullets.push({x:g.shipX,y:g.shipY-28,vx:Math.cos(theta)*940,vy:Math.sin(theta)*940,r:8+owned('focus')*2.6,damage,pierce,age:0,life:1.45,color:COLORS[(g.shotCount+i)%COLORS.length],seen:new Set(),explosive:owned('blast')});
 }
 g.shotCount++;g.fireDelay=max(.061,.158*Math.pow(.84,owned('rate')));
 for(let i=0;i<6;i++)addPart(g.shipX,g.shipY-31,rand(-40,40),rand(-190,-70),'#b3f8ff',rand(1,3),.20);
 snd('laser',1.1);
 g.shake=max(g.shake,1.2);
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
 toast('✦ PRISM CANNON! '+hits+' KOs!',g.W*.5,g.H*.33,'#fff4b2',1.1);
 snd('burst');if(navigator.vibrate)try{navigator.vibrate([25,30,50])}catch(e){}
 return true;
}
function bossCheck(){
 if(!g.boss||g.boss.hp>0)return;
 const b=g.boss;g.boss=null;g.bossesDefeated++;g.base=min(g.baseMax,g.base+12);
 g.score+=3000;snd('win');toast('★ COLOSSUS DOWN! ★',g.W*.5,g.H*.34,'#ffe1a2',1.25);
 explode(b.x,b.y,125,3,3);g.shake=13;g.superFlash=.6;
}
function collisionShots(dt){
 for(let i=g.bullets.length-1;i>=0;i--){
  const b=g.bullets[i];b.x+=b.vx*dt;b.y+=b.vy*dt;b.age+=dt;
  if(b.x< -25||b.x>g.W+25||b.y< -40||b.age>b.life||b.pierce<=0){g.bullets.splice(i,1);continue}
  if(g.boss){
   const bb=g.boss,dx=b.x-bb.x,dy=b.y-bb.y;
   if(abs(dx)<bb.w*.5+6&&abs(dy)<48){bb.hp-=b.damage*2.1;b.pierce=0;g.hitCount++;blastRing(b.x,b.y,20,'#fff1a9');bossCheck();continue}
  }
  for(const e of g.enemyPool){
   if(e.dead||b.seen.has(e))continue;
   const dx=e.x-b.x,dy=e.y-b.y,r=e.r+b.r;
   if(dx*dx+dy*dy>r*r)continue;
   b.seen.add(e);e.hp-=b.damage;b.pierce--;g.hitCount++;
   if(e.hp<=0)breakEnemy(e);
   explode(e.x,e.y,27+b.explosive*12,b.damage,1);
   if(b.pierce<=0)break;
  }
 }
}
function tick(dt){
 if(g.scene!=='play')return;
 dt=clamp(dt,0,.045);if(dt<=0)return;
 g.elapsed+=dt;
 const previousWave=g.wave;g.wave=min(5,1+Math.floor(g.elapsed/32));
 if(g.wave!==previousWave){Audio?.start(min(4,g.wave-1));snd('flow');toast('✦ WAVE '+g.wave+' · '+WAVES[g.wave-1]+'!',g.W/2,g.H*.32,'#ffefad',1.05)}
 const k=g.keys;
 let dir=(k.has('ArrowRight')||k.has('KeyD')?1:0)-(k.has('ArrowLeft')||k.has('KeyA')?1:0);
 if(dir){g.shipX=clamp(g.shipX+dir*470*dt,24,g.W-24);g.aimX=g.shipX;g.aimY=g.shipY-280}
 else if(g.pointer){g.shipX+=clamp(g.pointer.x-g.shipX,-600*dt,600*dt);g.aimX=g.pointer.x;g.aimY=g.pointer.y}
 // No pointer and no key: ship remains still and no gunshot is created.
 g.shipX=clamp(g.shipX,24,g.W-24);
 g.fireDelay-=dt;
 if((g.pointer?.down||g.fireKey)&&g.fireDelay<=0)shoot();
 g.spawnTimer-=dt;
 if(g.spawnTimer<=0){spawnGroup();g.spawnTimer=clamp(.156-g.wave*.008,.096,.148)}
 if((g.elapsed>=43&&g.bossesDefeated===0&&!g.boss)||(g.elapsed>=91&&g.bossesDefeated===1&&!g.boss)||(g.elapsed>=137&&g.bossesDefeated===2&&!g.boss))summonBoss();
 for(let i=g.enemyPool.length-1;i>=0;i--){
  const e=g.enemyPool[i];if(e.dead){g.enemyPool[i]=g.enemyPool[g.enemyPool.length-1];g.enemyPool.pop();continue}
  e.age+=dt;e.y+=e.vy*dt;
  if(e.type==='zig')e.x+=Math.sin(e.age*5+e.sway)*65*dt;
  else e.x+=Math.sin(e.age*1.5+e.sway)*6*dt;
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
 $('status').textContent=g.scene==='play'?(g.boss?'★ DESTROY THE COLOSSUS!':'✦ '+WAVES[g.wave-1]+' · HOLD TO FIRE'):'HOLD TO FIRE • AIM AT THE SWARM';
 $('weaponLevel').textContent='LV '+g.level;
 $('superFill').style.width=Math.floor(g.charge)+'%';$('superText').textContent=Math.floor(g.charge)+'%';$('superReady').textContent=g.charge>=100?'READY!':'CHARGE';
 $('superBtn').classList.toggle('ready',g.charge>=100);$('superBtn').setAttribute('aria-disabled',String(g.charge<100));
 $('bossHUD').hidden=!g.boss;if(g.boss){$('bossLabel').textContent='COLOSSUS '+g.bossesDefeated+'/3';$('bossFill').style.width=clamp(g.boss.hp/g.boss.maxHp*100,0,100)+'%'}
 $('flashLayer').style.opacity=clamp(g.superFlash*.36+g.flash*.36,0,.37);
}
function rounded(x,y,w,h,r,color){ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill()}
function ring(x,y,r,color='#fff'){ctx.strokeStyle=color;ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.stroke()}
function drawEnemy(e){
 const x=e.x,y=e.y,r=e.r;ctx.save();ctx.translate(x,y);
 if(e.type==='armor'){
  ctx.fillStyle='#ffeea7';ctx.beginPath();for(let k=0;k<6;k++){const a=k*TAU/6;ctx.lineTo(Math.cos(a)*r*1.2,Math.sin(a)*r*1.2)}ctx.closePath();ctx.fill();
  ctx.fillStyle='#9766cf';ctx.fillRect(-r*.6,-r*.6,r*1.2,r*1.2);
 }else{
  ctx.fillStyle=e.color;ctx.beginPath();ctx.arc(0,0,r,0,TAU);ctx.fill();
  if(e.type==='volatile'){ctx.strokeStyle='#fff1b3';ctx.lineWidth=1.7;ctx.stroke();ctx.fillStyle='#fff';ctx.fillRect(-2,-2,4,4)}
 }
 if(r>5.3){ctx.fillStyle='#27385e';ctx.fillRect(-r*.4,-1,2,2);ctx.fillRect(r*.2,-1,2,2)}
 ctx.restore();
}
function drawBoss(b,t){
 const x=b.x,y=b.y;ctx.save();ctx.translate(x,y);ctx.rotate(Math.sin(b.phase*1.5)*.07);
 const rad=b.w*.49;
 for(let k=0;k<12;k++){const a=TAU*k/12;ctx.fillStyle=k%2?'#e6c0fb':'#ffe0a7';ctx.beginPath();ctx.ellipse(Math.cos(a)*rad*.91,Math.sin(a)*rad*.78,rad*.28,rad*.4,a,0,TAU);ctx.fill()}
 ctx.fillStyle='#f8c8fb';ctx.beginPath();ctx.ellipse(0,0,rad*.92,rad*.85,0,0,TAU);ctx.fill();
 ctx.fillStyle='#fff5e1';ctx.beginPath();ctx.ellipse(0,-4,rad*.72,rad*.68,0,0,TAU);ctx.fill();
 ctx.fillStyle='#765daa';ctx.beginPath();ctx.arc(-rad*.29,-rad*.13,rad*.105,0,TAU);ctx.arc(rad*.29,-rad*.13,rad*.105,0,TAU);ctx.fill();
 ctx.lineWidth=3;ctx.strokeStyle='#d182be';ctx.beginPath();ctx.arc(0,rad*.17,rad*.23,.15,Math.PI-.15);ctx.stroke();
 ctx.fillStyle='#fff2b0';ctx.beginPath();ctx.moveTo(0,-rad*1.1);ctx.lineTo(rad*.16,-rad*.77);ctx.lineTo(0,-rad*.44);ctx.lineTo(-rad*.16,-rad*.77);ctx.closePath();ctx.fill();
 ctx.restore();
}
function ship(t){
 const x=g.shipX,y=g.shipY;ctx.save();ctx.translate(x,y);
 ctx.shadowColor='#61ddff';ctx.shadowBlur=22;
 const dx=g.aimX-x,dy=g.aimY-y,a=clamp(Math.atan2(min(-35,dy),dx)+Math.PI/2,-1.1,1.1);
 ctx.rotate(a*.35);
 const halo=ctx.createRadialGradient(0,0,7,0,0,49);halo.addColorStop(0,'#8becff8c');halo.addColorStop(1,'#7ed8ff00');ctx.fillStyle=halo;ctx.beginPath();ctx.arc(0,0,48,0,TAU);ctx.fill();
 ctx.fillStyle='#d8ffff';ctx.beginPath();ctx.moveTo(0,-37);ctx.lineTo(23,19);ctx.lineTo(9,13);ctx.lineTo(0,32);ctx.lineTo(-9,13);ctx.lineTo(-23,19);ctx.closePath();ctx.fill();
 ctx.fillStyle='#b59eff';ctx.beginPath();ctx.moveTo(0,-20);ctx.lineTo(8,16);ctx.lineTo(0,8);ctx.lineTo(-8,16);ctx.closePath();ctx.fill();
 ctx.fillStyle='#fff7c2';ctx.beginPath();ctx.arc(0,-11,6,0,TAU);ctx.fill();ctx.restore();
}
function draw(t){
 ctx.setTransform(g.dpr,0,0,g.dpr,0,0);const W=g.W,H=g.H;
 const grd=ctx.createLinearGradient(0,0,0,H);grd.addColorStop(0,'#0b1232');grd.addColorStop(.65,'#172f66');grd.addColorStop(1,'#344078');ctx.fillStyle=grd;ctx.fillRect(0,0,W,H);
 ctx.save();if(g.shake){ctx.translate(rand(-g.shake,g.shake),rand(-g.shake,g.shake))}
 for(let i=0;i<65;i++){const x=(i*217.7+93.1)%W,y=((i*131.1+t*.008*(i%3+1))%H);ctx.fillStyle=i%3===0?'#9af6ff96':'#ffbaf88c';ctx.fillRect(x,y,(i%5+1)*.5,(i%5+1)*.5)}
 const laneCount=W<500?5:9;
 for(let k=1;k<laneCount;k++){ctx.strokeStyle='#ffffff13';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(k*W/laneCount,80);ctx.lineTo(k*W/laneCount,g.shipY+20);ctx.stroke()}
 // The bottom is permanently the player's rail, unlike the old roaming survivor.
 ctx.fillStyle='#8eeeff18';ctx.fillRect(0,g.shipY+40,W,H-g.shipY-40);
 ctx.strokeStyle='#7ceffe88';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,g.shipY+40);ctx.lineTo(W,g.shipY+40);ctx.stroke();
 // Incoming troops form huge columns from ABOVE. Culling keeps rendering bounded.
 for(const e of g.enemyPool)if(e.y>60&&e.y<H+20)drawEnemy(e);
 if(g.boss)drawBoss(g.boss,t);
 // Multi-shot plasma tracers are manually emitted.
 for(const b of g.bullets){ctx.lineWidth=b.r*1.25;ctx.strokeStyle=b.color;ctx.shadowColor=b.color;ctx.shadowBlur=10;ctx.beginPath();ctx.moveTo(b.x,b.y);ctx.lineTo(b.x-b.vx*.025,b.y-b.vy*.025);ctx.stroke()}
 ctx.shadowBlur=0;
 for(const z of g.beams){const fade=1-z.age/z.life;ctx.save();ctx.globalAlpha=fade*.72;ctx.fillStyle='#d8f8ffad';ctx.fillRect(z.x-z.w*.5,0,z.w,g.shipY);ctx.fillStyle='#fff5c3';ctx.fillRect(z.x-z.w*.13,0,z.w*.26,g.shipY);ctx.restore()}
 for(const b of g.rings){ctx.globalAlpha=1-b.age/b.life;ctx.lineWidth=5;ring(b.x,b.y,b.r*(.35+.65*b.age/b.life),b.color)}ctx.globalAlpha=1;
 for(const p of g.particles){ctx.globalAlpha=1-p.age/p.life;ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.r*(1-p.age/p.life*.3),0,TAU);ctx.fill()}ctx.globalAlpha=1;
 ship(t);
 // Subtle aiming lane: only visible while player is deliberately firing.
 if((g.pointer?.down||g.fireKey)&&g.scene==='play'){
  ctx.strokeStyle='#b7fcff87';ctx.lineWidth=2;ctx.setLineDash([5,9]);ctx.beginPath();ctx.moveTo(g.shipX,g.shipY-31);ctx.lineTo(g.aimX,g.aimY);ctx.stroke();ctx.setLineDash([]);
  ctx.strokeStyle='#ffe8b9';ctx.lineWidth=2;ring(g.aimX,g.aimY,11,'#ffe8b9');
 }
 for(const txt of g.texts){const fade=1-txt.age/txt.life;ctx.globalAlpha=fade;ctx.textAlign='center';ctx.font='1000 '+Math.round(clamp(W*.040,17,31))+'px ui-rounded,system-ui';ctx.lineWidth=5;ctx.strokeStyle='#132047';ctx.strokeText(txt.str,txt.x,txt.y-txt.age*42);ctx.fillStyle=txt.color;ctx.fillText(txt.str,txt.x,txt.y-txt.age*42)}ctx.globalAlpha=1;
 // Danger warning marks descending waves of enemies at lower rows.
 if(g.scene==='play'&&g.enemyPool.some(e=>e.y>g.shipY-120)){ctx.strokeStyle='#ff87c78a';ctx.lineWidth=4;ctx.strokeRect(2,g.shipY-100,W-4,112)}
 ctx.restore();
}
$('overlay').addEventListener('click',e=>{const btn=e.target.closest('button[data-action]');if(!btn)return;Audio?.unlock();snd('click');switch(btn.dataset.action){case'start':reset();break;case'menu':menu();break;case'help':help();break;case'resume':resume();break;case'upgrade':selectUpgrade(Number(btn.dataset.index)||0);break}});
$('muteBtn').addEventListener('click',()=>{save.muted=!save.muted;persist();Audio?.setMuted(save.muted);$('muteBtn').textContent=save.muted?'♩':'♫'});
$('pauseBtn').addEventListener('click',()=>{if(g.scene==='play')pause();else if(g.scene==='paused')resume()});
$('superBtn').addEventListener('click',()=>{Audio?.unlock();special()});
function ptr(e){const r=canvas.getBoundingClientRect();const x=clamp(e.clientX-r.left,24,g.W-24),y=clamp(e.clientY-r.top,100,g.shipY-55);return{x,y,down:true,id:e.pointerId}}
canvas.addEventListener('pointerdown',e=>{if(g.scene!=='play'||g.pointer)return;e.preventDefault();Audio?.unlock();g.pointer=ptr(e);g.shipX=g.pointer.x;g.aimX=g.pointer.x;g.aimY=g.pointer.y;g.fireDelay=0;shoot();try{canvas.setPointerCapture(e.pointerId)}catch(err){}});
canvas.addEventListener('pointermove',e=>{if(g.scene!=='play')return;const p=ptr(e);if(g.pointer&&g.pointer.id===e.pointerId){g.pointer=p}else if(e.pointerType==='mouse'&&!g.pointer){g.aimX=p.x;g.aimY=p.y;g.shipX=p.x}});
function stopPointer(e){if(g.pointer&&g.pointer.id===e.pointerId){g.pointer=null;g.fireDelay=0}}
canvas.addEventListener('pointerup',stopPointer);canvas.addEventListener('pointercancel',stopPointer);
window.addEventListener('blur',()=>{if(g.scene==='play')pause()});
window.addEventListener('keydown',e=>{
 if(['Space','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.code))e.preventDefault();
 g.keys.add(e.code);
 if(g.scene==='play'){
  if(e.code==='Space'||e.code==='KeyJ'){if(!g.fireKey){Audio?.unlock();g.fireDelay=0;shoot()}g.fireKey=true}
  if(e.code==='KeyQ'&&!e.repeat){Audio?.unlock();special()}
  if(e.code==='Escape'||e.code==='KeyP')pause();
 }else if(g.scene==='upgrade'&&/^Digit[123]$/.test(e.code))selectUpgrade(Number(e.code.at(-1))-1);
 else if(g.scene==='menu'&&e.code==='Enter')reset();
 else if(g.scene==='paused'&&(e.code==='Escape'||e.code==='Enter'||e.code==='KeyP'))resume();
});
window.addEventListener('keyup',e=>{g.keys.delete(e.code);if(e.code==='Space'||e.code==='KeyJ')g.fireKey=false});
let last=0,lastHud=0;function frame(now){const dt=last?min(.045,(now-last)/1000):1/60;last=now;g.now=now;g.fps=Math.round(g.fps*.95+.05/dt);g.frameDt=dt;g.frameCount++;tick(dt);draw(now);if(now-lastHud>95){hud();lastHud=now}requestAnimationFrame(frame)}
if(new URLSearchParams(location.search).get('qa')==='1'){
 window.LumiQA={
  snapshot:()=>({scene:g.scene,time:g.elapsed,wave:g.wave,base:g.base,kills:g.kills,score:g.score,combo:g.combo,shots:g.shotCount,hits:g.hitCount,spawned:g.spawned,leaked:g.leaked,enemies:g.enemyPool.length,level:g.level,super:g.charge,boss:!!g.boss,bosses:g.bossesDefeated,shipX:g.shipX,shipY:g.shipY,weapon:{...g.upgrades},music:Audio?.status(),fps:g.fps}),
  start:()=>reset(),tick:(sec=1)=>{for(let t=0;t<sec;t+=.04){tick(.04);if(g.scene!=='play')break}},
  setBase:(n=100000)=>{g.base=n;g.baseMax=n},
  manualFire:(x=g.W/2,y=170)=>{g.aimX=x;g.aimY=y;g.shipX=clamp(x,24,g.W-24);shoot()},
  holdFire:(on=true)=>{g.fireKey=on;g.fireDelay=0},holdPointer:(x,y,on=true)=>{g.pointer=on?{x,y:clamp(y,100,g.shipY-55),down:true,id:999}:null;g.fireDelay=0},
  summonBoss:()=>summonBoss(),setCharge:(n=100)=>{g.charge=n},special:()=>special(),upgrade:(i=0)=>selectUpgrade(i),
  addEnemies:(n=400)=>{for(let i=0;i<n;i++){const x=clamp(g.W*.5+rand(-110,110),12,g.W-12);g.enemyPool.push({x,y:rand(112,260),r:rand(4,7),hp:1,maxHp:1,type:'glimmer',vy:90,age:0,sway:rand(0,7),color:COLORS[i%COLORS.length],dead:false});g.spawned++}},
  forceUpgrade:()=>levelUp(),win:()=>{g.boss=null;g.bossesDefeated=3;g.elapsed=g.duration;finish(true)},lose:()=>{g.base=0;finish(false)},
  resize:()=>dimension(),audio:()=>Audio?.status(),getDimension:()=>({W:g.W,H:g.H}),render:()=>draw(performance.now())
 };
}
Audio?.setMuted(save.muted);$('muteBtn').textContent=save.muted?'♩':'♫';window.addEventListener('resize',dimension,{passive:true});dimension();g.shipX=g.W/2;g.aimX=g.W/2;menu();requestAnimationFrame(frame);
})();
