#!/usr/bin/env python3
"""
Generate placeholder WAV audio files for the KQ game.
Uses only the standard library 'wave' and 'struct' modules.
Produces short sine-wave-based audio files for SFX, music, and ambient categories.
"""

import wave
import struct
import math
import os
import random

SAMPLE_RATE = 44100
BASE_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                        'public', 'assets', 'audio')


def generate_tone(frequency: float, duration: float, volume: float = 0.5) -> list[int]:
    """Generate a sine wave tone."""
    samples = []
    num_samples = int(SAMPLE_RATE * duration)
    for i in range(num_samples):
        t = i / SAMPLE_RATE
        value = volume * math.sin(2 * math.pi * frequency * t)
        # Apply fade-in/out envelope (10ms each)
        fade_samples = int(SAMPLE_RATE * 0.01)
        if i < fade_samples:
            value *= i / fade_samples
        elif i > num_samples - fade_samples:
            value *= (num_samples - i) / fade_samples
        samples.append(int(value * 32767))
    return samples


def generate_sweep(freq_start: float, freq_end: float, duration: float, volume: float = 0.5) -> list[int]:
    """Generate a frequency sweep (rising or falling tone)."""
    samples = []
    num_samples = int(SAMPLE_RATE * duration)
    for i in range(num_samples):
        t = i / SAMPLE_RATE
        progress = i / num_samples
        freq = freq_start + (freq_end - freq_start) * progress
        value = volume * math.sin(2 * math.pi * freq * t)
        # Envelope
        fade_samples = int(SAMPLE_RATE * 0.01)
        if i < fade_samples:
            value *= i / fade_samples
        elif i > num_samples - fade_samples:
            value *= (num_samples - i) / fade_samples
        samples.append(int(value * 32767))
    return samples


def generate_bursts(frequency: float, duration: float, burst_duration: float = 0.05,
                    gap_duration: float = 0.2, volume: float = 0.3) -> list[int]:
    """Generate periodic tone bursts."""
    samples = []
    num_samples = int(SAMPLE_RATE * duration)
    burst_samples = int(SAMPLE_RATE * burst_duration)
    gap_samples = int(SAMPLE_RATE * gap_duration)
    cycle = burst_samples + gap_samples
    for i in range(num_samples):
        t = i / SAMPLE_RATE
        pos_in_cycle = i % cycle
        if pos_in_cycle < burst_samples:
            value = volume * math.sin(2 * math.pi * frequency * t)
            # Burst envelope
            if pos_in_cycle < 100:
                value *= pos_in_cycle / 100
            elif pos_in_cycle > burst_samples - 100:
                value *= (burst_samples - pos_in_cycle) / 100
        else:
            value = 0
        samples.append(int(value * 32767))
    return samples


def generate_noise(duration: float, volume: float = 0.1) -> list[int]:
    """Generate low-amplitude noise (wind approximation)."""
    samples = []
    num_samples = int(SAMPLE_RATE * duration)
    random.seed(42)  # Deterministic for reproducibility
    for i in range(num_samples):
        value = volume * (random.random() * 2 - 1)
        # Low-pass: average with previous
        if samples:
            value = 0.7 * value + 0.3 * (samples[-1] / 32767)
        # Envelope
        fade_samples = int(SAMPLE_RATE * 0.05)
        if i < fade_samples:
            value *= i / fade_samples
        elif i > num_samples - fade_samples:
            value *= (num_samples - i) / fade_samples
        samples.append(int(value * 32767))
    return samples


def generate_alternating(frequencies: list[float], duration: float,
                         note_duration: float = 0.5, volume: float = 0.3) -> list[int]:
    """Generate alternating tones (simple melody)."""
    samples = []
    num_samples = int(SAMPLE_RATE * duration)
    note_samples = int(SAMPLE_RATE * note_duration)
    for i in range(num_samples):
        t = i / SAMPLE_RATE
        note_idx = (i // note_samples) % len(frequencies)
        freq = frequencies[note_idx]
        value = volume * math.sin(2 * math.pi * freq * t)
        # Note envelope
        pos_in_note = i % note_samples
        fade = int(SAMPLE_RATE * 0.02)
        if pos_in_note < fade:
            value *= pos_in_note / fade
        elif pos_in_note > note_samples - fade:
            value *= (note_samples - pos_in_note) / fade
        samples.append(int(value * 32767))
    return samples


def write_wav(filepath: str, samples: list[int]) -> None:
    """Write samples to a WAV file (16-bit mono)."""
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    with wave.open(filepath, 'w') as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(SAMPLE_RATE)
        data = struct.pack(f'<{len(samples)}h', *samples)
        wav.writeframes(data)
    print(f'  Created: {filepath} ({len(samples) / SAMPLE_RATE:.2f}s)')


def main() -> None:
    print('Generating placeholder audio files...\n')

    # --- SFX ---
    print('SFX:')
    # Rising two-tone
    write_wav(os.path.join(BASE_DIR, 'sfx', 'item-pickup.wav'),
              generate_sweep(300, 600, 0.2, 0.5))
    # Swoosh descending
    write_wav(os.path.join(BASE_DIR, 'sfx', 'door-transition.wav'),
              generate_sweep(500, 200, 0.3, 0.4))
    # Dramatic descending
    write_wav(os.path.join(BASE_DIR, 'sfx', 'death-sting.wav'),
              generate_sweep(400, 100, 0.5, 0.6))
    # Soft blip
    write_wav(os.path.join(BASE_DIR, 'sfx', 'dialogue-start.wav'),
              generate_tone(800, 0.1, 0.3))
    # Quick click
    write_wav(os.path.join(BASE_DIR, 'sfx', 'command-blip.wav'),
              generate_tone(1000, 0.05, 0.4))

    # --- Music ---
    print('\nMusic:')
    # C4=261.63, E4=329.63, G4=392.00, C5=523.25
    # F4=349.23, A4=440.00
    write_wav(os.path.join(BASE_DIR, 'music', 'forest.wav'),
              generate_alternating([261.63, 329.63, 392.00], 4.0, 0.8, 0.25))
    write_wav(os.path.join(BASE_DIR, 'music', 'cave.wav'),
              generate_alternating([130.81, 164.81], 4.0, 1.0, 0.2))
    write_wav(os.path.join(BASE_DIR, 'music', 'village.wav'),
              generate_alternating([349.23, 440.00, 523.25], 4.0, 0.7, 0.25))
    write_wav(os.path.join(BASE_DIR, 'music', 'menu.wav'),
              generate_alternating([261.63, 329.63, 392.00, 523.25], 3.0, 0.5, 0.3))

    # --- Ambient ---
    print('\nAmbient:')
    write_wav(os.path.join(BASE_DIR, 'ambient', 'forest-birds.wav'),
              generate_bursts(2000, 3.0, 0.03, 0.3, 0.2))
    write_wav(os.path.join(BASE_DIR, 'ambient', 'cave-drips.wav'),
              generate_bursts(200, 3.0, 0.05, 0.5, 0.25))
    write_wav(os.path.join(BASE_DIR, 'ambient', 'wind-light.wav'),
              generate_noise(2.0, 0.08))

    print('\nDone! Generated 12 placeholder audio files.')


if __name__ == '__main__':
    main()
