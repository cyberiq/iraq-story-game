const fs = require('fs');
const path = require('path');
const playwright = require('playwright');

async function run(){
  const outDir = path.join(__dirname, '..', 'artifacts');
  if(!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const targets = [
    { name: 'home', url: 'http://localhost:3000/' },
    { name: '404', url: 'http://localhost:3000/404.html' },
  ];

  const viewports = [
    { name: 'desktop', width: 1366, height: 768 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'mobile', width: 375, height: 812 },
  ];

  const browser = await playwright.chromium.launch({ headless: true });
  for(const t of targets){
    const url = t.url;
    for(const v of viewports){
      const context = await browser.newContext({ viewport: { width: v.width, height: v.height } });
      const page = await context.newPage();
      try{
        await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
      }catch(e){
        // ignore navigation timeout
      }
      const file = path.join(outDir, `${t.name}_${v.name}.png`);
      await page.screenshot({ path: file, fullPage: true });
      console.log('Saved', file);
      await context.close();
    }
  }
  await browser.close();
}

run().catch((err)=>{ console.error(err); process.exit(1); });
