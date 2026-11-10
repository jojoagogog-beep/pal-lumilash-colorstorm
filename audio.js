/* LUMILASH COLORSTORM — original offline-friendly synth score and arcade sound design.
 * Procedural music composed for five original worlds, scheduled against WebAudio clock.
 * No third-party music, soundfiles, or network calls. */
(()=>{'use strict';
const SCALE=[0,2,4,7,9,11],CHORDS=[0,5,3,4,0,3,5,4];
const MOTIFS=[
 [0,2,4,-1,5,4,2,0,2,4,5,7,5,4,2,-1],
 [0,4,2,4,5,7,5,4,4,2,0,2,5,4,2,0],
 [0,2,7,5,4,2,4,5,7,5,9,7,5,4,2,0],
 [4,2,0,-1,2,4,5,4,0,2,4,7,9,7,5,4],
 [0,7,5,9,7,5,4,2,4,9,7,11,9,7,5,4]
],ROOTS=[60,62,65,57,64],BPM=[118,126,132,122,144];
let ctx=null,mix=null,volume=null,comp=null,noise=null,playing=false,muted=false;
let world=0,step=0,next=0,timer=0,lastTap=-100,lastKill=-100;
let energy=.22,targetEnergy=.22,bossMode=false,flowMode=false,burstReady=false,progress=0;
let section=0,lastAccent=-100,lastHorde=-100;
const COLORS=[
 {lead:'triangle',pad:'sine',counter:12,hat:1.0},
 {lead:'sine',pad:'triangle',counter:19,hat:1.22},
 {lead:'triangle',pad:'sine',counter:7,hat:.94},
 {lead:'sine',pad:'triangle',counter:12,hat:1.12},
 {lead:'triangle',pad:'sine',counter:24,hat:1.35}
];
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function init(){
 if(ctx)return ctx;
 const AudioCtx=window.AudioContext||window.webkitAudioContext;
 if(!AudioCtx)return null;
 ctx=new AudioCtx();mix=ctx.createGain();mix.gain.value=1;
 comp=ctx.createDynamicsCompressor();comp.threshold.value=-18;comp.knee.value=16;comp.ratio.value=3;comp.attack.value=.004;comp.release.value=.2;
 volume=ctx.createGain();volume.gain.value=muted?0:.29;
 mix.connect(comp);comp.connect(volume);volume.connect(ctx.destination);
 noise=ctx.createBuffer(1,ctx.sampleRate,ctx.sampleRate);
 const a=noise.getChannelData(0);
 let seed=897711;
 for(let i=0;i<a.length;i++){seed=(Math.imul(seed,1664525)+1013904223)|0;a[i]=((seed>>>8)/8388608)-1}
 return ctx;
}
function unlock(){const a=init();if(a&&a.state!=='running')a.resume().catch(()=>{});return !!a}
function env(g,start,peak,attack,release){
 g.gain.cancelScheduledValues(start);g.gain.setValueAtTime(.0001,start);
 g.gain.exponentialRampToValueAtTime(Math.max(.0002,peak),start+attack);
 g.gain.exponentialRampToValueAtTime(.0001,start+release);
}
function osc(freq,when,dur=0.2,amp=.1,wave='sine',dest=mix,detune=0){
 if(!ctx)return;
 const o=ctx.createOscillator(),g=ctx.createGain();
 o.type=wave;o.frequency.setValueAtTime(freq,when);if(detune)o.detune.value=detune;
 env(g,when,amp,.008,Math.max(.04,dur));
 o.connect(g);g.connect(dest);o.start(when);o.stop(when+Math.max(.05,dur)+.04);
}
const hz=n=>440*Math.pow(2,(n-69)/12);
function softBell(n,when,amp=.045){
 const f=hz(n);osc(f,when,.34,amp,'sine');
 osc(f*2.01,when,.20,amp*.27,'sine',mix,3);
 osc(f*3.97,when,.11,amp*.1,'sine');
}
function stringPad(n,when,dur=1.0,amp=.022){
 osc(hz(n),when,dur,amp,COLORS[world].pad,mix,-4);
 osc(hz(n),when,dur,amp*.7,'triangle',mix,4);
}
function plume(n,when,vol=.15){
 const f=hz(n);osc(f,when,.27,vol,'triangle');osc(f*2,when,.13,vol*.21,'sine');
 osc(f*.5,when,.21,vol*.15,'sine');
}
function bass(n,when){
 osc(hz(n),when,.24,.087,'triangle');osc(hz(n)*.5,when,.3,.09,'sine');
}
function kick(when,str=.16){
 const o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';
 o.frequency.setValueAtTime(152,when);o.frequency.exponentialRampToValueAtTime(49,when+.13);
 g.gain.setValueAtTime(str,when);g.gain.exponentialRampToValueAtTime(.0001,when+.23);
 o.connect(g);g.connect(mix);o.start(when);o.stop(when+.25);
}
function hiss(when,duration,vol,filterHz,kind='highpass'){
 if(!ctx)return;
 const node=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain();
 node.buffer=noise;f.type=kind;f.frequency.value=filterHz;
 g.gain.setValueAtTime(Math.max(.0001,vol),when);
 g.gain.exponentialRampToValueAtTime(.0001,when+duration);
 node.connect(f);f.connect(g);g.connect(mix);
 node.start(when,Math.max(0,Math.random()*.65),duration+.005);node.stop(when+duration+.01);
}
function snare(when){hiss(when,.12,.065,1600);osc(176,when,.07,.029,'triangle')}
function tickNote(){
 const t=next,seq=step%16,beat=step%8,bar=Math.floor(step/8);
 energy+=Math.max(-.045,Math.min(.045,targetEnergy-energy));
 const root=ROOTS[world]+[-2,0,2,0,3][world];
 const motif=MOTIFS[world],degree=motif[seq];
 const chord=CHORDS[Math.floor(bar/2)%CHORDS.length];
 const active=energy>.44,big=energy>.7||bossMode,peak=energy>.86;
 const tone=COLORS[world],phase=Math.floor(step/64)%4;
 if(beat===0||beat===4)kick(t,(beat===0?.16:.125)*(1+energy*.55));
 if(big&&beat===0)kick(t+.125,.13);
 if(beat===2||beat===6)snare(t);
 if(beat%2===0||active)hiss(t,.034,(beat%2===0?.019:.011)*(1+energy*.35),7100*tone.hat);
 if(big&&(beat===3||beat===7))hiss(t,.07,.026,5400);
 if(energy>.65&&beat%4===1)hiss(t,.027,.014,8800);
 if(beat%2===0)bass(root-24+chord,t);
 if(big&&beat===6)bass(root-12+chord,t+.04);
 if(degree>=0) {
  const note=root+degree+(seq>7?12:0);
  if(phase===1||world===1)softBell(note,t,.05+energy*.025);
  else plume(note,t,(world===4?.088:.075)*(1+energy*.2));
 }
 // Harmonically stable backing swells change with section and world.
 if(beat===0){
  for(const k of [0,4,7])stringPad(root-12+chord+k,t,1.72,.015+energy*.008);
  if(phase===2||world===3)softBell(root+chord+19,t+.09,.032);
 }
 // Alternate melodic call-and-response, sparse early and bright at high intensity.
 if((active||phase===3)&&beat===5){
  const response=root+chord+tone.counter+(bar%2?2:0);
  softBell(response,t+.065,big?.055:.032);
 }
 if(peak&&beat===7){softBell(root+chord+24,t+.08,.047)}
 if(bossMode&&beat===0){
  osc(hz(root-24+chord),t,.76,.068,'sawtooth');
  hiss(t,.11,.045,900,'bandpass');
 }
 if(flowMode&&beat%4===2)softBell(root+chord+24,t+.04,.056);
 step++;next+=60/BPM[world]/2;
}
function schedule(){
 if(!playing||!ctx||ctx.state!=='running')return;
 let loops=0;
 while(next<ctx.currentTime+.19&&loops<12){tickNote();loops++}
 if(loops===12&&next<ctx.currentTime)next=ctx.currentTime+.04;
}
function setActivity(o={}){
 const opponents=clamp((o.enemies||0)/105,0,1);
 targetEnergy=clamp(.2+opponents*.36+Math.min(.24,(o.combo||0)/120)+clamp(o.progress||0,0,1)*.15+(o.flow?.12:0)+(o.boss?.34:0),.2,1);
 bossMode=!!o.boss;flowMode=!!o.flow;burstReady=!!o.burstReady;progress=clamp(o.progress||0,0,1);
}
function start(w=0,restart=false){
 if(!unlock())return;
 const nw=clamp(w|0,0,4);
 if(restart||nw!==world){step=0;targetEnergy=.22;energy=.22;bossMode=false;flowMode=false}
 world=nw;next=ctx.currentTime+.06;playing=true;
 clearInterval(timer);timer=setInterval(schedule,90);schedule();
}
function stop(){playing=false;clearInterval(timer);timer=0}
function setMuted(on){muted=!!on;if(!ctx)return;volume.gain.setTargetAtTime(muted?0:.29,ctx.currentTime,.02)}
function sfx(kind,power=1){
 if(!ctx||muted||ctx.state!=='running')return;
 const t=ctx.currentTime;
 if(kind==='kill'){
  if(t-lastKill<.028)return;lastKill=t;
  const freq=[392,440,523,587,659][Math.floor(Math.random()*5)]*clamp(power,.8,1.4);
  osc(freq,t,.085,.046,'sine');osc(freq*1.49,t+.023,.075,.023,'triangle');
 }else if(kind==='slash'){
  if(t-lastTap<.055)return;lastTap=t;
  hiss(t,.15,.085,1100,'bandpass');
  osc(175+power*40,t,.11,.052,'sawtooth');
 }else if(kind==='combo'){
  for(let i=0;i<4;i++)osc(hz(72+[0,4,7,12][i]),t+i*.052,.25,.09,'triangle');
 }else if(kind==='burst'){
  hiss(t,.55,.29,380,'bandpass');
  for(let k=0;k<8;k++){osc(hz(60+k*2),t+k*.043,.50-k*.029,.12,'sawtooth');osc(hz(72+k),t+k*.033,.2,.075,'triangle')}
 }else if(kind==='horde'){
  if(t-lastHorde<.092)return;lastHorde=t;
  hiss(t,.08,.048*clamp(power,.6,1.8),1400,'bandpass');
  osc(270+power*43,t,.09,.032,'triangle');
 }else if(kind==='flow'){
  [67,72,76,79,84].forEach((n,i)=>softBell(n,t+i*.066,.15));
  hiss(t,.22,.075,2600,'highpass');
 }else if(kind==='hurt'){osc(144,t,.20,.15,'square');osc(96,t+.05,.16,.055,'sawtooth')}
 else if(kind==='pickup'){osc(970,t,.10,.03,'sine')}
 else if(kind==='upgrade'){
  [60,64,67,72,76].forEach((n,i)=>plume(n,t+i*.09,.17));
 }else if(kind==='boss'){
  for(let i=0;i<5;i++){kick(t+i*.19,.23);osc(88,t+i*.19,.15,.14,'sawtooth')}
 }else if(kind==='win'){
  [60,64,67,72,76,79,84].forEach((n,i)=>plume(n,t+i*.11,.20));
 }else if(kind==='click')osc(640,t,.06,.025,'sine');
}
window.LumiAudio={start,stop,sfx,unlock,setMuted,setActivity,isMuted:()=>muted,isPlaying:()=>playing,status:()=>({playing,muted,context:ctx?.state||'absent',world,step,energy:Number(energy.toFixed(2)),targetEnergy:Number(targetEnergy.toFixed(2)),bossMode,flowMode,progress})};
})();