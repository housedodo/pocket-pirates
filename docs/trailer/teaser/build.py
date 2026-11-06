import subprocess
BAR=60/99*4; F=30
shots=[('a1',2*BAR),('a2',2*BAR),('a3',BAR),('a4',BAR),('a5',BAR),('a6',BAR),('a7',2*BAR),('a8',2*BAR),('a9',2*BAR),('a10',3*BAR),('a11',1.3),('a12',2.0)]
t=0; bounds=[]
for s,d in shots: bounds.append((s,round(t*F),round((t+d)*F))); t+=d
T_END=bounds[-1][2]/F
DARK=3.0; ENDC=53.0-T_END-DARK
args=['ffmpeg','-y','-loglevel','error']; fc=[]; n=0
for s,a,b in bounds:
    args+=['-framerate',str(F),'-start_number','0','-i',f'frames/{s}/%04d.jpg']
    fc.append(f'[{n}:v]scale=1280:720,setsar=1,tpad=stop_mode=clone:stop_duration=3,trim=end_frame={b-a},setpts=PTS-STARTPTS[v{n}]'); n+=1
# end card background: noon sail, slowed
args+=['-framerate',str(F),'-start_number','0','-i','frames/a6/%04d.jpg']; bgi=n; n+=1
fc.append(f'[{bgi}:v]scale=1280:720,setsar=1,setpts=2.2*PTS,fps={F},tpad=stop_mode=clone:stop_duration=6,trim=duration={ENDC:.3f},setpts=PTS-STARTPTS,fade=in:st=0:d=1.2[bg]')
fc.append(f'color=black:s=1280x720:r={F}:d={DARK:.3f}[blk]')
fc.append(''.join(f'[v{i}]' for i in range(len(bounds)))+f'[blk][bg]concat=n={len(bounds)+2}:v=1:a=0[base]')
caps=[('c1',0.7,4.5),('c2',9.95,12.0),('c3',19.9,24.0),('c4',24.7,29.0),('c5',29.5,33.7),('c6',34.6,40.6),('dark',T_END+0.4,T_END+DARK-0.2),('end',T_END+DARK+0.8,53.0)]
last='base'
for k,(c,a,b) in enumerate(caps):
    args+=['-loop','1','-framerate',str(F),'-i',f'ov-{c}.png']
    fade=f'fade=in:st={a}:d=0.35:alpha=1,fade=out:st={b-0.4}:d=0.4:alpha=1' if c!='end' else f'fade=in:st={a}:d=0.8:alpha=1'
    fc.append(f'[{n}:v]scale=1280:720,format=rgba,trim=duration=53,{fade}[o{k}]')
    fc.append(f'[{last}][o{k}]overlay=enable=\'between(t,{a},{b})\':shortest=0[m{k}]'); last=f'm{k}'; n+=1
# quick flash cut into the abyss, fade out at the very end
fc.append(f'[{last}]fade=out:st=52.2:d=0.8,trim=duration=53,format=yuv420p[vout]')
args+=['-i','teaser_audio.wav','-filter_complex',';'.join(fc),'-map','[vout]','-map',f'{n}:a','-c:v','libx264','-crf','18','-preset','medium','-c:a','aac','-b:a','192k','-shortest','-movflags','+faststart','Hoist_teaser.mp4']
print('T_END',T_END,[ (s,a/F) for s,a,b in bounds])
subprocess.run(args,check=True)
