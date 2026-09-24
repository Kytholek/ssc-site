/**
 * LifeQuestFlow — static frequency tree (fit viewport, no zoom/pan).
 */
import { useState, useMemo, useCallback, useEffect } from 'react'
import ReactFlow from 'reactflow'
import 'reactflow/dist/style.css'
import { fmt } from '../../lib/numerology'
import FlowDetailPanel from './FlowDetailPanel'
import FlowProgressNode from './FlowProgressNode'
import { useAppDispatch } from '../../context/AppContext'
import { useGameDispatch } from '../../state/GameContext'
import { ACTIONS } from '../../state/actions'
import {
  QuestEngine_markLQPObjective,
  earnStatXP,
  getLQP,
} from '../../lib/questEngine'
import { applyQuestSkillReward } from '../../lib/skillQuestBridge'

const LIFE_NODE_SIZE = 72
const LIFE_NODE_HALF = LIFE_NODE_SIZE / 2

const CENTER_X = 200
const CENTER_Y = 190

/** Tighter vertical span so the tree fits at zoom ≈ 1. */
const LIFE_LAYOUT = {
  so: { x: CENTER_X - 105, y: CENTER_Y - 155 },
  ou: { x: CENTER_X + 105, y: CENTER_Y - 155 },
  ex: { x: CENTER_X,       y: CENTER_Y - 78 },
  cl: { x: CENTER_X,       y: CENTER_Y },
  lp: { x: CENTER_X,       y: CENTER_Y + 78 },
  ac: { x: CENTER_X - 105, y: CENTER_Y + 155 },
  th: { x: CENTER_X + 105, y: CENTER_Y + 155 },
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
  so: '◈',
  ou: '◇',
  ex: '▣',
  cl: '★',
  lp: '⟶',
  ac: '▲',
  th: '◎',
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

const TIER_LABELS = { 1: 'APPRENTICE', 2: 'ADEPT', 3: 'MASTER' }

function resolveColor(colorToken) {
  if (!colorToken) return { hex: '#c9a84c' }
  if (colorToken.startsWith('#')) return { hex: colorToken }
  return { hex: COLOR_HEX[colorToken] || '#c9a84c' }
}

function LifeNode({ data }) {
  const stagesDone = data.completedCount || 0
  const progressPct = (stagesDone / 3) * 100
  const label = data.locked ? '' : (data.meta?.label || data.nodeKey)
  const ariaName = data.locked
    ? `${data.meta?.label || data.nodeKey}, locked until frequency level ${data.unlockLv}`
    : `${data.meta?.label || data.nodeKey}${data.isSelected ? ', selected' : ''}`

  return (
    <FlowProgressNode
      color={data.colorHex}
      icon={NODE_ICONS[data.nodeKey] || '✦'}
      displayNum={data.locked ? fmt(data.numObj.root, data.numObj.compound) : String(data.numObj?.root || '')}
      label={label}
      subtitle=""
      isSelected={data.isSelected}
      locked={data.locked}
      unlockLv={data.unlockLv}
      progressPct={data.locked ? 0 : progressPct}
      stagesDone={data.locked ? 0 : stagesDone}
      innateGlow={false}
      showPips={!data.locked}
      showBadge={!data.locked}
      size={LIFE_NODE_SIZE}
      shape="square"
      onClick={data.onClick}
      withHandles
      ariaLabel={ariaName}
      ariaPressed={data.isSelected && !data.locked}
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
  getQuestDescription,
}) {
  const [selected, setSelected] = useState(null)
  const [selectedObjective, setSelectedObjective] = useState(null)
  const [zoomLock, setZoomLock] = useState(null)
  const dispatch = useAppDispatch()
  const gameDispatch = useGameDispatch()

  useEffect(() => {
    setSelectedObjective(null)
  }, [selected])

  const clearSelection = useCallback(() => {
    setSelected(null)
    setSelectedObjective(null)
  }, [])

  const handleCompleteObjective = useCallback(() => {
    if (!selectedObjective || selectedObjective.done) return
    const { questKey, tier, objIdx } = selectedObjective
    const root = numMap[questKey]?.root
    const difficulty = tier === 3 ? 'hard' : tier === 2 ? 'medium' : 'easy'

    QuestEngine_markLQPObjective(questKey, tier, objIdx, { skipSkillReward: true })
    if (root != null) {
      applyQuestSkillReward(
        { root, tier, questKind: 'life', difficulty },
        earnStatXP,
        (name, detail) => window.dispatchEvent(new CustomEvent(name, { detail: detail || null })),
      )
    }
    gameDispatch({ type: ACTIONS.REFRESH_LQP, payload: getLQP() })
    gameDispatch({
      type: ACTIONS.SET_TOAST,
      payload: { msg: '✦ Life objective complete', color: 'var(--teal)' },
    })
    setSelectedObjective((prev) => (prev ? { ...prev, done: true } : null))
  }, [selectedObjective, numMap, gameDispatch])

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

  const onInit = useCallback((rf) => {
    rf.fitView({ padding: 0.12, duration: 0 })
    const z = rf.getZoom()
    setZoomLock(z)
    rf.setMinZoom(z)
    rf.setMaxZoom(z)
  }, [])

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
        position: { x: pos.x - LIFE_NODE_HALF, y: pos.y - LIFE_NODE_HALF },
        draggable: false,
        selectable: false,
        data: {
          numObj,
          nodeKey,
          meta: { label: meta.label, sub: meta.sub, title: meta.title },
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

  const panelOpen = !!selected
  const panelTitle = selectedObjective
    ? (nodeMeta[selectedObjective.questKey]?.label || 'Quest Objective')
    : (selData?.meta?.title || '')
  const panelSubtitle = selectedObjective
    ? `${TIER_LABELS[selectedObjective.tier]} · Objective ${Number(selectedObjective.objIdx) + 1}`
    : (selData?.meta?.sub || '')
  const panelIcon = selectedObjective
    ? (NODE_ICONS[selectedObjective.questKey] || '✦')
    : (NODE_ICONS[selected] || '✦')
  const panelColor = selectedObjective
    ? resolveColor(getQuestData(numMap[selectedObjective.questKey]?.root)?.color).hex
    : (selData?.hex || '#c9a84c')

  return (
    <>
      <div className="lqt-flow-wrap">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodeClick={onNodeClick}
          onInit={onInit}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          zoomOnDoubleClick={false}
          zoomOnScroll={false}
          zoomOnPinch={false}
          panOnDrag={false}
          panOnScroll={false}
          preventScrolling
          minZoom={zoomLock ?? 0.25}
          maxZoom={zoomLock ?? 2}
          proOptions={{ hideAttribution: true }}
        />
      </div>

      <FlowDetailPanel
        open={panelOpen}
        onClose={clearSelection}
        color={panelColor}
        title={panelTitle}
        subtitle={panelSubtitle}
        icon={panelIcon}
      >
        {selectedObjective ? (
          <div className="objective-detail-panel">
            <button
              type="button"
              className="objective-detail-back"
              onClick={() => setSelectedObjective(null)}
            >
              ← Back to objectives
            </button>
            <div className={`objective-detail-status objective-detail-status--${selectedObjective.done ? 'done' : 'pending'}`}>
              {selectedObjective.done ? '✓ Complete' : 'In Progress'}
            </div>
            <div className="objective-detail-text">{selectedObjective.text}</div>
            <div className="objective-detail-context">
              <div className="objective-detail-context-label">Quest Context</div>
              <div className="objective-detail-context-value">
                {getQuestDescription?.(selectedObjective.questKey) || 'Quest objective'}
              </div>
            </div>
            <div className="objective-detail-actions">
              {!selectedObjective.done && (
                <button
                  type="button"
                  className="objective-detail-btn objective-detail-btn--complete"
                  onClick={handleCompleteObjective}
                >
                  Complete
                </button>
              )}
              <button
                type="button"
                className="objective-detail-journal-link"
                onClick={() => dispatch({ type: 'SET_TAB', payload: 'home', section: 'journal' })}
              >
                Open in Home journal →
              </button>
            </div>
          </div>
        ) : (
          selData && renderPanel?.(selected, {
            onClose: clearSelection,
            onObjectiveClick: setSelectedObjective,
          })
        )}
      </FlowDetailPanel>
    </>
  )
}
