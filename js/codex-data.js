/**
 * Browser bootstrap — attaches shared Codex module to window for legacy scripts.
 */
import {
  CODEX_PLACEMENT,
  CODEX_NODES,
  getCodexRoot,
  getCodexPlacement,
  getCodexNodeMeta,
  getSpiralRing,
  getSpiralTurn,
  getSpiralSpoke,
  SPIRAL_MAX,
} from './codex-data.mjs';

window.CODEX_PLACEMENT = CODEX_PLACEMENT;
window.CODEX_NODES = CODEX_NODES;
window.getCodexRoot = getCodexRoot;
window.getCodexPlacement = getCodexPlacement;
window.getCodexNodeMeta = getCodexNodeMeta;
window.SPIRAL_MAX = SPIRAL_MAX;
window.getSpiralRing = getSpiralRing;
window.getSpiralTurn = getSpiralTurn;
window.getSpiralSpoke = getSpiralSpoke;
