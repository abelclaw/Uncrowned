#!/usr/bin/env python3
"""
Generate a 4-voice fugue using the original menu melody as the subject.
Same instruments as the existing fugue (warm_lead, triangle, soft_square, sine).
D minor, 92 BPM, 24 bars = 96 beats.

Subject (from original theme hook):
  D4(1) F4(.5) A4(.5) D5(2) | C5(1) Bb4(.5) A4(.5) G4(2)
"""

import wave
import struct
import math
import os

SAMPLE_RATE = 44100
BPM = 92
BEAT = 60.0 / BPM

NOTE_FREQ = {
    'R': 0,
    'C3': 130.81, 'D3': 146.83, 'Eb3': 155.56, 'E3': 164.81, 'F3': 174.61,
    'G3': 196.00, 'Ab3': 207.65, 'A3': 220.00, 'Bb3': 233.08, 'B3': 246.94,
    'C4': 261.63, 'D4': 293.66, 'Eb4': 311.13, 'E4': 329.63, 'F4': 349.23,
    'G4': 392.00, 'Ab4': 415.30, 'A4': 440.00, 'Bb4': 466.16, 'B4': 493.88,
    'C5': 523.25, 'D5': 587.33, 'Eb5': 622.25, 'E5': 659.25, 'F5': 698.46,
    'G5': 783.99, 'A5': 880.00, 'Bb5': 932.33,
}


# ── Waveforms (same as existing fugue) ──

def sine(freq, t):
    return math.sin(2 * math.pi * freq * t) if freq > 0 else 0

def triangle(freq, t):
    if freq == 0: return 0
    p = (t * freq) % 1.0
    return 4 * abs(p - 0.5) - 1

def soft_square(freq, t):
    if freq == 0: return 0
    return (sine(freq, t) + sine(freq*3, t)/3 + sine(freq*5, t)/5) * 0.7

def warm_lead(freq, t):
    if freq == 0: return 0
    return 0.5 * sine(freq, t) + 0.3 * triangle(freq, t) + 0.15 * sine(freq*2, t) + 0.05 * sine(freq*3, t)


# ── Envelope and rendering ──

def adsr(t, dur, a=0.02, d=0.05, s=0.7, r=0.1):
    r = min(r, dur * 0.3)
    if t < 0: return 0
    if t < a: return t / a
    if t < a + d: return 1.0 - (1.0 - s) * ((t - a) / d)
    if t < dur - r: return s
    if t < dur: return s * (1.0 - (t - (dur - r)) / r)
    return 0

def render_voice(notes, wave_fn, vol=0.3, a=0.02, d=0.05, s=0.7, r=0.1):
    total_beats = sum(b for _, b in notes)
    total_samples = int(total_beats * BEAT * SAMPLE_RATE)
    buf = [0.0] * total_samples
    t_offset = 0.0
    for note, beats in notes:
        freq = NOTE_FREQ.get(note, 0)
        dur = beats * BEAT
        n_samp = int(dur * SAMPLE_RATE)
        for i in range(n_samp):
            t = i / SAMPLE_RATE
            idx = int((t_offset + t) * SAMPLE_RATE)
            if idx >= len(buf): break
            env = adsr(t, dur, a, d, s, r)
            buf[idx] += wave_fn(freq, t_offset + t) * vol * env
        t_offset += dur
    return buf

def add_delay(buf, delay_ms=300, feedback=0.3, mix=0.25):
    delay_samples = int(SAMPLE_RATE * delay_ms / 1000)
    out = buf[:]
    for i in range(delay_samples, len(out)):
        out[i] += out[i - delay_samples] * feedback
    return [d * (1 - mix) + w * mix for d, w in zip(buf, out)]

def mix_and_normalize(*tracks, target=0.75):
    length = max(len(t) for t in tracks)
    mixed = [0.0] * length
    for track in tracks:
        for i in range(len(track)):
            mixed[i] += track[i]
    peak = max(abs(s) for s in mixed) or 1
    scale = target / peak
    return mixed, scale

def apply_fadeout(buf, fade_seconds=2.0):
    fade_samples = int(SAMPLE_RATE * fade_seconds)
    start = len(buf) - fade_samples
    for i in range(fade_samples):
        buf[i + start] *= 1.0 - (i / fade_samples)
    return buf

def write_wav(filepath, samples):
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    int_samples = [max(-32767, min(32767, int(s * 32767))) for s in samples]
    with wave.open(filepath, 'w') as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(SAMPLE_RATE)
        data = struct.pack(f'<{len(int_samples)}h', *int_samples)
        wav.writeframes(data)
    duration = len(int_samples) / SAMPLE_RATE
    size_kb = os.path.getsize(filepath) / 1024
    print(f'Created: {filepath} ({duration:.1f}s, {size_kb:.0f} KB)')


# =========================================================================
# COMPOSITION — 4-voice fugue built on the original melody
# =========================================================================
# Subject (8 beats, from original hook):
#   D4(1) F4(.5) A4(.5) D5(2) | C5(1) Bb4(.5) A4(.5) G4(2)
#
# Tonal answer (at the 5th, A minor):
#   A3(1) C4(.5) E4(.5) A4(2) | G4(1) F4(.5) E4(.5) D4(2)

def main():
    print('Composing melodic fugue theme...')
    print(f'  Key: D minor | Tempo: {BPM} BPM | Beat: {BEAT:.3f}s')

    # ==================================================================
    # SOPRANO — warm_lead (carries the original melody)
    # ==================================================================
    soprano = [
        # Bars 1-2: SUBJECT (the hook)
        ('D4', 1), ('F4', 0.5), ('A4', 0.5), ('D5', 2),
        ('C5', 1), ('Bb4', 0.5), ('A4', 0.5), ('G4', 2),

        # Bars 3-4: Countersubject (while alto has answer)
        ('F4', 1), ('G4', 0.5), ('A4', 0.5), ('Bb4', 1.5), ('A4', 0.5),
        ('G4', 1), ('F4', 1), ('D4', 2),

        # Bars 5-6: Continuation (variation on hook)
        ('D4', 0.5), ('E4', 0.5), ('F4', 0.5), ('A4', 0.5), ('D5', 1), ('C5', 1),
        ('Bb4', 1), ('C5', 0.5), ('D5', 0.5), ('E5', 2),

        # Bars 7-8: Climax phrase
        ('F5', 1), ('E5', 0.5), ('D5', 0.5), ('C5', 1), ('Bb4', 1),
        ('A4', 1.5), ('G4', 0.5), ('F4', 1), ('D4', 1),

        # Bars 9-10: Theme B material
        ('Bb4', 1), ('D5', 1), ('C5', 1), ('Bb4', 1),
        ('A4', 1), ('G4', 1), ('F4', 1), ('E4', 1),

        # Bars 11-12: Lyrical phrase
        ('F4', 1.5), ('A4', 0.5), ('C5', 2),
        ('Bb4', 1), ('A4', 1), ('G4', 2),

        # Bars 13-14: Subject return
        ('D4', 1), ('F4', 0.5), ('A4', 0.5), ('D5', 2),
        ('C5', 1), ('D5', 0.5), ('E5', 0.5), ('F5', 2),

        # Bars 15-16: Dramatic descent
        ('E5', 1), ('D5', 0.5), ('C5', 0.5), ('Bb4', 1), ('A4', 1),
        ('G4', 1), ('F4', 0.5), ('E4', 0.5), ('D4', 2),

        # Bars 17-18: Winding down
        ('A4', 1.5), ('G4', 0.5), ('F4', 2),
        ('E4', 1), ('F4', 1), ('D4', 2),

        # Bars 19-20: Final subject statement
        ('D4', 1), ('F4', 0.5), ('A4', 0.5), ('D5', 2),
        ('C5', 1), ('Bb4', 0.5), ('A4', 0.5), ('G4', 2),

        # Bars 21-22: Cadential
        ('A4', 1), ('Bb4', 1), ('A4', 1), ('G4', 1),
        ('A4', 2), ('D5', 2),

        # Bars 23-24: Resolution
        ('C5', 1), ('Bb4', 0.5), ('A4', 0.5), ('G4', 1), ('A4', 1),
        ('D4', 4),
    ]

    # ==================================================================
    # ALTO — triangle
    # ==================================================================
    alto = [
        # Bars 1-2: Rest (soprano alone)
        ('R', 8),

        # Bars 3-4: ANSWER in A minor
        ('A3', 1), ('C4', 0.5), ('E4', 0.5), ('A4', 2),
        ('G4', 1), ('F4', 0.5), ('E4', 0.5), ('D4', 2),

        # Bars 5-6: Countersubject
        ('R', 0.5), ('E4', 0.5), ('D4', 1), ('C4', 1), ('Bb3', 1),
        ('C4', 1), ('D4', 0.5), ('C4', 0.5), ('Bb3', 1), ('A3', 1),

        # Bars 7-8: Free counterpoint
        ('D4', 1), ('E4', 0.5), ('F4', 0.5), ('G4', 1), ('F4', 0.5), ('E4', 0.5),
        ('D4', 1), ('E4', 1), ('F4', 1), ('E4', 1),

        # Bars 9-10: Episode
        ('F4', 0.5), ('E4', 0.5), ('D4', 1), ('C4', 1), ('D4', 1),
        ('E4', 1), ('F4', 0.5), ('E4', 0.5), ('D4', 1), ('C4', 1),

        # Bars 11-12: Answer fragment
        ('A3', 1), ('C4', 0.5), ('E4', 0.5), ('A4', 2),
        ('G4', 1), ('F4', 1), ('E4', 1), ('D4', 1),

        # Bars 13-14: Free
        ('F4', 0.5), ('E4', 0.5), ('D4', 1), ('E4', 0.5), ('F4', 0.5), ('G4', 1),
        ('A4', 1), ('G4', 0.5), ('F4', 0.5), ('E4', 1), ('D4', 1),

        # Bars 15-16: Supporting
        ('C4', 1), ('D4', 0.5), ('E4', 0.5), ('F4', 1), ('E4', 1),
        ('D4', 1), ('C4', 0.5), ('D4', 0.5), ('E4', 1), ('D4', 1),

        # Bars 17-18: Sustained
        ('E4', 1), ('D4', 0.5), ('C4', 0.5), ('D4', 2),
        ('C4', 1), ('D4', 1), ('E4', 1), ('D4', 1),

        # Bars 19-20: Answer return
        ('A3', 1), ('C4', 0.5), ('E4', 0.5), ('A4', 2),
        ('G4', 1), ('F4', 0.5), ('E4', 0.5), ('D4', 2),

        # Bars 21-22: Cadential
        ('E4', 1), ('F4', 1), ('E4', 1), ('D4', 1),
        ('F4', 2), ('E4', 2),

        # Bars 23-24: Resolution
        ('E4', 1), ('D4', 0.5), ('C4', 0.5), ('D4', 1), ('E4', 1),
        ('F4', 4),
    ]

    # ==================================================================
    # TENOR — soft_square (reed organ)
    # ==================================================================
    tenor = [
        # Bars 1-4: Rest
        ('R', 16),

        # Bars 5-6: SUBJECT in D3
        ('D3', 1), ('F3', 0.5), ('A3', 0.5), ('D4', 2),
        ('C4', 1), ('Bb3', 0.5), ('A3', 0.5), ('G3', 2),

        # Bars 7-8: Countersubject
        ('Bb3', 0.5), ('A3', 0.5), ('G3', 1), ('F3', 1), ('A3', 1),
        ('G3', 1), ('F3', 0.5), ('E3', 0.5), ('D3', 1), ('E3', 1),

        # Bars 9-10: Episode
        ('F3', 1), ('G3', 1), ('A3', 1), ('Bb3', 1),
        ('A3', 1), ('G3', 0.5), ('F3', 0.5), ('E3', 1), ('D3', 1),

        # Bars 11-12: Subject fragment
        ('D3', 1), ('F3', 0.5), ('A3', 0.5), ('D4', 2),
        ('C4', 1), ('Bb3', 1), ('A3', 1), ('G3', 1),

        # Bars 13-14: Free
        ('A3', 1), ('Bb3', 0.5), ('C4', 0.5), ('D4', 1), ('C4', 1),
        ('Bb3', 1), ('A3', 0.5), ('G3', 0.5), ('F3', 1), ('G3', 1),

        # Bars 15-16: Stretto subject
        ('A3', 0.5), ('Bb3', 0.5), ('C4', 1), ('Bb3', 1), ('A3', 1),
        ('D3', 1), ('F3', 0.5), ('A3', 0.5), ('D4', 1), ('A3', 1),

        # Bars 17-18: Supporting
        ('G3', 1), ('A3', 0.5), ('Bb3', 0.5), ('A3', 1), ('G3', 1),
        ('F3', 1), ('G3', 1), ('A3', 1), ('G3', 1),

        # Bars 19-20: Subject return
        ('D3', 1), ('F3', 0.5), ('A3', 0.5), ('D4', 2),
        ('C4', 1), ('Bb3', 0.5), ('A3', 0.5), ('G3', 2),

        # Bars 21-22: Cadential
        ('Bb3', 1), ('A3', 1), ('G3', 1), ('A3', 1),
        ('D3', 1), ('F3', 0.5), ('A3', 0.5), ('D4', 2),

        # Bars 23-24: Resolution
        ('Bb3', 1), ('A3', 0.5), ('G3', 0.5), ('A3', 1), ('A3', 1),
        ('A3', 4),
    ]

    # ==================================================================
    # BASS — sine (deep foundation)
    # ==================================================================
    bass = [
        # Bars 1-6: Rest
        ('R', 24),

        # Bars 7-8: SUBJECT in D3
        ('D3', 1), ('F3', 0.5), ('A3', 0.5), ('D4', 2),
        ('C4', 1), ('Bb3', 0.5), ('A3', 0.5), ('G3', 2),

        # Bars 9-10: Walking bass
        ('D3', 1), ('E3', 1), ('F3', 1), ('G3', 1),
        ('A3', 1), ('G3', 1), ('F3', 1), ('E3', 1),

        # Bars 11-12: Pedal + walk
        ('D3', 2), ('A3', 2),
        ('Bb3', 1), ('A3', 1), ('G3', 1), ('F3', 1),

        # Bars 13-14: Walking bass
        ('D3', 1), ('F3', 1), ('A3', 1), ('G3', 1),
        ('F3', 1), ('E3', 1), ('D3', 1), ('C3', 1),

        # Bars 15-16: Dominant pedal
        ('D3', 4),
        ('D3', 2), ('A3', 2),

        # Bars 17-18: Walking bass
        ('Bb3', 1), ('A3', 1), ('G3', 1), ('F3', 1),
        ('G3', 1), ('A3', 1), ('Bb3', 1), ('A3', 1),

        # Bars 19-20: Subject fragment
        ('D3', 1), ('F3', 0.5), ('A3', 0.5), ('D4', 2),
        ('Bb3', 1), ('A3', 1), ('G3', 1), ('F3', 1),

        # Bars 21-22: Cadential
        ('G3', 1), ('Bb3', 1), ('A3', 2),
        ('D3', 4),

        # Bars 23-24: Final cadence
        ('A3', 2), ('D3', 2),
        ('D3', 4),
    ]

    # ==================================================================
    # Verify bar counts
    # ==================================================================
    for name, notes in [('Soprano', soprano), ('Alto', alto), ('Tenor', tenor), ('Bass', bass)]:
        total = sum(b for _, b in notes)
        assert total == 96, f'{name}: expected 96 beats, got {total}'
        print(f'  {name}: {total} beats OK')

    # ==================================================================
    # Render (same settings as existing fugue)
    # ==================================================================
    print('  Rendering soprano (warm lead)...')
    sop_buf = render_voice(soprano, warm_lead, vol=0.30, a=0.015, d=0.06, s=0.7, r=0.10)

    print('  Rendering alto (triangle)...')
    alt_buf = render_voice(alto, triangle, vol=0.22, a=0.02, d=0.08, s=0.6, r=0.12)

    print('  Rendering tenor (reed organ)...')
    ten_buf = render_voice(tenor, soft_square, vol=0.20, a=0.01, d=0.05, s=0.7, r=0.08)

    print('  Rendering bass (sine)...')
    bas_buf = render_voice(bass, sine, vol=0.32, a=0.03, d=0.1, s=0.6, r=0.15)

    # ==================================================================
    # Effects and mixing (same as existing fugue)
    # ==================================================================
    print('  Mixing...')
    sop_buf = add_delay(sop_buf, delay_ms=250, feedback=0.12, mix=0.12)

    mixed, scale = mix_and_normalize(sop_buf, alt_buf, ten_buf, bas_buf, target=0.75)
    final = [s * scale for s in mixed]
    final = apply_fadeout(final, fade_seconds=3.0)

    output_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                               'public', 'assets', 'audio', 'music', 'menu-melodic-fugue.wav')
    write_wav(output_path, final)

    total_beats = sum(b for _, b in soprano)
    print(f'\n  Total: {total_beats} beats = {total_beats * BEAT:.1f}s at {BPM} BPM')
    print('Done!')


if __name__ == '__main__':
    main()
