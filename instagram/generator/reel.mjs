// 릴스 생성기: posts/<slug>/post.json → posts/<slug>/reel.mp4 + reel-cover.png
// 사용법: node instagram/generator/reel.mjs instagram/posts/<slug>
// 카드뉴스와 같은 post.json을 그대로 써서 9:16 세로 영상(1080x1920, 30fps, 무음 오디오 트랙)을 만든다.
// 음악은 인스타 앱에서 직접 붙인다 (저작권 안전 + 인기 음원 노출 효과).
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

const { chromium } = createRequire(import.meta.url)('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const fontDir = pathToFileURL(join(here, 'fonts')).href;

const W = 1080, H = 1920, FPS = 30;
// 안전 영역: 위 260px(상단 UI), 아래 440px(캡션·계정명), 오른쪽 150px(좋아요·댓글 버튼)
// 커버는 프로필 격자(3:4)에서 위아래 240px씩 잘리므로 핵심 문구는 y 300~1620 안에 둔다.
const SAFE = { top: 300, bottom: 460, left: 88, right: 160 };

const C = {
  navy: '#0E2340', paper: '#F6F3EC', ink: '#14213D', sub: '#5B6475', line: '#E2DDD0',
  yellow: '#FFC93C', red: '#E5484D', white: '#FFFFFF', green: '#128C4B',
};
const THEMES = {
  deep: { bg: C.navy, fg: C.white, accent: C.yellow, chipBg: C.yellow, chipFg: C.navy, sub: 'rgba(255,255,255,.85)' },
  deadline: { bg: C.yellow, fg: C.navy, accent: C.red, chipBg: C.navy, chipFg: C.yellow, sub: 'rgba(14,35,64,.85)' },
  calc: { bg: '#E7F4EC', fg: C.ink, accent: C.green, chipBg: C.green, chipFg: C.white, sub: '#2D3A4F' },
};

const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
const check = (c) => `<svg width="54" height="54" viewBox="0 0 44 44"><circle cx="22" cy="22" r="22" fill="${c}"/><path d="M12 22.5l6.5 6.5L32 15.5" stroke="#fff" stroke-width="4.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const alert = `<svg width="54" height="54" viewBox="0 0 44 44"><circle cx="22" cy="22" r="22" fill="${C.red}"/><rect x="19.5" y="10" width="5" height="16" rx="2.5" fill="#fff"/><circle cx="22" cy="32.5" r="3" fill="#fff"/></svg>`;

const css = `
@font-face{font-family:P;font-weight:500;src:url(${fontDir}/Pretendard-Medium.woff2)}
@font-face{font-family:P;font-weight:700;src:url(${fontDir}/Pretendard-Bold.woff2)}
@font-face{font-family:P;font-weight:800;src:url(${fontDir}/Pretendard-ExtraBold.woff2)}
@font-face{font-family:P;font-weight:900;src:url(${fontDir}/Pretendard-Black.woff2)}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${W}px;height:${H}px;overflow:hidden}
body{font-family:P,sans-serif;letter-spacing:-0.02em;word-break:keep-all}
.s{position:relative;width:${W}px;height:${H}px}
.c{position:absolute;left:${SAFE.left}px;right:${SAFE.right}px;top:${SAFE.top}px;bottom:${SAFE.bottom}px;display:flex;flex-direction:column;justify-content:center}
.a{animation:rise .5s cubic-bezier(.2,.8,.2,1) both}
@keyframes rise{from{opacity:0;transform:translateY(40px)}to{opacity:1;transform:none}}
.pop{animation:pop .55s cubic-bezier(.2,.9,.3,1.3) both}
@keyframes pop{from{opacity:0;transform:scale(.7)}to{opacity:1;transform:none}}
.chip{display:inline-block;padding:14px 30px;border-radius:999px;font-size:38px;font-weight:800}
.bar{position:absolute;left:${SAFE.left}px;right:${SAFE.left}px;top:220px;display:flex;gap:10px}
.bar i{flex:1;height:8px;border-radius:4px}
.brand{position:absolute;left:${SAFE.left}px;top:250px;font-size:32px;font-weight:800}
`;

// 장면 안 요소마다 순서대로 등장 (0.12초 간격)
let k = 0;
const d = () => `animation-delay:${(k++ * 0.12).toFixed(2)}s;`;

function page(inner, idx, total, post, t) {
  const bar = Array.from({ length: total }, (_, j) => `<i style="background:${j <= idx ? t.accent : (t.fg === C.white ? 'rgba(255,255,255,.25)' : 'rgba(20,33,61,.15)')}"></i>`).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>
<div class="s" style="background:${t.bg};color:${t.fg}">
<div class="bar">${bar}</div><div class="brand" style="color:${t.accent};top:262px">${esc(post.brand)}</div>
<div class="c">${inner}</div></div></body></html>`;
}

const content = { bg: C.paper, fg: C.ink, accent: C.navy, chipBg: C.navy, chipFg: C.white, sub: C.sub };

const scenes = {
  cover(s, t) {
    return `<div class="a" style="${d()}"><span class="chip" style="background:${t.chipBg};color:${t.chipFg}">${esc(s.kicker)}</span></div>
<div class="a" style="${d()}font-size:104px;font-weight:900;line-height:1.16;margin-top:48px">${esc(s.title)}</div>
${s.highlight ? `<div class="pop" style="${d()}font-size:136px;font-weight:900;color:${t.accent};margin-top:40px;line-height:1.05">${esc(s.highlight)}</div>` : ''}
<div class="a" style="${d()}font-size:46px;font-weight:700;margin-top:44px;color:${t.sub}">${esc(s.sub)}</div>`;
  },
  list(s, t) {
    return head(s, t) + s.items.map((x) => `<div class="a" style="${d()}display:flex;gap:26px;align-items:flex-start;margin-bottom:34px">
<div style="flex:none;margin-top:6px">${check(C.navy)}</div><div style="font-size:52px;font-weight:800;line-height:1.36">${esc(x)}</div></div>`).join('');
  },
  table(s, t) {
    return head(s, t) + s.rows.map(([a, b]) => `<div class="a" style="${d()}padding:22px 0;border-bottom:3px solid ${C.line}">
<div style="font-size:38px;font-weight:700;color:${C.sub}">${esc(a)}</div><div style="font-size:56px;font-weight:900;margin-top:6px">${esc(b)}</div></div>`).join('')
      + (s.highlight ? `<div class="pop" style="${d()}margin-top:40px;background:${C.navy};color:#fff;border-radius:28px;padding:34px 36px;font-size:50px;font-weight:900;line-height:1.3">${esc(s.highlight)}</div>` : '');
  },
  steps(s, t) {
    return head(s, t) + s.steps.map((x, j) => `<div class="a" style="${d()}display:flex;gap:30px;align-items:flex-start;margin-bottom:44px">
<div style="flex:none;width:92px;height:92px;border-radius:50%;background:${C.yellow};color:${C.navy};font-size:48px;font-weight:900;display:flex;align-items:center;justify-content:center">${j + 1}</div>
<div><div style="font-size:54px;font-weight:900;line-height:1.25">${esc(x.t)}</div><div style="font-size:40px;font-weight:700;color:${C.sub};margin-top:10px;line-height:1.4">${esc(x.d)}</div></div></div>`).join('');
  },
  warning(s, t) {
    return head(s, t, C.red) + s.items.map((x) => `<div class="a" style="${d()}display:flex;gap:26px;align-items:flex-start;margin-bottom:34px">
<div style="flex:none;margin-top:6px">${alert}</div><div style="font-size:50px;font-weight:800;line-height:1.36">${esc(x)}</div></div>`).join('');
  },
  outro(s, t) {
    return `<div class="a" style="${d()}font-size:100px;font-weight:900;line-height:1.16">${esc(s.title)}</div>
<div class="a" style="${d()}font-size:46px;font-weight:700;margin-top:40px;line-height:1.45;color:${t.sub}">${esc(s.sub)}</div>
<div class="pop" style="${d()}margin-top:56px">${(s.buttons || []).map((b) => `<span style="display:inline-block;border:4px solid ${C.yellow};color:${C.yellow};border-radius:999px;padding:18px 34px;font-size:42px;font-weight:900;margin:0 18px 18px 0">${esc(b)}</span>`).join('')}</div>
<div class="a" style="${d()}font-size:44px;font-weight:800;margin-top:40px;line-height:1.45">${(s.items || []).map(esc).join('<br>')}</div>`;
  },
};

function head(s, t, chipBg = C.navy) {
  return `<div class="a" style="${d()}"><span class="chip" style="background:${chipBg};color:#fff">${esc(s.label)}</span></div>
<div class="a" style="${d()}font-size:80px;font-weight:900;line-height:1.2;margin:40px 0 56px">${esc(s.title)}</div>`;
}

// 장면별 길이(초): 표지는 짧게, 정보 장면은 읽을 시간, 마지막은 저장 유도
const DUR = { cover: 2.6, list: 3.6, table: 3.8, steps: 3.8, warning: 3.8, outro: 3.2 };

const dir = resolve(process.argv[2] || '.');
const post = JSON.parse(readFileSync(join(dir, 'post.json'), 'utf8'));
const theme = THEMES[post.series] || THEMES.deep;
const frames = join(dir, '.reel-frames');
rmSync(frames, { recursive: true, force: true });
mkdirSync(frames, { recursive: true });

const browser = await chromium.launch();
const pg = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
const list = [];
let f = 0;
for (const [i, s] of post.slides.entries()) {
  k = 0;
  const t = s.type === 'cover' || s.type === 'outro' ? (s.type === 'cover' ? theme : THEMES.deep) : content;
  const html = page(scenes[s.type](s, t), i, post.slides.length, post, t);
  const file = join(frames, `scene-${i}.html`);
  writeFileSync(file, html);
  await pg.goto(pathToFileURL(file).href);
  await pg.evaluate(() => document.fonts.ready);
  const intro = Math.min(0.5 + 0.12 * k + 0.1, 1.6); // 등장 애니메이션이 끝나는 시점
  const n = Math.round(intro * FPS);
  for (let j = 0; j <= n; j++) {
    const ms = (j / FPS) * 1000;
    await pg.evaluate((ms) => document.getAnimations().forEach((a) => { a.pause(); a.currentTime = ms; }), ms);
    const png = join(frames, `f${String(f++).padStart(5, '0')}.png`);
    await pg.screenshot({ path: png });
    const last = j === n;
    list.push(`file '${png}'`, `duration ${last ? (DUR[s.type] - intro).toFixed(3) : (1 / FPS).toFixed(5)}`);
    if (s.type === 'cover' && last) await pg.screenshot({ path: join(dir, 'reel-cover.png') });
  }
}
await browser.close();
list.push(list[list.length - 2]); // concat 규칙: 마지막 파일을 한 번 더 적어야 마지막 duration이 적용됨
writeFileSync(join(frames, 'list.txt'), list.join('\n'));

const out = join(dir, 'reel.mp4');
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', join(frames, 'list.txt'),
  '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo', '-shortest',
  '-vf', `fps=${FPS},format=yuv420p`, '-c:v', 'libx264', '-preset', 'medium', '-crf', '18',
  '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', out]);
rmSync(frames, { recursive: true, force: true });
console.log('saved', out, 'and reel-cover.png');
