// stills : node frender.cjs stills 1 5 … ; film : node frender.cjs video <sous-images> <de> <à>
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs'); const D = __dirname;
const [mode, ...rest] = process.argv.slice(2);
(async () => { const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  p.on('pageerror', e => console.log('PAGEERR', e.message)); p.on('console', m => { const x = m.text(); if (!/url access|color model|GPU stall|Automatic fallback/.test(x) && (m.type() === 'error' || m.type() === 'warning')) console.log('CONSOLE', x.slice(0, 200)); });
  await p.goto('http://127.0.0.1:8899/film.html'); await p.waitForFunction(() => window.ready === true, null, { timeout: 300000 });
  if (mode === 'stills') { for (const t of rest) { const t0 = Date.now(); await p.evaluate(t => render(+t), t); await p.screenshot({ path: `${D}/st-${t}.jpg`, quality: 88 }); console.log('still', t, Date.now() - t0, 'ms'); } }
  else { const sub = +(rest[0] || 1), fps = 30, N = 900, from = +(rest[1] || 0), to = +(rest[2] || N); const O = D + '/sub'; fs.mkdirSync(O, { recursive: true }); const T0 = Date.now();
    for (let f = from; f < to; f++) for (let k = 0; k < sub; k++) { const t = f / fps + (sub > 1 ? (k - (sub - 1) / 2) / (sub - 1) * (1 / 60) : 0);
      await p.evaluate(t => render(Math.max(0, t)), t); await p.screenshot({ path: `${O}/${String(f * sub + k).padStart(5, '0')}.jpg`, quality: 92 });
      if ((f * sub + k) % 100 === 0) console.log('image', f, Math.round((Date.now() - T0) / 1000) + 's'); } }
  await b.close(); })();
