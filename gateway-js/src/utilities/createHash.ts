import isNodeLike from './isNodeLike';

export function createHash (kind: string): import('crypto').Hash {
  if (isNodeLike) {
    // Use module.require instead of just require to avoid bundling whatever
    // crypto polyfills a non-Node bundler might fall back to.
    return module.require('crypto').createHash(kind);
  }
  return require('sha.js')(kind);
}
