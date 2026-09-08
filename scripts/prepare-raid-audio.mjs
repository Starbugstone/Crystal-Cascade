// Rebuild the licensed recordings documented in public/sound/village/credits.html.
// FFMPEG may point to a local executable; no API key or synthesis service is needed.
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
const directory = await mkdtemp(join(tmpdir(), 'prospect-raid-'));
const recordings = [
  [
    'yeehaw',
    'https://cdn.freesound.org/previews/507/507024_10801325-hq.mp3',
    ['-ss', '0.23', '-t', '1.65'],
    'highpass=f=100,lowpass=f=8000,afade=t=in:d=0.02,afade=t=out:st=1.48:d=0.17,loudnorm=I=-19:TP=-3:LRA=7',
  ],
  [
    'bandit-shot',
    'https://bigsoundbank.com/UPLOAD/mp3/0438.mp3',
    [],
    'silenceremove=start_periods=1:start_threshold=-42dB:start_silence=0.01,atrim=duration=1.15,highpass=f=75,lowpass=f=8000,afade=t=out:st=0.85:d=0.3,loudnorm=I=-21:TP=-3:LRA=7',
  ],
  [
    'sheriff-shot',
    'https://bigsoundbank.com/UPLOAD/mp3/0397.mp3',
    [],
    'silenceremove=start_periods=1:start_threshold=-42dB:start_silence=0.01,atrim=duration=1.2,highpass=f=75,lowpass=f=8000,afade=t=out:st=0.9:d=0.3,loudnorm=I=-21:TP=-3:LRA=7',
  ],
];
try {
  for (const [name, url, trim, filter] of recordings) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${name}: HTTP ${response.status}`);
    const source = join(directory, `${name}.mp3`);
    await writeFile(source, Buffer.from(await response.arrayBuffer()));
    execFileSync(
      process.env.FFMPEG ?? 'ffmpeg',
      [
        '-hide_banner',
        '-loglevel',
        'error',
        '-y',
        ...trim,
        '-i',
        source,
        '-af',
        filter,
        '-ar',
        '44100',
        '-ac',
        '1',
        '-b:a',
        '128k',
        `public/sound/village/${name}.mp3`,
      ],
      { stdio: 'inherit' },
    );
  }
} finally {
  await rm(directory, { recursive: true, force: true });
}
