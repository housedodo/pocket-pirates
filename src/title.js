// The title screen: the Merry Gull alone on open sea at a random hour, with the HOIST logo drawn at the game's
// low resolution in bone white with a dried-blood shadow (Pirata One), dithered and a little worn.
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

// time of day (0..1), weather to hold, and the camera: angle from the bow, distance, height, look height
export const TITLE_SCENES = [
  { id: 'morning', time: 0.31, weather: { cloud: 0.2, rain: 0, storm: 0, fog: 0 }, cam: [2.3, 15, 2.6, 6] },
  { id: 'day', time: 0.5, weather: { cloud: 0.3, rain: 0, storm: 0, fog: 0 }, cam: [-2.0, 17, 3.2, 6.5] },
  { id: 'dawn', time: 0.272, weather: { cloud: 0.2, rain: 0, storm: 0, fog: 0.55 }, cam: [2.6, 15, 2.8, 6.5],
    tint: { top: '#c0aa84', hor: '#ffd27a', fog: '#f0cc84', k: 0.75 } },   // misty gold, unlike the pink dusk
  { id: 'dusk', time: 0.772, weather: { cloud: 0.15, rain: 0, storm: 0, fog: 0 }, cam: [1.8, 14, 2.4, 6.5] },
  { id: 'night', time: 0.93, weather: { cloud: 0.05, rain: 0, storm: 0, fog: 0 }, cam: [2.3, 15, 2.6, 6.5] },
  { id: 'rain', time: 0.46, weather: { cloud: 0.9, rain: 0.85, storm: 0.25, fog: 0.15 }, cam: [-2.2, 15, 2.8, 6] },
];

let seed = 9; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
function cv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

/** draw the logo into `out` (sized in CSS); W/H is the low-res drawing size */
export function drawTitleLogo(out, W = 320, H = 110) {
  seed = 9;
  out.width = W; out.height = H;
  const g = out.getContext('2d'), font = "86px 'Pirata One'", cx = W / 2, y = 88;
  const face = cv(W, H), f = face.getContext('2d');
  f.font = font; f.textAlign = 'center'; f.fillStyle = '#fff'; f.fillText('Hoist', cx, y);
  const tint = (col) => { const c = cv(W, H), x = c.getContext('2d'); x.drawImage(face, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = col; x.fillRect(0, 0, W, H); return c; };
  const deep = tint('#1a0606'), blood = tint('#5a1612');
  for (let i = 6; i > 0; i--) g.drawImage(i > 3 ? deep : blood, Math.round(i * 0.6), i);
  // bone face: banded, dithered from bright to old ivory
  const md = f.getImageData(0, 0, W, H).data, img = g.createImageData(W, H), d = img.data, cols = ['#f4ead0', '#e2d4b0', '#b8a47c'].map(hex);
  for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) {
    const i = (py * W + px) * 4; if (md[i + 3] < 128) continue;
    const k = (py - (y - 64)) / 64 * 2 + BAYER[(py % 4) * 4 + (px % 4)] / 16 - 0.5, c = cols[Math.max(0, Math.min(2, Math.round(k)))];
    d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
  }
  const top = cv(W, H); top.getContext('2d').putImageData(img, 0, 0); g.drawImage(top, 0, 0);
  // wear: chips, salt and tar specks
  g.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 160; i++) g.fillRect(rnd() * W | 0, rnd() * H | 0, 1 + (rnd() * 2 | 0), 1);
  g.globalCompositeOperation = 'source-atop';
  for (let i = 0; i < 240; i++) { g.fillStyle = rnd() < 0.5 ? 'rgba(244,234,208,0.35)' : 'rgba(20,10,4,0.5)'; g.fillRect(rnd() * W | 0, rnd() * H | 0, 1, 1); }
  g.globalCompositeOperation = 'source-over';
}
