import subprocess, numpy as np
SR = 44100; BAR = 4 * 60 / 99; DUR = 37 * BAR; N = int(DUR * SR); A = '/home/user/pocket-pirates/public/audio/'
def rd(p): return np.frombuffer(subprocess.run(['ffmpeg', '-v', 'error', '-i', p, '-ac', '2', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True).stdout, np.float32).reshape(-1, 2)
def looped(a): return np.tile(a, (int(np.ceil(N / len(a))) + 1, 1))[:N]
def env(pts): t = np.arange(N) / SR; ts, gs = zip(*pts); return np.interp(t, ts, gs).astype(np.float32)[:, None]
B = lambda k: k * BAR
st = {k: looped(rd(A + k + '.ogg')) for k in ['s1_bass', 's1_shaperbox', 's1_pluck', 's1_drums', 's1_bell', 's1_guitar', 'n1_pluck', 'n1_shaperbox', 'n1_strings', 'n1_bell', 's2_bass', 's2_drums', 's2_guitar', 's2_pluck', 's4_drone', 's4_pluck', 's4_drums']}
x = 0.06
E = {
  's1_bass':      [(0, 0), (B(1.5), 0.9), (B(15), 0.9), (B(15.5), 0)],
  's1_shaperbox': [(0, 0), (B(1.5), 0.9), (B(17), 0.7), (B(17.4), 0)],
  's1_pluck':     [(0, 0), (B(2), 0), (B(2.5), 0.9), (B(17), 0.8), (B(17.4), 0)],
  's1_drums':     [(0, 0), (B(4) - x, 0), (B(4), 0.9), (B(15), 0.9), (B(15.3), 0)],
  's1_guitar':    [(0, 0), (B(4) - x, 0), (B(4), 0.9), (B(15), 0.9), (B(15.3), 0)],
  's1_bell':      [(0, 0), (B(4) - x, 0), (B(4), 0.9), (B(17), 0.9), (B(17.5), 0)],
  'n1_pluck':     [(0, 0), (B(17), 0), (B(17) + 0.6, 1.1), (B(20), 1.1), (B(20) + 0.4, 0)],
  'n1_shaperbox': [(0, 0), (B(17), 0), (B(17) + 0.6, 1.1), (B(20), 1.1), (B(20) + 0.4, 0)],
  'n1_strings':   [(0, 0), (B(17), 0), (B(17) + 0.6, 1.3), (B(20), 1.3), (B(20) + 0.6, 0)],
  'n1_bell':      [(0, 0), (B(17), 0), (B(17) + 0.6, 1.1), (B(20), 1.1), (B(20) + 0.4, 0)],
  's2_bass':      [(0, 0), (B(20), 0), (B(20) + 0.3, 1.0), (B(24), 1.0), (B(24) + 1.2, 0)],
  's2_drums':     [(0, 0), (B(20), 0), (B(20) + 0.3, 1.0), (B(24), 1.0), (B(24) + 0.8, 0)],
  's2_guitar':    [(0, 0), (B(22) - x, 0), (B(22), 1.0), (B(24), 1.0), (B(24) + 1.5, 0)],
  's2_pluck':     [(0, 0), (B(22) - x, 0), (B(22), 1.0), (B(24), 1.0), (B(24) + 1.5, 0)],
  # the hut: drone rises on the approach, pluck joins, drums at the window; in the black only the drone; theme again on the end card
  's4_drone':     [(0, 0), (B(23.5), 0), (B(24.5), 0.9), (B(32.5), 1.1), (B(33.5), 1.3), (B(36), 1.0), (DUR, 0)],
  's4_pluck':     [(0, 0), (B(25), 0), (B(26), 1.3), (B(32.4), 1.3), (B(32.5), 0), (B(33.5), 0), (B(34), 1.0), (DUR - 1.5, 0.9), (DUR, 0)],
  's4_drums':     [(0, 0), (B(28) - x, 0), (B(28), 0.9), (B(32.4), 0.9), (B(32.5), 0)],
}
mix = np.zeros((N, 2), np.float32)
for k, pts in E.items(): mix += st[k] * env(pts)
mix *= 0.22
sea = looped(rd(A + 'sea.ogg')); mix += sea * env([(0, 0), (1, 0.55), (B(32.5), 0.5), (B(33), 0.12), (DUR, 0.1)]) * 0.6
gul = looped(rd(A + 'gulls.ogg')); mix += gul * env([(0, 0), (1, 0.35), (B(4), 0.35), (B(5), 0)]) * 0.5
rain = looped(rd(A + 'rain_storm.ogg')); mix += rain * env([(0, 0), (B(20) - 0.3, 0), (B(20), 0.7), (B(22), 0.7), (B(22) + 1.5, 0)]) * 0.5
th = rd(A + 'thunder.ogg'); d20 = rd(A + 'roll_d20.ogg')
def at(clip, t, g):
    i = int(t * SR); seg = clip[:max(0, min(len(clip), N - i))]; mix[i:i + len(seg)] += seg * g
for t in [B(20) + 40 / 30 + 0.4, B(20) + 112 / 30 + 0.3]: at(th, t, 0.55)
at(d20, B(30) + 18 / 30, 0.7)
mix *= np.minimum(1, np.arange(N) / (0.3 * SR))[:, None]
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-af', 'loudnorm=I=-15:TP=-1.5:LRA=14', '-ar', '48000', 'demo90_audio.wav'], input=mix.astype(np.float32).tobytes(), check=True)
print('ok', DUR)
