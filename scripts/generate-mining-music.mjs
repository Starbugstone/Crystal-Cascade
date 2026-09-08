// Original score: “Lanterns Below”, written for Prospect Hollow. No external samples.
// Regenerate with: FFMPEG=/path/to/ffmpeg node scripts/generate-mining-music.mjs
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const rate = 44100;
const beat = 60 / 64;
const bar = beat * 4;
const seconds = bar * 32;
const frames = Math.round(seconds * rate);
const left = new Float32Array(frames);
const right = new Float32Array(frames);
const tau = Math.PI * 2;
const frequency = (midi) => 440 * 2 ** ((midi - 69) / 12);

// Circular rendering carries releases and cave reflections across the loop seam.
function voice(midi, start, duration, level, pan, instrument) {
  const hz = frequency(midi);
  const offset = Math.round(start * rate);
  const count = Math.round(duration * rate);
  const l = Math.cos(((pan + 1) * Math.PI) / 4) * level;
  const r = Math.sin(((pan + 1) * Math.PI) / 4) * level;
  for (let i = 0; i < count; i++) {
    const t = i / rate;
    const phase = tau * hz * t;
    const release = Math.min(1, (duration - t) / 0.8);
    let sample;
    if (instrument === 'pluck') {
      // Rounded fingerpicked-string attack; upper partials decay before the body.
      sample =
        (1 - Math.exp(-t * 95)) *
        release *
        (Math.sin(phase) * Math.exp(-t / 1.7) +
          0.32 * Math.sin(phase * 2) * Math.exp(-t / 0.8) +
          0.12 * Math.sin(phase * 3) * Math.exp(-t / 0.4) +
          0.035 * Math.sin(phase * 4) * Math.exp(-t / 0.2));
    } else if (instrument === 'crystal') {
      sample =
        (1 - Math.exp(-t * 45)) *
        Math.exp(-t / 1.8) *
        release *
        (Math.sin(phase) + 0.16 * Math.sin(phase * 2.003) * Math.exp(-t / 0.7));
    } else {
      const envelope = Math.sin(Math.PI * Math.min(1, t / duration)) ** 1.5;
      const drift = 0.012 * Math.sin(tau * 3.7 * t);
      sample =
        envelope *
        (Math.sin(phase + drift) +
          0.18 * Math.sin(phase * 2 + drift) +
          0.035 * Math.sin(phase * 3));
    }
    const frame = (offset + i) % frames;
    left[frame] += sample * l;
    right[frame] += sample * r;
  }
}

// D minor/add9, Bb major7, F/add9, C suspended: warm, unhurried, gently mysterious.
const chords = [
  [38, 50, 57, 60, 64],
  [34, 50, 53, 57, 60],
  [41, 53, 57, 60, 67],
  [36, 50, 55, 60, 64],
  [38, 50, 57, 60, 64],
  [43, 50, 57, 58, 65],
  [34, 50, 53, 57, 60],
  [36, 50, 55, 60, 62],
];
// Four eight-bar phrases leave space between answers; no drums or busy ostinato.
const melodies = [
  [
    [69, 0.6],
    [65, 2.4],
  ],
  [[64, 1.2]],
  [
    [65, 0.5],
    [67, 2.5],
  ],
  [[64, 1.0]],
  [
    [62, 0.5],
    [65, 2.2],
  ],
  [[69, 1.4]],
  [
    [65, 0.6],
    [64, 2.5],
  ],
  [[62, 1.2]],
];
for (let measure = 0; measure < 32; measure++) {
  const chord = chords[measure % 8];
  const phrase = Math.floor(measure / 8);
  const start = measure * bar;
  voice(chord[0], start, bar * 1.5, 0.1, 0, 'pad');
  for (let tone = 1; tone < 4; tone++) {
    voice(chord[tone], start + tone * 0.09, bar * 1.8, 0.026, (tone - 2) * 0.45, 'pad');
  }
  const picking = phrase === 2 ? [1, 3, 2] : [1, 2, 4];
  picking.forEach((tone, index) => {
    voice(
      chord[tone],
      start + (0.18 + index * 1.25) * beat,
      4.8,
      index === 0 ? 0.14 : 0.105,
      index % 2 ? 0.32 : -0.3,
      'pluck',
    );
  });
  // The middle phrase opens into a higher register, then settles back underground.
  for (const [note, position] of melodies[measure % 8]) {
    voice(
      note + (phrase === 2 ? 12 : 0),
      start + position * beat,
      beat * 3.2,
      phrase === 2 ? 0.035 : 0.052,
      0.12,
      'pad',
    );
  }
  if (measure % 2 === 0) {
    voice(chord[3] + 24, start + beat * 2.8, 6.5, 0.021, measure % 4 ? -0.5 : 0.5, 'crystal');
  }
}

// Diffuse, dark stereo reflections, applied from the dry mix without feedback.
const dryLeft = left.slice();
const dryRight = right.slice();
for (let tap = 0; tap < 18; tap++) {
  const delay = Math.round((0.113 + tap * 0.137 + (tap % 3) * 0.019) * rate);
  const level = 0.105 * Math.exp(-tap / 6);
  let lowLeft = 0;
  let lowRight = 0;
  // Warm the low-pass state before frame zero to keep the reverb periodic.
  for (let i = -1024; i < frames; i++) {
    const source = (i - delay + frames) % frames;
    lowLeft += 0.16 * ((tap % 2 ? dryRight : dryLeft)[source] - lowLeft);
    lowRight += 0.16 * ((tap % 2 ? dryLeft : dryRight)[source] - lowRight);
    if (i >= 0) {
      left[i] += lowLeft * level;
      right[i] += lowRight * level;
    }
  }
}

const pcm = Buffer.alloc(frames * 8);
for (let i = 0; i < frames; i++) {
  pcm.writeFloatLE(left[i], i * 8);
  pcm.writeFloatLE(right[i], i * 8 + 4);
}
const output = new URL('../public/sound/mining/', import.meta.url);
const scratch = await mkdtemp(join(tmpdir(), 'mining-music-'));
try {
  await mkdir(output, { recursive: true });
  const source = join(scratch, 'lanterns-below.f32');
  await writeFile(source, pcm);
  for (const [extension, codec] of [
    ['ogg', ['-c:a', 'libvorbis', '-q:a', '4']],
    ['mp3', ['-c:a', 'libmp3lame', '-b:a', '160k']],
  ]) {
    execFileSync(process.env.FFMPEG || 'ffmpeg', [
      '-hide_banner',
      '-loglevel',
      'error',
      '-y',
      '-f',
      'f32le',
      '-ar',
      String(rate),
      '-ac',
      '2',
      '-i',
      source,
      '-af',
      'loudnorm=I=-22:TP=-4:LRA=9',
      '-ar',
      String(rate),
      '-map_metadata',
      '-1',
      '-metadata',
      'title=Lanterns Below',
      '-metadata',
      'artist=Prospect Hollow',
      ...codec,
      new URL(`lanterns-below.${extension}`, output).pathname,
    ]);
  }
  console.log(`Generated Lanterns Below: ${seconds}s, 64 BPM, stereo OGG + MP3.`);
} finally {
  await rm(scratch, { recursive: true, force: true });
}
