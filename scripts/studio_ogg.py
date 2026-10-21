#!/usr/bin/env python3
"""Convert the sound studio's exported WAVs in public/audio/studio/ to ogg and point soundtrack.json at them."""
import json, pathlib, subprocess, sys
d = pathlib.Path(__file__).resolve().parent.parent / 'public' / 'audio' / 'studio'
j = d / 'soundtrack.json'
if not j.exists(): sys.exit('No public/audio/studio/soundtrack.json yet: export from the studio (F9) and put the files there.')
meta = json.loads(j.read_text())
for c in meta['clips']:
    w = d / c['file']
    if w.suffix.lower() != '.wav': continue
    o = w.with_suffix('.ogg')
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(w), '-c:a', 'libvorbis', '-q:a', '5', str(o)], check=True)
    c['file'] = o.name
    for r in meta['rules']:
        if r.get('clipFile') == w.name: r['clipFile'] = o.name
    print(f'{w.name}: {w.stat().st_size // 1024} KB -> {o.name}: {o.stat().st_size // 1024} KB')
j.write_text(json.dumps(meta, indent=1))
print('soundtrack.json updated. Delete the .wav files from the folder if you do not want them in the repo (keep your masters elsewhere).')
