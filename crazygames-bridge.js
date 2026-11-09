/* CrazyGames HTML5 SDK v3 lifecycle bridge.
 * Safe outside CrazyGames: gracefully disabled if SDK unavailable.
 * No ad request in Basic Launch. Gameplay events are deduplicated. */
(function(){
 'use strict';
 let sdkReady=false,initializing=false,lastSent='none',desired='stop';
 let retryTimer=0,flushTimer=0,attempts=0,lastEventAt=0;
 function sdk(){return window.CrazyGames&&window.CrazyGames.SDK}
 function actuallySend(){
  if(!sdkReady)return;
  const state=desired;
  if(state===lastSent)return;
  const s=sdk();
  if(!s||!s.game)return;
  if(typeof s.environment==='string'&&s.environment==='disabled')return;
  const delta=Date.now()-lastEventAt;
  if(delta<1200){clearTimeout(flushTimer);flushTimer=setTimeout(actuallySend,1200-delta+25);return}
  try{
   if(state==='play')s.game.gameplayStart();
   else s.game.gameplayStop();
   lastSent=state;lastEventAt=Date.now();
  }catch(e){
   // SDK not yet available or environment restricted; never block gameplay.
  }
 }
 async function initialize(){
  if(initializing||sdkReady)return;
  if(!sdk()||typeof sdk().init!=='function'){
   if(attempts++<30)retryTimer=setTimeout(initialize,850);
   return;
  }
  initializing=true;
  try{
   await sdk().init();
   sdkReady=true;
   try{window.dispatchEvent(new Event('palcrazyready'))}catch(e){}
   actuallySend();
  }catch(e){
   initializing=false;
   if(attempts++<20)retryTimer=setTimeout(initialize,1800);
  }
 }
 window.PALCrazy={
  boot:initialize,
  gameStart(){desired='play';actuallySend()},
  gameStop(){desired='stop';actuallySend()},
  data(){
   const s=sdk();
   if(!sdkReady||!s||!s.data||s.environment==='disabled')return null;
   return s.data;
  },
  status(){return{initialized:sdkReady,desired,sent:lastSent,environment:sdk()?.environment||'absent'}}
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize,{once:true});
 else initialize();
})();
