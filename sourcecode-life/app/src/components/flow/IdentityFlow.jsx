import { useState, useMemo } from 'react'
import ReactFlow, { Background } from 'reactflow'
import 'reactflow/dist/style.css'
import { fmt, reduceToSimple } from '../../lib/numerology'
import { ROOT, COMPOUND_DESC, STRIPS, FIRST_NAME_MEANINGS } from '../../lib/data'
import { getFirstNameValue } from '../../lib/numerologyProfile'
import FlowNode, { flowNodeTypes } from './FlowNode'
import FlowDetailPanel from './FlowDetailPanel'

// ── Node sizing & layout ────────────────────────────────────────────────────
const NODE_SIZE = 90
const IDENTITY_LAYOUT = {
  so: { x: 280, y: 100 },
  ou: { x: 520, y: 100 },
  fn: { x: 400, y: 260 },
  ex: { x: 400, y: 420 },
}

const IDENTITY_EDGES = [
  ['so', 'fn'],
  ['ou', 'fn'],
  ['fn', 'ex'],
]

const NODE_META = {
  so: { label: 'SOUL',       subtitle: 'Your inner desire',      icon: '💎' },
  ou: { label: 'OUTER',      subtitle: 'The mask you wear',       icon: '🎭' },
  fn: { label: '1ST NAME',   subtitle: 'The frequency you carry', icon: '✦'  },
  ex: { label: 'EXPRESSION', subtitle: 'Your outward signal',     icon: '🔮' },
}

const NODE_COLORS = {
  so: '#7c3aed',
  ou: '#f472b6',
  fn: '#f59e0b',
  ex: '#2dd4bf',
}

const MASTERS = new Set([11, 22, 33, 44, 55, 66, 77, 88, 99])

// ── Strip content ─────────────────────────────────────────────────────────────
function StripContent({ nodeKey, playerData, fnData }) {
  const colorHex = NODE_COLORS[nodeKey] || '#c9a84c'

  // First Name node — special rendering
  if (nodeKey === 'fn') {
    const { firstName, compound, root } = fnData
    const meaning = FIRST_NAME_MEANINGS[root]
    if (!meaning) return null
    return (
      <div className="purpose-strip-content" style={{ '--flow-color': colorHex }}>
        <div className="purpose-strip-header">
          <span className="purpose-strip-number">{root}</span>
          <span className="purpose-strip-label">1ST NAME</span>
        </div>
        <div className="purpose-strip-role">{firstName} · sum {compound} → root {root}</div>
        <div className="journal-section">
          <div className="journal-section-label">◈ {meaning.title.toUpperCase()}</div>
          <div className="journal-section-text">
            {meaning.text.split('\n\n').map((p, i) => <p key={i}>{p}</p>)}
          </div>
        </div>
      </div>
    )
  }

  const numMap = {
    so: playerData.so, ou: playerData.ou, ex: playerData.ex,
    lp: playerData.lp, cl: playerData.cl, ac: playerData.ac, th: playerData.th,
  }
  const numObj = numMap[nodeKey]
  if (!numObj) return null

  const root = numObj.root
  const compound = numObj.compound
  const rData = ROOT[root] || ROOT[reduceToSimple(root)] || ROOT[9] || {}
  const isMaster = MASTERS.has(root)
  const displayNum = fmt(root, compound)

  let coreText = ''
  if      (nodeKey === 'ex') coreText = rData.ex    || ''
  else if (nodeKey === 'so') coreText = rData.soul  || ''
  else if (nodeKey === 'ou') coreText = rData.outer || ''

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

// ── IdentityFlow ──────────────────────────────────────────────────────────────
export default function IdentityFlow({ playerData }) {
  const [selected, setSelected] = useState(null)

  const fnData = useMemo(() => {
    const firstName = (playerData.name || '').trim().split(/\s+/)[0] || ''
    return { firstName, ...getFirstNameValue(firstName) }
  }, [playerData.name])

  const nodes = useMemo(() => {
    return Object.keys(IDENTITY_LAYOUT).map((nodeKey) => {
      const pos   = IDENTITY_LAYOUT[nodeKey]
      const meta  = NODE_META[nodeKey]
      const color = NODE_COLORS[nodeKey] || '#c9a84c'

      let displayNum, isMaster
      if (nodeKey === 'fn') {
        displayNum = String(fnData.root || '?')
        isMaster   = MASTERS.has(fnData.root)
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
  }, [playerData, selected, fnData])

  const edges = useMemo(() => IDENTITY_EDGES.map(([source, target]) => ({
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
        {selected && <StripContent nodeKey={selected} playerData={playerData} fnData={fnData} />}
      </FlowDetailPanel>
    </>
  )
}
