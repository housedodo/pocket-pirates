#!/usr/bin/env python3
"""Writes docs/midi/hoist_stage{1..5}.mid + hoist_steel_only.mid: melodies built around the steel guitar "Hoist" motif.
125 BPM (quarter), 6/8 (6 eighths per bar), D family (Bm G D), 16 bars per loop. Run: python3 scripts/hoist_midi.py"""
import os, struct
PPQ = 480; E8 = PPQ // 2; BAR = 6 * E8
OUT = os.path.join(os.path.dirname(__file__), '..', 'docs', 'midi')
SEMI = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}

def pitch(tok):
    n = SEMI[tok[0]]; i = 1
    while tok[i] in '#b': n += 1 if tok[i] == '#' else -1; i += 1
    return 12 * (int(tok[i:]) + 1) + n

def bars(spec):
    """spec: list of bar strings 'B4:1 C#5:1 r:4' (durations in eighths, must sum to 6, or 12 for a held 2-bar span)."""
    out = []; t = 0
    for b in spec:
        used = 0
        for tok in b.split():
            nm, d = tok.split(':'); d = int(d); used += d
            if nm != 'r': out.append((t + (used - d) * E8, d * E8 - 6, pitch(nm)))
        assert used % 6 == 0, (b, used)
        t += used * E8
    return out

def vlq(n):
    b = [n & 0x7f]; n >>= 7
    while n: b.append((n & 0x7f) | 0x80); n >>= 7
    return bytes(reversed(b))

def track(name, ch, prog, notes, vel=84, bend=0, cc11=None, extra_len=0):
    ev = [(0, 0, b'\xff\x03' + vlq(len(name)) + name.encode()), (0, 1, bytes([0xc0 | ch, prog]))]
    if bend: ev.append((0, 1, bytes([0xe0 | ch, (8192 + bend) & 0x7f, (8192 + bend) >> 7])))
    if cc11:
        for t, v in cc11: ev.append((t, 1, bytes([0xb0 | ch, 11, v])))
    for t, d, p in notes:
        ev.append((t, 2, bytes([0x90 | ch, p, vel]))); ev.append((t + d, 1, bytes([0x80 | ch, p, 0])))
    ev.sort(key=lambda e: (e[0], e[1]))
    data = b''; last = 0
    for t, _, m in ev: data += vlq(t - last) + m; last = t
    end = max(last, 16 * BAR)
    data += vlq(end - last) + b'\xff\x2f\x00'
    return b'MTrk' + struct.pack('>I', len(data)) + data

def conductor():
    d = b'\x00\xff\x03\x0cHoist loop 16' + b'\x00\xff\x58\x04\x06\x03\x24\x08'
    d += b'\x00\xff\x51\x03' + (60_000_000 // 125).to_bytes(3, 'big') + b'\x00\xff\x59\x02\x02\x01'  # D major / B minor family
    d += vlq(16 * BAR) + b'\xff\x2f\x00'
    return b'MTrk' + struct.pack('>I', len(d)) + d

def write(fn, tracks):
    with open(os.path.join(OUT, fn), 'wb') as f:
        f.write(b'MThd' + struct.pack('>IHHH', 6, 1, len(tracks) + 1, PPQ) + conductor() + b''.join(tracks))
    print(fn)

def rep(a, b): return a + b   # 8-bar halves written out in full below

# --- steel guitar (the Hoist motif B D C# B | G ... at 0.7 s = half a bar, then climbing G D) ---------------------------
STEEL_A = ['B3:2 D4:1 C#4:1 B3:2', 'G3:2 B3:1 A3:1 G3:2', 'D4:2 F#4:1 E4:1 D4:2', 'A3:3 D4:2 r:1']
STEEL_A2 = STEEL_A[:3] + ['A3:3 B3:1 C#4:1 r:1']
STEEL_B = ['B3:6', 'G3:3 B3:3', 'D4:3 F#4:3', 'A3:3 D4:3']
STEEL_B2 = ['B3:3 D4:3', 'G3:3 A3:3', 'F#4:2 E4:2 D4:2', 'A3:4 B3:2']
steel1 = STEEL_A + STEEL_A2 + STEEL_B + STEEL_B2
# answer: same hook an octave up, only where the lead holds notes (call and response)
ANS = ['r:3 F#5:1 E5:1 D5:1', 'r:3 B4:1 D5:1 E5:1', 'r:3 A4:1 F#4:1 A4:1', 'r:6']
steel_hi = bars(ANS + ANS + ['r:6'] * 8)

# --- lead (accordion / fiddle) from SOUNDTRACK_BRIEF ----------------------------------------------------------------
L_A = ['B4:1 C#5:1 D5:1 F#5:2 D5:1', 'G5:2 F#5:1 E5:1 D5:2', 'F#5:2 E5:1 D5:1 A4:1 D5:1', 'D5:4 r:2']
L_A2 = L_A[:3] + ['A4:2 B4:1 r:2 B4:1']          # B4 pickup into the loop
L_B = ['F#5:3 D5:3', 'E5:3 D5:3', 'F#5:2 E5:1 D5:3', 'A4:3 D5:2 r:1']
L_B2 = L_B[:3] + ['A4:3 r:2 B4:1']
lead1 = bars(L_A + L_A2 + L_B + L_B2)

# --- whistle counter, second pass only -------------------------------------------------------------------------------
W = ['F#5:3 G5:1 F#5:1 D5:1', 'G5:2 E5:2 G5:2', 'A5:2 F#5:2 D5:2', 'r:6']
whistle1 = bars(['r:6'] * 4 + W + ['r:6'] * 4 + W)

# --- bass ----------------------------------------------------------------------------------------------------------------
BA = ['B2:3 F#2:3', 'G2:3 D3:3', 'D2:3 A2:3', 'D2:3 A2:3']
BB = ['D2:3 F#2:1 A2:2'] * 4                      # low D pedal, D2 -> F#2 -> A2
bass1 = bars(BA + BA + BB + BB)

PROG = dict(steel=25, accordion=21, fiddle=40, whistle=78, bass=32)
def stage1():
    return [track('Steel guitar (Hoist)', 0, PROG['steel'], bars(steel1), 90),
            track('Steel answer (high)', 1, PROG['steel'], steel_hi, 70),
            track('Accordion lead', 2, PROG['accordion'], lead1, 82),
            track('Whistle counter', 3, PROG['whistle'], whistle1, 70),
            track('Bass', 4, PROG['bass'], bass1, 80)]

def stage2():  # thinner, slower feel: no whistle, steel and lead on every other half-bar, bass roots only
    s = bars(['B3:6', 'G3:6', 'D4:2 F#4:1 E4:1 D4:2', 'A3:6'] * 4)
    l = bars(['r:3 F#5:3', 'r:3 D5:3', 'r:3 A4:3', 'D5:3 r:3'] * 4)
    b = bars(['B2:6', 'G2:6', 'D2:6', 'D2:6'] * 4)
    return [track('Steel guitar', 0, PROG['steel'], s, 78), track('Accordion', 2, PROG['accordion'], l, 70),
            track('Bass', 4, PROG['bass'], b, 70)]

def stage3():  # wrong notes: C over Bm (flat 2nd), A# over D (tritone from the root); sparse
    s = bars(['B3:2 D4:1 C4:1 B3:2', 'G3:2 B3:1 Ab3:1 G3:2', 'r:6', 'A#3:3 D4:3'] * 4)
    l = bars(['B4:1 C5:1 D5:1 F#5:2 D5:1', 'r:6', 'F#5:2 E5:1 D5:1 A#4:1 D5:1', 'r:6'] * 4)
    b = bars(['B2:6', 'r:6', 'D2:6', 'C2:6'] * 4)
    return [track('Steel (flat 2nd)', 0, PROG['steel'], s, 74), track('Accordion (wrong notes)', 2, PROG['accordion'], l, 68),
            track('Bass', 4, PROG['bass'], b, 66)]

def stage4():  # low D pedal + bass; lead fragments detuned -35 cents (bend range +-2 semitones => -1434)
    b = bars(['D2:6'] * 8 + ['D2:3 F#2:1 A2:2', 'D2:6', 'D2:6', 'D2:3 C2:3'] * 2)
    l = bars(['r:6'] * 3 + ['B4:2 D5:4'] + ['r:6'] * 3 + ['F#5:6'] + ['r:6'] * 2 + ['A4:3 r:3'] + ['r:6'] * 5)
    s = bars(['r:6'] * 5 + ['B3:3 r:3'] + ['r:6'] * 4 + ['G3:6'] + ['r:6'] * 5)
    return [track('Bass pedal', 4, PROG['bass'], b, 76),
            track('Accordion fragments (-35c)', 2, PROG['accordion'], l, 56, bend=-1434),
            track('Steel (-50c)', 0, PROG['steel'], s, 52, bend=-2048)]

def stage5():  # almost nothing: D2 rumble, one held note, bellows breathing as CC11 swells
    b = [(i * 4 * BAR, 4 * BAR - 6, pitch('D2')) for i in range(4)]
    l = [(2 * BAR, 12 * BAR, pitch('A4'))]
    cc = [(2 * BAR + k * 2 * BAR, v) for k, v in enumerate([20, 70, 25, 80, 20, 60])]
    return [track('Bass rumble', 4, PROG['bass'], b, 60),
            track('Accordion breathing', 2, PROG['accordion'], l, 50, cc11=cc)]

if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    write('hoist_steel_only.mid', [track('Steel guitar (Hoist)', 0, PROG['steel'], bars(steel1), 90), track('Steel answer (high)', 1, PROG['steel'], steel_hi, 70)])
    for i, f in enumerate((stage1, stage2, stage3, stage4, stage5), 1): write(f'hoist_stage{i}.mid', f())
