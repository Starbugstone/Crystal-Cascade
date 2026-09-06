import { writeFileSync } from 'node:fs';

// Original procedural effects: no downloaded recording or third-party sample.
// Mono PCM keeps decoding inexpensive. The river loop tapers over its seam.
const rate = 16000;
let seed = 22;
const noise = () => {
  seed = (seed * 16807) % 2147483647;
  return seed / 1073741823.5 - 1;
};
function writeWave(name, seconds, sample) {
  const count = seconds * rate,
    buffer = Buffer.alloc(44 + count * 2);
  buffer.write('RIFF');
  buffer.writeUInt32LE(buffer.length - 8, 4);
  buffer.write('WAVEfmt ', 8);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(rate, 24);
  buffer.writeUInt32LE(rate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(count * 2, 40);
  for (let i = 0; i < count; i++) {
    const t = i / rate,
      envelope = Math.min(1, t / 0.12, (seconds - t) / 0.12);
    buffer.writeInt16LE(
      Math.round(Math.max(-1, Math.min(1, sample(t))) * envelope * 21000),
      44 + i * 2,
    );
  }
  writeFileSync(new URL(`../public/sound/village/${name}.wav`, import.meta.url), buffer);
}
let low = 0;
writeWave('river', 8, (t) => {
  low = 0.88 * low + 0.12 * noise();
  return low * (0.8 + 0.1 * Math.sin(t * 3)) + noise() * 0.035;
});
writeWave(
  'train',
  3,
  (t) =>
    (Math.sin(t * 2 * Math.PI * 370) + 0.35 * Math.sin(t * 2 * Math.PI * 494)) *
    0.22 *
    Math.sin((Math.PI * t) / 3) ** 2,
);
writeWave(
  'steamboat',
  3,
  (t) =>
    (Math.sin(t * 2 * Math.PI * 196) + 0.35 * Math.sin(t * 2 * Math.PI * 294)) *
    0.25 *
    Math.sin((Math.PI * t) / 3) ** 2,
);
