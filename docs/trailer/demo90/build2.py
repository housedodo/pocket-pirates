import subprocess
BAR = 60 / 99 * 4; F = 30; DUR = 37 * BAR
shots = [('a1', 2), ('a2', 2), ('b1', 1), ('a6', 1), ('b6', 1), ('a4', 1), ('a5', 1), ('b2', 1), ('b3', 1), ('b4', 1), ('b5', 1), ('b7', 1), ('b12', 1), ('b13', 2), ('a7', 2), ('b8', 1), ('a8', 2), ('a9', 2), ('a10', 4), ('a12', 2), ('b9', 2.5)]
t = 0; bounds = []
for s, b in shots: d = b * BAR; bounds.append((s, round(t * F), round((t + d) * F))); t += d
T_END = bounds[-1][2] / F; DARK = BAR; ENDC = DUR - T_END - DARK
args = ['ffmpeg', '-y', '-loglevel', 'error']; fc = []; n = 0
for s, a, b in bounds:
    args += ['-framerate', str(F), '-start_number', '0', '-i', f'frames/{s}/%04d.jpg']
    fc.append(f'[{n}:v]scale=1280:720,setsar=1,tpad=stop_mode=clone:stop_duration=3,trim=end_frame={b - a},setpts=PTS-STARTPTS[v{n}]'); n += 1
args += ['-framerate', str(F), '-start_number', '0', '-i', 'frames/a12/%04d.jpg']; bgi = n; n += 1
fc.append(f'[{bgi}:v]scale=1280:720,setsar=1,setpts=2.5*PTS,fps={F},tpad=stop_mode=clone:stop_duration=8,trim=duration={ENDC:.3f},setpts=PTS-STARTPTS,eq=brightness=-0.08,fade=in:st=0:d=1.2[bg]')
fc.append(f'color=black:s=1280x720:r={F}:d={DARK:.3f}[blk]')
fc.append(''.join(f'[v{i}]' for i in range(len(bounds))) + f'[blk][bg]concat=n={len(bounds) + 2}:v=1:a=0[base]')
caps = [('dark', T_END + 0.2, T_END + DARK - 0.1), ('end', T_END + DARK + 0.8, DUR)]
last = 'base'
for k, (c, a, b) in enumerate(caps):
    args += ['-loop', '1', '-framerate', str(F), '-i', f'ov-{c}.png']
    fade = f'fade=in:st={a}:d=0.35:alpha=1,fade=out:st={b - 0.35}:d=0.35:alpha=1' if c != 'end' else f'fade=in:st={a}:d=0.8:alpha=1'
    fc.append(f'[{n}:v]scale=1280:720,format=rgba,trim=duration={DUR:.3f},{fade}[o{k}]')
    fc.append(f"[{last}][o{k}]overlay=enable='between(t,{a},{b})':shortest=0[m{k}]"); last = f'm{k}'; n += 1
fc.append(f'[{last}]fade=out:st={DUR - 0.9:.3f}:d=0.9,trim=duration={DUR:.3f},format=yuv420p[vout]')
args += ['-i', 'demo90_audio.wav', '-filter_complex', ';'.join(fc), '-map', '[vout]', '-map', f'{n}:a', '-c:v', 'libx264', '-crf', '18', '-preset', 'medium', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', 'Hoist_demo_90s.mp4']
print('T_END', round(T_END, 2), [(s, round(a / F, 1)) for s, a, b in bounds])
subprocess.run(args, check=True)
