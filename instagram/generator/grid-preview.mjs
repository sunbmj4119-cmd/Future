// 프로필 격자(3:4) 미리보기: node instagram/generator/grid-preview.mjs out.png img1 img2 ... (3개씩 한 줄)
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
const { chromium } = createRequire(import.meta.url)('playwright');
const [out, ...imgs] = process.argv.slice(2).map((p) => resolve(p));
const cells = imgs.map((p) => `<div style="aspect-ratio:3/4;background:url('${pathToFileURL(p).href}') center/cover"></div>`).join('');
const rows = Math.ceil(imgs.length / 3);
const html = `<!doctype html><html><body style="margin:0;background:#fff">
<div style="width:1080px;display:grid;grid-template-columns:repeat(3,1fr);gap:4px">${cells}</div></body></html>`;
const tmp = join(dirname(out), '.grid.html');
writeFileSync(tmp, html);
const b = await chromium.launch();
const pg = await b.newPage({ viewport: { width: 1080, height: Math.ceil(rows * (1076 / 3) * 4 / 3 + rows * 4) }, deviceScaleFactor: 1 });
await pg.goto(pathToFileURL(tmp).href);
await pg.screenshot({ path: out, fullPage: true });
await b.close();
console.log('saved', out);
