#!/usr/bin/env python3
"""
Generate a catchy melodic main menu theme for Uncrowned.
Medieval fantasy adventure feel in D minor, ~51 seconds looping.
Instruments: flute-like lead, string ensemble pad, cello bass, gentle harp.
"""

import wave
import struct
import math
import os
import random

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


# ── Waveform generators ──

def sine(freq, t):
    return math.sin(2 * math.pi * freq * t) if freq > 0 else 0


def warm_lead(freq, t):
    """Pure sine lead with sub-octave warmth — no overtones, no vibrato."""
    if freq == 0:
        return 0
    return 0.9 * sine(freq, t) + 0.1 * sine(freq * 0.5, t)


def cello(freq, t):
    """Cello-like: pure sine with slow vibrato."""
    if freq == 0:
        return 0
    vib = 1.0 + 0.004 * math.sin(2 * math.pi * 4.8 * t)
    return sine(freq * vib, t)


def string_voice(freq, t, detune_hz=0):
    """Single string player: sine + vibrato + slight detune."""
    if freq == 0:
        return 0
    f = (freq + detune_hz) * (1.0 + 0.003 * math.sin(2 * math.pi * (5.0 + detune_hz) * t))
    return sine(f, t)


def harp_tone(freq, t):
    """Harp: pure sine with exponential decay."""
    if freq == 0:
        return 0
    return math.exp(-t * 4.0) * sine(freq, t)


# ── Envelope ──

def adsr(t, dur, a=0.02, d=0.05, s=0.7, r=0.1):
    r = min(r, dur * 0.3)
    if t < 0:
        return 0
    if t < a:
        return t / a
    if t < a + d:
        return 1.0 - (1.0 - s) * ((t - a) / d)
    if t < dur - r:
        return s
    if t < dur:
        return s * (1.0 - (t - (dur - r)) / r)
    return 0


# ── Renderers ──

def render_voice(notes, wave_fn, vol=0.3, a=0.02, d=0.05, s=0.7, r=0.1):
    """Render a monophonic voice."""
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
            if idx >= len(buf):
                break
            env = adsr(t, dur, a, d, s, r)
            buf[idx] += wave_fn(freq, t) * vol * env
        t_offset += dur

    return buf


def render_string_ensemble(chords, vol=0.06, a=0.25, d=0.1, s=0.4, r=0.4):
    """
    String ensemble pad: each chord note rendered by 3 'players'
    with slight detuning (+0, +0.8, -0.7 Hz) for natural ensemble sound.
    Very slow attack for smooth, lush feel.
    """
    total_beats = sum(b for _, b in chords)
    total_samples = int(total_beats * BEAT * SAMPLE_RATE)
    buf = [0.0] * total_samples

    detunes = [0, 0.8, -0.7]  # 3 players per note

    t_offset = 0.0
    for chord_notes, beats in chords:
        dur = beats * BEAT
        n_samp = int(dur * SAMPLE_RATE)
        for note in chord_notes:
            freq = NOTE_FREQ.get(note, 0)
            if freq == 0:
                continue
            for dt in detunes:
                for i in range(n_samp):
                    t = i / SAMPLE_RATE
                    idx = int((t_offset + t) * SAMPLE_RATE)
                    if idx >= len(buf):
                        break
                    env = adsr(t, dur, a, d, s, r)
                    buf[idx] += string_voice(freq, t, dt) * vol * env
        t_offset += dur

    return buf


def render_harp(chords, vol=0.14, note_beats=0.5):
    """
    Gentle harp arpeggiation. Uses exponential decay envelope (no ADSR)
    for natural plucked-string sound.
    """
    total_beats = sum(b for _, b in chords)
    total_samples = int(total_beats * BEAT * SAMPLE_RATE)
    buf = [0.0] * total_samples

    t_offset = 0.0
    for chord_notes, beats in chords:
        total_dur = beats * BEAT
        arp_dur = note_beats * BEAT
        n_notes = len(chord_notes)
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
                if idx >= len(buf):
                    break
                buf[idx] += harp_tone(freq, t) * vol
            inner_offset += this_dur
            arp_idx += 1
        t_offset += total_dur

    return buf


# ── Effects ──

def reverb(buf, dry=0.75, wet=0.25):
    """
    Simple Schroeder-style reverb using 4 comb filters + 2 allpass filters.
    Simulates room ambience without the metallic quality of a single delay tap.
    """
    out = buf[:]
    length = len(out)

    # Comb filter delays (in samples) — chosen to be mutually prime
    comb_delays = [1557, 1617, 1491, 1422]
    comb_feedback = 0.80  # controls decay time

    # Run 4 parallel comb filters and sum
    comb_sum = [0.0] * length
    for delay in comb_delays:
        comb_buf = [0.0] * length
        for i in range(length):
            if i >= delay:
                comb_buf[i] = out[i] + comb_buf[i - delay] * comb_feedback
            else:
                comb_buf[i] = out[i]
        for i in range(length):
            comb_sum[i] += comb_buf[i] * 0.25  # average of 4 combs

    # Two allpass filters in series for diffusion
    allpass_delays = [225, 341]
    allpass_gain = 0.5
    result = comb_sum
    for delay in allpass_delays:
        ap_buf = [0.0] * length
        for i in range(length):
            if i >= delay:
                ap_buf[i] = -allpass_gain * result[i] + result[i - delay] + allpass_gain * ap_buf[i - delay]
            else:
                ap_buf[i] = result[i] * (1 - allpass_gain)
        result = ap_buf

    # Mix dry/wet
    return [d * dry + w * wet for d, w in zip(buf, result)]


def lowpass(buf, cutoff=0.15):
    """Single-pole low-pass filter. cutoff 0..1 (lower = darker)."""
    out = buf[:]
    prev = 0.0
    for i in range(len(out)):
        out[i] = prev + cutoff * (out[i] - prev)
        prev = out[i]
    return out


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


def main():
    print('Composing Uncrowned main menu theme...')
    print(f'  Key: D minor | Tempo: {BPM} BPM | Beat: {BEAT:.3f}s')

    # ================================================================
    # COMPOSITION in D minor (D E F G A Bb C D)
    # Structure: Intro (4 bars) + Theme A (8 bars) + Theme B (8 bars) + Outro (4 bars)
    # Total: 24 bars = 96 beats ≈ 51 seconds
    # ================================================================

    # --- LEAD MELODY (warm sine) ---
    lead_notes = [
        # == INTRO (4 bars) ==
        ('R', 4), ('R', 4),
        ('A4', 1.5), ('G4', 0.5), ('F4', 1), ('D4', 1),
        ('E4', 1), ('F4', 1), ('A4', 2),

        # == THEME A (8 bars) ==
        ('D4', 1), ('F4', 0.5), ('A4', 0.5), ('D5', 2),
        ('C5', 1), ('Bb4', 0.5), ('A4', 0.5), ('G4', 2),
        ('F4', 1), ('G4', 0.5), ('A4', 0.5), ('Bb4', 1.5), ('A4', 0.5),
        ('G4', 1), ('F4', 1), ('D4', 2),
        ('D4', 0.5), ('E4', 0.5), ('F4', 0.5), ('A4', 0.5), ('D5', 1), ('C5', 1),
        ('Bb4', 1), ('C5', 0.5), ('D5', 0.5), ('E5', 2),
        ('F5', 1), ('E5', 0.5), ('D5', 0.5), ('C5', 1), ('Bb4', 1),
        ('A4', 1.5), ('G4', 0.5), ('F4', 1), ('D4', 1),

        # == THEME B (8 bars) ==
        ('Bb4', 1), ('D5', 1), ('C5', 1), ('Bb4', 1),
        ('A4', 1), ('G4', 1), ('F4', 1), ('E4', 1),
        ('F4', 1.5), ('A4', 0.5), ('C5', 2),
        ('Bb4', 1), ('A4', 1), ('G4', 2),
        ('D4', 1), ('F4', 0.5), ('A4', 0.5), ('D5', 2),
        ('C5', 1), ('D5', 0.5), ('E5', 0.5), ('F5', 2),
        ('E5', 1), ('D5', 0.5), ('C5', 0.5), ('Bb4', 1), ('A4', 1),
        ('G4', 1), ('F4', 0.5), ('E4', 0.5), ('D4', 2),

        # == OUTRO (4 bars) ==
        ('A4', 1.5), ('G4', 0.5), ('F4', 2),
        ('E4', 1), ('F4', 1), ('D4', 2),
        ('F4', 1), ('A4', 1), ('D5', 2),
        ('D4', 4),
    ]

    # --- BASS (cello) ---
    bass_notes = [
        ('D3', 4), ('D3', 4),
        ('D3', 2), ('F3', 2),
        ('C3', 2), ('D3', 2),
        # Theme A
        ('D3', 4),
        ('Bb3', 2), ('G3', 2),
        ('F3', 4),
        ('G3', 2), ('D3', 2),
        ('D3', 4),
        ('Bb3', 2), ('C3', 2),
        ('F3', 2), ('Bb3', 2),
        ('A3', 2), ('D3', 2),
        # Theme B
        ('Bb3', 4),
        ('A3', 2), ('F3', 2),
        ('F3', 2), ('C3', 2),
        ('Bb3', 2), ('G3', 2),
        ('D3', 4),
        ('C3', 2), ('F3', 2),
        ('G3', 2), ('Bb3', 2),
        ('A3', 2), ('D3', 2),
        # Outro
        ('D3', 4),
        ('C3', 2), ('D3', 2),
        ('F3', 2), ('D3', 2),
        ('D3', 4),
    ]

    # --- STRING ENSEMBLE PAD ---
    pad_chords = [
        (['D4', 'F4', 'A4'], 4),
        (['D4', 'F4', 'A4'], 4),
        (['D4', 'F4', 'A4'], 2), (['F4', 'A4', 'C5'], 2),
        (['C4', 'E4', 'G4'], 2), (['D4', 'F4', 'A4'], 2),
        # Theme A
        (['D4', 'F4', 'A4'], 4),
        (['Bb3', 'D4', 'F4'], 2), (['G3', 'Bb3', 'D4'], 2),
        (['F3', 'A3', 'C4'], 4),
        (['G3', 'Bb3', 'D4'], 2), (['D3', 'F3', 'A3'], 2),
        (['D4', 'F4', 'A4'], 4),
        (['Bb3', 'D4', 'F4'], 2), (['C4', 'E4', 'G4'], 2),
        (['F3', 'A3', 'C4'], 2), (['Bb3', 'D4', 'F4'], 2),
        (['A3', 'C4', 'E4'], 2), (['D3', 'F3', 'A3'], 2),
        # Theme B
        (['Bb3', 'D4', 'F4'], 4),
        (['A3', 'C4', 'E4'], 2), (['F3', 'A3', 'C4'], 2),
        (['F3', 'A3', 'C4'], 2), (['C4', 'E4', 'G4'], 2),
        (['Bb3', 'D4', 'F4'], 2), (['G3', 'Bb3', 'D4'], 2),
        (['D4', 'F4', 'A4'], 4),
        (['C4', 'E4', 'G4'], 2), (['F3', 'A3', 'C4'], 2),
        (['G3', 'Bb3', 'D4'], 2), (['Bb3', 'D4', 'F4'], 2),
        (['A3', 'C4', 'E4'], 2), (['D3', 'F3', 'A3'], 2),
        # Outro
        (['D4', 'F4', 'A4'], 4),
        (['C4', 'E4', 'G4'], 2), (['D4', 'F4', 'A4'], 2),
        (['F3', 'A3', 'C4'], 2), (['D4', 'F4', 'A4'], 2),
        (['D3', 'F3', 'A3'], 4),
    ]

    # --- HARP ARPEGGIOS (mid-range, gentle) ---
    harp_chords = [
        (['D4', 'F4', 'A4'], 4),
        (['D4', 'F4', 'A4'], 4),
        (['D4', 'F4', 'A4'], 2), (['F4', 'A4', 'C5'], 2),
        (['C4', 'E4', 'G4'], 2), (['D4', 'F4', 'A4'], 2),
        # Theme A
        (['D4', 'F4', 'A4'], 4),
        (['Bb3', 'D4', 'F4'], 2), (['G3', 'Bb3', 'D4'], 2),
        (['F3', 'A3', 'C4'], 4),
        (['G3', 'Bb3', 'D4'], 2), (['D3', 'F3', 'A3'], 2),
        (['D4', 'F4', 'A4'], 4),
        (['Bb3', 'D4', 'F4'], 2), (['C4', 'E4', 'G4'], 2),
        (['F3', 'A3', 'C4'], 2), (['Bb3', 'D4', 'F4'], 2),
        (['A3', 'C4', 'E4'], 2), (['D3', 'F3', 'A3'], 2),
        # Theme B
        (['Bb3', 'D4', 'F4'], 4),
        (['A3', 'C4', 'E4'], 2), (['F3', 'A3', 'C4'], 2),
        (['F3', 'A3', 'C4'], 2), (['C4', 'E4', 'G4'], 2),
        (['Bb3', 'D4', 'F4'], 2), (['G3', 'Bb3', 'D4'], 2),
        (['D4', 'F4', 'A4'], 4),
        (['C4', 'E4', 'G4'], 2), (['F3', 'A3', 'C4'], 2),
        (['G3', 'Bb3', 'D4'], 2), (['Bb3', 'D4', 'F4'], 2),
        (['A3', 'C4', 'E4'], 2), (['D3', 'F3', 'A3'], 2),
        # Outro
        (['D4', 'F4', 'A4'], 4),
        (['C4', 'E4', 'G4'], 2), (['D4', 'F4', 'A4'], 2),
        (['F3', 'A3', 'C4'], 2), (['D4', 'F4', 'A4'], 2),
        (['D3', 'F3', 'A3'], 4),
    ]

    # ── Render each instrument ──

    print('  Rendering lead melody...')
    lead = render_voice(lead_notes, warm_lead, vol=0.40, a=0.03, d=0.08, s=0.6, r=0.15)

    print('  Rendering cello bass...')
    bass = render_voice(bass_notes, cello, vol=0.30, a=0.06, d=0.1, s=0.5, r=0.2)

    print('  Rendering string ensemble...')
    strings = render_string_ensemble(pad_chords, vol=0.05, a=0.3, d=0.1, s=0.35, r=0.5)

    print('  Rendering harp...')
    harp = render_harp(harp_chords, vol=0.10, note_beats=0.5)

    # ── Mix (no reverb — comb filters cause metallic/tinny artifacts) ──
    print('  Mixing...')
    mixed, scale = mix_and_normalize(lead, bass, strings, harp, target=0.75)
    final = [s * scale for s in mixed]
    final = apply_fadeout(final, fade_seconds=3.0)

    base = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                        'public', 'assets', 'audio', 'music')
    write_wav(os.path.join(base, 'menu-ensemble.wav'), final)

    total_beats = sum(b for _, b in lead_notes)
    print(f'\n  Total: {total_beats} beats = {total_beats * BEAT:.1f}s at {BPM} BPM')
    print('Done!')


if __name__ == '__main__':
    main()
