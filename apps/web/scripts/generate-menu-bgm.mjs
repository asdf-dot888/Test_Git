import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Deterministic menu/map loop: 80 BPM, D minor, 24 seconds, mono 22.05 kHz PCM16.
// Regenerate with: node apps/web/scripts/generate-menu-bgm.mjs
const sampleRate = 22_050;
const durationSeconds = 24;
const sampleCount = sampleRate * durationSeconds;
const beatSeconds = 60 / 80;
const outputPath = resolve(dirname(fileURLToPath(import.meta.url)), "../public/audio/bgm/menu.wav");
const samples = new Float64Array(sampleCount);
const tau = Math.PI * 2;

const droneNotes = [
  { frequency: 73.416, amplitude: 0.075, phase: 0.12 }, // D2
  { frequency: 110, amplitude: 0.045, phase: 0.73 }, // A2
  { frequency: 146.832, amplitude: 0.025, phase: 1.17 }, // D3
];

for (let index = 0; index < sampleCount; index += 1) {
  const time = index / sampleRate;
  const drone = droneNotes.reduce((value, note) => value + Math.sin(tau * note.frequency * time + note.phase) * note.amplitude, 0);
  const slowPulse = 0.86 + 0.14 * Math.sin(tau * time / 6);
  samples[index] = drone * slowPulse;
}

// A sparse D-minor figure repeats every four bars. Each note has a soft pluck envelope.
const figure = [146.832, 220, 261.626, 174.614, 146.832, 196, 220, 293.665]; // D3, A3, C4, F3, D3, G3, A3, D4
const stepSeconds = beatSeconds / 2;
for (let start = 0; start < durationSeconds; start += stepSeconds) {
  const step = Math.round(start / stepSeconds) % figure.length;
  const frequency = figure[step];
  const accent = step % 4 === 0 ? 0.085 : 0.052;
  const end = Math.min(sampleCount, Math.round((start + 0.34) * sampleRate));
  const begin = Math.round(start * sampleRate);
  for (let index = begin; index < end; index += 1) {
    const elapsed = (index - begin) / sampleRate;
    const envelope = (1 - Math.exp(-elapsed * 75)) * Math.exp(-elapsed * 6.5);
    samples[index] += Math.sin(tau * frequency * elapsed) * accent * envelope;
  }
}

// Blend the first and final 50 ms into each other to avoid a click at the loop seam.
const seamSamples = Math.round(sampleRate * 0.05);
for (let index = 0; index < seamSamples; index += 1) {
  const mix = index / (seamSamples - 1);
  const startIndex = index;
  const endIndex = sampleCount - seamSamples + index;
  const startSample = samples[startIndex];
  const endSample = samples[endIndex];
  samples[startIndex] = startSample * (1 - mix) + endSample * mix;
  samples[endIndex] = endSample * (1 - mix) + startSample * mix;
}

let peak = 0;
for (const sample of samples) peak = Math.max(peak, Math.abs(sample));
const outputGain = peak > 0 ? 0.7 / peak : 1;
const dataBytes = sampleCount * 2;
const wav = Buffer.alloc(44 + dataBytes);
wav.write("RIFF", 0);
wav.writeUInt32LE(36 + dataBytes, 4);
wav.write("WAVE", 8);
wav.write("fmt ", 12);
wav.writeUInt32LE(16, 16);
wav.writeUInt16LE(1, 20);
wav.writeUInt16LE(1, 22);
wav.writeUInt32LE(sampleRate, 24);
wav.writeUInt32LE(sampleRate * 2, 28);
wav.writeUInt16LE(2, 32);
wav.writeUInt16LE(16, 34);
wav.write("data", 36);
wav.writeUInt32LE(dataBytes, 40);

for (let index = 0; index < sampleCount; index += 1) {
  const signedSample = Math.max(-1, Math.min(1, samples[index] * outputGain));
  wav.writeInt16LE(Math.round(signedSample * 32_767), 44 + index * 2);
}

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, wav);
process.stdout.write(`Generated ${outputPath} (${durationSeconds}s, ${sampleRate} Hz mono PCM16).\n`);
