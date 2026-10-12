import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const out='screenshots/truck-detail';await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try {
 const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 const url=new URL(process.env.GAME_URL||'http://127.0.0.1:8080/');url.searchParams.set('qa','1');
 await page.goto(url.href,{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>window.__SACK_V2_INPUT__?.veliState().loaded&&window.__SACK_V2_INPUT__?.foodCourtState().loaded,null,{timeout:90000});
 const frames=n=>page.evaluate(async count=>{for(let i=0;i<count;i++)await new Promise(r=>requestAnimationFrame(r));},n);
 for(const [name,x,night,yaw] of [['veli-day',62,false,0],['veli-side',62,false,-.25],['brotherz-day',70,false,0],['catch901-day',78,false,0],['veli-night',62,true,0]]) {
   await page.evaluate(o=>window.__SACK_V2_INPUT__.setShot(o),{place:'street',x,z:22.4,night,yaw,dist:8.5,height:3,lookY:2.1,dollars:240,dialogue:''});await frames(12);
   await page.screenshot({path:`${out}/${name}.png`,timeout:60000});
   console.log('Captured',name);
 }
 await page.setViewportSize({width:390,height:844});
 await page.evaluate(()=>window.__SACK_V2_INPUT__.setShot({place:'street',x:62,z:22.4,night:false,yaw:0,dist:8.5,height:3,lookY:2.1,dollars:240,dialogue:''}));await frames(12);
 await page.screenshot({path:`${out}/veli-mobile.png`,timeout:60000});
 await page.getByRole('button',{name:'E',exact:true}).click();await page.getByTestId('veli-menu').waitFor({timeout:90000});
 await page.getByTestId('veli-order-0').click();
 await page.waitForFunction(()=>window.__SACK_V2_INPUT__.receiverState().holding,null,{polling:'raf',timeout:90000});
 await page.evaluate(()=>window.__SACK_V2_INPUT__.freezeCapture(true));
 assert.equal(await page.evaluate(()=>window.__SACK_V2__.dollars),225);
 await page.screenshot({path:`${out}/veli-mobile-receive.png`,timeout:60000});
 assert.deepEqual(errors,[]);
 console.log('PASS: day/night/side/portrait production truck captures and paid mobile Veli receiving');
} finally {await browser.close();}
