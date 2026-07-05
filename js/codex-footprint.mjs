/**
 * Codex footprint map — SVG + prompt helpers for purpose triangle (LP, Expression, Calling).
 */

import { CODEX_NODES, getCodexNodeMeta, getCodexRoot } from './codex-data.mjs';

const CODEX_GRID_XY = {
  '1': { x: 96, y: 96, r: 16 },
  '2': { x: 204, y: 96, r: 16 },
  '3': { x: 150, y: 42, r: 16 },
  '4': { x: 42, y: 150, r: 16 },
  '5': { x: 258, y: 150, r: 16 },
  '6': { x: 150, y: 258, r: 16 },
  '7': { x: 96, y: 204, r: 16 },
  '8': { x: 204, y: 204, r: 16 },
  '9': { x: 150, y: 150, r: 22 },
};

const HIGHLIGHT_COLORS = {
  lp: '#7ec8c8',
  exp: '#c898f0',
  calling: '#e8c96b',
};

function getPurposeHighlights(frequencies) {
  return [
    { key: 'lp', root: getCodexRoot(frequencies.lifePath), label: 'Life Path', color: HIGHLIGHT_COLORS.lp },
    { key: 'exp', root: getCodexRoot(frequencies.expression), label: 'Expression', color: HIGHLIGHT_COLORS.exp },
    { key: 'calling', root: getCodexRoot(frequencies.destiny), label: 'Life Calling', color: HIGHLIGHT_COLORS.calling },
  ];
}

export function buildCodexNarrative(frequencies) {
  const lpMeta = getCodexNodeMeta(frequencies.lifePath);
  const expMeta = getCodexNodeMeta(frequencies.expression);
  const callMeta = getCodexNodeMeta(frequencies.destiny);

  return `Your Life Path sits at Node ${lpMeta.root} · ${lpMeta.placement}. Your Expression at Node ${expMeta.root} · ${expMeta.placement}. They converge in Life Calling · Node ${callMeta.root}.`;
}

function ringSvg(cx, cy, baseR, colors) {
  if (colors.length === 1) {
    return `<circle cx="${cx}" cy="${cy}" r="${baseR + 5}" fill="none" stroke="${colors[0].color}" stroke-width="2.5" opacity="0.9"/>`;
  }
  const seg = (Math.PI * (baseR + 5) * 2) / colors.length;
  const dash = seg.toFixed(1);
  return colors.map((c, i) => {
    const r = baseR + 5 + i * 4;
    const offset = (seg * i).toFixed(1);
    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${c.color}" stroke-width="2.5" stroke-dasharray="${dash} ${dash}" stroke-dashoffset="${offset}" opacity="0.92"/>`;
  }).join('');
}

/** Inline SVG for PDF — highlights LP, Expression, Life Calling on the 3×3 Codex grid. */
export function buildCodexFootprintSvg(frequencies) {
  const highlights = getPurposeHighlights(frequencies);
  const byNode = {};
  highlights.forEach((h) => {
    const k = String(h.root);
    if (!byNode[k]) byNode[k] = [];
    byNode[k].push(h);
  });

  const lines = [
    [150, 42, 96, 96], [150, 42, 204, 96], [96, 96, 150, 150], [204, 96, 150, 150],
    [96, 204, 150, 150], [204, 204, 150, 150], [150, 258, 96, 204], [150, 258, 204, 204],
    [42, 150, 150, 150], [258, 150, 150, 150],
  ];
  const lineHtml = lines.map((l) =>
    `<line x1="${l[0]}" y1="${l[1]}" x2="${l[2]}" y2="${l[3]}" stroke="rgba(201,168,76,0.15)" stroke-width="1"/>`
  ).join('');

  const nodeOrder = ['3', '4', '5', '6', '1', '2', '7', '8', '9'];
  const nodesHtml = nodeOrder.map((num) => {
    const pos = CODEX_GRID_XY[num];
    const active = byNode[num];
    const meta = CODEX_NODES[num] || {};
    const fill = active ? 'rgba(8,12,18,0.92)' : 'rgba(5,4,10,0.75)';
    const stroke = active
      ? (active.length === 1 ? active[0].color : 'rgba(201,168,76,0.5)')
      : 'rgba(201,168,76,0.18)';
    const textFill = active
      ? (active.length === 1 ? active[0].color : '#e8c96b')
      : 'rgba(201,168,76,0.35)';
    const ring = active ? ringSvg(pos.x, pos.y, pos.r, active) : '';
    const title = meta.name ? `${num} — ${meta.name}` : `Node ${num}`;
    const label = active ? ` · ${active.map((a) => a.label).join(', ')}` : '';
    return `<g><title>${title}${label}</title>${ring}<circle cx="${pos.x}" cy="${pos.y}" r="${pos.r}" fill="${fill}" stroke="${stroke}" stroke-width="${active ? 2 : 1}"/><text x="${pos.x}" y="${pos.y + 5}" text-anchor="middle" font-family="Cinzel,serif" font-size="14" fill="${textFill}">${num}</text></g>`;
  }).join('');

  const legendHtml = highlights.map((h) =>
    `<span class="codex-legend-item"><span class="codex-legend-dot" style="background:${h.color}"></span>${h.label}</span>`
  ).join('');

  return {
    svg: `<svg viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Codex footprint map">${lineHtml}${nodesHtml}</svg>`,
    legend: legendHtml,
    narrative: buildCodexNarrative(frequencies),
  };
}

export function buildCodexPromptBlock(frequencies) {
  const lpMeta = getCodexNodeMeta(frequencies.lifePath);
  const expMeta = getCodexNodeMeta(frequencies.expression);
  const callMeta = getCodexNodeMeta(frequencies.destiny);

  const lines = [
    `CODEX PLACEMENT (Purpose Triangle — for the Codex Footprint section ONLY):`,
    `- Life Path ${frequencies.rawLifePath}/${frequencies.lifePath} → Codex Node ${lpMeta.root} · ${lpMeta.placement} · ${lpMeta.name} · ${lpMeta.essence}`,
    `- Expression ${frequencies.rawExpression}/${frequencies.expression} → Codex Node ${expMeta.root} · ${expMeta.placement} · ${expMeta.name} · ${expMeta.essence}`,
    `- Life Calling ${frequencies.rawDestiny}/${frequencies.destiny} → Codex Node ${callMeta.root} · ${callMeta.placement} · ${callMeta.name} · ${callMeta.essence}`,
  ];

  const nodes = [lpMeta.root, expMeta.root, callMeta.root];
  const unique = [...new Set(nodes)];
  if (unique.length < 3) {
    const shared = unique.filter((n) => nodes.filter((x) => x === n).length > 1);
    lines.push(`Convergence note: ${shared.length ? `Nodes ${shared.join(' and ')} carry multiple frequencies — interpret the fusion of those roles on the same matrix position.` : 'Two or more frequencies share the same Codex node.'}`);
  } else {
    lines.push(`Convergence note: Life Path, Expression, and Life Calling occupy three distinct nodes (${unique.join(', ')}) — describe how energy moves between these positions in the matrix.`);
  }

  lines.push(`Do NOT repeat full Codex node metadata inside the Life Path, Expression, or Life Calling sections later — those sections focus on number meaning. The Codex Footprint section covers matrix placement only.`);

  return lines.join('\n');
}
