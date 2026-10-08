"""Build the single-file games from dist/ (run after `npx vite build`):  python3 scripts/single.py
  pocket-pirates-demo.html  for playing and sharing: no sound at all, no test tools
  pocket-pirates-dev.html   for working: every sound in public/audio + volumes.json, the mixer (F8) and test tools on"""
import base64, json, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda p: os.path.join(ROOT, 'dist', p.lstrip('./'))
b64 = lambda path: base64.b64encode(open(path, 'rb').read()).decode()
MIME = {'.ogg': 'audio/ogg', '.mp3': 'audio/mpeg', '.wav': 'audio/wav'}

h = open(P('index.html')).read()
# sounds: one data URI per cue (same priority as the game: ogg, then mp3, then wav)
adir, sounds = os.path.join(ROOT, 'public', 'audio'), {}
for ext in ['.wav', '.mp3', '.ogg']:
    for f in sorted(os.listdir(adir)):
        if f.endswith(ext):
            sounds[f[:-len(ext)]] = f'data:{MIME[ext]};base64,{b64(os.path.join(adir, f))}'
vpath = os.path.join(adir, 'volumes.json')
volumes = json.load(open(vpath)) if os.path.exists(vpath) else {}
def build(boot):
  out = re.sub(r'<script type="module" crossorigin src="([^"]+)"></script>',
               lambda m: boot + '<script type="module">' + open(P(m.group(1))).read().replace('</script', '<\\/script') + '</script>', h)
  out = re.sub(r'<link rel="stylesheet" crossorigin href="([^"]+)">', lambda m: '<style>' + open(P(m.group(1))).read() + '</style>', out)
  return re.sub(r'url\((fonts/[^)]+\.woff2)\)', lambda m: 'url(data:font/woff2;base64,' + b64(os.path.join(ROOT, 'public', m.group(1))) + ')', out)

for name, boot in [
    ('pocket-pirates-demo.html', "<script>window.__BUILD='demo';</script>"),
    ('pocket-pirates-dev.html', f"<script>window.__BUILD='dev';window.__AUDIO={json.dumps(sounds)};window.__VOLUMES={json.dumps(volumes)};</script>"),
]:
  out = build(boot)
  open(os.path.join(ROOT, name), 'w').write(out)
  print(f'{name}: {len(out) / 1e6:.1f} MB')
print(f'({len(sounds)} sounds, {len(volumes)} volume settings in the dev build)')
