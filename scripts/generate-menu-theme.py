#!/usr/bin/env python3
"""
Generate a catchy melodic main menu theme for Uncrowned.
Medieval fantasy adventure feel in D minor, ~35 seconds looping.
Uses sine/triangle wave synthesis with ADSR envelopes, chorus, and delay.
"""

import wave
import struct
import math
import os

SAMPLE_RATE = 44100
BPM = 112
BEAT = 60.0 / BPM  # ~0.536 seconds per beat

# Note frequencies (Hz)
NOTE_FREQ = {
    'R': 0,
    'C3': 130.81, 'D3': 146.83, 'Eb3': 155.56, 'E3': 164.81, 'F3': 174.61,
    'G3': 196.00, 'Ab3': 207.65, 'A3': 220.00, 'Bb3': 233.08, 'B3': 246.94,
    'C4': 261.63, 'D4': 293.66, 'Eb4': 311.13, 'E4': 329.63, 'F4': 349.23,
    'G4': 392.00, 'Ab4': 415.30, 'A4': 440.00, 'Bb4': 466.16, 'B4': 493.88,
    'C5': 523.25, 'D5': 587.33, 'Eb5': 622.25, 'E5': 659.25, 'F5': 698.46,
    'G5': 783.99, 'A5': 880.00, 'Bb5': 932.33,
}


def sine(freq, t):
    return math.sin(2 * math.pi * freq * t) if freq > 0 else 0

def triangle(freq, t):
    if freq == 0: return 0
    p = (t * freq) % 1.0
    return 4 * abs(p - 0.5) - 1

def soft_square(freq, t):
    """Square wave with only first 3 odd harmonics for a mellow reed/organ tone."""
    if freq == 0: return 0
    return (sine(freq, t) + sine(freq*3, t)/3 + sine(freq*5, t)/5) * 0.7

def warm_lead(freq, t):
    """Pure sine lead with sub-octave warmth."""
    if freq == 0: return 0
    return 0.9 * sine(freq, t) + 0.1 * sine(freq * 0.5, t)

def pluck(freq, t):
    """Pure sine pluck — no overtones, just a volume envelope."""
    if freq == 0: return 0
    return sine(freq, t)

def adsr(t, dur, a=0.02, d=0.05, s=0.7, r=0.1):
    """ADSR envelope."""
    r = min(r, dur * 0.3)  # don't let release exceed 30% of note
    if t < 0: return 0
    if t < a: return t / a
    if t < a + d: return 1.0 - (1.0 - s) * ((t - a) / d)
    if t < dur - r: return s
    if t < dur: return s * (1.0 - (t - (dur - r)) / r)
    return 0


def render_voice(notes, wave_fn, vol=0.3, a=0.02, d=0.05, s=0.7, r=0.1, detune=0):
    """
    Render a note sequence to float samples.
    notes: list of (note_name, beats) tuples
    detune: Hz offset for chorus effect
    """
    total_beats = sum(b for _, b in notes)
    total_samples = int(total_beats * BEAT * SAMPLE_RATE)
    buf = [0.0] * total_samples

    t_offset = 0.0
    for note, beats in notes:
        freq = NOTE_FREQ.get(note, 0) + detune
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


def render_chords(chords, wave_fn, vol=0.12, a=0.08, d=0.1, s=0.5, r=0.2):
    """Render chord pads. chords: list of ([note_names], beats)."""
    total_beats = sum(b for _, b in chords)
    total_samples = int(total_beats * BEAT * SAMPLE_RATE)
    buf = [0.0] * total_samples

    t_offset = 0.0
    for chord_notes, beats in chords:
        dur = beats * BEAT
        n_samp = int(dur * SAMPLE_RATE)
        for note in chord_notes:
            freq = NOTE_FREQ.get(note, 0)
            if freq == 0: continue
            for i in range(n_samp):
                t = i / SAMPLE_RATE
                idx = int((t_offset + t) * SAMPLE_RATE)
                if idx >= len(buf): break
                env = adsr(t, dur, a, d, s, r)
                buf[idx] += wave_fn(freq, t_offset + t) * vol * env
        t_offset += dur

    return buf


def render_arpeggio(chords, wave_fn, vol=0.2, note_beats=0.5, a=0.01, d=0.08, s=0.3, r=0.15):
    """Render arpeggiated chords. Each chord note played sequentially."""
    total_beats = sum(b for _, b in chords)
    total_samples = int(total_beats * BEAT * SAMPLE_RATE)
    buf = [0.0] * total_samples

    t_offset = 0.0
    for chord_notes, beats in chords:
        total_dur = beats * BEAT
        arp_dur = note_beats * BEAT
        n_notes = len(chord_notes)
        # Cycle through chord notes to fill the beat duration
        arp_idx = 0
        inner_offset = 0.0
        while inner_offset < total_dur - 0.001:
            note = chord_notes[arp_idx % n_notes]
            freq = NOTE_FREQ.get(note, 0)
            this_dur = min(arp_dur, total_dur - inner_offset)
            n_samp = int(this_dur * SAMPLE_RATE)
            for i in range(n_samp):
                t = i / SAMPLE_RATE
                idx = int((t_offset + inner_offset + t) * SAMPLE_RATE)
                if idx >= len(buf): break
                env = adsr(t, this_dur, a, d, s, r)
                buf[idx] += wave_fn(freq, t_offset + inner_offset + t) * vol * env
            inner_offset += this_dur
            arp_idx += 1
        t_offset += total_dur

    return buf


def lowpass(buf, cutoff=0.15):
    """Simple single-pole low-pass filter. cutoff 0..1 (lower = darker)."""
    out = buf[:]
    prev = 0.0
    for i in range(len(out)):
        out[i] = prev + cutoff * (out[i] - prev)
        prev = out[i]
    return out


def add_delay(buf, delay_ms=300, feedback=0.3, mix=0.25):
    """Simple delay/echo effect."""
    delay_samples = int(SAMPLE_RATE * delay_ms / 1000)
    out = buf[:]
    for i in range(delay_samples, len(out)):
        out[i] += out[i - delay_samples] * feedback
    # Mix wet/dry
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


def main():
    print('Composing Uncrowned main menu theme...')
    print(f'  Key: D minor | Tempo: {BPM} BPM | Beat: {BEAT:.3f}s')

    # ================================================================
    # COMPOSITION in D minor (D E F G A Bb C D)
    # Structure: Intro (4 bars) + Theme A (8 bars) + Theme B (8 bars) + Outro (4 bars)
    # Total: 24 bars = 96 beats ≈ 51 seconds
    # ================================================================

    # q=1, e=0.5, h=2, dq=1.5, w=4, s=0.25

    # --- LEAD MELODY ---
    lead_notes = [
        # == INTRO (4 bars) - gentle opening ==
        ('R', 4),  # Bar 1: rest (arpeggio plays alone)
        ('R', 4),  # Bar 2: rest
        ('A4', 1.5), ('G4', 0.5), ('F4', 1), ('D4', 1),  # Bar 3: gentle entry
        ('E4', 1), ('F4', 1), ('A4', 2),                   # Bar 4: building

        # == THEME A (8 bars) - main hook ==
        # Bar 5: THE HOOK - ascending D minor arpeggio
        ('D4', 1), ('F4', 0.5), ('A4', 0.5), ('D5', 2),
        # Bar 6: answer phrase - descending
        ('C5', 1), ('Bb4', 0.5), ('A4', 0.5), ('G4', 2),
        # Bar 7: rising phrase
        ('F4', 1), ('G4', 0.5), ('A4', 0.5), ('Bb4', 1.5), ('A4', 0.5),
        # Bar 8: resolution
        ('G4', 1), ('F4', 1), ('D4', 2),
        # Bar 9: hook repeat with variation
        ('D4', 0.5), ('E4', 0.5), ('F4', 0.5), ('A4', 0.5), ('D5', 1), ('C5', 1),
        # Bar 10: soaring answer
        ('Bb4', 1), ('C5', 0.5), ('D5', 0.5), ('E5', 2),
        # Bar 11: climax
        ('F5', 1), ('E5', 0.5), ('D5', 0.5), ('C5', 1), ('Bb4', 1),
        # Bar 12: resolution home
        ('A4', 1.5), ('G4', 0.5), ('F4', 1), ('D4', 1),

        # == THEME B (8 bars) - development, slightly different feel ==
        # Bar 13: new motif - Bb major feel
        ('Bb4', 1), ('D5', 1), ('C5', 1), ('Bb4', 1),
        # Bar 14: walking down
        ('A4', 1), ('G4', 1), ('F4', 1), ('E4', 1),
        # Bar 15: call
        ('F4', 1.5), ('A4', 0.5), ('C5', 2),
        # Bar 16: response
        ('Bb4', 1), ('A4', 1), ('G4', 2),
        # Bar 17: recapitulation of hook
        ('D4', 1), ('F4', 0.5), ('A4', 0.5), ('D5', 2),
        # Bar 18: different continuation
        ('C5', 1), ('D5', 0.5), ('E5', 0.5), ('F5', 2),
        # Bar 19: dramatic descent
        ('E5', 1), ('D5', 0.5), ('C5', 0.5), ('Bb4', 1), ('A4', 1),
        # Bar 20: final resolution
        ('G4', 1), ('F4', 0.5), ('E4', 0.5), ('D4', 2),

        # == OUTRO (4 bars) - winding down ==
        # Bar 21
        ('A4', 1.5), ('G4', 0.5), ('F4', 2),
        # Bar 22
        ('E4', 1), ('F4', 1), ('D4', 2),
        # Bar 23
        ('F4', 1), ('A4', 1), ('D5', 2),
        # Bar 24: final note
        ('D4', 4),
    ]

    # --- BASS LINE ---
    bass_notes = [
        # Intro
        ('D3', 4), ('D3', 4),
        ('D3', 2), ('F3', 2),
        ('C3', 2), ('D3', 2),
        # Theme A
        ('D3', 4),                          # Dm
        ('Bb3', 2), ('G3', 2),             # Bb, Gm (using Bb3 not too low)
        ('F3', 4),                          # F
        ('G3', 2), ('D3', 2),              # Gm, Dm
        ('D3', 4),                          # Dm
        ('Bb3', 2), ('C3', 2),             # Bb, C (using C3)
        ('F3', 2), ('Bb3', 2),             # F, Bb
        ('A3', 2), ('D3', 2),              # Am, Dm
        # Theme B
        ('Bb3', 4),                         # Bb
        ('A3', 2), ('F3', 2),              # Am, F
        ('F3', 2), ('C3', 2),              # F, C
        ('Bb3', 2), ('G3', 2),             # Bb, Gm
        ('D3', 4),                          # Dm
        ('C3', 2), ('F3', 2),              # C, F
        ('G3', 2), ('Bb3', 2),             # Gm, Bb
        ('A3', 2), ('D3', 2),              # Am, Dm
        # Outro
        ('D3', 4),
        ('C3', 2), ('D3', 2),
        ('F3', 2), ('D3', 2),
        ('D3', 4),
    ]

    # --- CHORD PAD ---
    pad_chords = [
        # Intro
        (['D4', 'F4', 'A4'], 4),           # Dm
        (['D4', 'F4', 'A4'], 4),           # Dm
        (['D4', 'F4', 'A4'], 2), (['F4', 'A4', 'C5'], 2),
        (['C4', 'E4', 'G4'], 2), (['D4', 'F4', 'A4'], 2),
        # Theme A
        (['D4', 'F4', 'A4'], 4),           # Dm
        (['Bb3', 'D4', 'F4'], 2), (['G3', 'Bb3', 'D4'], 2),  # Bb, Gm
        (['F3', 'A3', 'C4'], 4),           # F
        (['G3', 'Bb3', 'D4'], 2), (['D3', 'F3', 'A3'], 2),  # Gm, Dm
        (['D4', 'F4', 'A4'], 4),           # Dm
        (['Bb3', 'D4', 'F4'], 2), (['C4', 'E4', 'G4'], 2),  # Bb, C
        (['F3', 'A3', 'C4'], 2), (['Bb3', 'D4', 'F4'], 2),  # F, Bb
        (['A3', 'C4', 'E4'], 2), (['D3', 'F3', 'A3'], 2),   # Am, Dm
        # Theme B
        (['Bb3', 'D4', 'F4'], 4),          # Bb
        (['A3', 'C4', 'E4'], 2), (['F3', 'A3', 'C4'], 2),   # Am, F
        (['F3', 'A3', 'C4'], 2), (['C4', 'E4', 'G4'], 2),   # F, C
        (['Bb3', 'D4', 'F4'], 2), (['G3', 'Bb3', 'D4'], 2), # Bb, Gm
        (['D4', 'F4', 'A4'], 4),           # Dm
        (['C4', 'E4', 'G4'], 2), (['F3', 'A3', 'C4'], 2),   # C, F
        (['G3', 'Bb3', 'D4'], 2), (['Bb3', 'D4', 'F4'], 2), # Gm, Bb
        (['A3', 'C4', 'E4'], 2), (['D3', 'F3', 'A3'], 2),   # Am, Dm
        # Outro
        (['D4', 'F4', 'A4'], 4),
        (['C4', 'E4', 'G4'], 2), (['D4', 'F4', 'A4'], 2),
        (['F3', 'A3', 'C4'], 2), (['D4', 'F4', 'A4'], 2),
        (['D3', 'F3', 'A3'], 4),
    ]

    # --- ARPEGGIO (harp-like, voiced low for warmth) ---
    arp_chords = [
        # Intro - prominent arpeggios
        (['D3', 'F3', 'A3', 'D4'], 4),
        (['D3', 'F3', 'A3', 'D4'], 4),
        (['D3', 'F3', 'A3', 'C4'], 2), (['F3', 'A3', 'C4', 'F4'], 2),
        (['C3', 'E3', 'G3', 'C4'], 2), (['D3', 'F3', 'A3', 'D4'], 2),
        # Theme A
        (['D3', 'F3', 'A3', 'D4'], 4),
        (['Bb3', 'D4', 'F4'], 2), (['G3', 'Bb3', 'D4'], 2),
        (['F3', 'A3', 'C4'], 4),
        (['G3', 'Bb3', 'D4'], 2), (['D3', 'F3', 'A3'], 2),
        (['D3', 'F3', 'A3', 'D4'], 4),
        (['Bb3', 'D4', 'F4'], 2), (['C3', 'E3', 'G3', 'C4'], 2),
        (['F3', 'A3', 'C4'], 2), (['Bb3', 'D4', 'F4'], 2),
        (['A3', 'C4', 'E4'], 2), (['D3', 'F3', 'A3'], 2),
        # Theme B
        (['Bb3', 'D4', 'F4'], 4),
        (['A3', 'C4', 'E4'], 2), (['F3', 'A3', 'C4'], 2),
        (['F3', 'A3', 'C4'], 2), (['C3', 'E3', 'G3', 'C4'], 2),
        (['Bb3', 'D4', 'F4'], 2), (['G3', 'Bb3', 'D4'], 2),
        (['D3', 'F3', 'A3', 'D4'], 4),
        (['C3', 'E3', 'G3', 'C4'], 2), (['F3', 'A3', 'C4'], 2),
        (['G3', 'Bb3', 'D4'], 2), (['Bb3', 'D4', 'F4'], 2),
        (['A3', 'C4', 'E4'], 2), (['D3', 'F3', 'A3'], 2),
        # Outro
        (['D3', 'F3', 'A3', 'D4'], 4),
        (['C3', 'E3', 'G3', 'C4'], 2), (['D3', 'F3', 'A3', 'D4'], 2),
        (['F3', 'A3', 'C4', 'F4'], 2), (['D3', 'F3', 'A3', 'D4'], 2),
        (['D3', 'F3', 'A3'], 4),
    ]

    print('  Rendering lead melody...')
    lead = render_voice(lead_notes, warm_lead, vol=0.40, a=0.03, d=0.08, s=0.6, r=0.15)

    print('  Rendering bass...')
    bass = render_voice(bass_notes, sine, vol=0.35, a=0.04, d=0.1, s=0.5, r=0.15)

    print('  Rendering chord pad...')
    pad = render_chords(pad_chords, sine, vol=0.10, a=0.2, d=0.1, s=0.4, r=0.3)

    print('  Rendering arpeggio...')
    arp = render_arpeggio(arp_chords, pluck, vol=0.10, note_beats=0.5, a=0.04, d=0.15, s=0.2, r=0.25)

    print('  Mixing and adding effects...')
    # Three-pass low-pass filter on arpeggio for a very dark, warm sound
    arp = lowpass(lowpass(lowpass(arp, cutoff=0.15), cutoff=0.15), cutoff=0.15)

    # Gentle low-pass on lead
    lead = lowpass(lead, cutoff=0.3)

    # Light delay on lead only (no delay on arpeggio — it creates metallic comb artifacts)
    lead = add_delay(lead, delay_ms=280, feedback=0.10, mix=0.10)

    # Mix all tracks
    mixed, scale = mix_and_normalize(lead, bass, pad, arp, target=0.75)
    final = [s * scale for s in mixed]

    # Apply fade-out at the end
    final = apply_fadeout(final, fade_seconds=3.0)

    # Output
    output_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                               'public', 'assets', 'audio', 'music', 'menu.wav')
    write_wav(output_path, final)

    total_beats = sum(b for _, b in lead_notes)
    print(f'\n  Total: {total_beats} beats = {total_beats * BEAT:.1f}s at {BPM} BPM')
    print('Done!')


if __name__ == '__main__':
    main()
