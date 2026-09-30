// stills : node render.cjs stills 1.2 5 … ; film : node render.cjs video [sous-images] [de] [à]
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs'); const D = __dirname;
const [mode, ...rest] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch({ args: ['--disable-web-security', '--allow-file-access-from-files'] });
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  p.on('pageerror', e => console.log('PAGEERR', e.message)); p.on('console', m => { if (m.type() === 'error') console.log('CONSOLE', m.text()); });
  await p.goto('file://' + D + '/index.html'); await p.evaluate(() => window.ready);
  if (mode === 'stills') {
    fs.mkdirSync(D + '/stills', { recursive: true });
    for (const t of rest) { await p.evaluate(t => render(+t), t); await p.screenshot({ path: `${D}/stills/${t}.jpg`, quality: 80 }); }
  } else {
    const sub = +(rest[0] || 4), fps = 30, N = Math.round(await p.evaluate(() => DURATION) * fps);
    const O = D + '/sub'; fs.mkdirSync(O, { recursive: true });
    const from = +(rest[1] || 0), to = +(rest[2] || N); const t0 = Date.now();
    for (let f = from; f < to; f++) for (let k = 0; k < sub; k++) {
      const t = f / fps + (sub > 1 ? (k - (sub - 1) / 2) / sub * (1 / 60) : 0); // obturateur 180°
      await p.evaluate(t => render(Math.max(0, t)), t);
      await p.screenshot({ path: `${O}/${String(f * sub + k).padStart(5, '0')}.jpg`, quality: 92 });
      if ((f * sub + k) % 400 === 0) console.log('image', f, '/', to, Math.round((Date.now() - t0) / 1000) + 's');
    }
  }
  await b.close();
})();
