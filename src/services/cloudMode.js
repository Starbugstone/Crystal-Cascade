// The standalone demo is explicit and has its own local save. Never fall back to it.
export const cloudEnabled =
  import.meta.env.VITE_CLOUD === 'true' &&
  new URLSearchParams(globalThis.location?.search ?? '').get('mode') !== 'demo';
