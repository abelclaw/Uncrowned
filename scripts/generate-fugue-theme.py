#!/usr/bin/env python3
"""
Generate a 4-voice fugue main menu theme for Uncrowned.
D minor, 92 BPM, ~63 seconds. Baroque-inspired with medieval game feel.

Voices:
  Soprano (warm_lead)  - enters first with subject
  Alto    (triangle)   - enters second with answer at the 5th
  Tenor   (soft_square) - enters third with subject
  Bass    (sine)       - enters fourth with subject

Structure (24 bars, 96 beats):
  Bars 1-2:   Soprano alone — Subject in D minor
  Bars 3-4:   Alto answer in A, soprano countersubject
  Bars 5-6:   Tenor subject in D (octave lower), others continue
  Bars 7-8:   Bass subject in D (low octave), all 4 voices
  Bars 9-10:  Episode 1 — rising sequence
  Bars 11-12: Middle entry — subject in F major (soprano)
  Bars 13-14: Episode 2 — descending sequence
  Bars 15-16: Stretto — subject entries overlap
  Bars 17-18: Climax and descent
  Bars 19-20: Final subject statement
  Bars 21-24: Cadential progression and resolution
"""

import wave
import struct
import math
import os

SAMPLE_RATE = 44100
BPM = 92
BEAT = 60.0 / BPM  # ~0.652 seconds per beat

NOTE_FREQ = {
    'R': 0,
    'C3': 130.81, 'D3': 146.83, 'Eb3': 155.56, 'E3': 164.81, 'F3': 174.61,
    'G3': 196.00, 'Ab3': 207.65, 'A3': 220.00, 'Bb3': 233.08, 'B3': 246.94,
    'C4': 261.63, 'D4': 293.66, 'Eb4': 311.13, 'E4': 329.63, 'F4': 349.23,
    'G4': 392.00, 'Ab4': 415.30, 'A4': 440.00, 'Bb4': 466.16, 'B4': 493.88,
    'C5': 523.25, 'D5': 587.33, 'Eb5': 622.25, 'E5': 659.25, 'F5': 698.46,
    'G5': 783.99, 'A5': 880.00, 'Bb5': 932.33,
}


# =========================================================================
# Waveforms — each voice gets a distinct timbre
# =========================================================================

def sine(freq, t):
    return math.sin(2 * math.pi * freq * t) if freq > 0 else 0

def triangle(freq, t):
    if freq == 0: return 0
    p = (t * freq) % 1.0
    return 4 * abs(p - 0.5) - 1

def soft_square(freq, t):
    """Square wave with only first 3 odd harmonics — mellow reed/organ tone."""
    if freq == 0: return 0
    return (sine(freq, t) + sine(freq*3, t)/3 + sine(freq*5, t)/5) * 0.7

def warm_lead(freq, t):
    """Blend of sine + triangle + soft overtone for a warm melodic lead."""
    if freq == 0: return 0
    return 0.5 * sine(freq, t) + 0.3 * triangle(freq, t) + 0.15 * sine(freq*2, t) + 0.05 * sine(freq*3, t)


# =========================================================================
# Envelope and rendering
# =========================================================================

def adsr(t, dur, a=0.02, d=0.05, s=0.7, r=0.1):
    """ADSR envelope."""
    r = min(r, dur * 0.3)
    if t < 0: return 0
    if t < a: return t / a
    if t < a + d: return 1.0 - (1.0 - s) * ((t - a) / d)
    if t < dur - r: return s
    if t < dur: return s * (1.0 - (t - (dur - r)) / r)
    return 0


def render_voice(notes, wave_fn, vol=0.3, a=0.02, d=0.05, s=0.7, r=0.1):
    """Render a note sequence to float samples."""
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
    """Simple delay/echo effect."""
    delay_samples = int(SAMPLE_RATE * delay_ms / 1000)
    out = buf[:]
    for i in range(delay_samples, len(out)):
        out[i] += out[i - delay_samples] * feedback
    return [d * (1 - mix) + w * mix for d, w in zip(buf, out)]


def mix_and_normalize(*tracks, target=0.75):
    """Mix tracks and normalize to target amplitude."""
    length = max(len(t) for t in tracks)
    mixed = [0.0] * length
    for track in tracks:
        for i in range(len(track)):
            mixed[i] += track[i]
    peak = max(abs(s) for s in mixed) or 1
    scale = target / peak
    return mixed, scale


def apply_fadeout(buf, fade_seconds=2.0):
    """Apply fade-out to the end."""
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
# COMPOSITION — 4-voice fugue in D minor
# =========================================================================
# Subject (8 beats = 2 bars):
#   D4(1) F4(.5) A4(.5) D5(2) | C5(1) Bb4(.5) A4(.5) G4(1) A4(1)
#   — ascending D minor arpeggio to the octave, then stepwise descent
#
# Answer (at the 5th, A minor, 8 beats):
#   A3(1) C4(.5) E4(.5) A4(2) | G4(1) F4(.5) E4(.5) D4(1) E4(1)

def main():
    print('Composing Uncrowned fugue theme...')
    print(f'  Key: D minor | Tempo: {BPM} BPM | Beat: {BEAT:.3f}s')

    # ==================================================================
    # SOPRANO — warm_lead
    # ==================================================================
    soprano = [
        # Bars 1-2: SUBJECT
        ('D4', 1), ('F4', 0.5), ('A4', 0.5), ('D5', 2),
        ('C5', 1), ('Bb4', 0.5), ('A4', 0.5), ('G4', 1), ('A4', 1),

        # Bars 3-4: Countersubject (against alto answer)
        ('R', 0.5), ('E5', 0.5), ('D5', 1), ('C5', 1), ('Bb4', 1),
        ('C5', 1), ('D5', 0.5), ('C5', 0.5), ('Bb4', 1), ('A4', 1),

        # Bars 5-6: Free counterpoint (tenor enters with subject)
        ('D5', 1), ('C5', 0.5), ('D5', 0.5), ('E5', 1), ('F5', 1),
        ('E5', 1), ('D5', 0.5), ('C5', 0.5), ('Bb4', 1), ('A4', 1),

        # Bars 7-8: Free (bass enters with subject)
        ('Bb4', 1), ('C5', 0.5), ('D5', 0.5), ('C5', 1), ('Bb4', 1),
        ('A4', 0.5), ('Bb4', 0.5), ('C5', 1), ('A4', 1), ('G4', 1),

        # Bars 9-10: Episode 1 — rising sequence using subject head motif
        ('A4', 0.5), ('C5', 0.5), ('D5', 1), ('C5', 1), ('Bb4', 1),
        ('C5', 0.5), ('E5', 0.5), ('F5', 1), ('E5', 1), ('D5', 1),

        # Bars 11-12: SUBJECT in F major (middle entry)
        ('F4', 1), ('A4', 0.5), ('C5', 0.5), ('F5', 2),
        ('E5', 1), ('D5', 0.5), ('C5', 0.5), ('Bb4', 1), ('C5', 1),

        # Bars 13-14: Episode 2 — descending sequence
        ('D5', 0.5), ('C5', 0.5), ('Bb4', 1), ('A4', 0.5), ('Bb4', 0.5), ('C5', 0.5), ('D5', 0.5),
        ('E5', 0.5), ('D5', 0.5), ('C5', 1), ('D5', 0.5), ('C5', 0.5), ('Bb4', 0.5), ('A4', 0.5),

        # Bars 15-16: STRETTO — subject restated
        ('D4', 1), ('F4', 0.5), ('A4', 0.5), ('D5', 2),
        ('C5', 1), ('Bb4', 0.5), ('A4', 0.5), ('G4', 1), ('A4', 1),

        # Bars 17-18: Climax and descent
        ('Bb4', 1), ('C5', 0.5), ('D5', 0.5), ('E5', 1), ('D5', 1),
        ('C5', 1), ('Bb4', 0.5), ('A4', 0.5), ('G4', 1), ('F4', 1),

        # Bars 19-20: Final subject statement
        ('D4', 1), ('F4', 0.5), ('A4', 0.5), ('D5', 2),
        ('C5', 1), ('Bb4', 1), ('A4', 1), ('G4', 1),

        # Bars 21-22: Cadential
        ('A4', 1), ('Bb4', 1), ('A4', 1), ('G4', 1),
        ('A4', 2), ('D5', 2),

        # Bars 23-24: Final resolution
        ('C5', 1), ('Bb4', 0.5), ('A4', 0.5), ('G4', 1), ('A4', 1),
        ('D5', 4),
    ]

    # ==================================================================
    # ALTO — triangle (flute-like)
    # ==================================================================
    alto = [
        # Bars 1-2: Rest (soprano alone)
        ('R', 4),
        ('R', 4),

        # Bars 3-4: ANSWER in A minor
        ('A3', 1), ('C4', 0.5), ('E4', 0.5), ('A4', 2),
        ('G4', 1), ('F4', 0.5), ('E4', 0.5), ('D4', 1), ('E4', 1),

        # Bars 5-6: Countersubject (tenor enters with subject)
        ('F4', 0.5), ('E4', 0.5), ('D4', 1), ('C4', 1), ('D4', 0.5), ('E4', 0.5),
        ('F4', 1), ('G4', 0.5), ('F4', 0.5), ('E4', 1), ('D4', 0.5), ('C4', 0.5),

        # Bars 7-8: Free (bass enters)
        ('D4', 1), ('E4', 0.5), ('F4', 0.5), ('G4', 1), ('F4', 0.5), ('E4', 0.5),
        ('D4', 0.5), ('E4', 0.5), ('F4', 1), ('E4', 0.5), ('D4', 0.5), ('C4', 0.5), ('D4', 0.5),

        # Bars 9-10: Episode 1
        ('E4', 0.5), ('F4', 0.5), ('G4', 1), ('A4', 0.5), ('G4', 0.5), ('F4', 0.5), ('E4', 0.5),
        ('F4', 1), ('E4', 0.5), ('D4', 0.5), ('C4', 1), ('D4', 0.5), ('E4', 0.5),

        # Bars 11-12: ANSWER in C (tonal answer to F subject)
        ('C4', 1), ('E4', 0.5), ('G4', 0.5), ('C5', 2),
        ('Bb4', 1), ('A4', 0.5), ('G4', 0.5), ('F4', 1), ('G4', 1),

        # Bars 13-14: Episode 2
        ('A4', 1), ('G4', 0.5), ('F4', 0.5), ('E4', 1), ('D4', 0.5), ('E4', 0.5),
        ('F4', 0.5), ('G4', 0.5), ('A4', 1), ('G4', 0.5), ('F4', 0.5), ('E4', 0.5), ('D4', 0.5),

        # Bars 15-16: Stretto — answer enters 1 bar after soprano subject
        ('R', 4),
        ('A3', 1), ('C4', 0.5), ('E4', 0.5), ('A4', 1), ('E4', 0.5), ('D4', 0.5),

        # Bars 17-18: Climax support
        ('E4', 1), ('F4', 0.5), ('G4', 0.5), ('A4', 1), ('G4', 1),
        ('F4', 1), ('E4', 0.5), ('D4', 0.5), ('C4', 1), ('D4', 1),

        # Bars 19-20: Subject-related material
        ('A3', 1), ('C4', 0.5), ('E4', 0.5), ('A4', 2),
        ('G4', 1), ('F4', 1), ('E4', 1), ('D4', 1),

        # Bars 21-22: Cadential
        ('E4', 1), ('F4', 1), ('E4', 1), ('D4', 1),
        ('F4', 1), ('E4', 0.5), ('D4', 0.5), ('F4', 1), ('E4', 1),

        # Bars 23-24: Resolution
        ('E4', 1), ('D4', 0.5), ('C4', 0.5), ('D4', 1), ('E4', 1),
        ('F4', 4),
    ]

    # ==================================================================
    # TENOR — soft_square (reed organ)
    # ==================================================================
    tenor = [
        # Bars 1-4: Rest (waiting for entry)
        ('R', 4), ('R', 4), ('R', 4), ('R', 4),

        # Bars 5-6: SUBJECT in D3
        ('D3', 1), ('F3', 0.5), ('A3', 0.5), ('D4', 2),
        ('C4', 1), ('Bb3', 0.5), ('A3', 0.5), ('G3', 1), ('A3', 1),

        # Bars 7-8: Free (bass enters with subject)
        ('Bb3', 0.5), ('A3', 0.5), ('G3', 1), ('F3', 0.5), ('G3', 0.5), ('A3', 0.5), ('Bb3', 0.5),
        ('A3', 1), ('G3', 0.5), ('F3', 0.5), ('E3', 1), ('F3', 0.5), ('G3', 0.5),

        # Bars 9-10: Episode 1
        ('A3', 0.5), ('Bb3', 0.5), ('C4', 1), ('Bb3', 0.5), ('A3', 0.5), ('G3', 0.5), ('F3', 0.5),
        ('G3', 1), ('F3', 0.5), ('E3', 0.5), ('D3', 1), ('E3', 0.5), ('F3', 0.5),

        # Bars 11-12: SUBJECT in G minor (subdominant)
        ('G3', 1), ('Bb3', 0.5), ('D4', 0.5), ('G4', 2),
        ('F4', 1), ('Eb4', 0.5), ('D4', 0.5), ('C4', 1), ('D4', 1),

        # Bars 13-14: Episode 2
        ('C4', 1), ('Bb3', 0.5), ('A3', 0.5), ('G3', 1), ('F3', 0.5), ('G3', 0.5),
        ('A3', 0.5), ('Bb3', 0.5), ('A3', 1), ('G3', 0.5), ('F3', 0.5), ('E3', 0.5), ('F3', 0.5),

        # Bars 15-16: Stretto — subject enters 2 bars after soprano
        ('G3', 0.5), ('A3', 0.5), ('Bb3', 0.5), ('C4', 0.5), ('D4', 0.5), ('C4', 0.5), ('Bb3', 1),
        ('D3', 1), ('F3', 0.5), ('A3', 0.5), ('D4', 1), ('A3', 0.5), ('G3', 0.5),

        # Bars 17-18: Climax support
        ('A3', 1), ('G3', 0.5), ('F3', 0.5), ('G3', 1), ('F3', 0.5), ('E3', 0.5),
        ('D3', 0.5), ('E3', 0.5), ('F3', 1), ('E3', 1), ('D3', 0.5), ('E3', 0.5),

        # Bars 19-20: Subject fragment
        ('D3', 1), ('F3', 0.5), ('A3', 0.5), ('D4', 2),
        ('C4', 1), ('Bb3', 1), ('A3', 1), ('G3', 1),

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
        # Bars 1-6: Rest (waiting for entry)
        ('R', 4), ('R', 4), ('R', 4), ('R', 4), ('R', 4), ('R', 4),

        # Bars 7-8: SUBJECT in D3 (bass entry)
        ('D3', 1), ('F3', 0.5), ('A3', 0.5), ('D4', 2),
        ('C4', 1), ('Bb3', 0.5), ('A3', 0.5), ('G3', 1), ('A3', 1),

        # Bars 9-10: Walking bass (episode)
        ('D3', 1), ('E3', 1), ('F3', 1), ('G3', 1),
        ('A3', 1), ('G3', 1), ('F3', 1), ('E3', 1),

        # Bars 11-12: Support for G minor / F major entries
        ('G3', 2), ('D3', 2),
        ('Eb3', 1), ('F3', 1), ('G3', 1), ('A3', 1),

        # Bars 13-14: Walking bass descent
        ('D3', 2), ('A3', 2),
        ('Bb3', 1), ('A3', 1), ('G3', 1), ('F3', 1),

        # Bars 15-16: Dominant pedal point
        ('D3', 4),
        ('D3', 2), ('A3', 2),

        # Bars 17-18: Walking bass
        ('Bb3', 1), ('A3', 1), ('G3', 1), ('F3', 1),
        ('G3', 1), ('A3', 1), ('Bb3', 1), ('A3', 1),

        # Bars 19-20: SUBJECT fragment (bass gets the final statement)
        ('D3', 1), ('F3', 0.5), ('A3', 0.5), ('D4', 2),
        ('Bb3', 1), ('A3', 1), ('G3', 1), ('F3', 1),

        # Bars 21-22: Cadential bass
        ('G3', 1), ('Bb3', 1), ('A3', 2),
        ('D3', 4),

        # Bars 23-24: Final cadence (V-I)
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
    # Render each voice
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
    # Effects and mixing
    # ==================================================================
    print('  Mixing and adding effects...')

    # Light delay on soprano only for depth — keep other voices dry for clarity
    sop_buf = add_delay(sop_buf, delay_ms=250, feedback=0.12, mix=0.12)

    # Mix all 4 voices
    mixed, scale = mix_and_normalize(sop_buf, alt_buf, ten_buf, bas_buf, target=0.75)
    final = [s * scale for s in mixed]

    # Fade out
    final = apply_fadeout(final, fade_seconds=3.0)

    # Output
    output_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                               'public', 'assets', 'audio', 'music', 'menu.wav')
    write_wav(output_path, final)

    total_beats = sum(b for _, b in soprano)
    print(f'\n  Total: {total_beats} beats = {total_beats * BEAT:.1f}s at {BPM} BPM')
    print('  Voices: soprano (warm_lead), alto (triangle), tenor (soft_square), bass (sine)')
    print('Done!')


if __name__ == '__main__':
    main()
