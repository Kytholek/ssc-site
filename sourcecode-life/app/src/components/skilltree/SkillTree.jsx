/**
 * SkillTree — progressive paths:
 * 3x3 seals -> root + 3 routes -> expand one active route's tiers.
 * Class loadout: equip up to 2 blueprint-eligible routes.
 * Compact docked inspector. Equip / Start CTA.
 */
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import ReactFlow, { MarkerType } from 'reactflow'
import 'reactflow/dist/style.css'
import FlowProgressNode from '../flow/FlowProgressNode'
import { FLOW_NODE_SIZE } from '../flow/flowNodeConstants'
import {
  NUMBERS,
  MASTERS_SEAL,
  TIER_LABELS,
  THRESHOLDS,
  getSealProgress,
  getRouteStages,
  canStartRoute,
  startRoute,
  isRouteStageUnlocked,
  getTrainingProgress,
  getNextTierAction,
  getRouteDef,
  getNumberDef,
  migrateProgressToV3,
  resolveRouteStageQuests,
} from '../../lib/skillRoutes'
import { getHeldMasterRoots } from '../../lib/numerologyProfile'
import { pinSkillQuestToToday } from '../../lib/numerologyQuests'
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

const CODEX_AXES = [
  { id: 'mind', label: 'Mind' },
  { id: 'body', label: 'Body' },
  { id: 'spirit', label: 'Spirit' },
]

/** Muted fills for the skill board only. Neon SKILL_TREE colors stay for the rest of the app. */
const CODEX_COLORS = {
  1: '#7d9a62',
  2: '#c4a888',
  3: '#8aab8e',
  4: '#b88888',
  5: '#c4a15a',
  6: '#b88888',
  7: '#8aab8e',
  8: '#c4a888',
  9: '#8b78b0',
}

function codexColor(id) {
  return CODEX_COLORS[Number(id)] || '#c4a15a'
}

function routeOnChart(route, heldMasters, trainableOnly) {
  if (!trainableOnly || !route?.masterRoot) return true
  return heldMasters.has(Number(route.masterRoot))
}

function CodexLabel({ axis, edge }) {
  return (
    <span className={`skills-codex-label skills-codex-label--${edge} skills-codex-label--${axis.id}`}>
      {axis.label}
    </span>
  )
}
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
  const routeY = 170
  const tierStartY = 320
  const tierGapY = 136
  const routeSpread = routes.length > 3 ? 118 : 160
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
  const trainableOnly = !!number.trainableOnly
  const fullyAligned = trainableOnly
    ? stagesDone === 3
    : stagesDone === 3 && statVal >= THRESHOLDS.stage3
  const locked = !eligible

  const eligiblePips = trainableOnly
    ? [true, true, true]
    : [
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
    <div
      className={`skills-grid-cell${equipped ? ' skills-grid-cell--equipped' : ''}${locked ? ' skills-grid-cell--locked' : ''}`}
      style={equipped ? { '--seal-size': `${size}px` } : undefined}
    >
      <FlowProgressNode
        color={codexColor(number.id)}
        icon={number.icon}
        displayNum={number.displayNum != null ? number.displayNum : number.id}
        label={number.label}
        subtitle={locked ? (lockedReason || 'Not in blueprint') : number.subtitle}
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
        ariaLabel={`${number.label}${equipped ? ', equipped' : ''}${locked ? `, ${lockedReason || 'not in blueprint'}` : ''}${active ? ', selected' : ''}`}
        ariaPressed={active}
      />
      {equipped && !locked && (
        <span className="skills-seal-equip-badge" aria-hidden="true">CLASS</span>
      )}
    </div>
  )
}

function BranchFlowNode({ data }) {
  const entering = typeof data.enterDelay === 'number'
  return (
    <div
      className={[
        'skills-branch-node',
        data.caption ? 'skills-branch-node--captioned' : '',
        data.rare ? 'skills-branch-node--rare' : '',
        entering ? 'skills-branch-node--enter' : '',
      ].filter(Boolean).join(' ')}
      style={{
        width: data.size,
        height: data.size,
        ...(entering ? { '--enter-delay': `${data.enterDelay}ms` } : null),
      }}
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
          {data.tag ? <span className="skills-route-tier"> · {data.tag}</span> : null}
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

function SkillsInspector({
  open, color, title, subtitle, icon, onClose, children, slim = false, contentKey = 'sheet',
}) {
  const reduceMotion = useReducedMotion()
  const swap = reduceMotion
    ? { duration: 0 }
    : { duration: 0.18, ease: 'easeOut' }
  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          className={`skills-inspector${slim ? ' skills-inspector--slim' : ''}`}
          style={{ '--skill-color': color, '--flow-color': color }}
          initial={{ y: '100%', opacity: 0.6 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'tween', duration: reduceMotion ? 0 : 0.22, ease: 'easeOut' }}
          role="dialog"
          aria-label={title}
        >
          <div className="skills-inspector-handle" aria-hidden="true" />
          <div className="skills-inspector-header">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div
                key={contentKey}
                className="skills-inspector-heading"
                initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? { opacity: 1 } : { opacity: 0, y: -4 }}
                transition={swap}
              >
                <span className="skills-inspector-icon" aria-hidden="true">{icon}</span>
                <div className="skills-inspector-meta">
                  <div className="skills-inspector-title">{title}</div>
                  {subtitle && <div className="skills-inspector-sub">{subtitle}</div>}
                </div>
              </motion.div>
            </AnimatePresence>
            <button type="button" className="skills-inspector-close" onClick={onClose} aria-label="Close">
              {'\u2715'}
            </button>
          </div>
          <div className="skills-inspector-body">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div
                key={contentKey}
                className="skills-inspector-body-swap"
                initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? { opacity: 1 } : { opacity: 0, y: -6 }}
                transition={swap}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}

function pinRouteQuest(spec, playerData) {
  const result = pinSkillQuestToToday(spec, playerData)
  const msg = result.ok
    ? (result.already ? 'Already in today’s journal' : 'Pinned to today’s journal')
    : (result.error || 'Could not pin quest')
  try {
    window.dispatchEvent(new CustomEvent('scl:xp_toast', {
      detail: { msg, color: result.ok ? 'var(--teal)' : 'var(--rose)' },
    }))
  } catch { /* intentional */ }
  return result
}

function RouteQuestItems({ quests, done, canPin, specBase, playerData }) {
  return (
    <ul className="skills-detail-quests">
      {quests.map((q, qi) => (
        <li key={qi} className={done ? 'is-done' : 'skills-quest-line'}>
          <span>{q}</span>
          {canPin && !done && (
            <button
              type="button"
              className="skills-pin-today"
              onClick={() => pinRouteQuest({ ...specBase, questIdx: qi, questText: q }, playerData)}
            >
              Do this today
            </button>
          )}
        </li>
      ))}
    </ul>
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
  const reduceMotion = !!useReducedMotion()
  const [sealSize, setSealSize] = useState(FLOW_NODE_SIZE)
  const measureRaf = useRef(0)
  const [expandedRouteId, setExpandedRouteId] = useState(null)
  const [focus, setFocus] = useState(null)
  const [gateMsg, setGateMsg] = useState(null)
  const [flowReady, setFlowReady] = useState(0)
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
  const expanded = activeNode ? getNumberDef(activeNode.id) : null
  const numProgress = expanded
    ? progress[expanded.id] || { activeRoutes: [], routes: {} }
    : null

  const training = getTrainingProgress(progress)
  const eligibleSeals = useMemo(
    () => getEligibleSeals(playerData, freqLevel),
    [playerData, freqLevel],
  )
  const heldMasters = useMemo(
    () => getHeldMasterRoots(playerData),
    [playerData],
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
      if (!routeOnChart(route, heldMasters, expanded.trainableOnly)) continue
      const active = (numProgress.activeRoutes || []).includes(route.id)
      if (!active) continue
      const next = getNextTierAction(expanded.id, route.id, numProgress, statValues, seeds)
      if (next) {
        if (tiersRouteId === route.id) return { kind: 'tier', ...next }
        return { kind: 'route', routeId: route.id }
      }
    }
    for (const route of expanded.routes) {
      if (!routeOnChart(route, heldMasters, expanded.trainableOnly)) continue
      const gate = canStartRoute(numProgress, expanded.id, route.id)
      if (gate.ok && gate.reason !== 'active') {
        return { kind: 'route', routeId: route.id }
      }
    }
    return null
  }, [expanded, numProgress, tiersRouteId, seeds, statValues, heldMasters])

  const openSeal = useCallback((number, opts = {}) => {
    if (opts.locked) {
      setLockSheet({
        label: number.label,
        color: codexColor(number.id),
        subtitle: number.subtitle,
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
      const grid = el.querySelector('.skills-grid')
      const gw = grid?.clientWidth || w
      const gh = grid?.clientHeight || h
      const label = 46
      const padX = 24
      const padY = 12
      const gapX = 12
      const gapY = 18
      const header = 18
      const cellW = (gw - label - padX - gapX * 2) / 3
      const cellH = (gh - header - padY - gapY * 2) / 3
      const next = Math.max(68, Math.min(108, Math.floor(Math.min(cellW, cellH) * 0.78)))
      setSealSize((prev) => (Math.abs(prev - next) < 2 ? prev : next))
    }

    const schedule = () => {
      if (measureRaf.current) cancelAnimationFrame(measureRaf.current)
      measureRaf.current = requestAnimationFrame(measure)
    }

    measure()
    const ro = new ResizeObserver(schedule)
    ro.observe(el)
    const grid = el.querySelector('.skills-grid')
    if (grid) ro.observe(grid)
    return () => {
      ro.disconnect()
      if (measureRaf.current) cancelAnimationFrame(measureRaf.current)
    }
  }, [expanded])

  const tryStartRoute = useCallback((routeId) => {
    if (!expanded || !setCompleted) return { ok: false, error: 'Unavailable' }
    const route = expanded.routes.find((r) => r.id === routeId)
    if (route && !routeOnChart(route, heldMasters, expanded.trainableOnly)) {
      return { ok: false, error: `${route.masterRoot} is not on your chart` }
    }
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
  }, [expanded, numProgress, progress, setCompleted, heldMasters])

  const onBranchNode = useCallback((payload) => {
    if (!expanded) return
    setGateMsg(null)

    if (payload.type === 'root') {
      setFocus(null)
      setExpandedRouteId(null)
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

    const sealColor = codexColor(expanded.id)
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
      width: ROOT_SIZE,
      height: ROOT_SIZE,
      draggable: false,
      selectable: false,
      data: {
        color: sealColor,
        icon: expanded.icon,
        displayNum: expanded.displayNum != null ? expanded.displayNum : expanded.id,
        label: expanded.label,
        caption: '',
        size: ROOT_SIZE,
        isSelected: selectedId === 'root',
        progressPct: (sealStages / 3) * 100,
        stagesDone: sealStages,
        pipStates: [0, 1, 2].map((i) => ({
          done: sealDone[i],
          eligible: expanded.trainableOnly
            || i === 0
            || innateStages[i]
            || statVal >= (i === 1 ? THRESHOLDS.stage2 : THRESHOLDS.stage3),
          innate: innateStages[i],
        })),
        innateGlow: !!innateStages[0],
        fullyAligned: expanded.trainableOnly
          ? sealStages === 3
          : sealStages === 3 && statVal >= THRESHOLDS.stage3,
        showPips: true,
        showBadge: true,
        showProgressArc: true,
        ariaLabel: `${expanded.label} root`,
        rare: !!expanded.trainableOnly,
        onClick: () => onBranchNode({ type: 'root' }),
      },
    })

    expanded.routes.forEach((route, ri) => {
      const routeId = route.id
      const stages = getRouteStages(numProgress, expanded.id, routeId)
      const done = stages.filter(Boolean).length
      const isActive = (numProgress.activeRoutes || []).includes(routeId)
      const chartLocked = !routeOnChart(route, heldMasters, expanded.trainableOnly)
      const gate = canStartRoute(numProgress, expanded.id, routeId)
      const gated = chartLocked || (!isActive && !gate.ok)
      const routePos = layout[`route:${routeId}`]
      const nodeId = `route:${routeId}`
      const isNextRoute = nextAction?.kind === 'route' && nextAction.routeId === routeId

      nodesOut.push({
        id: nodeId,
        type: 'branch',
        position: { x: routePos.x - ROUTE_HALF, y: routePos.y - ROUTE_HALF },
        width: ROUTE_SIZE,
        height: ROUTE_SIZE,
        draggable: false,
        selectable: false,
        data: {
          color: gated ? '#666680' : sealColor,
          icon: ROUTE_ICONS[ri % ROUTE_ICONS.length],
          displayNum: '',
          label: '',
          caption: route.name,
          size: ROUTE_SIZE,
          shape: 'square',
          isSelected: selectedId === nodeId || expandedRouteId === routeId,
          locked: chartLocked,
          progressPct: (done / 3) * 100,
          stagesDone: done,
          showPips: false,
          showBadge: false,
          showProgressArc: !gated && done > 0,
          isNextAction: isNextRoute,
          enterDelay: reduceMotion ? undefined : (ri + 1) * 90,
          ariaLabel: chartLocked
            ? `${route.name} route, ${route.masterRoot} is not on your chart`
            : gated
              ? `${route.name} route, locked`
              : `${route.name} route`,
          rare: !!expanded.trainableOnly,
          onClick: () => onBranchNode({ type: 'route', routeId }),
        },
      })

      edgesOut.push({
        id: `e-root-${routeId}`,
        source: 'root',
        target: nodeId,
        type: 'smoothstep',
        animated: isNextRoute && !reduceMotion,
        style: {
          stroke: isActive ? `${sealColor}99` : 'rgba(255,255,255,0.18)',
          strokeWidth: isActive ? 2 : 1.25,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 14,
          height: 14,
          color: isActive ? sealColor : 'rgba(255,255,255,0.25)',
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
          width: TIER_SIZE,
          height: TIER_SIZE,
          draggable: false,
          selectable: false,
          data: {
            color: isNextTier ? sealColor : tierColor,
            icon: isDone ? '\u2713' : String(stage.stage),
            displayNum: '',
            label: '',
            caption: stage.name,
            tag: expanded.trainableOnly ? '' : tierLabel,
            size: TIER_SIZE,
            isSelected: selectedId === tierId,
            locked: tierLocked && !isNextTier,
            progressPct: isDone ? 100 : 0,
            stagesDone: isDone ? 1 : 0,
            showPips: false,
            showBadge: false,
            showProgressArc: isDone,
            isNextAction: isNextTier,
            enterDelay: reduceMotion ? undefined : si * 70,
            ariaLabel: `${route.name} ${stage.name}, ${tierLabel}`,
            onClick: () => onBranchNode({ type: 'tier', routeId, stageIdx: si }),
          },
        })

        const prevId = si === 0 ? nodeId : `tier:${routeId}:${si - 1}`
        const flowToNext = isNextTier && !reduceMotion
        edgesOut.push({
          id: `e-${prevId}-${tierId}`,
          source: prevId,
          target: tierId,
          type: 'smoothstep',
          animated: flowToNext,
          style: {
            stroke: isDone
              ? `${tierColor}aa`
              : isNextTier
                ? `${sealColor}88`
                : (isActive ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.1)'),
            strokeWidth: isDone || isNextTier ? 1.75 : 1.1,
            strokeDasharray: flowToNext || unlocked || isDone ? undefined : '4 4',
          },
        })
      })
    })

    return { nodes: nodesOut, edges: edgesOut }
  }, [
    expanded, layout, numProgress, selectedId, seeds, statValues,
    onBranchNode, tiersRouteId, expandedRouteId, nextAction, loadout, reduceMotion,
    heldMasters,
  ])

  const onInit = useCallback((rf) => {
    rfRef.current = rf
    setFlowReady((n) => n + 1)
  }, [])

  const expandedId = expanded?.id ?? null
  useEffect(() => {
    if (!expandedId || !rfRef.current) return
    const rf = rfRef.current
    const duration = reduceMotion ? 0 : 480
    const t = requestAnimationFrame(() => {
      rf.setMinZoom(0.15)
      rf.setMaxZoom(1.6)
      rf.fitView({ padding: 0.2, duration, includeHiddenNodes: false })
    })
    return () => cancelAnimationFrame(t)
  }, [expandedId, tiersRouteId, reduceMotion, flowReady])

  const inspector = useMemo(() => {
    if (!expanded || !focus || !numProgress) return null

    const sealColor = codexColor(expanded.id)
    const sealEligible = isSealEligible(expanded.id, playerData, freqLevel)

    if (focus.type === 'root') {
      return {
        color: sealColor,
        title: expanded.label,
        subtitle: expanded.subtitle,
        icon: expanded.icon,
        body: (
          <>
            <p className="skills-detail-lead">
              {expanded.trainableOnly
                ? 'Four master paths. Train the ones on your chart. This branch does not take a class slot.'
                : `${expanded.subtitle}. Three paths — equip one as your class.`}
            </p>
            {expanded.routes.map((route) => (
              <div key={route.id} className="skills-route-tier-preview">
                <button
                  type="button"
                  className="skills-cross-train-link"
                  onClick={() => {
                    setExpandedRouteId(route.id)
                    setFocus({ type: 'route', routeId: route.id, numId: expanded.id })
                  }}
                >
                  {route.name}
                  {expanded.trainableOnly && route.masterRoot
                    ? (routeOnChart(route, heldMasters, true) ? ` · ${route.masterRoot}` : ` · ${route.masterRoot} locked`)
                    : (route.classNoun ? ` · ${route.classNoun}` : '')}
                </button>
                {route.blurb && <p className="skills-detail-note">{route.blurb}</p>}
              </div>
            ))}
          </>
        ),
      }
    }

    if (focus.type === 'route') {
      const route = expanded.routes.find((r) => r.id === focus.routeId)
      if (!route) return null
      const stages = getRouteStages(numProgress, expanded.id, route.id)
      const active = (numProgress.activeRoutes || []).includes(route.id)
      const chartLocked = !routeOnChart(route, heldMasters, expanded.trainableOnly)
      const gate = canStartRoute(numProgress, expanded.id, route.id)
      const equipped = isRouteEquipped(expanded.id, route.id, loadout)
      const equipSlotIdx = findLoadoutSlotIndex(expanded.id, route.id, loadout)
      return {
        color: sealColor,
        title: route.name,
        subtitle: route.blurb || route.name,
        icon: equipped ? '\u265A' : '\u25C8',
        body: (
          <>
            <p className="skills-detail-note">
              {expanded.trainableOnly
                ? (chartLocked
                  ? `${route.masterRoot} is not on your chart.`
                  : active
                    ? `Training · ${stages.filter(Boolean).length}/3 stages. This path does not take a class slot.`
                    : 'Train this path. It does not take a class slot.')
                : equipped
                  ? `Equipped class path · ${stages.filter(Boolean).length}/3 tiers`
                  : active
                    ? `Training · ${stages.filter(Boolean).length}/3 tiers — equip to focus dailies`
                    : 'Preview the path, then equip it as a class specialization.'}
            </p>
            {!expanded.trainableOnly && !sealEligible && (
              <p className="skills-detail-gate" role="status">Not in your blueprint</p>
            )}
            {chartLocked && (
              <p className="skills-detail-gate" role="status">{route.masterRoot} is not on your chart</p>
            )}
            {!expanded.trainableOnly && sealEligible && !equipped && (
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
                {loadout.slots.map((slot, i) => {
                  const slotSeal = slot
                    ? NUMBERS.find((n) => Number(n.id) === slot.number)
                    : null
                  const slotRoute = slot ? getRouteDef(slot.number, slot.routeId) : null
                  return (
                    <button
                      key={i}
                      type="button"
                      className="skills-replace-slot"
                      onClick={() => tryEquipRoute(route.id, i)}
                    >
                      Slot {i === 0 ? 'A' : 'B'}
                      {slot
                        ? ` — ${slotSeal?.label || slot.number} · ${slotRoute?.name || 'Path'}`
                        : ' (empty)'}
                    </button>
                  )
                })}
                <button
                  type="button"
                  className="skills-detail-cta skills-detail-cta--ghost"
                  onClick={() => setReplacePicker(null)}
                >
                  Cancel
                </button>
              </div>
            )}
            {expanded.trainableOnly && !chartLocked && !active && gate.ok && (
              <button
                type="button"
                className="skills-detail-cta"
                onClick={() => {
                  const res = tryStartRoute(route.id)
                  if (!res.ok) setGateMsg(res.error)
                }}
              >
                Start training
              </button>
            )}
            {!expanded.trainableOnly && !active && gate.ok && sealEligible && (
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
            <p className="skills-detail-kicker">Stages</p>
            {(() => {
              const nextIdx = route.stages.findIndex((_, i) => (
                !stages[i] && active && isRouteStageUnlocked(
                  expanded.id, route.id, i, numProgress, statValues, seeds,
                )
              ))
              return route.stages.map((s, i) => {
              const done = !!stages[i]
              const state = done ? 'done' : i === nextIdx ? 'next' : 'locked'
              return (
                <button
                  key={s.stage}
                  type="button"
                  className={`skills-stage-step skills-stage-step--${state}`}
                  onClick={() => onBranchNode({ type: 'tier', routeId: route.id, stageIdx: i })}
                >
                  <span className="skills-stage-step-name">{s.name}</span>
                  <span className="skills-stage-step-state">{state}</span>
                  {s.blurb && <span className="skills-stage-step-blurb">{s.blurb}</span>}
                </button>
              )
              })
            })()}
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
        const prevName = route.stages[focus.stageIdx - 1]?.name
        lockParts.push(prevName ? `Finish ${prevName} first` : 'Finish the previous stage first')
      }
      if (!expanded.trainableOnly && threshold && !innateStages[focus.stageIdx] && statVal < threshold) {
        lockParts.push(`Stat ${statVal} of ${threshold}`)
      }
      return {
        color: unlocked || isDone ? TIER_COLORS[stage.stage] : sealColor,
        title: stage.name,
        subtitle: route.name,
        icon: isDone ? '\u2713' : String(stage.stage),
        body: (
          <>
            {stage.blurb && <p className="skills-detail-lead">{stage.blurb}</p>}
            {!unlocked && (
              <p className="skills-detail-gate" role="status">
                {lockParts.join(' · ') || 'Locked'}
              </p>
            )}
            {isDone && <p className="skills-detail-note">Tier complete.</p>}
            {unlocked && !isDone && (
              <p className="skills-detail-note">Next up — complete these in the world.</p>
            )}
            <p className="skills-detail-kicker">Quests</p>
            <RouteQuestItems
              quests={resolveRouteStageQuests(expanded.id, route.id, focus.stageIdx, stage.quests || [])}
              done={isDone}
              canPin={unlocked && !isDone}
              playerData={playerData}
              specBase={{
                number: expanded.trainableOnly ? expanded.id : Number(expanded.id),
                numberLabel: expanded.label,
                routeId: route.id,
                routeName: route.name,
                classNoun: route.classNoun,
                stage: stage.stage,
                stageIdx: focus.stageIdx,
                stageName: stage.name,
              }}
            />
            <p className="skills-detail-note">
              {expanded.trainableOnly
                ? 'Pin a line to today’s journal. Completing it fills this stage.'
                : 'Pin a line to today’s journal. Matching class quests still fill this tier.'}
            </p>
          </>
        ),
      }
    }

    return null
  }, [
    expanded, focus, numProgress, seeds, statValues, tryStartRoute,
    tryEquipRoute, tryUnequip, loadout, replacePicker, playerData, freqLevel,
    openSeal, onBranchNode, heldMasters,
  ])

  const thesis = !expanded
    ? (filledSlots.length
      ? `${classTitle} — select a seal to train.`
      : 'Equip up to two blueprint paths as your class.')
    : expanded.trainableOnly
      ? (heldMasters.size
        ? (tiersRouteId
          ? `Masters — ${expanded.routes.find((r) => r.id === tiersRouteId)?.name || 'path'}`
          : 'Masters — train a path on your chart.')
        : 'Masters — no master number on your chart.')
      : !isSealEligible(expanded.id, playerData, freqLevel)
      ? `${expanded.label} — not in your blueprint.`
      : tiersRouteId
        ? `${expanded.label.charAt(0)}${expanded.label.slice(1).toLowerCase()} — ${expanded.routes.find((r) => r.id === tiersRouteId)?.name || 'path'}`
        : `${expanded.label.charAt(0)}${expanded.label.slice(1).toLowerCase()} — pick a path.`

  const focusedStageName = focus?.type === 'tier'
    ? expanded?.routes.find((r) => r.id === focus.routeId)?.stages?.[focus.stageIdx]?.name
    : null
  const nextStageName = nextAction?.kind === 'tier'
    ? expanded?.routes.find((r) => r.id === nextAction.routeId)?.stages?.[nextAction.stageIdx]?.name
    : null
  const statGate = (() => {
    if (!expanded || !tiersRouteId || focusedStageName || nextAction?.kind === 'tier') return null
    const route = expanded.routes.find((r) => r.id === tiersRouteId)
    if (!route) return null
    const stages = getRouteStages(numProgress, expanded.id, tiersRouteId)
    const innate = seeds?.[expanded.id] || [false, false, false]
    const statVal = statValues?.[expanded.id] || 0
    for (let i = 0; i < route.stages.length; i++) {
      if (stages[i]) continue
      if (isRouteStageUnlocked(expanded.id, tiersRouteId, i, numProgress, statValues, seeds)) return null
      const threshold = i === 1 ? THRESHOLDS.stage2 : i === 2 ? THRESHOLDS.stage3 : null
      const prevDone = i === 0 || !!stages[i - 1]
      if (threshold && prevDone && !innate[i] && statVal < threshold) {
        return { name: route.stages[i].name, threshold }
      }
      return null
    }
    return null
  })()
  const nextStepHint = focusedStageName
    ? focusedStageName
    : nextAction?.kind === 'tier'
      ? `Next: ${nextStageName || 'stage'}`
      : statGate
        ? `${statGate.name} needs stat ${statGate.threshold}`
        : nextAction
          ? 'Next: open or equip a route'
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
                  style={{ '--chip-color': codexColor(chip.number) }}
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
        <AnimatePresence initial={false}>
        {!expanded ? (
          <motion.div
            key="seals"
            ref={wrapRef}
            className="skills-flow-wrap"
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.94, pointerEvents: 'none' }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
          >
            {filledSlots.length > 0 && (
              <p className="skills-idle-hint" aria-hidden="true">
                Blueprint seals open — locked seals are outside your destiny kit.
              </p>
            )}
            <div className="skills-board">
            <div className="skills-grid" aria-label="Skill Tree">
              <span className="skills-codex-corner" aria-hidden="true" />
              {CODEX_AXES.map((axis) => (
                <CodexLabel key={`col-${axis.id}`} axis={axis} edge="col" />
              ))}
              {NUMBERS.map((num, i) => {
                const eligible = !playerData || eligibleSeals.has(Number(num.id))
                const equippedRoute = getEquippedRouteId(num.id, loadout)
                const seal = (
                  <SkillSeal
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
                if (i % 3 !== 0) return <Fragment key={num.id}>{seal}</Fragment>
                return (
                  <Fragment key={num.id}>
                    <CodexLabel axis={CODEX_AXES[Math.floor(i / 3)]} edge="row" />
                    {seal}
                  </Fragment>
                )
              })}
            </div>
            <div className="skills-masters-band">
              <div className="skills-masters-rule" aria-hidden="true">
                <span>✦</span>
              </div>
              <div className="skills-masters-row">
                <div className="skills-masters-seal">
                  <SkillSeal
                    number={MASTERS_SEAL}
                    completed={getSealProgress(progress.masters, 'masters', null)}
                    active={false}
                    seeds={seeds}
                    statValues={statValues}
                    size={Math.min(sealSize, 68)}
                    onSelect={openSeal}
                    eligible={!playerData || heldMasters.size > 0}
                    equipped={false}
                    lockedReason="No master number on your chart"
                  />
                  {(!playerData || heldMasters.size === 0) && (
                    <span className="skills-masters-caption">No master number on your chart</span>
                  )}
                </div>
              </div>
            </div>
            </div>
            <SkillsInspector
              open={!!lockSheet}
              slim
              color={lockSheet?.color || 'var(--gold)'}
              title={lockSheet?.label || 'Seal'}
              subtitle={lockSheet?.subtitle || 'Not in blueprint'}
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
          </motion.div>
        ) : (
          <motion.div
            key="branch"
            className={`skills-branch-wrap${inspector ? ' skills-branch-wrap--inspect' : ''}`}
            style={{ '--skill-color': codexColor(expanded.id), '--flow-color': codexColor(expanded.id) }}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12, pointerEvents: 'none' }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
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
                minZoom={tiersRouteId ? 0.15 : 0.25}
                maxZoom={1.6}
                proOptions={{ hideAttribution: true }}
              />
            </div>

            <SkillsInspector
              open={!!inspector}
              contentKey={focusKey(focus) || 'sheet'}
              color={inspector?.color || codexColor(expanded.id)}
              title={inspector?.title || ''}
              subtitle={inspector?.subtitle || ''}
              icon={inspector?.icon || '\u2726'}
              onClose={() => { setFocus(null); setGateMsg(null); setReplacePicker(null) }}
            >
              {inspector?.body}
            </SkillsInspector>
          </motion.div>
        )}
        </AnimatePresence>
      </div>
    </div>
  )
}
