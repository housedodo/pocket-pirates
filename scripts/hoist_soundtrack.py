#!/usr/bin/env python3
"""Rebuild music_1..5 from a (new) main melody clip with the HOIST soundtrack generator.

    python3 scripts/hoist_soundtrack.py my_melody.wav [--vary] [--chords Fm,Fm,Db,Db,...|auto] [--bpm 99] [--dry]

The clip: F minor, 99 BPM, a whole number of bars (4, 8, 12, 16 ...). A short ring-out after the last bar is fine:
it wraps into the head of the loop. Any sample rate or channel count (converted to 48 kHz stereo first).
--vary    HOIST (tide, dread, mix) is automated across the loop and the added parts change pass by pass, so a
          stage does not sound the same every 9.7 s. The loop becomes at least 16 bars (38.8 s at 99 BPM).
--chords  one chord per bar of the clip if the new melody moves differently from Fm Fm Db Db (the default,
          repeated); `auto` uses the generator's guess (printed every run, so you can compare).
--dry     render and check only; do not touch public/audio.
The bass in stages 1-2 always gets its low-pass. The generator is Chaos_Grain's `HoistSoundtrack`
(cmake -B build -DCHAOSGRAIN_TESTS=ON && cmake --build build --target HoistSoundtrack); point HOIST_BIN at it.
"""
import argparse, os, pathlib, shutil, subprocess, sys, tempfile, wave

ROOT = pathlib.Path(__file__).resolve().parent.parent
AUDIO = ROOT / 'public' / 'audio'
DEFAULT_BIN = ROOT.parent / 'Chaos_Grain' / 'build' / 'HoistSoundtrack_artefacts' / 'Release' / 'HoistSoundtrack'

ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
ap.add_argument('clip')
ap.add_argument('--vary', action='store_true')
ap.add_argument('--chords')
ap.add_argument('--bpm', type=float)
ap.add_argument('--dry', action='store_true')
a = ap.parse_args()

hb = pathlib.Path(os.environ.get('HOIST_BIN', DEFAULT_BIN))
if not hb.exists(): sys.exit(f'HoistSoundtrack not found at {hb}: build it in Chaos_Grain or set HOIST_BIN.')
work = pathlib.Path(tempfile.mkdtemp(prefix='hoist_'))
clip48 = work / 'clip48k.wav'
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', a.clip, '-ar', '48000', '-ac', '2', '-c:a', 'pcm_s24le', str(clip48)], check=True)
cmd = [str(hb), str(clip48), str(work / 'out'), 'stems', 'basslp']
if a.vary: cmd.append('vary')
if a.bpm: cmd.append(f'bpm={a.bpm:g}')
if a.chords: cmd.append(f'chords={a.chords}')
r = subprocess.run(cmd, capture_output=True, text=True)
print(r.stdout.strip())
if r.returncode: sys.exit(r.stderr or 'generator failed')

# all five loops must be exactly the same length so the game's cross-fades stay on the beat
lens = set()
for n in range(1, 6):
    with wave.open(str(work / 'out' / f'music_{n}.wav')) as w: lens.add(w.getnframes())
if len(lens) != 1: sys.exit(f'music loops differ in length: {lens}')
print(f'five loops, {lens.pop() / 48000:.2f} s each')
if a.dry: print(f'dry run: renders kept in {work}/out'); sys.exit()
for n in range(1, 6):
    dst = AUDIO / f'music_{n}.ogg'
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(work / 'out' / f'music_{n}.wav'), '-ar', '44100', '-c:a', 'libvorbis', '-q:a', '5', str(dst)], check=True)
    print(f'{dst.relative_to(ROOT)}: {dst.stat().st_size // 1024} KB')
shutil.rmtree(work)
print('done: the MIDI of the added parts is in the generator output if you need it (run with --dry to keep it).')
