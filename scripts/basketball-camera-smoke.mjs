import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const out='screenshots/basketball-camera';await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try {
 const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const url=new URL(process.env.GAME_URL||'http://127.0.0.1:8080/');url.searchParams.set('qa','1');
 await page.goto(url.href,{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>window.__SACK_V2_INPUT__?.courtCameraState(),null,{timeout:90000});
 const frames=n=>page.evaluate(async count=>{for(let i=0;i<count;i++)await new Promise(r=>requestAnimationFrame(r));},n);
 const set=async opts=>{await page.evaluate(o=>window.__SACK_V2_INPUT__.setShot(o),opts);await frames(20);};
 const screenshot=async name=>{await page.evaluate(()=>window.__SACK_V2_INPUT__.freezeCapture(true));await page.screenshot({path:`${out}/${name}.png`,timeout:60000});await page.evaluate(()=>window.__SACK_V2_INPUT__.freezeCapture(false));console.log('Captured',name);};
 const low=async()=>{
  const state=await page.evaluate(()=>({camera:window.__SACK_V2_INPUT__.courtCameraState(),match:window.__SACK_V2_INPUT__.basketballState(),ball:window.__SACK_V2_INPUT__.ballState()}));
  assert.ok(state.camera.y<5.4,'Basketball camera must remain low');
  const points=state.match?.actionScreen??state.ball.shotScreen;
  assert.ok(points.every(p=>Math.abs(p.x)<.96&&Math.abs(p.y)<.96&&p.z>-1&&p.z<1),'Shooter, ball and rim must remain in view');
  return state;
 };
 if(process.env.CAMERA_SCOPE!=='mobile') {
 await set({place:'court',x:64,z:-22,yaw:Math.PI,ballHeld:true,dialogue:''});
 assert.equal((await low()).camera.mode,'behind');
 await page.evaluate(()=>window.__SACK_V2_INPUT__.setCharge(true));await frames(16);assert.ok((await low()).ball.charge>0);await screenshot('practice-behind-gather');
 await page.evaluate(()=>window.__SACK_V2_INPUT__.setCharge(false));await frames(9);await low();assert.ok((await low()).ball.taken>0);await screenshot('practice-behind-flight');
 await page.evaluate(()=>window.__SACK_V2_INPUT__.startBasketball('half'));await frames(20);
 await page.waitForFunction(()=>window.__SACK_V2_INPUT__.basketballState()?.animation.loaded===8,null,{timeout:90000});
 for(const mode of ['behind','sideline','baseline']) {
  assert.equal((await low()).camera.mode,mode);
  await screenshot(`half-${mode}`);
  await page.evaluate(()=>window.__SACK_V2_INPUT__.startBasketball('half'));await frames(20);
  await page.evaluate(()=>window.__SACK_V2_INPUT__.setCharge(true));await frames(12);assert.equal((await low()).camera.mode,mode);assert.ok((await low()).match.charge>0);
  await screenshot(`shoot-${mode}`);await page.evaluate(()=>window.__SACK_V2_INPUT__.setCharge(false));await frames(10);await low();
  // Camera mode changes must not remap A/D to the opposite screen direction.
  await page.evaluate(()=>window.__SACK_V2_INPUT__.startBasketball('half'));await frames(20);
  for(const [key,sign] of [['KeyA',-1],['KeyD',1]]) {
   const before=await page.evaluate(()=>({x:window.__SACK_V2__.x,z:window.__SACK_V2__.z,c:window.__SACK_V2_INPUT__.courtCameraState()}));
   await page.keyboard.down(key);await frames(6);await page.keyboard.up(key);
   const after=await page.evaluate(()=>({x:window.__SACK_V2__.x,z:window.__SACK_V2__.z}));
   const [fx,,fz]=before.c.direction,len=Math.hypot(fx,fz);
   const right=(after.x-before.x)*(-fz/len)+(after.z-before.z)*(fx/len);
   assert.ok(right*sign>0,`${mode}: ${key} must move in the correct screen direction`);
  }
  await page.keyboard.press('KeyB');await frames(25);
 }
 await page.evaluate(()=>window.__SACK_V2_INPUT__.startBasketball('half'));
 await set({place:'court',x:58,z:-22,yaw:Math.PI,ballHeld:true,dialogue:''});
 await page.keyboard.press('KeyV');await frames(15);let state=await low();
 assert.equal(state.match.animation.action,'dunk-back');await screenshot('dunk-behind');
 await page.evaluate(()=>window.__SACK_V2_INPUT__.startBasketball('half'));
 await set({place:'court',x:59,z:-22,yaw:Math.PI,ballHeld:true,dialogue:''});
 await page.keyboard.press('KeyL');await frames(8);state=await low();assert.equal(state.match.animation.action,'layup-back');await screenshot('layup-behind');
 }
 await page.setViewportSize({width:390,height:844});
 await set({place:'court',x:60,z:-22,yaw:Math.PI,ballHeld:true,dialogue:''});
 await page.evaluate(()=>window.__SACK_V2_INPUT__.startBasketball('full'));await frames(25);
 await page.evaluate(()=>window.__SACK_V2_INPUT__.setCharge(true));await frames(12);await low();assert.ok((await low()).match.charge>0);await screenshot('full-behind-mobile');await page.evaluate(()=>window.__SACK_V2_INPUT__.setCharge(false));
 await page.getByRole('button',{name:'CAM: BEHIND',exact:true}).click();await frames(25);assert.equal((await low()).camera.mode,'sideline');
 await page.getByRole('button',{name:'CAM: SIDELINE',exact:true}).click();await frames(25);assert.equal((await low()).camera.mode,'baseline');await screenshot('full-baseline-mobile');
 assert.deepEqual(errors,[]);console.log(process.env.CAMERA_SCOPE==='mobile'?'PASS: low full-court portrait shot and CAM controls':'PASS: low practice/2v2 shots, three selectable views, screen-correct A/D, rear dunk/layup and portrait CAM control');
} finally {await browser.close();}
