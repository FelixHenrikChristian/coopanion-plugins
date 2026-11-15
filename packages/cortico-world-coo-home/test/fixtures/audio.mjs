// Neutral PCM generated entirely in memory; no installed figure audio is read.
export function neutralWave(seconds = .4) {
  const rate = 16000, samples = Math.round(seconds * rate), bytes = Buffer.alloc(44 + samples * 2);
  bytes.write('RIFF', 0); bytes.writeUInt32LE(bytes.length - 8, 4); bytes.write('WAVEfmt ', 8);
  bytes.writeUInt32LE(16, 16); bytes.writeUInt16LE(1, 20); bytes.writeUInt16LE(1, 22);
  bytes.writeUInt32LE(rate, 24); bytes.writeUInt32LE(rate * 2, 28); bytes.writeUInt16LE(2, 32); bytes.writeUInt16LE(16, 34);
  bytes.write('data', 36); bytes.writeUInt32LE(samples * 2, 40);
  for (let i = 0; i < samples; i++) bytes.writeInt16LE(Math.round(Math.sin(i / rate * Math.PI * 2 * 400) * 500 * Math.min(1, i / 100, (samples - i) / 100)), 44 + i * 2);
  return bytes;
}

export function neutralAudioProfile(key, overrides = {}) {
  return { key, assetKey: key, enabled: true, volume: 35,
    kinds: { move: true, touch: true, face: true, snore: true, talk: true, ui: true, alert: true },
    snoreSeconds: 5, panByPosition: true, speech: { enabled: true, pitchHz: 400, unitsPerSecond: 6 },
    voice: { pitch: 1 }, sounds: [{ name: 'neutral-tone.wav', kind: 'talk', volume: .1, repeat: 'restart' }], ...overrides };
}

export function neutralSpeechUnits(text) {
  return { units: Array.from(text).slice(0, 300).map((_, at) => ({ at, key: 'a', tone: 0, stress: false, weak: false, pos: at, of: text.length, end: '' })) };
}
