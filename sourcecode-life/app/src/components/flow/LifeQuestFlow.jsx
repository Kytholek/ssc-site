import { useState, useMemo, useCallback } from 'react'
import ReactFlow, { Background } from 'reactflow'
import 'reactflow/dist/style.css'
import { fmt } from '../../lib/numerology'
import FlowDetailPanel from './FlowDetailPanel'
import FlowProgressNode from './FlowProgressNode'
import { FLOW_NODE_HALF, FLOW_NODE_SIZE } from './flowNodeConstants'

const CENTER_X = 320
const CENTER_Y = 220

const LIFE_LAYOUT = {
  so: { x: CENTER_X - 150, y: CENTER_Y - 240 },
  ou: { x: CENTER_X + 150, y: CENTER_Y - 240 },
  ex: { x: CENTER_X,       y: CENTER_Y - 120 },
  cl: { x: CENTER_X,       y: CENTER_Y },
  lp: { x: CENTER_X,       y: CENTER_Y + 120 },
  ac: { x: CENTER_X - 150, y: CENTER_Y + 240 },
  th: { x: CENTER_X + 150, y: CENTER_Y + 240 },
}

const LIFE_EDGES = [
  ['so', 'ex'],
  ['ou', 'ex'],
  ['ex', 'cl'],
  ['cl', 'lp'],
  ['lp', 'ac'],
  ['lp', 'th'],
]

const NODE_ICONS = {
  so: '💎',
  ou: '🎭',
  ex: '🔧',
  cl: '⭐',
  lp: '🛤️',
  ac: '🏆',
  th: '📜',
}

const COLOR_HEX = {
  '--teal': '#00e5b4',
  '--gold': '#c9a84c',
  '--amber': '#ff9500',
  '--rose': '#dc5078',
  '--purple': '#7b61ff',
  '--sage': '#78b464',
  '--silver': '#c0c0c0',
}

function resolveColor(colorToken) {
  if (!colorToken) return { hex: '#c9a84c' }
  if (colorToken.startsWith('#')) return { hex: colorToken }
  return { hex: COLOR_HEX[colorToken] || '#c9a84c' }
}

function LifeNode({ data }) {
  const stagesDone = data.completedCount || 0
  const progressPct = (stagesDone / 3) * 100

  return (
    <FlowProgressNode
      color={data.colorHex}
      icon={NODE_ICONS[data.nodeKey] || '✦'}
      displayNum={data.locked ? fmt(data.numObj.root, data.numObj.compound) : String(data.numObj?.root || '')}
      label={data.locked ? '' : (data.meta?.label || data.nodeKey)}
      subtitle={data.locked ? '' : (data.meta?.sub || '')}
      isSelected={data.isSelected}
      locked={data.locked}
      unlockLv={data.unlockLv}
      progressPct={data.locked ? 0 : progressPct}
      stagesDone={data.locked ? 0 : stagesDone}
      innateGlow={data.locked}
      showPips={!data.locked}
      showBadge={!data.locked}
      onClick={data.onClick}
      withHandles
    />
  )
}

const nodeTypes = { lifeNode: LifeNode }

export default function LifeQuestFlow({
  numMap,
  freqLevel,
  nodeMeta,
  getQuestData,
  lqp,
  onLocked,
  renderPanel,
}) {
  const [selected, setSelected] = useState(null)

  const selData = selected
    ? {
        nodeKey: selected,
        meta: nodeMeta[selected],
        numObj: numMap[selected],
        qData: getQuestData(numMap[selected]?.root),
        ...resolveColor(getQuestData(numMap[selected]?.root)?.color),
      }
    : null

  const nodeLookup = useMemo(() => {
    const lookup = {}
    Object.keys(LIFE_LAYOUT).forEach((nodeKey) => {
      const meta = nodeMeta[nodeKey]
      const numObj = numMap[nodeKey]
      if (!numObj) return
      const qData = getQuestData(numObj.root)
      const unlockLv = nodeMeta[nodeKey].unlockLv || 0
      const locked = freqLevel < unlockLv
      lookup[nodeKey] = { meta, numObj, qData, unlockLv, locked }
    })
    return lookup
  }, [numMap, freqLevel, nodeMeta, getQuestData])

  const onNodeClick = useCallback((event, node) => {
    event.stopPropagation()
    const key = node.id
    const info = nodeLookup[key]
    if (!info) return
    if (info.locked) {
      onLocked?.(`Reach Freq LV ${info.unlockLv} to unlock ${info.meta.title}`)
    } else {
      setSelected((prev) => (prev === key ? null : key))
    }
  }, [nodeLookup, onLocked])

  const nodes = useMemo(() => {
    return Object.keys(LIFE_LAYOUT).map((nodeKey) => {
      const pos = LIFE_LAYOUT[nodeKey]
      const meta = nodeMeta[nodeKey]
      const numObj = numMap[nodeKey]
      if (!numObj) return null
      const qData = getQuestData(numObj.root)
      const unlockLv = nodeMeta[nodeKey].unlockLv || 0
      const locked = freqLevel < unlockLv
      const { hex: colorHex } = locked
        ? { hex: '#787878' }
        : resolveColor(qData.color)

      let completedCount = 0
      const lqpEntry = lqp?.[nodeKey]
      if (lqpEntry) {
        for (let t = 1; t <= 3; t++) {
          const prog = lqpEntry[t] || []
          if (prog.length > 0 && prog.every(Boolean)) completedCount++
          else break
        }
      }

      return {
        id: nodeKey,
        type: 'lifeNode',
        position: { x: pos.x - FLOW_NODE_HALF, y: pos.y - FLOW_NODE_HALF },
        draggable: false,
        data: {
          numObj,
          nodeKey,
          meta: { label: meta.label, sub: meta.sub },
          unlockLv,
          locked,
          colorHex,
          completedCount,
          isSelected: selected === nodeKey,
          onClick: () => {
            if (locked) {
              onLocked?.(`Reach Freq LV ${unlockLv} to unlock ${meta.title}`)
            } else {
              setSelected((prev) => (prev === nodeKey ? null : nodeKey))
            }
          },
        },
      }
    }).filter(Boolean)
  }, [numMap, selected, freqLevel, nodeMeta, getQuestData, lqp, onLocked])

  const edges = useMemo(() => (
    LIFE_EDGES.map(([source, target]) => ({
      id: `${source}-${target}`,
      source,
      target,
      type: 'default',
      style: {
        stroke: 'rgba(201,168,76,0.25)',
        strokeWidth: 1.5,
        strokeDasharray: '4 4',
      },
      animated: false,
    }))
  ), [])

  return (
    <>
      <div className="lqt-flow-wrap lqt-flow-wrap--compact">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodeClick={onNodeClick}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable
          zoomOnDoubleClick={false}
          zoomOnScroll
          zoomOnPinch
          panOnDrag
          panOnScroll={false}
          preventScrolling={false}
          minZoom={0.4}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#ffffff08" gap={24} size={1} />
        </ReactFlow>
      </div>

      <FlowDetailPanel
        open={!!selected}
        onClose={() => setSelected(null)}
        color={selData?.hex || '#c9a84c'}
        title={selData?.meta?.title || ''}
        subtitle={selData?.meta?.sub || ''}
        icon={NODE_ICONS[selected] || '✦'}
      >
        {selData && renderPanel?.(selected)}
      </FlowDetailPanel>
    </>
  )
}
