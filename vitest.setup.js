import { vi } from 'vitest';

// Provide a Jest-compatible global for jest-canvas-mock when running under Vitest.
const jestLike = vi;
globalThis.jest = jestLike;
if (typeof global !== 'undefined') {
  global.jest = jestLike;
}
if (typeof window !== 'undefined') {
  window.jest = jestLike;
}

vi.mock('phaser3spectorjs', () => ({}), { virtual: true });

await import('jest-canvas-mock');
