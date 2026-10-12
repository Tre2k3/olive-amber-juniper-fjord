import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const out='screenshots/basketball-uniforms';await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try {
 const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 const url=new URL(process.env.GAME_URL||'http://127.0.0.1:8080/');url.searchParams.set('qa','1');
 await page.goto(url.href,{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>window.__SACK_V2_INPUT__?.courtCameraState(),null,{timeout:90000});
 const frames=n=>page.evaluate(async count=>{for(let i=0;i<count;i++)await new Promise(r=>requestAnimationFrame(r));},n);
 const state=()=>page.evaluate(()=>window.__SACK_V2_INPUT__.basketballState());
 const set=async(x=64)=>{await page.evaluate(x=>{window.__SACK_V2_INPUT__.setShot({place:'court',x,z:-26,yaw:Math.PI,ballHeld:true,dialogue:''});window.__SACK_V2_INPUT__.startBasketball('half');window.__SACK_V2_INPUT__.setShot({place:'court',x,z:-26,yaw:Math.PI,ballHeld:true,dialogue:''});},x);await frames(12);};
 const capture=async name=>{await page.evaluate(()=>window.__SACK_V2_INPUT__.freezeCapture(true));await page.screenshot({path:`${out}/${name}.png`,timeout:60000});await page.evaluate(()=>window.__SACK_V2_INPUT__.freezeCapture(false));console.log('Captured',name);};
 for(const kit of ['black-fresh','blue-fresh','white-224']) {
  await set();
  await page.waitForFunction(kit=>{const s=window.__SACK_V2_INPUT__.basketballState();return s?.animation.loaded===8&&s.animation.kit===kit&&s.uniformTextures===24&&s.jerseys===4;},kit,{timeout:90000});
  const inspect=async()=>{const s=await state();assert.equal(s.jerseyOverlays,0);assert.equal(s.animation.kit,kit);assert.deepEqual(s.uniformPlayers.map(p=>p.kit),[kit,'blue-fresh','white-224','white-224']);assert.ok(s.animation.src.includes(`/basketball/actions/benji/${kit}/`));assert.ok(s.animation.residentAtlases<=8);};
  await inspect();assert.equal((await state()).animation.action,'dribble');
  await page.evaluate(()=>window.__SACK_V2_INPUT__.setCharge(true));await frames(8);await inspect();
  const held=await state();assert.equal(held.animation.action,'shoot-back');assert.ok(Math.hypot(held.ball.x-held.hand[0],held.ball.y-held.hand[1],held.ball.z-held.hand[2])<.04);
  await capture(`${kit}-rear-shot`);await page.evaluate(()=>window.__SACK_V2_INPUT__.setCharge(false));await frames(5);await inspect();
  await set(58);await page.evaluate(()=>window.__SACK_V2_INPUT__.setShot({place:'court',x:58,z:-22,yaw:Math.PI,ballHeld:true,dialogue:''}));await frames(2);await page.keyboard.press('KeyV');await frames(15);await inspect();assert.equal((await state()).animation.action,'dunk-back');await capture(`${kit}-dunk`);
  await set(59);await page.evaluate(()=>window.__SACK_V2_INPUT__.setShot({place:'court',x:59,z:-22,yaw:Math.PI,ballHeld:true,dialogue:''}));await frames(2);await page.keyboard.press('KeyL');await frames(8);await inspect();assert.equal((await state()).animation.action,'layup-back');
  await set();await page.keyboard.press('KeyC');await frames(1);await inspect();assert.equal((await state()).animation.action,'cross-back');
  await page.keyboard.press('KeyJ');await frames(2);
 }
 assert.equal((await state()).jerseys,0);
 await page.keyboard.press('KeyJ');await set();await page.waitForFunction(()=>window.__SACK_V2_INPUT__.basketballState()?.animation.loaded===8,null,{timeout:90000});
 await page.keyboard.press('KeyB');await frames(20);await capture('complete-player-outfits');
 await page.keyboard.press('KeyB');await frames(20);await page.keyboard.press('KeyB');await frames(20);
 await page.keyboard.press('KeyF');await page.evaluate(()=>window.__SACK_V2_INPUT__.setShot({facing:'front'}));await frames(2);await capture('complete-front-jersey');
 await set();
 await page.setViewportSize({width:390,height:844});await frames(24);await capture('full-outfit-mobile');
 await page.keyboard.press('Escape');await frames(4);
 assert.deepEqual(errors,[]);console.log('PASS: three complete outfit families, 24 loaded turnarounds, matching action sprites, no garment overlays, retained palm contact, dunk/layup/cross, kit cycling and bounded atlas memory');
} finally {await browser.close();}
