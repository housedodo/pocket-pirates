import sys, subprocess, numpy as np
S, T = sys.argv[1], sys.argv[2]
SR = 44100; BAR = 4 * 60 / 99; LOOP = 1710545; DUR = 53.0; N = int(DUR * SR)
def rd(p, mono=False):
    a = np.frombuffer(subprocess.run(['ffmpeg', '-v', 'error', '-i', p, '-ac', '2', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True).stdout, np.float32).reshape(-1, 2)
    return a
def looped(a):   # the stem laid along the whole timeline, in step with every other stem (all start at 0)
    reps = int(np.ceil(N / len(a))) + 1; return np.tile(a, (reps, 1))[:N]
def env(points):   # [(seconds, gain)], linear between
    t = np.arange(N) / SR; ts, gs = zip(*points); return np.interp(t, ts, gs).astype(np.float32)[:, None]
B = lambda k: k * BAR
st = {}
for k in ['bass', 'shaperbox', 'pluck', 'drums', 'bell', 'guitar']: st['s1_' + k] = looped(rd(f'{S}/l4/s1_{k}.wav'))
for k in ['pluck', 'shaperbox', 'strings', 'bell']: st['n1_' + k] = looped(rd(f'{S}/night/n1_{k}.wav'))
for k in ['bass', 'drums', 'guitar', 'pluck']: st['s2_' + k] = looped(rd(f'{S}/st2/s2_{k}.wav'))
st['s4_pluck'] = looped(rd(f'{S}/st4b/s4_pluck.wav')); st['s4_drums'] = looped(rd(f'{S}/st4b/s4_drums.wav')); st['s4_drone'] = looped(rd(f'{S}/st4b/s4_drone_fixed.wav'))
x = 0.06   # a short cross-fade at every cut
E = {
  # opening: bass and shaperbox rise out of the sea, pluck joins at bar 2; full band bars 4-8; the band again softly on the end card
  's1_bass':      [(0, 0), (B(1.5), 0.9), (B(8), 0.9), (B(8) + 0.5, 0), (47.5, 0), (49.5, 0.7), (DUR - 1.5, 0.7), (DUR, 0)],
  's1_shaperbox': [(0, 0), (B(1.5), 0.9), (B(8), 0.9), (B(8) + 0.5, 0), (47.5, 0), (49.5, 0.7), (DUR - 1.5, 0.7), (DUR, 0)],
  's1_pluck':     [(0, 0), (B(2), 0), (B(2.5), 0.9), (B(8), 0.9), (B(8) + 0.5, 0)],
  's1_drums':     [(0, 0), (B(4) - x, 0), (B(4), 0.9), (B(8), 0.9), (B(8) + 0.4, 0)],
  's1_bell':      [(0, 0), (B(4) - x, 0), (B(4), 0.9), (B(8), 0.9), (B(8) + 0.6, 0), (48.5, 0), (50, 0.8), (DUR - 1.5, 0.8), (DUR, 0)],
  's1_guitar':    [(0, 0), (B(4) - x, 0), (B(4), 0.9), (B(8), 0.9), (B(8) + 0.4, 0)],
  # night
  'n1_pluck': [(0, 0), (B(8), 0), (B(8) + 0.8, 1.1), (B(10), 1.1), (B(10) + 0.4, 0)], 'n1_shaperbox': [(0, 0), (B(8), 0), (B(8) + 0.8, 1.1), (B(10), 1.1), (B(10) + 0.4, 0)],
  'n1_strings': [(0, 0), (B(8), 0), (B(8) + 0.8, 1.3), (B(10), 1.3), (B(10) + 0.6, 0)], 'n1_bell': [(0, 0), (B(8), 0), (B(8) + 0.8, 1.1), (B(10), 1.1), (B(10) + 0.4, 0)],
  # storm (stage 2 bass and drums under the rain), then stage 2 in full
  's2_bass':  [(0, 0), (B(10), 0), (B(10) + 0.3, 1.0), (B(14), 1.0), (B(14) + 1.2, 0)],
  's2_drums': [(0, 0), (B(10), 0), (B(10) + 0.3, 1.0), (B(14), 1.0), (B(14) + 0.8, 0)],
  's2_guitar': [(0, 0), (B(12) - x, 0), (B(12), 1.0), (B(14), 1.0), (B(14) + 1.5, 0)], 's2_pluck': [(0, 0), (B(12) - x, 0), (B(12), 1.0), (B(14), 1.0), (B(14) + 1.5, 0)],
  # the hut: its theme rises; the glimpse of the deep is the drone alone; then silence
  's4_drone': [(0, 0), (B(14), 0), (B(15), 0.9), (B(17), 1.0), (41.2, 1.0), (41.25, 1.4), (42.5, 1.4), (44.0, 0.6), (44.6, 0)],
  's4_pluck': [(0, 0), (B(14), 0), (B(15), 1.4), (41.15, 1.4), (41.2, 0), (42.5, 0), (42.8, 0.9), (44.2, 0.9), (44.6, 0)],
  's4_drums': [(0, 0), (B(14) + 2, 0), (B(15) + 1, 0.9), (41.15, 0.9), (41.2, 0)],
}
mix = np.zeros((N, 2), np.float32)
for k, pts in E.items(): mix += st[k] * env(pts)
mix *= 0.22
# the sea under everything (quieter in the black), gulls at the start, the storm's rain and two thunder rolls
sea = looped(rd('/home/user/pocket-pirates/public/audio/sea.ogg')); mix += sea * env([(0, 0.0), (1.0, 0.55), (44.5, 0.5), (45, 0.12), (47.5, 0.12), (48.5, 0.45), (DUR - 1, 0.45), (DUR, 0)]) * 0.6
gul = looped(rd('/home/user/pocket-pirates/public/audio/gulls.ogg')); mix += gul * env([(0, 0), (1, 0.35), (9, 0.35), (10.5, 0)]) * 0.5
rain = looped(rd('/home/user/pocket-pirates/public/audio/rain_storm.ogg')); mix += rain * env([(0, 0), (B(10) - 0.3, 0), (B(10), 0.7), (B(12), 0.7), (B(12) + 1.5, 0)]) * 0.5
th = rd('/home/user/pocket-pirates/public/audio/thunder.ogg')
for at in [B(10) + 40 / 30 + 0.4, B(10) + 112 / 30 + 0.3]:
    i = int(at * SR); seg = th[:max(0, min(len(th), N - i))]; mix[i:i + len(seg)] += seg * 0.55
mix *= np.minimum(1, np.arange(N) / (0.3 * SR))[:, None]
w = f'{T}/teaser_audio.wav'
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-af', 'loudnorm=I=-15:TP=-1.5:LRA=14', '-ar', '48000', w], input=mix.astype(np.float32).tobytes(), check=True)
print('audio', w, DUR, 's')
