"""Generate proper game SFX for Uncrowned using audio synthesis."""
import numpy as np
import struct
import wave
import os

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'assets', 'audio', 'sfx')
SAMPLE_RATE = 44100


def write_wav(filename: str, samples: np.ndarray, sample_rate: int = SAMPLE_RATE):
    """Write a mono WAV file from float samples in [-1, 1]."""
    path = os.path.join(OUTPUT_DIR, filename)
    samples = np.clip(samples, -1.0, 1.0)
    int_samples = (samples * 32767).astype(np.int16)
    with wave.open(path, 'w') as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(int_samples.tobytes())
    print(f"  Written: {filename} ({len(samples)/sample_rate:.3f}s)")


def envelope(length: int, attack: float = 0.01, decay: float = 0.1, sustain: float = 0.7,
             release: float = 0.2) -> np.ndarray:
    """ADSR envelope."""
    total = attack + decay + release
    sustain_time = max(0, length / SAMPLE_RATE - total)

    a = np.linspace(0, 1, int(attack * SAMPLE_RATE))
    d = np.linspace(1, sustain, int(decay * SAMPLE_RATE))
    s = np.full(int(sustain_time * SAMPLE_RATE), sustain)
    r = np.linspace(sustain, 0, int(release * SAMPLE_RATE))

    env = np.concatenate([a, d, s, r])
    # Pad or trim to exact length
    if len(env) < length:
        env = np.concatenate([env, np.zeros(length - len(env))])
    return env[:length]


def generate_command_blip():
    """Soft UI confirmation blip — two quick gentle tones."""
    duration = 0.12
    n = int(duration * SAMPLE_RATE)
    t = np.linspace(0, duration, n)

    # Two quick ascending tones (like a soft "bip-bip")
    tone1 = np.sin(2 * np.pi * 880 * t) * 0.3
    tone2 = np.sin(2 * np.pi * 1320 * t) * 0.3

    # First tone in first half, second in second half
    mid = n // 2
    env1 = np.zeros(n)
    env1[:mid] = envelope(mid, attack=0.005, decay=0.02, sustain=0.4, release=0.03)
    env2 = np.zeros(n)
    env2[mid:] = envelope(n - mid, attack=0.005, decay=0.02, sustain=0.3, release=0.03)

    samples = tone1 * env1 + tone2 * env2
    write_wav('command-blip.wav', samples * 0.5)


def generate_item_pickup():
    """Cheerful ascending arpeggio for picking up items."""
    duration = 0.4
    n = int(duration * SAMPLE_RATE)
    t = np.linspace(0, duration, n)
    samples = np.zeros(n)

    # Three ascending notes (C5, E5, G5) with slight overlap
    freqs = [523.25, 659.25, 783.99]
    for i, freq in enumerate(freqs):
        start = int(i * 0.1 * SAMPLE_RATE)
        note_len = int(0.2 * SAMPLE_RATE)
        end = min(start + note_len, n)
        actual_len = end - start

        note_t = np.linspace(0, actual_len / SAMPLE_RATE, actual_len)
        note = np.sin(2 * np.pi * freq * note_t)
        # Add a gentle harmonic
        note += 0.3 * np.sin(2 * np.pi * freq * 2 * note_t)
        note *= envelope(actual_len, attack=0.005, decay=0.05, sustain=0.6, release=0.1)

        samples[start:end] += note * 0.35

    write_wav('item-pickup.wav', samples)


def generate_door_transition():
    """Whooshy sweep sound for room transitions."""
    duration = 0.6
    n = int(duration * SAMPLE_RATE)
    t = np.linspace(0, duration, n)

    # Filtered noise sweep (low to high)
    noise = np.random.randn(n) * 0.15

    # Frequency sweep for a resonant filter effect
    sweep_freq = np.linspace(200, 2000, n)
    sweep = np.sin(2 * np.pi * np.cumsum(sweep_freq) / SAMPLE_RATE) * 0.2

    # Low rumble undertone
    rumble = np.sin(2 * np.pi * 80 * t) * 0.15

    env = envelope(n, attack=0.05, decay=0.1, sustain=0.5, release=0.3)

    # Smooth the noise to make it less harsh
    from scipy.ndimage import uniform_filter1d
    smooth_noise = uniform_filter1d(noise, size=20)

    samples = (smooth_noise + sweep + rumble) * env
    write_wav('door-transition.wav', samples * 0.6)


def generate_dialogue_start():
    """Gentle chime for dialogue beginning — like a soft bell."""
    duration = 0.35
    n = int(duration * SAMPLE_RATE)
    t = np.linspace(0, duration, n)

    # Bell-like sound: fundamental + inharmonic partials
    f0 = 1200
    bell = (np.sin(2 * np.pi * f0 * t) * 0.4 +
            np.sin(2 * np.pi * f0 * 2.76 * t) * 0.15 +
            np.sin(2 * np.pi * f0 * 4.07 * t) * 0.08)

    env = envelope(n, attack=0.002, decay=0.08, sustain=0.2, release=0.25)
    samples = bell * env
    write_wav('dialogue-start.wav', samples * 0.4)


def generate_death_sting():
    """Dramatic descending minor chord sting."""
    duration = 1.2
    n = int(duration * SAMPLE_RATE)
    t = np.linspace(0, duration, n)
    samples = np.zeros(n)

    # Descending minor chord: Dm (D4, F4, A4) resolving down
    freqs = [293.66, 349.23, 440.00]
    for freq in freqs:
        # Slight pitch drop over time for dramatic effect
        pitch_env = np.linspace(1.0, 0.95, n)
        tone = np.sin(2 * np.pi * freq * pitch_env * t)
        # Add grit with slight distortion harmonics
        tone += 0.2 * np.sin(2 * np.pi * freq * 3 * pitch_env * t)
        samples += tone * 0.2

    # Add a low impact thud at the start
    thud = np.sin(2 * np.pi * 60 * t) * np.exp(-t * 8) * 0.4
    samples += thud

    env = envelope(n, attack=0.01, decay=0.3, sustain=0.3, release=0.6)
    samples *= env
    write_wav('death-sting.wav', samples * 0.5)


if __name__ == '__main__':
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    print("Generating SFX...")
    generate_command_blip()
    generate_item_pickup()
    generate_door_transition()
    generate_dialogue_start()
    generate_death_sting()
    print("Done!")
