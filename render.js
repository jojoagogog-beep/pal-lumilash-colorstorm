/* LUMILASH: COLORSTORM — custom premium pastel Canvas renderer (no external sprite dependencies). */
(()=>{'use strict';
const C=window.LumiCore;
if(!C)throw Error('LumiCore must initialize first');
const {g,WORLD,ctx,clamp,orbitCount,orbitRadius}=C;
const TAU=Math.PI*2;
const RAD=(x,y,r,colors)=>{
 const grd=ctx.createRadialGradient(x-r*.28,y-r*.37,1,x,y,r);
 for(const [step,color] of colors)grd.addColorStop(step,color);
 return grd;
};
function rgba(hex,a){
 const v=hex.replace('#','');
 return 'rgba('+parseInt(v.slice(0,2),16)+','+parseInt(v.slice(2,4),16)+','+parseInt(v.slice(4,6),16)+','+a+')';
}
function ellipse(x,y,rx,ry,color){
 ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,TAU);ctx.fill();
}
function circ(x,y,r,color){ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill()}
function polygon(n,r,x=0,y=0,rot=0){
 ctx.beginPath();
 for(let i=0;i<n;i++){
  const a=rot+i*TAU/n;
  if(!i)ctx.moveTo(x+Math.cos(a)*r,y+Math.sin(a)*r);
  else ctx.lineTo(x+Math.cos(a)*r,y+Math.sin(a)*r);
 }
 ctx.closePath();
}
function star(x,y,outer,inner,points,color,rot=0){
 ctx.fillStyle=color;ctx.beginPath();
 for(let i=0;i<points*2;i++){
  const radius=i%2?inner:outer,a=rot+i*Math.PI/points;
  const xx=x+radius*Math.cos(a),yy=y+radius*Math.sin(a);
  if(i===0)ctx.moveTo(xx,yy);else ctx.lineTo(xx,yy);
 }
 ctx.closePath();ctx.fill();
}
function round(x,y,w,h,r,color){
 ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();
}
function shadow(x,y,rx,ry,alpha=.1){ellipse(x,y+10,rx,ry,'rgba(64,106,120,'+alpha+')')}
function hash(a,b){
 let n=(Math.imul(a|0,374761393)+Math.imul(b|0,668265263))|0;
 n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;
}
function drawFlower(x,y,size,color,seed){
 ctx.save();ctx.translate(x,y);ctx.rotate(seed*TAU);
 for(let i=0;i<5;i++){
  let a=TAU*i/5;ellipse(Math.cos(a)*size*.47,Math.sin(a)*size*.47,size*.4,size*.34,rgba(color,.61));
 }
 circ(0,0,size*.27,'#fff9d4');circ(-size*.07,-size*.05,size*.065,'#fff');
 ctx.restore();
}
function background(now){
 const {viewW:W,viewH:H}=g,w=W,h=H,theme=WORLD[g.world];
 const sky=ctx.createLinearGradient(0,0,w,h);
 sky.addColorStop(0,theme.sky);
 sky.addColorStop(.65,theme.ground);
 sky.addColorStop(1,g.world===4?'#e9d7ff':'#e8f8df');
 ctx.fillStyle=sky;ctx.fillRect(-15,-15,w+30,h+30);
 const camX=g.camX,camY=g.camY;
 // Deep scrolling layers of soft painterly shapes, never a black void.
 const ox=(camX*.24)%690,oy=(camY*.2)%530;
 for(let i=-1;i<5;i++){
  const x=i*670+120-ox,y=150-oy+Math.sin(i*2.5)*260;
  const grd=ctx.createRadialGradient(x,y,18,x,y,430);
  grd.addColorStop(0,g.world%2?'#ffffff34':'#fdffff53');
  grd.addColorStop(1,'#ffffff00');
  ctx.fillStyle=grd;ctx.beginPath();ctx.ellipse(x,y,430,270,0,0,TAU);ctx.fill();
 }
 const unit=128,bx=Math.floor(camX/unit)-1,by=Math.floor(camY/unit)-1;
 const maxX=Math.ceil(W/unit)+3,maxY=Math.ceil(H/unit)+3;
 for(let i=0;i<maxX;i++)for(let j=0;j<maxY;j++){
  const tx=bx+i,ty=by+j,sd=hash(tx,ty),sx=tx*unit-camX,sy=ty*unit-camY;
  if(sd>.24){
   const px=sx+unit*hash(ty+20,tx),py=sy+unit*hash(tx-4,ty+17);
   const size=5+sd*5;
   drawFlower(px,py,size,theme.enemy[(Math.abs(tx+ty))%4],sd);
  }
  if(sd>.68){
   ctx.save();ctx.globalAlpha=.55;
   star(sx+unit*.22,sy+unit*.7,3+sd*2,1.5,4,'#fff',sd*TAU);
   ctx.restore();
  }
  if(sd<.17){
   ctx.strokeStyle='#ffffff64';ctx.lineWidth=3;ctx.lineCap='round';
   ctx.beginPath();ctx.moveTo(sx+41,sy+53);ctx.quadraticCurveTo(sx+54,sy+32,sx+72,sy+53);ctx.stroke();
  }
 }
 // Light concentric tempo rings keep the player visually grounded.
 const cx=g.x-camX,cy=g.y-camY,rad=78+Math.sin(now*.0011)*2;
 ctx.save();ctx.globalAlpha=.22;ctx.strokeStyle='#ffffff';ctx.lineWidth=3;
 ctx.setLineDash([3,19]);
 ctx.beginPath();ctx.arc(cx,cy,rad+15,0,TAU);ctx.stroke();
 ctx.setLineDash([]);ctx.restore();
}
function enemyBody(e,now){
 const x=e.x-g.camX,y=e.y-g.camY,r=e.r;
 const wob=Math.sin(e.age*4+e.wiggle)*.045;
 ctx.save();ctx.translate(x,y);ctx.rotate(Math.sin(e.age*1.8+e.wiggle)*.095);
 ctx.scale(1+wob,1-wob);
 shadow(0,r*.65,r*.9,7,.13);
 if(e.type==='boss'){
  ctx.save();ctx.rotate(now*.00055);
  for(let i=0;i<12;i++){
   let a=i*TAU/12;
   ctx.save();ctx.rotate(a);ellipse(0,-r*.77,r*.37,r*.56,i%2?'#ffddae':'#ebbbf9');ctx.restore();
  }ctx.restore();
  circ(0,0,r*.86,'#fff5d8');circ(0,-7,r*.73,e.hurt>0?'#fff':e.color);
  ctx.lineWidth=7;ctx.strokeStyle='#fff';ctx.beginPath();ctx.arc(0,0,r*.83,0,TAU);ctx.stroke();
  star(0,-r*.7,21,10,5,'#ffca85',-.5);
 }else{
  if(e.type==='puff'){
   for(let k=0;k<9;k++){const a=k*TAU/9;circ(Math.cos(a)*r*.76,Math.sin(a)*r*.76,r*.37,rgba(e.color,.87))}
  }else if(e.type==='tank'){
   for(let i=0;i<7;i++){const a=i*TAU/7;ellipse(Math.sin(a)*r*.75,Math.cos(a)*r*.78,r*.28,r*.34,'#ffffffa8')}
  }else if(e.type==='rush'){
   star(0,0,r*1.25,r*.75,6,'#fff9e6',Math.PI/6);
  }else if(e.type==='spitter'){
   for(let i=0;i<6;i++){
    const a=i*TAU/6;circ(Math.cos(a)*r*.73,Math.sin(a)*r*.73,8,'#fff9e7');
   }
  }else if(e.type==='splitter'){
   for(let i=0;i<5;i++){
    const a=i*TAU/5;circ(Math.cos(a)*r*.75,Math.sin(a)*r*.75,r*.42,'#fff');
   }
  }
  ctx.fillStyle=e.hurt>0?'#fff':e.color;
  ctx.strokeStyle='#ffffff';ctx.lineWidth=e.type==='mini'?2:3.5;
  ctx.beginPath();ctx.ellipse(0,0,r*.92,r*(e.type==='rush'?.78:.9),0,0,TAU);ctx.fill();ctx.stroke();
  ellipse(-r*.25,-r*.34,r*.42,r*.20,'#ffffff82');
 }
 // expressive faces with eye highlights and blush
 const ey=r*.31,eyeY=-r*.09,er=e.type==='boss'?7:r*.105+2;
 for(const sign of [-1,1]){
  const ex=sign*ey;
  ellipse(ex,eyeY,er*.78,er*1.2,'#445574');
  circ(ex-er*.2,eyeY-er*.32,Math.max(1.2,er*.35),'#fff');
  ellipse(sign*r*.49,r*.18,r*.14,r*.075,'#ff829488');
 }
 ctx.strokeStyle=e.type==='spitter'?'#9a5a84':'#7f6885';ctx.lineWidth=Math.max(1.5,r*.08);ctx.lineCap='round';
 ctx.beginPath();
 if(e.type==='spitter')ctx.arc(0,r*.30,r*.15,0,Math.PI,true);
 else ctx.arc(0,r*.16,r*.20,.16,Math.PI-.16);
 ctx.stroke();
 if(e.type==='tank'||e.type==='boss'){
  const hp=Math.max(0,e.hp/e.maxHp);
  round(-r*.67,-r-19,r*1.34,5,4,'#e6f1f4');
  round(-r*.67,-r-19,r*1.34*hp,5,4,e.type==='boss'?'#f9b671':'#9fd4ae');
 }
 if(e.hurt>0){
  ctx.globalAlpha=clamp(e.hurt*4,0,.65);ctx.fillStyle='#ffffff';
  ctx.beginPath();ctx.arc(0,0,r*.93,0,TAU);ctx.fill();
 }
 ctx.restore();
}
function enemyVisible(e,W,H){
 const x=e.x-g.camX,y=e.y-g.camY;
 return x>-100&&y>-110&&x<W+100&&y<H+120;
}
function player(now){
 const x=g.x-g.camX,y=g.y-g.camY;
 ctx.save();ctx.translate(x,y);ctx.rotate(g.rx*.025);
 shadow(0,28,35,9,.18);
 const pulse=Math.sin(now*.005)*2;
 // waist-length scarf trail and pristine white-blue lightweight armor
 ctx.save();ctx.rotate(-Math.PI/2+Math.atan2(g.ry,g.rx||.001)*.13);
 ctx.fillStyle='#b4a1f8aa';
 ctx.beginPath();ctx.moveTo(4,19);ctx.quadraticCurveTo(-25,63+Math.sin(now*.003)*13,-9,72);
 ctx.quadraticCurveTo(8,39,16,22);ctx.fill();ctx.restore();
 circ(0,0,36+pulse,'#fffffff1');
 circ(0,0,29+pulse, g.inv>0&&Math.floor(now/110)%2===0?'#fff5c7':'#a1e5e9');
 ctx.strokeStyle='#fff';ctx.lineWidth=4;
 ctx.beginPath();ctx.arc(0,0,30+pulse,0,TAU);ctx.stroke();
 ctx.fillStyle='#fefefe';ctx.beginPath();ctx.ellipse(0,-5,19,19,0,0,TAU);ctx.fill();
 // prism crown and three crown jewels
 for(let i=-1;i<=1;i++){
  const xx=i*11;
  star(xx,-27-Math.abs(i)*4,i===0?12:7,4,4,i===0?'#f9c67a':'#df9bec',.1);
 }
 for(const dir of [-1,1]){
  circ(dir*8,-7,3.9,'#587e98');circ(dir*6.9,-8.4,1.2,'#fff');
  ellipse(dir*13,4,5,2.7,'#f3a7bccc');
 }
 ctx.strokeStyle='#6d9aa9';ctx.lineWidth=2;ctx.lineCap='round';
 ctx.beginPath();ctx.arc(0,3,4.4,.16,Math.PI-.16);ctx.stroke();
 // body armor chest insignia and shield detailing
 ctx.fillStyle='#fff';ctx.beginPath();ctx.roundRect(-13,16,26,17,8);ctx.fill();
 star(0,22,9,3,4,'#b39ff1',Math.PI/4);
 if(g.inv>0){
  ctx.globalAlpha=.65;ctx.strokeStyle='#ffe6a1';ctx.lineWidth=4;
  ctx.beginPath();ctx.arc(0,0,41+Math.sin(now*.014)*3,0,TAU);ctx.stroke();
 }
 ctx.restore();
}
function drawBlades(now){
 const count=orbitCount(),r=orbitRadius(),time=g.elapsed*2.8;
 for(let i=0;i<count;i++){
  const a=time+i*TAU/count;
  const x=g.x-g.camX+Math.cos(a)*r,y=g.y-g.camY+Math.sin(a)*r;
  ctx.save();ctx.translate(x,y);ctx.rotate(a+Math.PI*.5);
  ctx.shadowColor='#f9a3ed';ctx.shadowBlur=19;
  ellipse(0,0,17,32,'#ffffff94');
  star(0,0,27,10,4,i%2?'#9adff5':'#f4a9d7',Math.PI/4);
  star(0,0,16,5,4,'#fff',Math.PI/4);
  circ(0,0,5,'#ffeec9');
  ctx.restore();
 }
}
function drawArcs(){
 for(const a of g.arcs){
  const t=clamp(a.age/a.life,0,1),x=a.x-g.camX,y=a.y-g.camY;
  const rad=a.range*(.68+.29*t);
  const start=a.angle-a.width*.5,end=a.angle+a.width*.5;
  ctx.save();
  ctx.globalAlpha=(1-t)*.88;
  ctx.lineCap='round';ctx.shadowBlur=19;ctx.shadowColor=a.color;
  for(const [weight,color] of [[36,'#ffffff28'],[21,'#fbdbf9b6'],[12,a.color],[3,'#fff']]){
   ctx.strokeStyle=color;ctx.lineWidth=weight;
   ctx.beginPath();ctx.arc(x,y,rad,start,end);ctx.stroke();
  }
  ctx.restore();
 }
}
function drops(now){
 const W=g.viewW,H=g.viewH;
 for(const o of g.drops){
  const x=o.x-g.camX,y=o.y-g.camY;
  if(x<-20||x>W+20||y<-20||y>H+20)continue;
  ctx.save();ctx.translate(x,y);ctx.rotate(now*.0018+o.spin);
  ctx.shadowColor=o.color;ctx.shadowBlur=7;
  polygon(4,7.5,0,0,Math.PI/4);ctx.fillStyle=o.color;ctx.fill();
  star(0,0,4,1.5,4,'#fff',Math.PI/4);
  ctx.restore();
 }
}
function projectiles(){
 for(const p of g.projectiles){
  const x=p.x-g.camX,y=p.y-g.camY;
  ctx.save();ctx.shadowColor=p.color;ctx.shadowBlur=12;
  circ(x,y,p.r+3,'#ffffffb9');circ(x,y,p.r,p.color);
  star(x,y,p.r*.65,p.r*.25,4,'#fff',.5);ctx.restore();
 }
}
function effects(now){
 for(const a of g.rings){
  const t=clamp(a.age/a.life,0,1),x=a.x-g.camX,y=a.y-g.camY,r=a.r0+(a.r-a.r0)*(1-(1-t)**2);
  ctx.save();ctx.globalAlpha=(1-t)*.89;ctx.lineWidth=a.line*(1-t)+1;ctx.strokeStyle=a.color;
  ctx.shadowColor=a.color;ctx.shadowBlur=17;ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.stroke();ctx.restore();
 }
 for(const p of g.particles){
  const x=p.x-g.camX,y=p.y-g.camY;
  const t=clamp(p.age/p.life,0,1),r=p.r*(1-t*.38);
  ctx.save();ctx.translate(x,y);ctx.rotate(p.angle+p.age*3);ctx.globalAlpha=1-t;
  if(p.shape%4===0){ctx.fillStyle=p.color;ctx.fillRect(-r,-r*.4,r*2,r*.8)}
  else if(p.shape%4===1)star(0,0,r*1.25,r*.38,4,p.color,.1);
  else circ(0,0,r,p.color);
  ctx.restore();
 }
}
function damageText(){
 for(const s of g.texts){
  const t=clamp(s.age/s.life,0,1),y=s.y-t*65;
  ctx.save();ctx.globalAlpha=t>.68?(1-t)/.32:1;
  ctx.textAlign='center';ctx.textBaseline='middle';
  const large=s.giant;
  ctx.font='1000 '+(large?Math.min(41,g.viewW*.065):Math.min(23,g.viewW*.042))+'px ui-rounded,system-ui';
  ctx.lineWidth=5;ctx.strokeStyle='#ffffff';
  ctx.strokeText(s.txt,s.x,y);ctx.fillStyle=s.kind==='gold'?'#e99f49':s.kind==='bad'?'#e7669a':'#b26ed4';
  ctx.fillText(s.txt,s.x,y);ctx.restore();
 }
}
function screenSpecial(now){
 if(g.burstActive>0){
  const t=1-g.burstActive/.76,x=g.x-g.camX,y=g.y-g.camY;
  const r=(Math.min(g.viewW,g.viewH)*.65)*t;
  const grd=ctx.createRadialGradient(x,y,r*.2,x,y,r+120);
  grd.addColorStop(0,'#fff9e900');grd.addColorStop(.4,'#ffffe988');
  grd.addColorStop(1,'#f6d2ff00');
  ctx.save();ctx.globalAlpha=.6*(1-t);ctx.fillStyle=grd;
  ctx.beginPath();ctx.arc(x,y,r+100,0,TAU);ctx.fill();
  for(let i=0;i<11;i++){
   const a=TAU*i/11+now*.0003;ctx.save();ctx.rotate(0);
   ctx.strokeStyle=i%2?'#ffc0ed':'#fff7ca';ctx.lineWidth=8*(1-t)+1;ctx.globalAlpha=(1-t)*.68;
   ctx.beginPath();ctx.moveTo(x+Math.cos(a)*r*.1,y+Math.sin(a)*r*.1);
   ctx.lineTo(x+Math.cos(a)*(r+140),y+Math.sin(a)*(r+140));ctx.stroke();ctx.restore();
  }
  ctx.restore();
 }
 if(g.flash>0){
  ctx.save();ctx.globalAlpha=clamp(g.flash*.34,0,.22);
  ctx.fillStyle='#fffef4';ctx.fillRect(0,0,g.viewW,g.viewH);ctx.restore();
 }
}
function draw(now){
 const W=g.viewW,H=g.viewH;
 ctx.setTransform(g.dpr,0,0,g.dpr,0,0);
 ctx.save();
 const shake=g.shake>0?g.shake*7:0;
 g.camX=g.x-W*.5+(shake?Math.sin(now*.19)*shake:0);
 g.camY=g.y-H*.5+(shake?Math.cos(now*.17)*shake:0);
 background(now);
 drops(now);
 projectiles();
 let visible=0;
 for(const e of g.enemies){if(enemyVisible(e,W,H)){enemyBody(e,now);visible++}}
 drawArcs();
 drawBlades(now);player(now);effects(now);screenSpecial(now);damageText();
 if(g.scene==='menu'){
  // Warm ambient rain of stars behind the main menu.
  for(let i=0;i<30;i++){
   const x=(hash(i,9)*W+now*.006*(i%3+1))%W;
   const y=(hash(4,i)*H+Math.sin(now*.0007+i)*17+H)%H;
   ctx.save();ctx.globalAlpha=.28;star(x,y,2+i%3,1,4,'#fff',now*.001);ctx.restore();
  }
 }
 ctx.restore();
 g.frameCount++;
 g.checks={visibleEnemies:visible,canvasReady:!!ctx,stageName:WORLD[g.world].name};
}
window.LumiRender={draw,status:()=>({...g.checks})};
})();