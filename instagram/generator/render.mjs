// 카드뉴스 생성기: posts/<slug>/post.json → posts/<slug>/slide-01.png ...
// 사용법: node instagram/generator/render.mjs instagram/posts/<slug>
// 크기: 1080x1350 (인스타 피드 4:5). --jpg 옵션을 주면 JPEG도 함께 저장 (API 게시용).
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// 전역 설치된 playwright도 찾을 수 있도록 require로 불러옴
const { chromium } = createRequire(import.meta.url)('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const fontDir = pathToFileURL(join(here, 'fonts')).href;

const C = {
  navy: '#0E2340', navy2: '#16325A', paper: '#F6F3EC', ink: '#14213D',
  sub: '#5B6475', line: '#E2DDD0', yellow: '#FFC93C', red: '#E5484D', white: '#FFFFFF',
};

const esc = (s = '') => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/\n/g, '<br>');

const icon = {
  check: (c) => `<svg width="44" height="44" viewBox="0 0 44 44"><circle cx="22" cy="22" r="22" fill="${c}"/><path d="M12 22.5l6.5 6.5L32 15.5" stroke="#fff" stroke-width="4.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  alert: `<svg width="44" height="44" viewBox="0 0 44 44"><circle cx="22" cy="22" r="22" fill="${C.red}"/><rect x="19.5" y="10" width="5" height="16" rx="2.5" fill="#fff"/><circle cx="22" cy="32.5" r="3" fill="#fff"/></svg>`,
  arrow: (c) => `<svg width="40" height="24" viewBox="0 0 40 24"><path d="M2 12h32M24 3l10 9-10 9" stroke="${c}" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
};

const base = `
@font-face{font-family:P;font-weight:400;src:url(${fontDir}/Pretendard-Regular.woff2)}
@font-face{font-family:P;font-weight:500;src:url(${fontDir}/Pretendard-Medium.woff2)}
@font-face{font-family:P;font-weight:700;src:url(${fontDir}/Pretendard-Bold.woff2)}
@font-face{font-family:P;font-weight:800;src:url(${fontDir}/Pretendard-ExtraBold.woff2)}
@font-face{font-family:P;font-weight:900;src:url(${fontDir}/Pretendard-Black.woff2)}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1080px;height:1350px}
body{font-family:P,sans-serif;letter-spacing:-0.02em;word-break:keep-all;overflow:hidden}
.s{position:relative;width:1080px;height:1350px;padding:96px 88px 120px}
.top{display:flex;justify-content:space-between;align-items:center;font-size:30px;font-weight:700}
.chip{display:inline-block;padding:12px 26px;border-radius:999px;font-size:32px;font-weight:800}
.foot{position:absolute;left:88px;right:88px;bottom:64px;display:flex;justify-content:space-between;align-items:center;font-size:28px;font-weight:600}
h1{font-weight:900;line-height:1.18}
h2{font-size:70px;font-weight:800;line-height:1.22;margin:44px 0 52px}
.note{font-size:32px;line-height:1.5;font-weight:500}
`;

function frame(slide, i, n, post, inner, dark = false) {
  const fg = dark ? C.white : C.ink;
  const muted = dark ? 'rgba(255,255,255,.6)' : C.sub;
  return `<!doctype html><html><head><meta charset="utf-8"><style>${base}</style></head>
<body><div class="s" style="background:${dark ? C.navy : C.paper};color:${fg}">
<div class="top"><span style="color:${dark ? C.yellow : C.navy}">${esc(post.brand)}</span><span style="color:${muted}">${i}/${n}</span></div>
${inner}
<div class="foot" style="color:${muted}"><span>${esc(post.handle)}</span>${i < n ? `<span style="display:flex;gap:12px;align-items:center">넘겨보기 ${icon.arrow(muted)}</span>` : '<span></span>'}</div>
</div></body></html>`;
}

const chip = (label, bg, fg) => `<span class="chip" style="background:${bg};color:${fg}">${esc(label)}</span>`;

const render = {
  cover(s, i, n, p) {
    return frame(s, i, n, p, `
<div style="margin-top:120px">${chip(s.kicker, C.yellow, C.navy)}</div>
<h1 style="font-size:108px;margin-top:56px">${esc(s.title)}</h1>
<div style="font-size:128px;font-weight:900;color:${C.yellow};margin-top:36px;line-height:1.1">${esc(s.highlight)}</div>
<div style="font-size:44px;font-weight:600;margin-top:48px;color:rgba(255,255,255,.85)">${esc(s.sub)}</div>`, true);
  },
  list(s, i, n, p) {
    const items = s.items.map((t) => `
<div style="display:flex;gap:28px;align-items:flex-start;background:#fff;border:2px solid ${C.line};border-radius:28px;padding:34px 36px;margin-bottom:22px">
<div style="flex:none;margin-top:4px">${icon.check(C.navy2)}</div><div style="font-size:42px;font-weight:700;line-height:1.4">${esc(t)}</div></div>`).join('');
    return frame(s, i, n, p, `
<div style="margin-top:28px">${chip(s.label, C.navy, C.white)}</div><h2>${esc(s.title)}</h2>${items}
${s.note ? `<div class="note" style="color:${C.sub};margin-top:26px">${esc(s.note)}</div>` : ''}`);
  },
  table(s, i, n, p) {
    const rows = s.rows.map(([k, v]) => `
<div style="display:flex;justify-content:space-between;align-items:center;gap:24px;padding:30px 4px;border-bottom:2px solid ${C.line}">
<div style="font-size:38px;font-weight:600;color:${C.sub};line-height:1.35">${esc(k)}</div><div style="font-size:44px;font-weight:800;text-align:right;line-height:1.3">${esc(v)}</div></div>`).join('');
    return frame(s, i, n, p, `
<div style="margin-top:28px">${chip(s.label, C.navy, C.white)}</div><h2>${esc(s.title)}</h2>
<div style="background:#fff;border-radius:28px;padding:10px 40px;border:2px solid ${C.line}">${rows}</div>
${s.highlight ? `<div style="margin-top:36px;background:${C.navy};color:${C.white};border-radius:28px;padding:36px 40px;font-size:46px;font-weight:800;line-height:1.35">${esc(s.highlight)}</div>` : ''}
${s.note ? `<div class="note" style="color:${C.sub};margin-top:24px">${esc(s.note)}</div>` : ''}`);
  },
  steps(s, i, n, p) {
    const steps = s.steps.map((st, k) => `
<div style="display:flex;gap:32px;align-items:flex-start;margin-bottom:40px">
<div style="flex:none;width:84px;height:84px;border-radius:50%;background:${C.yellow};color:${C.navy};font-size:44px;font-weight:900;display:flex;align-items:center;justify-content:center">${k + 1}</div>
<div><div style="font-size:48px;font-weight:800;line-height:1.3">${esc(st.t)}</div><div style="font-size:36px;font-weight:500;color:${C.sub};margin-top:10px;line-height:1.45">${esc(st.d)}</div></div></div>`).join('');
    return frame(s, i, n, p, `
<div style="margin-top:28px">${chip(s.label, C.navy, C.white)}</div><h2>${esc(s.title)}</h2>${steps}
${s.note ? `<div class="note" style="color:${C.sub}">${esc(s.note)}</div>` : ''}`);
  },
  warning(s, i, n, p) {
    const items = s.items.map((t) => `
<div style="display:flex;gap:28px;align-items:flex-start;margin-bottom:34px">
<div style="flex:none;margin-top:2px">${icon.alert}</div><div style="font-size:42px;font-weight:700;line-height:1.42">${esc(t)}</div></div>`).join('');
    return frame(s, i, n, p, `
<div style="margin-top:28px">${chip(s.label, C.red, C.white)}</div><h2>${esc(s.title)}</h2>
<div style="background:#fff;border:3px solid ${C.red};border-radius:28px;padding:44px 40px 12px">${items}</div>`);
  },
  outro(s, i, n, p) {
    const items = (s.items || []).map((t) => `<div style="font-size:40px;font-weight:700;line-height:1.5;color:rgba(255,255,255,.92)">${esc(t)}</div>`).join('');
    const btn = (t) => `<span style="display:inline-block;border:3px solid ${C.yellow};color:${C.yellow};border-radius:999px;padding:18px 36px;font-size:38px;font-weight:800;margin-right:20px">${esc(t)}</span>`;
    return frame(s, i, n, p, `
<h1 style="font-size:96px;margin-top:150px">${esc(s.title)}</h1>
<div style="font-size:42px;font-weight:600;margin-top:36px;color:rgba(255,255,255,.8);line-height:1.45">${esc(s.sub)}</div>
<div style="margin-top:56px">${(s.buttons || []).map(btn).join('')}</div>
<div style="margin-top:64px">${items}</div>
${s.source ? `<div style="position:absolute;left:88px;right:88px;bottom:130px;font-size:26px;line-height:1.5;color:rgba(255,255,255,.55)">${esc(s.source)}</div>` : ''}`, true);
  },
};

const dir = resolve(process.argv[2] || '.');
const wantJpg = process.argv.includes('--jpg');
const post = JSON.parse(readFileSync(join(dir, 'post.json'), 'utf8'));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });
const n = post.slides.length;
for (const [k, s] of post.slides.entries()) {
  const fn = render[s.type];
  if (!fn) throw new Error(`unknown slide type: ${s.type}`);
  const htmlPath = join(dir, `.slide-${k + 1}.html`);
  writeFileSync(htmlPath, fn(s, k + 1, n, post));
  await page.goto(pathToFileURL(htmlPath).href);
  await page.evaluate(() => document.fonts.ready);
  const name = `slide-${String(k + 1).padStart(2, '0')}`;
  await page.screenshot({ path: join(dir, `${name}.png`) });
  if (wantJpg) await page.screenshot({ path: join(dir, `${name}.jpg`), type: 'jpeg', quality: 92 });
  console.log('saved', name);
}
await browser.close();
