#!/usr/bin/env python3
"""
Generate a short death theme for Uncrowned using FluidSynth + SoundFont.
A brief, somber dirge (~10 seconds) that plays once on the death screen.

Key: D minor, 60 BPM (slow, funeral pace)
Instruments: Choir Aahs (lead), Cello (bass), String Ensemble (pad)

Outputs:
  death.wav — Death screen music sting

Requires:
  pip install MIDIUtil
  brew install fluid-synth
  FluidR3_GM.sf2 soundfont in scripts/soundfonts/
"""

import os
import subprocess
from midiutil import MIDIFile

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
SOUNDFONT = os.path.join(SCRIPT_DIR, 'soundfonts', 'FluidR3_GM.sf2')
OUTPUT_DIR = os.path.join(SCRIPT_DIR, '..', 'public', 'assets', 'audio', 'music')

# General MIDI program numbers (0-indexed)
GM_CHOIR_AAHS  = 52   # Ethereal, mournful lead
GM_CELLO       = 42   # Deep bass
GM_STRINGS     = 48   # String Ensemble 1
GM_TUBULAR     = 14   # Tubular Bells — tolling bell

# ── Note name → MIDI pitch ──

NOTE_MIDI = {}
_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']
_ALIAS = {'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#'}
for octave in range(0, 9):
    for i, name in enumerate(_NAMES):
        midi_num = 12 * (octave + 1) + i
        NOTE_MIDI[f'{name}{octave}'] = midi_num
        if name in _ALIAS:
            NOTE_MIDI[f'{_ALIAS[name]}{octave}'] = midi_num
NOTE_MIDI['R'] = -1  # rest


def note_to_midi(name):
    return NOTE_MIDI.get(name, -1)


def add_voice(midi, track, channel, program, notes, volume=100,
              time_offset=0.0):
    midi.addProgramChange(track, channel, 0, program)
    t = time_offset
    for note_name, beats in notes:
        pitch = note_to_midi(note_name)
        if pitch >= 0:
            midi.addNote(track, channel, pitch, t, beats * 0.95, volume)
        t += beats


def add_chords(midi, track, channel, program, chords, volume=80):
    midi.addProgramChange(track, channel, 0, program)
    t = 0.0
    for notes, beats in chords:
        for note_name in notes:
            pitch = note_to_midi(note_name)
            if pitch >= 0:
                midi.addNote(track, channel, pitch, t, beats * 0.95, volume)
        t += beats


def main():
    print('Generating death theme (death.wav)')
    print(f'SoundFont: {SOUNDFONT}')

    if not os.path.exists(SOUNDFONT):
        print(f'\nERROR: SoundFont not found at {SOUNDFONT}')
        exit(1)

    midi = MIDIFile(4, deinterleave=False)
    bpm = 60  # Slow, funeral pace

    for i in range(4):
        midi.addTempo(i, 0, bpm)

    # --- Track 0: Tolling bell (two low D strikes) ---
    # A funeral bell tolls at the start, then once more midway
    bell_notes = [
        ('D3', 3),      # First toll — rings out
        ('R', 1),
        ('D3', 3),      # Second toll
        ('R', 3),
    ]
    add_voice(midi, 0, 0, GM_TUBULAR, bell_notes, volume=90)

    # --- Track 1: Choir melody (mournful descending line) ---
    # Slow, descending phrase: the soul departing
    choir_notes = [
        ('R', 1),                           # Let the bell ring first
        ('A4', 2), ('G4', 1),              # Start high, step down
        ('F4', 2), ('E4', 1),              # Continue descent
        ('D4', 3),                          # Arrive on the tonic — finality
        ('R', 0.5),
    ]
    add_voice(midi, 1, 1, GM_CHOIR_AAHS, choir_notes, volume=85)

    # --- Track 2: String ensemble pad (dark chords) ---
    # Sustained minor chords that darken as the phrase descends
    pad_chords = [
        (['D3', 'A3', 'D4', 'F4'], 3),    # Dm — open, hollow
        (['D3', 'A3', 'D4', 'F4'], 1),     # Dm sustained
        (['Bb2', 'F3', 'Bb3', 'D4'], 2),   # Bbmaj — brief warmth
        (['A2', 'E3', 'A3', 'C#4'], 1),    # A major — dominant pull
        (['D2', 'A2', 'D3', 'F3'], 3),     # Dm low — final, deep
    ]
    add_chords(midi, 2, 2, GM_STRINGS, pad_chords, volume=60)

    # --- Track 3: Cello bass (pedal tone, then descent) ---
    bass_notes = [
        ('D2', 4),      # Pedal D through the bell tolls
        ('Bb2', 2),     # Follows the harmony down
        ('A2', 1),      # Dominant
        ('D2', 3),      # Final D — deep and low
    ]
    add_voice(midi, 3, 3, GM_CELLO, bass_notes, volume=75)

    mid_path = os.path.join(SCRIPT_DIR, 'midi', 'death.mid')
    wav_path = os.path.join(OUTPUT_DIR, 'death.wav')

    os.makedirs(os.path.dirname(mid_path), exist_ok=True)
    os.makedirs(os.path.dirname(wav_path), exist_ok=True)

    with open(mid_path, 'wb') as f:
        midi.writeFile(f)

    cmd = [
        'fluidsynth',
        '-ni',
        '-F', wav_path,
        '-T', 'wav',
        '-r', '44100',
        '-g', '1.0',
        '-R', '1',
        '-C', '1',
        SOUNDFONT,
        mid_path,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f'  FluidSynth error: {result.stderr}')
        return

    size_kb = os.path.getsize(wav_path) / 1024
    print(f'  Created: {wav_path} ({size_kb:.0f} KB)')
    print('Done!')


if __name__ == '__main__':
    main()
