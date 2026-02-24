#!/usr/bin/env python3
"""
Generate MIDI-rendered menu theme for Uncrowned using FluidSynth + SoundFont.
Real sampled instruments instead of raw sine-wave synthesis.

Outputs:
  menu-ensemble.wav — Original melody with orchestral sampled instruments

Requires:
  pip install MIDIUtil midi2audio
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
GM_RECORDER    = 74   # Warm medieval lead
GM_CELLO       = 42   # Bass voice
GM_STRINGS     = 48   # String Ensemble 1
GM_HARP        = 46   # Orchestral Harp


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


def add_voice(midi, track, channel, program, notes, bpm, volume=100,
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


def add_harp_arpeggios(midi, track, channel, chords, volume=70,
                       arp_beats=0.5):
    midi.addProgramChange(track, channel, 0, GM_HARP)
    t = 0.0
    for notes, beats in chords:
        inner = 0.0
        idx = 0
        while inner < beats - 0.01:
            note_name = notes[idx % len(notes)]
            pitch = note_to_midi(note_name)
            dur = min(arp_beats, beats - inner)
            if pitch >= 0:
                midi.addNote(track, channel, pitch, t + inner, dur * 0.9,
                             volume)
            inner += dur
            idx += 1
        t += beats


def render_midi_to_wav(midi_obj, midi_path, wav_path):
    os.makedirs(os.path.dirname(midi_path), exist_ok=True)
    os.makedirs(os.path.dirname(wav_path), exist_ok=True)

    with open(midi_path, 'wb') as f:
        midi_obj.writeFile(f)

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
        midi_path,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f'  FluidSynth error: {result.stderr}')
        return False

    size_kb = os.path.getsize(wav_path) / 1024
    print(f'  Created: {wav_path} ({size_kb:.0f} KB)')
    return True


def main():
    print('Generating MIDI orchestral theme (menu-ensemble.wav)')
    print(f'SoundFont: {SOUNDFONT}')

    if not os.path.exists(SOUNDFONT):
        print(f'\nERROR: SoundFont not found at {SOUNDFONT}')
        exit(1)

    midi = MIDIFile(4, deinterleave=False)
    bpm = 112

    for i in range(4):
        midi.addTempo(i, 0, bpm)

    # --- Track 0: Lead melody (Recorder) ---
    lead_notes = [
        ('R', 4), ('R', 4),
        ('A4', 1.5), ('G4', 0.5), ('F4', 1), ('D4', 1),
        ('E4', 1), ('F4', 1), ('A4', 2),
        # Theme A
        ('D4', 1), ('F4', 0.5), ('A4', 0.5), ('D5', 2),
        ('C5', 1), ('Bb4', 0.5), ('A4', 0.5), ('G4', 2),
        ('F4', 1), ('G4', 0.5), ('A4', 0.5), ('Bb4', 1.5), ('A4', 0.5),
        ('G4', 1), ('F4', 1), ('D4', 2),
        ('D4', 0.5), ('E4', 0.5), ('F4', 0.5), ('A4', 0.5), ('D5', 1), ('C5', 1),
        ('Bb4', 1), ('C5', 0.5), ('D5', 0.5), ('E5', 2),
        ('F5', 1), ('E5', 0.5), ('D5', 0.5), ('C5', 1), ('Bb4', 1),
        ('A4', 1.5), ('G4', 0.5), ('F4', 1), ('D4', 1),
        # Theme B
        ('Bb4', 1), ('D5', 1), ('C5', 1), ('Bb4', 1),
        ('A4', 1), ('G4', 1), ('F4', 1), ('E4', 1),
        ('F4', 1.5), ('A4', 0.5), ('C5', 2),
        ('Bb4', 1), ('A4', 1), ('G4', 2),
        ('D4', 1), ('F4', 0.5), ('A4', 0.5), ('D5', 2),
        ('C5', 1), ('D5', 0.5), ('E5', 0.5), ('F5', 2),
        ('E5', 1), ('D5', 0.5), ('C5', 0.5), ('Bb4', 1), ('A4', 1),
        ('G4', 1), ('F4', 0.5), ('E4', 0.5), ('D4', 2),
        # Outro
        ('A4', 1.5), ('G4', 0.5), ('F4', 2),
        ('E4', 1), ('F4', 1), ('D4', 2),
        ('F4', 1), ('A4', 1), ('D5', 2),
        ('D4', 4),
    ]
    add_voice(midi, 0, 0, GM_RECORDER, lead_notes, bpm, volume=105)

    # --- Track 1: Cello bass ---
    bass_notes = [
        ('D3', 4), ('D3', 4),
        ('D3', 2), ('F3', 2),
        ('C3', 2), ('D3', 2),
        ('D3', 4),
        ('Bb3', 2), ('G3', 2),
        ('F3', 4),
        ('G3', 2), ('D3', 2),
        ('D3', 4),
        ('Bb3', 2), ('C3', 2),
        ('F3', 2), ('Bb3', 2),
        ('A3', 2), ('D3', 2),
        ('Bb3', 4),
        ('A3', 2), ('F3', 2),
        ('F3', 2), ('C3', 2),
        ('Bb3', 2), ('G3', 2),
        ('D3', 4),
        ('C3', 2), ('F3', 2),
        ('G3', 2), ('Bb3', 2),
        ('A3', 2), ('D3', 2),
        ('D3', 4),
        ('C3', 2), ('D3', 2),
        ('F3', 2), ('D3', 2),
        ('D3', 4),
    ]
    add_voice(midi, 1, 1, GM_CELLO, bass_notes, bpm, volume=85)

    # --- Track 2: String ensemble pad ---
    pad_chords = [
        (['D4', 'F4', 'A4'], 4),
        (['D4', 'F4', 'A4'], 4),
        (['D4', 'F4', 'A4'], 2), (['F4', 'A4', 'C5'], 2),
        (['C4', 'E4', 'G4'], 2), (['D4', 'F4', 'A4'], 2),
        (['D4', 'F4', 'A4'], 4),
        (['Bb3', 'D4', 'F4'], 2), (['G3', 'Bb3', 'D4'], 2),
        (['F3', 'A3', 'C4'], 4),
        (['G3', 'Bb3', 'D4'], 2), (['D3', 'F3', 'A3'], 2),
        (['D4', 'F4', 'A4'], 4),
        (['Bb3', 'D4', 'F4'], 2), (['C4', 'E4', 'G4'], 2),
        (['F3', 'A3', 'C4'], 2), (['Bb3', 'D4', 'F4'], 2),
        (['A3', 'C4', 'E4'], 2), (['D3', 'F3', 'A3'], 2),
        (['Bb3', 'D4', 'F4'], 4),
        (['A3', 'C4', 'E4'], 2), (['F3', 'A3', 'C4'], 2),
        (['F3', 'A3', 'C4'], 2), (['C4', 'E4', 'G4'], 2),
        (['Bb3', 'D4', 'F4'], 2), (['G3', 'Bb3', 'D4'], 2),
        (['D4', 'F4', 'A4'], 4),
        (['C4', 'E4', 'G4'], 2), (['F3', 'A3', 'C4'], 2),
        (['G3', 'Bb3', 'D4'], 2), (['Bb3', 'D4', 'F4'], 2),
        (['A3', 'C4', 'E4'], 2), (['D3', 'F3', 'A3'], 2),
        (['D4', 'F4', 'A4'], 4),
        (['C4', 'E4', 'G4'], 2), (['D4', 'F4', 'A4'], 2),
        (['F3', 'A3', 'C4'], 2), (['D4', 'F4', 'A4'], 2),
        (['D3', 'F3', 'A3'], 4),
    ]
    add_chords(midi, 2, 2, GM_STRINGS, pad_chords, volume=55)

    # --- Track 3: Harp arpeggios ---
    add_harp_arpeggios(midi, 3, 3, pad_chords, volume=60, arp_beats=0.5)

    mid_path = os.path.join(SCRIPT_DIR, 'midi', 'menu-ensemble.mid')
    wav_path = os.path.join(OUTPUT_DIR, 'menu-ensemble.wav')
    render_midi_to_wav(midi, mid_path, wav_path)
    print('Done!')


if __name__ == '__main__':
    main()
