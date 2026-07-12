import { useState, useMemo } from 'react'
import ReactFlow, { Background } from 'reactflow'
import 'reactflow/dist/style.css'
import { fmt, reduceToSimple } from '../../lib/numerology'
import { ROOT, CALLING, COMPOUND_DESC, STRIPS, GIFTS } from '../../lib/data'
import FlowNode, { flowNodeTypes } from './FlowNode'
import FlowDetailPanel from './FlowDetailPanel'

// ── Node sizing & layout ────────────────────────────────────────────────────
const NODE_SIZE = 90
const LESSONS_LAYOUT = {
  th: { x: 400, y:  80 },
  ac: { x: 240, y: 260 },
  dy: { x: 560, y: 260 },
  lp: { x: 400, y: 440 },
}

const LESSONS_EDGES = [
  ['th', 'ac'],
  ['th', 'dy'],
  ['ac', 'lp'],
  ['dy', 'lp'],
]

const NODE_META = {
  th: { label: 'THEME',       subtitle: 'Your life\'s backdrop',    icon: '📜' },
  ac: { label: 'ACHIEVEMENT', subtitle: 'How you manifest',         icon: '🏆' },
  dy: { label: 'DAY GIFT',    subtitle: 'Your innate coded ability', icon: '✦'  },
  lp: { label: 'LIFE PATH',   subtitle: 'The road you walk',        icon: '🛤️' },
}

const NODE_COLORS = {
  th: '#7c3aed',
  ac: '#f59e0b',
  dy: '#c9a84c',
  lp: '#00e5cc',
}

const MASTERS = new Set([11, 22, 33, 44, 55, 66, 77, 88, 99])

// ── Strip content ─────────────────────────────────────────────────────────────
function StripContent({ nodeKey, playerData }) {
  const colorHex = NODE_COLORS[nodeKey] || '#c9a84c'

  // Day Gift node — special rendering
  if (nodeKey === 'dy') {
    const n    = reduceToSimple(playerData.d)
    const gift = GIFTS[n]?.day
    if (!gift) return null
    return (
      <div className="purpose-strip-content" style={{ '--flow-color': colorHex }}>
        <div className="purpose-strip-header">
          <span className="purpose-strip-number">{n}</span>
          <span className="purpose-strip-label">DAY GIFT</span>
        </div>
        <div className="purpose-strip-role">Birth day reduced · innate coded ability</div>
        <div className="journal-section">
          <div className="journal-section-label">{gift.glyph} {gift.word}</div>
          <div className="journal-section-text">{gift.desc}</div>
        </div>
      </div>
    )
  }

  const numMap = {
    lp: playerData.lp, ex: playerData.ex, cl: playerData.cl,
    so: playerData.so, ou: playerData.ou, ac: playerData.ac, th: playerData.th,
  }
  const numObj = numMap[nodeKey]
  if (!numObj) return null

  const root = numObj.root
  const compound = numObj.compound
  const rData = ROOT[root] || ROOT[reduceToSimple(root)] || ROOT[9] || {}
  const isMaster = MASTERS.has(root)
  const displayNum = fmt(root, compound)

  let coreText = ''
  if      (nodeKey === 'lp') coreText = rData.lp    || ''
  else if (nodeKey === 'ac') coreText = rData.ach   || ''
  else if (nodeKey === 'th') coreText = rData.theme || ''
  else if (nodeKey === 'cl') {
    const cData = CALLING[root] || CALLING[reduceToSimple(root)] || CALLING[9] || {}
    coreText = [cData.summary, cData.career, cData.gift ? '✦ Gift: ' + cData.gift : ''].filter(Boolean).join('\n\n')
  }

  const hasCompound = compound && compound !== root && COMPOUND_DESC[compound]
  const strip = STRIPS.find(s => s.id === nodeKey)

  return (
    <div className="purpose-strip-content" style={{ '--flow-color': colorHex }}>
      <div className="purpose-strip-header">
        <span className="purpose-strip-number">{displayNum}</span>
        <span className="purpose-strip-label">
          {(strip?.label || nodeKey).toUpperCase()}
          {isMaster && <span className="strip-master-badge">MASTER</span>}
        </span>
      </div>
      {strip?.role && <div className="purpose-strip-role">{strip.role}</div>}

      {hasCompound && (
        <div className="journal-section">
          <div className="journal-section-label">◈ COMPOUND — {compound}/{root}</div>
          <div className="journal-section-text">{COMPOUND_DESC[compound]}</div>
        </div>
      )}

      {coreText && (
        <div className="journal-section">
          <div className="journal-section-label">◈ {(strip?.label || nodeKey).toUpperCase()}</div>
          <div className="journal-section-text">
            {coreText.split('\n\n').map((p, i) => <p key={i}>{p}</p>)}
          </div>
        </div>
      )}

      {rData.shadow && (
        <div className="journal-section journal-section-shadow">
          <div className="journal-section-label">◈ SHADOW</div>
          <div className="journal-section-text">{rData.shadow}</div>
        </div>
      )}

      {rData.integration && (
        <div className="journal-section">
          <div className="journal-section-label">◈ INTEGRATION</div>
          <div className="journal-section-text">{rData.integration}</div>
        </div>
      )}

      {rData.aff && (
        <div className="journal-affirmation">{rData.aff}</div>
      )}
    </div>
  )
}

// ── LessonsFlow ───────────────────────────────────────────────────────────────
export default function LessonsFlow({ playerData }) {
  const [selected, setSelected] = useState(null)

  const nodes = useMemo(() => {
    return Object.keys(LESSONS_LAYOUT).map((nodeKey) => {
      const pos    = LESSONS_LAYOUT[nodeKey]
      const meta   = NODE_META[nodeKey]
      const color  = NODE_COLORS[nodeKey] || '#c9a84c'

      let displayNum, isMaster
      if (nodeKey === 'dy') {
        const n = reduceToSimple(playerData.d)
        displayNum = String(n)
        isMaster   = false
      } else {
        const numObj = playerData[nodeKey]
        if (!numObj) return null
        displayNum = fmt(numObj.root, numObj.compound)
        isMaster   = MASTERS.has(numObj.root)
      }

      return {
        id: nodeKey,
        type: 'flowNode',
        position: { x: pos.x - NODE_SIZE / 2, y: pos.y - NODE_SIZE / 2 },
        draggable: false,
        data: {
          nodeKey, label: meta.label, icon: meta.icon,
          displayNum, isMaster, color,
          isSelected: selected === nodeKey,
          onClick: () => setSelected(prev => prev === nodeKey ? null : nodeKey),
        },
      }
    }).filter(Boolean)
  }, [playerData, selected])

  const edges = useMemo(() => LESSONS_EDGES.map(([source, target]) => ({
    id: `${source}-${target}`,
    source, target,
    type: 'default',
    style: { stroke: 'rgba(201,168,76,0.3)', strokeWidth: 2, strokeDasharray: '6 4' },
    animated: true,
  })), [])

  const selMeta  = selected ? NODE_META[selected]   : null
  const selColor = selected ? NODE_COLORS[selected] : '#c9a84c'

  return (
    <>
      <div className="lqt-flow-wrap">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={flowNodeTypes}
          onInit={(rf) => { setTimeout(() => { rf.fitView({ padding: 0.25, duration: 0 }); setTimeout(() => { const v = rf.getViewport(); rf.setViewport({ x: v.x, y: v.y - 95, zoom: v.zoom }) }, 50) }, 0) }}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          zoomOnDoubleClick={false}
          zoomOnScroll
          zoomOnPinch
          panOnDrag
          panOnScroll={false}
          preventScrolling={false}
          minZoom={0.3}
          maxZoom={3}
          proOptions={{ hideAttribution: true }}
          onNodeClick={(_, node) => setSelected(prev => prev === node.id ? null : node.id)}
        >
          <Background color="#ffffff08" gap={28} size={1} />
        </ReactFlow>
      </div>

      <FlowDetailPanel
        open={!!selected}
        onClose={() => setSelected(null)}
        color={selColor}
        title={selMeta?.label || ''}
        subtitle={selMeta?.subtitle || ''}
        icon={selMeta?.icon || ''}
        panelClassName="flow-side-panel--blueprint"
      >
        {selected && <StripContent nodeKey={selected} playerData={playerData} />}
      </FlowDetailPanel>
    </>
  )
}
