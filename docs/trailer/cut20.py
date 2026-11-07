"""20 s demo clip from the rendered shots (run segs.mjs and ov.mjs first):  python3 docs/trailer/cut20.py
Shots: intro + logo, sailing, Tama, cave d20, night, squall, dusk + end card. 0.3 s cross-fades, sea/gull/music bed."""
import os, subprocess
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
D = os.environ.get('TRAILER_OUT') or '/tmp/claude-0/-home-user-pocket-pirates/37a2ff23-2cf5-5710-8414-270d3e0416b6/scratchpad/trailer'
A = os.path.join(ROOT, 'public', 'audio')
FPS, XF = 30, 0.3
# (shot, first frame, seconds, overlay, overlay fade-in start, overlay fade-out start or None)
SHOTS = [('s1', 0, 3.5, 'logo', 0.5, 2.6), ('s2', 0, 3.0, 'c1', 0.4, 2.2), ('s3', 0, 3.0, 'c2', 0.4, 2.2),
         ('s4', 30, 4.0, 'c3', 0.3, 3.2), ('s5', 0, 2.5, 'c4', 0.3, 1.8), ('s6', 0, 2.5, 'c5', 0.3, 1.8),
         ('s7', 0, 3.6, 'end', 1.2, None)]
args, f = ['ffmpeg', '-y', '-loglevel', 'error'], []
for i, (s, st, dur, ov, fi, fo) in enumerate(SHOTS):
  args += ['-framerate', str(FPS), '-start_number', str(st), '-i', f'{D}/{s}/%04d.jpg',
           '-loop', '1', '-framerate', str(FPS), '-t', str(dur), '-i', f'{D}/ov-{ov}.png']
  fade = f'fade=in:st={fi}:d=0.35:alpha=1' + (f',fade=out:st={fo}:d=0.35:alpha=1' if fo else '')
  f.append(f'[{2*i}:v]trim=duration={dur},setpts=PTS-STARTPTS,scale=1920:1080,format=yuv420p[b{i}];'
           f'[{2*i+1}:v]format=rgba,{fade}[o{i}];[b{i}][o{i}]overlay=format=auto,fps={FPS}[v{i}]')
prev, t = 'v0', SHOTS[0][2]
for i in range(1, len(SHOTS)):
  t -= XF; f.append(f'[{prev}][v{i}]xfade=transition=fade:duration={XF}:offset={t:.2f}[x{i}]'); prev = f'x{i}'; t += SHOTS[i][2]
total = t
n = 2 * len(SHOTS)
args += ['-i', f'{A}/sea.ogg', '-i', f'{A}/gulls.ogg', '-i', f'{A}/music_1.ogg', '-i', f'{A}/thunder.ogg']
storm = sum(s[2] for s in SHOTS[:5]) - 5 * XF   # when the squall shot starts
f.append(f'[{n}:a]volume=1.6[sea];[{n+1}:a]volume=0.35[gu];[{n+2}:a]volume=0.55[mu];[{n+3}:a]adelay={int(storm*1000)}|{int(storm*1000)},volume=0.6[th];'
         f'[sea][gu][mu][th]amix=inputs=4:normalize=0,atrim=duration={total:.2f},afade=in:d=0.6,afade=out:st={total-1.5:.2f}:d=1.5,volume=2,alimiter=limit=0.9[a]')
args += ['-filter_complex', ';'.join(f), '-map', f'[{prev}]', '-map', '[a]', '-c:v', 'libx264', '-crf', '18', '-preset', 'slow',
         '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', f'{D}/hoist-demo-20s.mp4']
subprocess.run(args, check=True)
print(f'{D}/hoist-demo-20s.mp4  {total:.1f} s')
