/**
 * SkillTree — progressive paths:
 * 3x3 seals -> root + 3 routes -> expand one active route's tiers.
 * Class loadout: equip up to 2 blueprint-eligible routes.
 * Compact docked inspector. Equip / Start CTA.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import ReactFlow, { MarkerType } from 'reactflow'
import 'reactflow/dist/style.css'
import FlowProgressNode from '../flow/FlowProgressNode'
import { FLOW_NODE_SIZE } from '../flow/flowNodeConstants'
import {
  NUMBERS,
  TIER_LABELS,
  THRESHOLDS,
  getSealProgress,
  getRouteStages,
  canStartRoute,
  startRoute,
  isRouteStageUnlocked,
  getTrainingProgress,
  getNextTierAction,
  migrateProgressToV3,
  resolveRouteStageQuests,
} from '../../lib/skillRoutes'
import {
  loadClassLoadout,
  getClassTitle,
  getLoadoutPathChips,
  getFilledSlots,
  getEligibleSeals,
  isSealEligible,
  isRouteEquipped,
  getEquippedRouteId,
  findLoadoutSlotIndex,
  equipRoute,
  unequipSlot,
  setClassTitleOverride,
  clearClassTitleOverride,
} from '../../lib/classLoadout'
import { useGameState } from '../../state/GameContext'

export { NUMBERS }

const ROOT_SIZE = 78
const ROUTE_SIZE = 68
const TIER_SIZE = 52
const ROOT_HALF = ROOT_SIZE / 2
const ROUTE_HALF = ROUTE_SIZE / 2
const TIER_HALF = TIER_SIZE / 2

const TIER_COLORS = {
  1: '#22c55e',
  2: '#eab308',
  3: '#ef4444',
}

const ROUTE_ICONS = ['\u25C7', '\u25C8', '\u2726']

/** Root + 3 routes; tiers only for expandedRouteId when provided */
function buildBranchLayout(numDef, expandedRouteId) {
  const routes = numDef.routes || []
  const cx = 240
  const rootY = 40
  const routeY = 155
  const tierStartY = 275
  const tierGapY = 100
  const routeSpread = 160
  const startX = cx - ((routes.length - 1) * routeSpread) / 2

  const positions = { root: { x: cx, y: rootY } }
  routes.forEach((route, ri) => {
    const x = startX + ri * routeSpread
    positions[`route:${route.id}`] = { x, y: routeY }
    if (expandedRouteId === route.id) {
      route.stages.forEach((_, si) => {
        positions[`tier:${route.id}:${si}`] = { x, y: tierStartY + si * tierGapY }
      })
    }
  })
  return positions
}

function SkillSeal({
  number, completed, active, seeds, statValues, size, onSelect,
  eligible = true, equipped = false, lockedReason = null,
}) {
  const stagesDone = completed.filter(Boolean).length
  const progressPct = (stagesDone / 3) * 100
  const innateStages = seeds?.[number.id] || [false, false, false]
  const isInnate = innateStages[0]
  const statVal = statValues?.[number.id] || 0
  const fullyAligned = stagesDone === 3 && statVal >= THRESHOLDS.stage3
  const locked = !eligible

  const eligiblePips = [
    true,
    innateStages[1] || statVal >= THRESHOLDS.stage2,
    innateStages[2] || statVal >= THRESHOLDS.stage3,
  ]

  const pipStates = [0, 1, 2].map((i) => ({
    done: completed[i],
    eligible: eligiblePips[i],
    innate: innateStages[i],
  }))

  return (
    <div className={`skills-grid-cell${equipped ? ' skills-grid-cell--equipped' : ''}${locked ? ' skills-grid-cell--locked' : ''}`}>
      <FlowProgressNode
        color={number.color}
        icon={number.icon}
        displayNum={number.id}
        label={number.label}
        subtitle={locked ? 'Not in blueprint' : number.subtitle}
        isSelected={active || equipped}
        locked={locked}
        progressPct={locked ? 0 : progressPct}
        stagesDone={locked ? 0 : stagesDone}
        pipStates={pipStates}
        innateGlow={!locked && isInnate}
        fullyAligned={!locked && fullyAligned}
        showPips={!locked}
        showBadge={!locked}
        size={size}
        onClick={() => onSelect(number, { locked, lockedReason })}
        ariaLabel={`${number.label}${equipped ? ', equipped' : ''}${locked ? ', not in blueprint' : ''}${active ? ', selected' : ''}`}
        ariaPressed={active}
      />
      {equipped && !locked && (
        <span className="skills-seal-equip-badge" aria-hidden="true">CLASS</span>
      )}
    </div>
  )
}

function BranchFlowNode({ data }) {
  return (
    <div
      className={`skills-branch-node${data.caption ? ' skills-branch-node--captioned' : ''}`}
      style={{ width: data.size, height: data.size }}
    >
      <FlowProgressNode
        color={data.color}
        icon={data.icon}
        displayNum={data.displayNum}
        label={data.caption ? '' : data.label}
        subtitle=""
        isSelected={data.isSelected}
        locked={data.locked}
        progressPct={data.progressPct}
        stagesDone={data.stagesDone}
        pipStates={data.pipStates}
        innateGlow={data.innateGlow || data.isNextAction}
        fullyAligned={data.fullyAligned}
        showPips={data.showPips}
        showBadge={data.showBadge}
        showProgressArc={data.showProgressArc}
        size={data.size}
        shape={data.shape || 'circle'}
        onClick={data.onClick}
        withHandles
        className={data.isNextAction ? 'skills-node--next' : ''}
        ariaLabel={data.ariaLabel}
        ariaPressed={data.isSelected}
      />
      {data.caption && (
        <span className="skills-route-caption" aria-hidden="true">
          {data.caption}
        </span>
      )}
    </div>
  )
}

const nodeTypes = { branch: BranchFlowNode }

function focusKey(focus) {
  if (!focus) return null
  if (focus.type === 'root') return 'root'
  if (focus.type === 'route') return `route:${focus.routeId}`
  if (focus.type === 'tier') return `tier:${focus.routeId}:${focus.stageIdx}`
  return null
}

function parseNodeId(id) {
  if (!id || id === 'root') return { type: 'root' }
  if (id.startsWith('route:')) return { type: 'route', routeId: id.slice(6) }
  const tierMatch = /^tier:(.+):(\d+)$/.exec(id)
  if (tierMatch) {
    return { type: 'tier', routeId: tierMatch[1], stageIdx: Number(tierMatch[2]) }
  }
  return null
}

function SkillsInspector({ open, color, title, subtitle, icon, onClose, children, slim = false }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          className={`skills-inspector${slim ? ' skills-inspector--slim' : ''}`}
          style={{ '--skill-color': color, '--flow-color': color }}
          initial={{ y: '100%', opacity: 0.6 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'tween', duration: 0.22, ease: 'easeOut' }}
          role="dialog"
          aria-label={title}
        >
          <div className="skills-inspector-handle" aria-hidden="true" />
          <div className="skills-inspector-header">
            <span className="skills-inspector-icon" aria-hidden="true">{icon}</span>
            <div className="skills-inspector-meta">
              <div className="skills-inspector-title">{title}</div>
              {subtitle && <div className="skills-inspector-sub">{subtitle}</div>}
            </div>
            <button type="button" className="skills-inspector-close" onClick={onClose} aria-label="Close">
              {'\u2715'}
            </button>
          </div>
          <div className="skills-inspector-body">{children}</div>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}

export default function SkillTree({
  completed,
  setCompleted,
  activeNode,
  setActiveNode,
  seeds = {},
  statValues = {},
  playerData = null,
  freqLevel = 1,
}) {
  const wrapRef = useRef(null)
  const [sealSize, setSealSize] = useState(FLOW_NODE_SIZE)
  const measureRaf = useRef(0)
  const [expandedRouteId, setExpandedRouteId] = useState(null)
  const [focus, setFocus] = useState(null)
  const [gateMsg, setGateMsg] = useState(null)
  const [zoomLock, setZoomLock] = useState(null)
  const [loadout, setLoadout] = useState(() => loadClassLoadout())
  const [renameOpen, setRenameOpen] = useState(false)
  const [renameDraft, setRenameDraft] = useState('')
  const [renameError, setRenameError] = useState('')
  const { user } = useGameState()
  const isPremium = !!user?.isPremium
  const [replacePicker, setReplacePicker] = useState(null) // { number, routeId }
  const [lockSheet, setLockSheet] = useState(null) // { label, color, reason }
  const rfRef = useRef(null)

  const progress = migrateProgressToV3(completed || {})
  const expanded = activeNode
    ? NUMBERS.find((n) => n.id === activeNode.id) || null
    : null
  const numProgress = expanded
    ? progress[expanded.id] || { activeRoutes: [], routes: {} }
    : null

  const training = getTrainingProgress(progress)
  const eligibleSeals = useMemo(
    () => getEligibleSeals(playerData, freqLevel),
    [playerData, freqLevel],
  )
  const filledSlots = getFilledSlots(loadout)
  const classTitle = getClassTitle(loadout)
  const pathChips = getLoadoutPathChips(loadout)
  const equippedSealIds = useMemo(
    () => new Set((loadout.slots || []).filter(Boolean).map((s) => s.number)),
    [loadout],
  )

  useEffect(() => {
    const onLoadout = (e) => {
      if (e.detail) setLoadout(e.detail)
      else setLoadout(loadClassLoadout())
    }
    window.addEventListener('scl:class_loadout_updated', onLoadout)
    return () => window.removeEventListener('scl:class_loadout_updated', onLoadout)
  }, [])

  const tiersRouteId = useMemo(() => {
    if (!expandedRouteId || !numProgress) return null
    if ((numProgress.activeRoutes || []).includes(expandedRouteId)) return expandedRouteId
    return null
  }, [expandedRouteId, numProgress])

  const nextAction = useMemo(() => {
    if (!expanded || !numProgress) return null
    if (tiersRouteId) {
      const next = getNextTierAction(expanded.id, tiersRouteId, numProgress, statValues, seeds)
      if (next) return { kind: 'tier', ...next }
    }
    for (const route of expanded.routes) {
      const active = (numProgress.activeRoutes || []).includes(route.id)
      if (!active) continue
      const next = getNextTierAction(expanded.id, route.id, numProgress, statValues, seeds)
      if (next) {
        if (tiersRouteId === route.id) return { kind: 'tier', ...next }
        return { kind: 'route', routeId: route.id }
      }
    }
    for (const route of expanded.routes) {
      const gate = canStartRoute(numProgress, expanded.id, route.id)
      if (gate.ok && gate.reason !== 'active') {
        return { kind: 'route', routeId: route.id }
      }
    }
    return null
  }, [expanded, numProgress, tiersRouteId, seeds, statValues])

  const openSeal = useCallback((number, opts = {}) => {
    if (opts.locked) {
      setLockSheet({
        label: number.label,
        color: number.color,
        reason: opts.lockedReason || 'Not in your blueprint',
      })
      return
    }
    setLockSheet(null)
    setGateMsg(null)
    setFocus(null)
    setExpandedRouteId(null)
    setReplacePicker(null)
    setActiveNode(number)
  }, [setActiveNode])

  const collapse = useCallback(() => {
    setActiveNode(null)
    setExpandedRouteId(null)
    setFocus(null)
    setGateMsg(null)
    setReplacePicker(null)
    setLockSheet(null)
  }, [setActiveNode])

  const tryEquipRoute = useCallback((routeId, replaceSlotIndex = null) => {
    if (!expanded || !setCompleted) return { ok: false, error: 'Unavailable' }
    const sealOk = isSealEligible(expanded.id, playerData, freqLevel)
    if (!sealOk) return { ok: false, error: 'Not in your blueprint.' }

    if (replaceSlotIndex != null) {
      const existing = loadout.slots?.[replaceSlotIndex]
      if (existing) {
        const node = progress[String(existing.number)] || {}
        const done = (node.routes?.[existing.routeId] || []).filter(Boolean).length
        if (done < 3) {
          const ok = window.confirm(
            'Replace this class path? Progress on the old path is kept — only the daily focus changes.',
          )
          if (!ok) return { ok: false, cancelled: true }
        }
      }
    }

    const res = equipRoute(expanded.id, routeId, {
      playerData,
      freqLevel,
      replaceSlotIndex,
      loadout,
      progress,
    })
    if (res.needsReplace) {
      setReplacePicker({ number: expanded.id, routeId })
      setGateMsg(res.error)
      return res
    }
    if (!res.ok) {
      setGateMsg(res.error || 'Could not equip')
      return res
    }
    if (res.progress) setCompleted(res.progress)
    setLoadout(res.loadout)
    setExpandedRouteId(routeId)
    setReplacePicker(null)
    setGateMsg(null)
    return res
  }, [expanded, playerData, freqLevel, loadout, progress, setCompleted])

  const tryUnequip = useCallback((slotIndex) => {
    const res = unequipSlot(slotIndex, loadout)
    if (res.ok) {
      setLoadout(res.loadout)
      return
    }
    if (res.error) {
      setGateMsg(res.error)
      try {
        window.dispatchEvent(new CustomEvent('scl:xp_toast', {
          detail: { msg: res.error, color: 'var(--rose)' },
        }))
      } catch { /* intentional */ }
    }
  }, [loadout])

  const openRename = useCallback(() => {
    if (!isPremium) {
      setGateMsg('Premium unlocks custom class titles.')
      try {
        window.dispatchEvent(new CustomEvent('scl:xp_toast', {
          detail: { msg: 'Premium unlocks custom class titles.', color: 'var(--gold)' },
        }))
      } catch { /* intentional */ }
      return
    }
    setRenameDraft(loadout.titleOverride || classTitle)
    setRenameError('')
    setRenameOpen(true)
  }, [isPremium, loadout.titleOverride, classTitle])

  const saveRename = useCallback(() => {
    if (!isPremium) return
    const res = setClassTitleOverride(renameDraft, loadout)
    if (!res.ok) {
      setRenameError(res.error || 'Could not save title.')
      return
    }
    setLoadout(res.loadout)
    setRenameOpen(false)
    setRenameError('')
  }, [isPremium, renameDraft, loadout])

  const resetRename = useCallback(() => {
    if (!isPremium) return
    const res = clearClassTitleOverride(loadout)
    if (res.ok) {
      setLoadout(res.loadout)
      setRenameOpen(false)
      setRenameDraft('')
      setRenameError('')
    }
  }, [isPremium, loadout])

  useEffect(() => {
    const el = wrapRef.current
    if (!el || typeof ResizeObserver === 'undefined' || expanded) return undefined

    const measure = () => {
      const w = el.clientWidth || 0
      const h = el.clientHeight || 0
      if (w < 40 || h < 40) return
      const pad = 12
      const gap = 8
      const cellW = (w - pad * 2 - gap * 2) / 3
      const cellH = (h - pad * 2 - gap * 2) / 3
      const next = Math.max(64, Math.min(100, Math.floor(Math.min(cellW, cellH) * 0.82)))
      setSealSize((prev) => (Math.abs(prev - next) < 2 ? prev : next))
    }

    const schedule = () => {
      if (measureRaf.current) cancelAnimationFrame(measureRaf.current)
      measureRaf.current = requestAnimationFrame(measure)
    }

    measure()
    const ro = new ResizeObserver(schedule)
    ro.observe(el)
    return () => {
      ro.disconnect()
      if (measureRaf.current) cancelAnimationFrame(measureRaf.current)
    }
  }, [expanded])

  const tryStartRoute = useCallback((routeId) => {
    if (!expanded || !setCompleted) return { ok: false, error: 'Unavailable' }
    const gate = canStartRoute(numProgress, expanded.id, routeId)
    if (!gate.ok) return { ok: false, error: gate.reason }
    if (gate.reason === 'active') {
      setExpandedRouteId(routeId)
      return { ok: true, already: true }
    }
    const { progress: next, error } = startRoute(progress, expanded.id, routeId)
    if (error) return { ok: false, error }
    setCompleted(next)
    window.dispatchEvent(new CustomEvent('scl:skilltree_updated', { detail: next }))
    setExpandedRouteId(routeId)
    setGateMsg(null)
    return { ok: true }
  }, [expanded, numProgress, progress, setCompleted])

  const onBranchNode = useCallback((payload) => {
    if (!expanded) return
    setGateMsg(null)

    if (payload.type === 'root') {
      setFocus(null)
      return
    }

    if (payload.type === 'route') {
      const gate = canStartRoute(numProgress, expanded.id, payload.routeId)
      if (!gate.ok) setGateMsg(gate.reason)
      setExpandedRouteId(payload.routeId)
      setFocus({ type: 'route', routeId: payload.routeId, numId: expanded.id })
      return
    }

    if (payload.type === 'tier') {
      setExpandedRouteId(payload.routeId)
      setFocus({
        type: 'tier',
        routeId: payload.routeId,
        stageIdx: payload.stageIdx,
        numId: expanded.id,
      })
    }
  }, [expanded, numProgress])

  const onRfNodeClick = useCallback((event, node) => {
    event?.stopPropagation?.()
    const parsed = parseNodeId(node?.id)
    if (parsed) onBranchNode(parsed)
  }, [onBranchNode])

  const layout = useMemo(
    () => (expanded ? buildBranchLayout(expanded, tiersRouteId) : null),
    [expanded, tiersRouteId],
  )

  const selectedId = focusKey(focus)

  const { nodes, edges } = useMemo(() => {
    if (!expanded || !layout || !numProgress) return { nodes: [], edges: [] }

    const equippedRoute = getEquippedRouteId(expanded.id, loadout)
    const sealDone = getSealProgress(numProgress, expanded.id, equippedRoute)
    const sealStages = sealDone.filter(Boolean).length
    const innateStages = seeds?.[expanded.id] || [false, false, false]
    const statVal = statValues?.[expanded.id] || 0
    const nodesOut = []
    const edgesOut = []

    const rootPos = layout.root
    nodesOut.push({
      id: 'root',
      type: 'branch',
      position: { x: rootPos.x - ROOT_HALF, y: rootPos.y - ROOT_HALF },
      draggable: false,
      selectable: false,
      data: {
        color: expanded.color,
        icon: expanded.icon,
        displayNum: expanded.id,
        label: expanded.label,
        caption: '',
        size: ROOT_SIZE,
        isSelected: selectedId === 'root',
        progressPct: (sealStages / 3) * 100,
        stagesDone: sealStages,
        pipStates: [0, 1, 2].map((i) => ({
          done: sealDone[i],
          eligible: i === 0 || innateStages[i] || statVal >= (i === 1 ? THRESHOLDS.stage2 : THRESHOLDS.stage3),
          innate: innateStages[i],
        })),
        innateGlow: !!innateStages[0],
        fullyAligned: sealStages === 3 && statVal >= THRESHOLDS.stage3,
        showPips: true,
        showBadge: true,
        showProgressArc: true,
        ariaLabel: `${expanded.label} root`,
        onClick: () => onBranchNode({ type: 'root' }),
      },
    })

    expanded.routes.forEach((route, ri) => {
      const routeId = route.id
      const stages = getRouteStages(numProgress, expanded.id, routeId)
      const done = stages.filter(Boolean).length
      const isActive = (numProgress.activeRoutes || []).includes(routeId)
      const gate = canStartRoute(numProgress, expanded.id, routeId)
      const gated = !isActive && !gate.ok
      const routePos = layout[`route:${routeId}`]
      const nodeId = `route:${routeId}`
      const isNextRoute = nextAction?.kind === 'route' && nextAction.routeId === routeId

      nodesOut.push({
        id: nodeId,
        type: 'branch',
        position: { x: routePos.x - ROUTE_HALF, y: routePos.y - ROUTE_HALF },
        draggable: false,
        selectable: false,
        data: {
          color: gated ? '#666680' : expanded.color,
          icon: ROUTE_ICONS[ri % ROUTE_ICONS.length],
          displayNum: '',
          label: '',
          caption: route.name,
          size: ROUTE_SIZE,
          shape: 'square',
          isSelected: selectedId === nodeId || expandedRouteId === routeId,
          locked: false,
          progressPct: (done / 3) * 100,
          stagesDone: done,
          showPips: false,
          showBadge: false,
          showProgressArc: !gated && done > 0,
          isNextAction: isNextRoute,
          ariaLabel: gated ? `${route.name} route, locked` : `${route.name} route`,
          onClick: () => onBranchNode({ type: 'route', routeId }),
        },
      })

      edgesOut.push({
        id: `e-root-${routeId}`,
        source: 'root',
        target: nodeId,
        type: 'smoothstep',
        animated: isActive,
        style: {
          stroke: isActive ? `${expanded.color}99` : 'rgba(255,255,255,0.18)',
          strokeWidth: isActive ? 2 : 1.25,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 14,
          height: 14,
          color: isActive ? expanded.color : 'rgba(255,255,255,0.25)',
        },
      })

      if (tiersRouteId !== routeId) return

      route.stages.forEach((stage, si) => {
        const tierId = `tier:${routeId}:${si}`
        const tierPos = layout[tierId]
        if (!tierPos) return
        const unlocked = isActive && isRouteStageUnlocked(
          expanded.id, routeId, si, numProgress, statValues, seeds,
        )
        const isDone = !!stages[si]
        const tierLocked = !unlocked
        const tierColor = tierLocked ? '#555568' : TIER_COLORS[stage.stage]
        const isNextTier = nextAction?.kind === 'tier'
          && nextAction.routeId === routeId
          && nextAction.stageIdx === si
        const tierLabel = TIER_LABELS[stage.stage].label

        nodesOut.push({
          id: tierId,
          type: 'branch',
          position: { x: tierPos.x - TIER_HALF, y: tierPos.y - TIER_HALF },
          draggable: false,
          selectable: false,
          data: {
            color: isNextTier ? expanded.color : tierColor,
            icon: isDone ? '\u2713' : String(stage.stage),
            displayNum: '',
            label: '',
            caption: tierLabel,
            size: TIER_SIZE,
            isSelected: selectedId === tierId,
            locked: tierLocked && !isNextTier,
            progressPct: isDone ? 100 : 0,
            stagesDone: isDone ? 1 : 0,
            showPips: false,
            showBadge: false,
            showProgressArc: isDone,
            isNextAction: isNextTier,
            ariaLabel: `${route.name} ${tierLabel}`,
            onClick: () => onBranchNode({ type: 'tier', routeId, stageIdx: si }),
          },
        })

        const prevId = si === 0 ? nodeId : `tier:${routeId}:${si - 1}`
        edgesOut.push({
          id: `e-${prevId}-${tierId}`,
          source: prevId,
          target: tierId,
          type: 'smoothstep',
          animated: isDone || isNextTier,
          style: {
            stroke: isDone
              ? `${tierColor}aa`
              : isNextTier
                ? `${expanded.color}88`
                : (isActive ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.1)'),
            strokeWidth: isDone || isNextTier ? 1.75 : 1.1,
            strokeDasharray: unlocked || isDone ? undefined : '4 4',
          },
        })
      })
    })

    return { nodes: nodesOut, edges: edgesOut }
  }, [
    expanded, layout, numProgress, selectedId, seeds, statValues,
    onBranchNode, tiersRouteId, expandedRouteId, nextAction, loadout,
  ])

  const onInit = useCallback((rf) => {
    rfRef.current = rf
    rf.fitView({ padding: 0.2, duration: 200 })
    const z = rf.getZoom()
    setZoomLock(z)
    rf.setMinZoom(Math.max(0.25, z * 0.7))
    rf.setMaxZoom(Math.min(1.6, z * 1.25))
  }, [])

  useEffect(() => {
    if (!expanded || !rfRef.current) return
    const t = requestAnimationFrame(() => {
      rfRef.current?.fitView?.({ padding: 0.22, duration: 280, includeHiddenNodes: false })
    })
    return () => cancelAnimationFrame(t)
  }, [expanded?.id, tiersRouteId])

  const inspector = useMemo(() => {
    if (!expanded || !focus || !numProgress) return null
    if (focus.type === 'root') return null

    const sealEligible = isSealEligible(expanded.id, playerData, freqLevel)

    if (focus.type === 'route') {
      const route = expanded.routes.find((r) => r.id === focus.routeId)
      if (!route) return null
      const stages = getRouteStages(numProgress, expanded.id, route.id)
      const active = (numProgress.activeRoutes || []).includes(route.id)
      const gate = canStartRoute(numProgress, expanded.id, route.id)
      const equipped = isRouteEquipped(expanded.id, route.id, loadout)
      const equipSlotIdx = findLoadoutSlotIndex(expanded.id, route.id, loadout)
      return {
        color: expanded.color,
        title: route.name,
        subtitle: route.classNoun
          ? `${route.classNoun} · ${route.thesis}`
          : route.thesis,
        icon: equipped ? '\u265A' : '\u25C8',
        body: (
          <>
            <p className="skills-detail-lead">
              {equipped
                ? `Equipped class path · ${stages.filter(Boolean).length}/3 tiers`
                : active
                  ? `Training · ${stages.filter(Boolean).length}/3 tiers — equip to focus dailies`
                  : 'Preview the path, then equip it as a class specialization.'}
            </p>
            {!sealEligible && (
              <p className="skills-detail-gate" role="status">Not in your blueprint</p>
            )}
            {sealEligible && !equipped && (
              <button
                type="button"
                className="skills-detail-cta"
                onClick={() => {
                  const res = tryEquipRoute(route.id)
                  if (!res.ok && !res.needsReplace) setGateMsg(res.error)
                }}
              >
                Equip
              </button>
            )}
            {equipped && (
              <button
                type="button"
                className="skills-detail-cta skills-detail-cta--ghost"
                onClick={() => tryUnequip(equipSlotIdx)}
              >
                Unequip path
              </button>
            )}
            {replacePicker?.routeId === route.id && (
              <div className="skills-replace-picker" role="group" aria-label="Replace class slot">
                <p className="skills-detail-kicker">Replace which path?</p>
                {loadout.slots.map((slot, i) => (
                  <button
                    key={i}
                    type="button"
                    className="skills-replace-slot"
                    onClick={() => tryEquipRoute(route.id, i)}
                  >
                    Slot {i === 0 ? 'A' : 'B'}
                    {slot
                      ? ` — ${NUMBERS.find((n) => Number(n.id) === slot.number)?.label || slot.number} · ${slot.routeId}`
                      : ' (empty)'}
                  </button>
                ))}
                <button
                  type="button"
                  className="skills-detail-cta skills-detail-cta--ghost"
                  onClick={() => setReplacePicker(null)}
                >
                  Cancel
                </button>
              </div>
            )}
            {!active && gate.ok && sealEligible && (
              <button
                type="button"
                className="skills-detail-start-link"
                onClick={() => {
                  const res = tryStartRoute(route.id)
                  if (!res.ok) setGateMsg(res.error)
                }}
              >
                Start without equipping
              </button>
            )}
            {!gate.ok && (
              <p className="skills-detail-gate" role="status">{gate.reason}</p>
            )}
            {Array.isArray(route.relatedRoutes) && route.relatedRoutes.length > 0 && (
              <div className="skills-cross-train" role="group" aria-label="Cross-train paths">
                <p className="skills-detail-kicker">Cross-train</p>
                {route.relatedRoutes.map((edge) => {
                  const targetNum = NUMBERS.find((n) => Number(n.id) === Number(edge.number))
                  const targetRoute = targetNum?.routes?.find((r) => r.id === edge.routeId)
                  if (!targetNum || !targetRoute) return null
                  return (
                    <button
                      key={`${edge.number}-${edge.routeId}`}
                      type="button"
                      className="skills-cross-train-link"
                      onClick={() => {
                        openSeal(targetNum)
                        setExpandedRouteId(edge.routeId)
                        setFocus({ type: 'route', routeId: edge.routeId, numId: targetNum.id })
                      }}
                    >
                      {targetNum.label} · {targetRoute.name}
                      {targetRoute.classNoun ? ` (${targetRoute.classNoun})` : ''}
                    </button>
                  )
                })}
              </div>
            )}
            <p className="skills-detail-kicker">Tiers &amp; quests</p>
            {route.stages.map((s, i) => {
              const done = !!stages[i]
              const unlocked = active && isRouteStageUnlocked(
                expanded.id, route.id, i, numProgress, statValues, seeds,
              )
              return (
                <div key={s.stage} className="skills-route-tier-preview">
                  <div className="skills-route-tier-preview-head">
                    <strong>T{s.stage} {TIER_LABELS[s.stage].label}</strong>
                    <span>
                      {done ? 'done' : !active ? 'locked' : unlocked ? s.name : 'locked'}
                    </span>
                  </div>
                  <ul className="skills-detail-quests">
                    {resolveRouteStageQuests(expanded.id, route.id, i, s.quests || []).map((q, qi) => (
                      <li key={qi} className={done ? 'is-done' : ''}>{q}</li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </>
        ),
      }
    }

    if (focus.type === 'tier') {
      const route = expanded.routes.find((r) => r.id === focus.routeId)
      const stage = route?.stages?.[focus.stageIdx]
      if (!route || !stage) return null
      const stages = getRouteStages(numProgress, expanded.id, route.id)
      const isDone = !!stages[focus.stageIdx]
      const isActive = (numProgress.activeRoutes || []).includes(route.id)
      const unlocked = isActive && isRouteStageUnlocked(
        expanded.id, route.id, focus.stageIdx, numProgress, statValues, seeds,
      )
      const innateStages = seeds?.[expanded.id] || [false, false, false]
      const statVal = statValues?.[expanded.id] || 0
      const threshold = focus.stageIdx === 1
        ? THRESHOLDS.stage2
        : focus.stageIdx === 2
          ? THRESHOLDS.stage3
          : null
      const lockParts = []
      if (!isActive) lockParts.push('Start or equip this route first')
      if (focus.stageIdx > 0 && !stages[focus.stageIdx - 1]) {
        lockParts.push(`Complete ${TIER_LABELS[focus.stageIdx].label}`)
      }
      if (threshold && !innateStages[focus.stageIdx] && statVal < threshold) {
        lockParts.push(`Stat ${statVal}/${threshold}`)
      }
      const tier = TIER_LABELS[stage.stage]
      return {
        color: unlocked || isDone ? TIER_COLORS[stage.stage] : expanded.color,
        title: stage.name,
        subtitle: `${route.name} · ${tier.label}`,
        icon: isDone ? '\u2713' : String(stage.stage),
        body: (
          <>
            {!unlocked && (
              <p className="skills-detail-gate" role="status">
                {lockParts.join(' · ') || 'Locked'}
              </p>
            )}
            {isDone && <p className="skills-detail-lead">Tier complete.</p>}
            {unlocked && !isDone && (
              <p className="skills-detail-lead">Next up — complete these in the world.</p>
            )}
            <p className="skills-detail-kicker">Quests</p>
            <ul className="skills-detail-quests">
              {resolveRouteStageQuests(expanded.id, route.id, focus.stageIdx, stage.quests || []).map((q, i) => (
                <li key={i} className={isDone ? 'is-done' : ''}>{q}</li>
              ))}
            </ul>
            <p className="skills-detail-note">
              Matching class / daily quests fill this tier automatically.
            </p>
          </>
        ),
      }
    }

    return null
  }, [
    expanded, focus, numProgress, seeds, statValues, tryStartRoute,
    tryEquipRoute, tryUnequip, loadout, replacePicker, playerData, freqLevel,
    openSeal,
  ])

  const thesis = !expanded
    ? (filledSlots.length
      ? `Class: ${classTitle} — select a seal to train.`
      : 'Equip up to two blueprint paths as your class.')
    : !isSealEligible(expanded.id, playerData, freqLevel)
      ? `${expanded.label} — not in your blueprint.`
      : tiersRouteId
        ? `${expanded.label} · ${expanded.routes.find((r) => r.id === tiersRouteId)?.name || 'path'} tiers`
        : `${expanded.label} — equip a route as your class path.`

  const nextStepHint = nextAction
    ? nextAction.kind === 'tier'
      ? `Next: ${TIER_LABELS[nextAction.stageIdx + 1]?.label || 'tier'} on this path`
      : 'Next: open or equip a route'
    : null

  return (
    <div className="skills-stage" aria-label="Numerology Skill Tree">
      <header className="skills-stage-header skills-stage-header--loadout">
        <div className="skills-loadout-block">
          <div className="skills-class-row">
            <span className="skills-class-kicker">CLASS</span>
            <span className="skills-class-title">{classTitle}</span>
            {filledSlots.length > 0 && (
              <button
                type="button"
                className={`skills-class-rename-btn${isPremium ? '' : ' skills-class-rename-btn--locked'}`}
                onClick={openRename}
                title={isPremium ? 'Rename class title' : 'Premium: rename class title'}
              >
                {isPremium ? 'Rename' : 'Rename ✦'}
              </button>
            )}
          </div>
          {renameOpen && isPremium && (
            <div className="skills-class-rename" role="group" aria-label="Custom class title">
              <input
                type="text"
                className="skills-class-rename-input"
                value={renameDraft}
                maxLength={32}
                onChange={(e) => setRenameDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveRename()
                  if (e.key === 'Escape') setRenameOpen(false)
                }}
                placeholder="Custom class title"
                aria-label="Custom class title"
              />
              <div className="skills-class-rename-actions">
                <button type="button" className="skills-class-rename-save" onClick={saveRename}>
                  Save
                </button>
                {loadout.titleOverride && (
                  <button type="button" className="skills-class-rename-reset" onClick={resetRename}>
                    Reset
                  </button>
                )}
                <button
                  type="button"
                  className="skills-class-rename-reset"
                  onClick={() => setRenameOpen(false)}
                >
                  Cancel
                </button>
              </div>
              {renameError && <p className="skills-class-rename-error" role="status">{renameError}</p>}
            </div>
          )}
          <div className="skills-loadout-chips" aria-label="Equipped paths">
            {[0, 1].map((i) => {
              const chip = pathChips[i]
              if (!chip) {
                return (
                  <span
                    key={i}
                    className="skills-loadout-chip skills-loadout-chip--empty"
                    aria-hidden="true"
                  >
                    {i === 0 ? 'Empty path' : 'Second path'}
                  </span>
                )
              }
              return (
                <button
                  key={`${chip.number}-${chip.routeId}`}
                  type="button"
                  className="skills-loadout-chip"
                  style={{ '--chip-color': chip.color }}
                  onClick={() => {
                    const num = NUMBERS.find((n) => Number(n.id) === chip.number)
                    if (num) {
                      openSeal(num)
                      setExpandedRouteId(chip.routeId)
                      setFocus({ type: 'route', routeId: chip.routeId, numId: chip.number })
                    }
                  }}
                >
                  <span aria-hidden="true">{chip.icon}</span>
                  {chip.sealLabel} · {chip.routeName}
                </button>
              )
            })}
          </div>
          {filledSlots.length === 0 && (
            <div className="skills-class-coach skills-class-coach--header" role="note">
              <p className="skills-class-coach-title">Choose your class</p>
              <p className="skills-class-coach-line">
                Open a blueprint seal → Equip a route. Optionally equip a second path.
              </p>
            </div>
          )}
          <p className="skills-thesis">{thesis}</p>
        </div>
        <div className="skills-progress" aria-label="Overall skill progress">
          <span className="skills-progress-label">PROGRESS</span>
          <div className="skills-progress-track">
            <div
              className="skills-progress-fill"
              style={{ width: `${Math.min(100, (training.done / training.total) * 100)}%` }}
            />
          </div>
          <span className="skills-progress-val">{training.done}/{training.total}</span>
        </div>
      </header>

      <div className="skills-stage-body">
        {!expanded && (
          <div ref={wrapRef} className="skills-flow-wrap">
            {filledSlots.length > 0 && (
              <p className="skills-idle-hint" aria-hidden="true">
                Blueprint seals open — locked seals are outside your destiny kit.
              </p>
            )}
            <div className="skills-grid" aria-label="Skill Tree">
              {NUMBERS.map((num) => {
                const eligible = !playerData || eligibleSeals.has(Number(num.id))
                const equippedRoute = getEquippedRouteId(num.id, loadout)
                return (
                  <SkillSeal
                    key={num.id}
                    number={num}
                    completed={getSealProgress(progress[num.id], num.id, equippedRoute)}
                    active={false}
                    seeds={seeds}
                    statValues={statValues}
                    size={sealSize}
                    onSelect={openSeal}
                    eligible={eligible}
                    equipped={equippedSealIds.has(Number(num.id))}
                    lockedReason="Not in your blueprint"
                  />
                )
              })}
            </div>
            <SkillsInspector
              open={!!lockSheet}
              slim
              color={lockSheet?.color || 'var(--gold)'}
              title={lockSheet?.label || 'Seal'}
              subtitle="Not in blueprint"
              icon="◇"
              onClose={() => setLockSheet(null)}
            >
              <p className="skills-detail-gate" role="status">
                {lockSheet?.reason || 'Not in your blueprint'}
              </p>
              <p className="skills-detail-note">
                Class paths equip only from seals on your destiny chart.
              </p>
            </SkillsInspector>
          </div>
        )}

        {expanded && (
          <div
            className={`skills-branch-wrap${inspector ? ' skills-branch-wrap--inspect' : ''}`}
            style={{ '--skill-color': expanded.color, '--flow-color': expanded.color }}
          >
            <div className="skills-branch-toolbar">
              <button type="button" className="skills-branch-back" onClick={collapse}>
                {'\u2190'} All seals
              </button>
              <span className="skills-branch-title">
                <span aria-hidden="true">{expanded.icon}</span> {expanded.label}
                {equippedSealIds.has(Number(expanded.id)) && (
                  <span className="skills-branch-equipped-tag">EQUIPPED</span>
                )}
              </span>
              {nextStepHint && (
                <span className="skills-branch-next">{nextStepHint}</span>
              )}
              {tiersRouteId && (
                <button
                  type="button"
                  className="skills-branch-collapse"
                  onClick={() => {
                    setExpandedRouteId(null)
                    setFocus(null)
                  }}
                >
                  Collapse route
                </button>
              )}
            </div>
            {gateMsg && (
              <p className="skills-branch-gate" role="status">{gateMsg}</p>
            )}
            <div className="skills-branch-canvas">
              <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                onInit={onInit}
                onNodeClick={onRfNodeClick}
                nodesDraggable={false}
                nodesConnectable={false}
                elementsSelectable={false}
                zoomOnDoubleClick={false}
                panOnScroll
                zoomOnScroll={false}
                zoomOnPinch
                panOnDrag
                preventScrolling={false}
                minZoom={zoomLock ? Math.max(0.25, zoomLock * 0.7) : 0.25}
                maxZoom={zoomLock ? Math.min(1.6, zoomLock * 1.25) : 1.6}
                proOptions={{ hideAttribution: true }}
                fitView
                fitViewOptions={{ padding: 0.2 }}
              />
            </div>

            <SkillsInspector
              open={!!inspector}
              color={inspector?.color || expanded.color}
              title={inspector?.title || ''}
              subtitle={inspector?.subtitle || ''}
              icon={inspector?.icon || '\u2726'}
              onClose={() => { setFocus(null); setGateMsg(null); setReplacePicker(null) }}
            >
              {inspector?.body}
            </SkillsInspector>
          </div>
        )}
      </div>
    </div>
  )
}
