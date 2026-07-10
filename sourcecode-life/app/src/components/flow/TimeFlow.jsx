/**
 * TimeFlow — Current Cycles (unified flow nodes)
 */
import { useState, useEffect, useMemo } from 'react'
import ReactFlow, { Background } from 'reactflow'
import 'reactflow/dist/style.css'
import { reduceToSimple, getCycleAnchor, calcPersonalYear, calcPinnacles, calcPersonalMonth, calcPersonalDay, calcFourMonthCycle, todayStr } from '../../lib/numerology'
import { useQuestEngine } from '../../hooks/useQuestEngine'
import FlowDetailPanel from './FlowDetailPanel'
import FlowProgressNode from './FlowProgressNode'
import { FLOW_NODE_HALF } from './flowNodeConstants'
import CoachMark from '../ui/CoachMark'
import MonthCheckinPanel from '../datachunks/MonthCheckinPanel'
import {
  CYCLE_MEANINGS, CYCLE_QUEST_COLORS, MONTH_NAMES,
  NUM_QUESTS, MASTER_QUESTS,
} from '../../lib/data'
import { getCycleObjectives, PINNACLE_MONTH_LENS } from '../../lib/objectives'
import { LS_DAILY_GLYPHS, getPinnacleProgress, getActiveTier } from '../../lib/questEngine'
import { resolveBlueprintNode } from '../../lib/questBlueprint'
import { completeFourMonthSeason, getMonthSeasonState, getYearSeasonState, addMonthCheckin } from '../../lib/seasonEngine'
import { getActiveMultiDayQuests } from '../../lib/numerologyQuests'

const MASTERS = new Set([11, 22, 33, 44, 55, 66, 77, 88, 99])
const ORB_CENTER_OFFSET = 52

function CycleNode({ data }) {
  const maxProgress = data.progressMax || 3
  const stagesDone = Math.min(maxProgress, data.progress || 0)
  const progressPct = maxProgress > 0 ? (stagesDone / maxProgress) * 100 : 0
  const pipStates = Array.from({ length: Math.min(maxProgress, 6) }, (_, i) => ({
    done: i < stagesDone,
    eligible: i === stagesDone,
    innate: false,
  }))

  return (
    <div className="tf-cycle-node-wrap">
      <FlowProgressNode
        color={data.colorHex}
        icon={data.icon || '◎'}
        displayNum={data.isMaster ? '' : String(reduceToSimple(data.root))}
        subtitle={data.shortLabel}
        isSelected={data.isSelected}
        isMaster={data.isMaster}
        progressPct={progressPct}
        stagesDone={stagesDone}
        pipStates={pipStates}
        fullyAligned={stagesDone >= maxProgress}
        showBadge={!data.isMaster}
        onClick={data.onClick}
        withHandles
      />
      <div className={`tf-node-caption${data.isSelected ? ' tf-node-caption--active' : ''}`}>
        {data.shortLabel}
      </div>
    </div>
  )
}

const cycleNodeTypes = { cycleNode: CycleNode }

function getQuestData(root) {
  if (MASTERS.has(root) && MASTER_QUESTS[root]) return MASTER_QUESTS[root]
  const simple = reduceToSimple(root)
  return NUM_QUESTS[simple] || NUM_QUESTS[9]
}

// ── Node positions (centered in each zone vertically + horizontally) ───────
const NODES = [
  { key: 'theme',         x: 66,  y: 38,  label: 'THEME',        icon: '🎯' },
  { key: 'pinnacle',      x: 230, y: 38,  label: 'PINNACLE',     icon: '🏔️' },
  { key: 'personalYear',  x: 66,  y: 228, label: 'YEAR',         icon: '📅' },
  { key: 'fourMonthCycle',x: 230, y: 228, label: '4-MONTH',      icon: '🔄' },
  { key: 'personalMonth', x: 66,  y: 428, label: 'MONTH',        icon: '🌙' },
  { key: 'personalDay',   x: 230, y: 428, label: 'DAY',          icon: '☀️' },
]

const LINE_PTS = NODES.map(n => `${n.x + ORB_CENTER_OFFSET},${n.y + ORB_CENTER_OFFSET}`).join(' ')

const ZONES = [
  { y: 0,   h: 180, label: 'LONG TERM',   bg: '#14100c' },
  { y: 180, h: 200, label: 'MEDIUM TERM', bg: '#16100e' },
  { y: 380, h: 200, label: 'SHORT TERM',  bg: '#181210' },
]

const ORB_COLORS = {
  theme:         { hex: '#c9a84c', glow: '#c9a84c66' },
  pinnacle:      { hex: '#c9a84c', glow: '#c9a84c66' },
  personalYear:  { hex: '#00e5cc', glow: '#00e5cc66' },
  fourMonthCycle:{ hex: '#7c3aed', glow: '#7c3aed66' },
  personalMonth: { hex: '#f472b6', glow: '#f472b666' },
  personalDay:   { hex: '#4ade80', glow: '#4ade8066' },
}

// ── Helpers ─────────────────────────────────────────────────────────────────
function getMeaning(type, root) {
  const map = CYCLE_MEANINGS[type]
  return (map && map[root]) || {}
}

function getCycleObjs(type, root, freqLevel = 1) {
  const objs = getCycleObjectives(type, root, freqLevel)
  return objs.map(o => o.text)
}

function getCycleProgress(sq, cycleType) {
  if (!sq || typeof sq !== 'object') return 0
  return Object.values(sq).filter(
    q => q && q.status === 'completed' && q.cycleType === cycleType
  ).length
}

function getDailyGlyphsDone() {
  try {
    const raw = localStorage.getItem(LS_DAILY_GLYPHS)
    if (!raw) return 0
    const state = JSON.parse(raw)
    const today = todayStr()
    if (!state || state.date !== today) return 0
    return (state.completed || []).filter(Boolean).length
  } catch { return 0 }
}

// ── TimeFlow ────────────────────────────────────────────────────────────────
export default function TimeFlow({ playerData, sideQuests: sqProp }) {
  const [selected, setSelected] = useState(null)
  const [chartReady, setChartReady] = useState(false)
  const [dailyGlyphsDone, setDailyGlyphsDone] = useState(getDailyGlyphsDone)
  const [seasonRefreshTick, setSeasonRefreshTick] = useState(0)
  const [checkinPanelOpen, setCheckinPanelOpen] = useState(false)
  const { xp } = useQuestEngine()
  const freqLevel = xp?.freqLevel || 1
  const sideQuests = sqProp && typeof sqProp === 'object' ? sqProp : {}

  const { lp, th, ex, cl, so, ou, ac, m, d, y } = playerData || {}

  useEffect(() => {
    const timer = setTimeout(() => setChartReady(true), 100)
    return () => clearTimeout(timer)
  }, [])

  // Listen for daily glyph completions
  useEffect(() => {
    const handler = () => setDailyGlyphsDone(getDailyGlyphsDone())
    window.addEventListener('scl:daily_glyphs_updated', handler)
    return () => window.removeEventListener('scl:daily_glyphs_updated', handler)
  }, [])

  const monthSeasonState = useMemo(() => {
    // Intentionally read to allow manual recompute after localStorage writes.
    seasonRefreshTick
    if (!lp?.root || !m || !d) return null
    return getMonthSeasonState(lp.root, m, d, freqLevel, playerData)
  }, [lp?.root, m, d, freqLevel, seasonRefreshTick, playerData])

  const yearSeasonState = useMemo(() => {
    // Intentionally read to allow manual recompute after localStorage writes.
    seasonRefreshTick
    if (!lp?.root || !m || !d) return null
    return getYearSeasonState(lp.root, m, d)
  }, [lp?.root, m, d, seasonRefreshTick])

  if (!playerData) return null
  if (!m || !d || !y || !lp?.root || !th?.root) return null

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentAge = currentYear - y - (
    now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d) ? 1 : 0
  )
  const { cycleStartYear } = getCycleAnchor(m, d)
  const cycleEndYear = cycleStartYear + 1
  const py = calcPersonalYear(m, d)
  const pinnacles = calcPinnacles(m, d, y, lp)
  const currentPinn = pinnacles.find((p, i) =>
    i < 3 ? currentAge >= p.startAge && currentAge <= p.endAge : currentAge >= p.startAge
  ) || pinnacles[3]
  const pinnIndex = pinnacles.indexOf(currentPinn) + 1
  const fmc = calcFourMonthCycle(m, d)
  const pm = calcPersonalMonth(m, d)
  const pd = calcPersonalDay(m, d)
  const thData = getQuestData(th.root)

  const handleCheckinSubmit = (journal, objectiveIdx) => {
    const result = addMonthCheckin(lp.root, m, d, journal, objectiveIdx)
    if (result.ok) {
      setCheckinPanelOpen(false)
      setSeasonRefreshTick(t => t + 1)
      return { ok: true }
    }
    return result
  }

  const blueprintRoots = [
    lp?.root, ex?.root, cl?.root, so?.root, ou?.root, ac?.root, th?.root,
  ].filter(Boolean).map(r => reduceToSimple(r))

  const nodeData = [
    {
      ...NODES[0], root: th.root, isMaster: MASTERS.has(th.root),
      subtitle: 'Your Life Curriculum',
      meaning: {}, color: ORB_COLORS.theme,
      title: 'THEME QUEST', typeLabel: 'THEME',
      desc: thData.desc, objectives: thData.objectives || [],
      affirmation: thData.affirmation || '',
      progress: getCycleProgress(sideQuests, 'theme'),
      aligned: blueprintRoots.includes(reduceToSimple(th.root)),
    },
    {
      ...NODES[1], root: currentPinn.root, isMaster: MASTERS.has(currentPinn.root),
      subtitle: `Pinnacle ${pinnIndex} · ${currentPinn.endAge ? `Ages ${currentPinn.startAge}–${currentPinn.endAge}` : `Age ${currentPinn.startAge}+`}`,
      detail: `Major Life Chapter · Pinnacle ${pinnIndex} of 4`,
      meaning: getMeaning('pinnacle', currentPinn.root),
      color: ORB_COLORS.pinnacle,
      title: `PINNACLE ${pinnIndex} — ACTIVE`, typeLabel: 'PINNACLE',
      desc: '', objectives: [],
      pinnDesc: CYCLE_MEANINGS.pinnacle?.[currentPinn.root],
      affirmation: 'I meet this chapter with full presence.',
      pinnacleData: getPinnacleProgress(pinnIndex, currentPinn.root),
      progress: getPinnacleProgress(pinnIndex, currentPinn.root).milestones.length,
      progressMax: getPinnacleProgress(pinnIndex, currentPinn.root).required,
      aligned: blueprintRoots.includes(reduceToSimple(currentPinn.root)),
    },
    {
      ...NODES[2], root: py.root, isMaster: MASTERS.has(py.root),
      subtitle: `${cycleStartYear}–${cycleEndYear} · Birthday to Birthday`,
      detail: `Year ${cycleStartYear}–${cycleEndYear} · 9-Year Cycle`,
      meaning: getMeaning('personalYear', py.root),
      color: ORB_COLORS.personalYear,
      title: `PERSONAL YEAR ${cycleStartYear}–${cycleEndYear} QUEST`, typeLabel: 'YEAR QUEST',
      desc: '', objectives: getCycleObjs('personalYear', py.root, freqLevel),
      affirmation: "I am aligned with my personal year frequency.",
      progress: getCycleProgress(sideQuests, 'personalYear'),
      aligned: blueprintRoots.includes(reduceToSimple(py.root)),
    },
    {
      ...NODES[3], root: fmc.root, isMaster: MASTERS.has(fmc.root),
      subtitle: `Cycle ${fmc.cycleNum}`,
      detail: `Seasonal Chapter · Cycle ${fmc.cycleNum} of 3`,
      meaning: getMeaning('fourMonthCycle', fmc.root),
      color: ORB_COLORS.fourMonthCycle,
      title: `FOUR-MONTH CYCLE ${fmc.cycleNum} QUEST`, typeLabel: 'SEASON QUEST',
      desc: '', objectives: getCycleObjs('fourMonthCycle', fmc.root, freqLevel),
      affirmation: "I work with the energy of this season.",
      progress: getCycleProgress(sideQuests, 'fourMonthCycle'),
      aligned: blueprintRoots.includes(reduceToSimple(fmc.root)),
    },
    {
      ...NODES[4], root: pm.root, isMaster: MASTERS.has(pm.root),
      subtitle: `${MONTH_NAMES[now.getMonth()] || ''} · Personal Number ${pm.root}`,
      detail: `Monthly Frequency · Cycle ${pm.monthNum} of 12`,
      meaning: getMeaning('personalMonth', pm.root),
      color: ORB_COLORS.personalMonth,
      title: `PERSONAL MONTH ${pm.monthNum} QUEST`, typeLabel: 'MONTH QUEST',
      desc: '', objectives: getCycleObjs('personalMonth', pm.root, freqLevel),
      affirmation: 'This month I act in alignment.',
      progress: monthSeasonState?.checkins?.length || getCycleProgress(sideQuests, 'personalMonth'),
      progressMax: monthSeasonState?.tierDays || 3,
      aligned: blueprintRoots.includes(reduceToSimple(pm.root)),
    },
    {
      ...NODES[5], root: pd.root, isMaster: MASTERS.has(pd.root),
      subtitle: `${MONTH_NAMES[now.getMonth()] || ''} ${now.getDate()} · Today`,
      detail: `Daily Tone · Root ${reduceToSimple(pd.root)}`,
      meaning: getMeaning('personalDay', pd.root),
      color: ORB_COLORS.personalDay,
      title: `PERSONAL DAY ${pd.root}`, typeLabel: 'DAY QUEST',
      desc: '', objectives: getCycleObjs('personalDay', pd.root, freqLevel),
      affirmation: '',
      progress: dailyGlyphsDone + getCycleProgress(sideQuests, 'personalDay'),
      aligned: blueprintRoots.includes(reduceToSimple(pd.root)),
    },
  ]

  const selNode = selected ? nodeData.find((n) => n.key === selected) : null

  const rfNodes = nodeData.map((node) => ({
    id: node.key,
    type: 'cycleNode',
    position: {
      x: node.x + ORB_CENTER_OFFSET - FLOW_NODE_HALF,
      y: node.y + ORB_CENTER_OFFSET - FLOW_NODE_HALF,
    },
    draggable: false,
    data: {
      root: node.root,
      icon: node.icon,
      shortLabel: node.label,
      colorHex: node.color.hex,
      isMaster: node.isMaster,
      progress: node.progress,
      progressMax: node.progressMax || 3,
      isSelected: selected === node.key,
      onClick: () => setSelected((prev) => (prev === node.key ? null : node.key)),
    },
  }))

  const rfEdges = nodeData.slice(0, -1).map((node, i) => ({
    id: `${node.key}-${nodeData[i + 1].key}`,
    source: node.key,
    target: nodeData[i + 1].key,
    type: 'default',
    style: { stroke: 'rgba(255,255,255,0.08)', strokeWidth: 1.5, strokeDasharray: '4 4' },
  }))

  const onNodeClick = (_event, node) => {
    setSelected((prev) => (prev === node.id ? null : node.id))
  }

  return (
    <div className="tf-wrap">
      <CoachMark storageKey="scl_coach_time_flow" title="Current Cycles" afterTour>
        Six time horizons: Theme & Pinnacle (long-term), Year & 4-Month (medium), Month & Day (now). Tap a node to see objectives.
      </CoachMark>
      {/* ── Cycle Flow Chart (unified nodes) ── */}
      <div className={`tf-chart-area tf-chart-area--flow${chartReady ? ' tf-chart-area--ready' : ''}`}>
        <div className="tf-zones-layer" aria-hidden="true">
          {ZONES.map((z, i) => (
            <div
              key={z.label}
              className={`tf-zone tf-zone--${i + 1}`}
              style={{
                top: `${(z.y / 580) * 100}%`,
                height: `${(z.h / 580) * 100}%`,
                opacity: chartReady ? 1 : 0,
                transition: `opacity 0.8s ease ${0.1 + i * 0.15}s`,
              }}
            >
              <span className="tf-zone-label">{z.label}</span>
            </div>
          ))}
        </div>
        <div className="tf-flow-wrap lqt-flow-wrap lqt-flow-wrap--compact">
          <ReactFlow
            nodes={rfNodes}
            edges={rfEdges}
            nodeTypes={cycleNodeTypes}
            onNodeClick={onNodeClick}
            fitView
            fitViewOptions={{ padding: 0.18 }}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable
            zoomOnDoubleClick={false}
            zoomOnScroll
            zoomOnPinch
            panOnDrag
            panOnScroll={false}
            preventScrolling={false}
            minZoom={0.45}
            maxZoom={1.6}
            proOptions={{ hideAttribution: true }}
          >
            <Background color="#ffffff08" gap={20} size={1} />
          </ReactFlow>
        </div>
      </div>

      {/* ── Detail Panel ── */}
      <FlowDetailPanel
        open={!!selNode}
        onClose={() => setSelected(null)}
        color={selNode?.color?.hex || '#c9a84c'}
        title={selNode?.title || ''}
        subtitle={selNode?.subtitle || ''}
        icon={selNode?.icon || '◎'}
      >
        {selNode && (
          <div className="flow-panel-content">
            {selNode.meaning.theme && (
              <div className="journal-section">
                <div className="journal-section-label">◈ THEME</div>
                <div className="journal-section-text">{selNode.meaning.theme}</div>
              </div>
            )}
            {selNode.meaning.summary && (
              <div className="journal-section">
                <div className="journal-section-label">◈ SUMMARY</div>
                <div className="journal-section-text">{selNode.meaning.summary}</div>
              </div>
            )}
            {selNode.key === 'personalYear' && yearSeasonState && (
              <div className="journal-section">
                <div className="journal-section-label">◈ YEAR SEASONS</div>
                <div className="seasons-progress-bar" style={{ marginBottom: 6 }}>
                  <div className="seasons-progress-fill" style={{
                    width: `${(yearSeasonState.monthsCompleted.length / 12) * 100}%`,
                    '--season-color': selNode.color.hex,
                  }} />
                </div>
                <div style={{ fontSize: '0.72rem', opacity: 0.45 }}>
                  {yearSeasonState.monthsCompleted.length} / 12 seasons · {yearSeasonState.journalDone ? 'Year Complete' : 'In Progress'}
                </div>
              </div>
            )}
            {selNode.desc && (
              <div className="journal-section">
                <div className="journal-section-label">◈ DESCRIPTION</div>
                <div className="journal-section-text">{selNode.desc}</div>
              </div>
            )}
            {selNode.pinnDesc && (
              <>
                <div className="journal-section">
                  <div className="journal-section-label">▲ {selNode.pinnDesc.theme}</div>
                  <p style={{ opacity: 0.7, fontSize: '0.85rem', lineHeight: 1.6, marginBottom: 0 }}>{selNode.pinnDesc.summary}</p>
                </div>
                {selNode.pinnacleData && (
                  <div className="journal-section">
                    <div className="journal-section-label">◈ MILESTONES</div>
                    <div style={{ opacity: 0.8, fontSize: '0.85rem' }}>
                      {selNode.pinnacleData.milestones.length} / {selNode.pinnacleData.required} four-month cycles complete
                    </div>
                  </div>
                )}
              </>
            )}
            {selNode.key === 'personalMonth' && PINNACLE_MONTH_LENS[currentPinn?.root] && (
              <div style={{
                fontSize: '0.72rem', color: 'var(--gold)', opacity: 0.65,
                borderLeft: '2px solid var(--gold-dim)', paddingLeft: 8, marginBottom: 12,
                fontStyle: 'italic'
              }}>
                {PINNACLE_MONTH_LENS[currentPinn.root]}
              </div>
            )}
            {selNode.key === 'personalMonth' && (() => {
              const blueprintKey = monthSeasonState?.lockedObj?.questKey
                || (playerData ? resolveBlueprintNode(playerData, pd, pm, freqLevel) : 'cl')
              const tier = getActiveTier(blueprintKey) || 1
              const tierName = ['APPRENTICE', 'ADEPT', 'MASTER'][tier - 1]
              const tierDays = monthSeasonState?.tierDays || 7
              const checkinCount = monthSeasonState?.checkins?.length || 0
              return (
                <div style={{ fontSize: '0.7rem', letterSpacing: '0.12em', color: selNode.color.hex, opacity: 0.55, marginBottom: 8, fontFamily: "'Share Tech Mono', monospace" }}>
                  ◈ {blueprintKey.toUpperCase()} · {tierName} · {tierDays}-DAY COMMITMENT
                </div>
              )
            })()}
            {selNode.key === 'personalMonth' && monthSeasonState?.lockedObj && (() => {
              const tierDays = monthSeasonState.tierDays || 7
              const checkinCount = monthSeasonState.checkins?.length || 0
              const today = todayStr()
              const checkedInToday = monthSeasonState.checkins?.some(c => c.date === today)
              const multiDay = monthSeasonState.multiDayId
                ? getActiveMultiDayQuests()[monthSeasonState.multiDayId]
                : null
              const streak = multiDay?.multiDay?.streak || checkinCount
              const canCheckin = !monthSeasonState.completed && !checkedInToday && checkinCount < tierDays
              return (
              <div className="journal-section">
                <div className="journal-section-label">◈ MONTHLY MISSION</div>
                <div className="seasons-locked-obj" style={{ '--season-color': selNode.color.hex }}>
                  <div className="seasons-locked-obj-tier">
                    {['APPRENTICE', 'ADEPT', 'MASTER'][monthSeasonState.lockedObj.tierAtLock - 1] || 'APPRENTICE'} MISSION
                  </div>
                  <div className="seasons-locked-obj-text">{monthSeasonState.lockedObj.text}</div>
                </div>
                <div className="seasons-checkins-pips" style={{ marginTop: 10 }}>
                  {Array.from({ length: tierDays }, (_, i) => {
                    const isDone = i < checkinCount
                    const isCurrent = i === checkinCount && canCheckin
                    return (
                      <div
                        key={i}
                        className={`seasons-pip seasons-pip--compact${isDone ? ' seasons-pip--done' : ''}${isCurrent ? ' seasons-pip--current' : ''}${!isDone && !isCurrent ? ' seasons-pip--pending' : ''}`}
                        style={{ '--season-color': selNode.color.hex }}
                      >
                        <span className="seasons-pip-mark">{isDone ? '✦' : String(i + 1)}</span>
                      </div>
                    )
                  })}
                </div>
                <div className="seasons-checkins-stats" style={{ marginTop: 8 }}>
                  <span>{checkinCount}/{tierDays} sealed</span>
                  <span>streak {streak}/{tierDays}</span>
                </div>
                {canCheckin && (
                  <button
                    type="button"
                    className="seasons-checkin-btn seasons-checkin-btn--compact"
                    onClick={() => setCheckinPanelOpen(true)}
                    style={{ '--season-color': selNode.color.hex, marginTop: 10 }}
                  >
                    ▶ CHECK IN TODAY
                  </button>
                )}
                {checkedInToday && !monthSeasonState.completed && (
                  <div className="seasons-checkin-status seasons-checkin-status--done" style={{ marginTop: 8 }}>
                    ✦ Checked in today
                  </div>
                )}
                {monthSeasonState.completed && (
                  <div className="seasons-checkin-status" style={{ marginTop: 8 }}>✦ MONTH COMPLETE</div>
                )}
              </div>
              )
            })()}
            {selNode.key === 'fourMonthCycle' && (
              <div className="journal-section" style={{ marginBottom: 12 }}>
                <button
                  onClick={() => {
                    const now = new Date()
                    const res = completeFourMonthSeason(lp.root, now.getMonth() + 1, now.getDate(), pinnIndex, currentPinn.root)
                    if (res.ok) setSelected(null)
                  }}
                  style={{
                    padding: '6px 12px', fontSize: '0.8rem', cursor: 'pointer',
                    background: 'var(--gold)', color: '#0a0a12', border: 'none', borderRadius: '2px',
                    fontWeight: 600, opacity: 0.9
                  }}
                >
                  Complete Season
                </button>
              </div>
            )}
            {selNode.objectives?.length > 0 && (
              <div className="journal-section">
                <div className="journal-section-label">◈ {selNode.key === 'pinnacle' ? 'CHAPTER THEMES' : 'QUEST OBJECTIVES'}</div>
                <div className="quest-tile-objs-styled">
                  {selNode.objectives.map((obj, i) => (
                    <div key={i} className="quest-objective-item" style={{
                      borderColor: (selNode.color?.hex || '#c9a84c') + '44',
                      background: selNode.key === 'pinnacle' ? 'rgba(201,168,76,0.04)' : 'transparent',
                      opacity: selNode.key === 'pinnacle' ? 0.8 : 1,
                    }}>
                      <div className="quest-obj-check" style={{
                        borderColor: selNode.color?.hex || '#c9a84c',
                        color: selNode.color?.hex || '#c9a84c',
                        fontStyle: selNode.key === 'pinnacle' ? 'italic' : 'normal',
                        fontSize: selNode.key === 'pinnacle' ? '0.65rem' : 'inherit',
                        opacity: selNode.key === 'pinnacle' ? 0.5 : 1,
                      }}>
                        {selNode.key === 'pinnacle' ? '◈' : i + 1}
                      </div>
                      <div className="quest-obj-text">{obj}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {selNode.affirmation && <div className="journal-affirmation">{selNode.affirmation}</div>}
          </div>
        )}
      </FlowDetailPanel>

      {/* Month Checkin Panel */}
      <MonthCheckinPanel
        open={checkinPanelOpen}
        monthTheme={pm.root ? getMeaning('personalMonth', pm.root).theme : 'This Month'}
        monthRoot={pm.root}
        objectives={monthSeasonState?.objectives || []}
        color={CYCLE_QUEST_COLORS.personalMonth?.hex || 'var(--rose)'}
        checkinCount={monthSeasonState?.checkins?.length || 0}
        tierDays={monthSeasonState?.tierDays || 7}
        streak={
          monthSeasonState?.multiDayId
            ? (getActiveMultiDayQuests()[monthSeasonState.multiDayId]?.multiDay?.streak
              || monthSeasonState?.checkins?.length || 0)
            : (monthSeasonState?.checkins?.length || 0)
        }
        onClose={() => setCheckinPanelOpen(false)}
        onSubmit={handleCheckinSubmit}
      />

      {/* Full Timecycle Button */}
      <button
        onClick={() => window.Native_onOpenTab?.('profile', 'spiral')}
        style={{
          width: '100%',
          padding: '10px 16px',
          margin: '16px 0 0 0',
          fontFamily: "'Share Tech Mono', monospace",
          fontSize: '11px',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--text-light)',
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '6px',
          cursor: 'pointer',
          transition: 'all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)',
        }}
        onMouseEnter={(e) => {
          e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'
          e.target.style.borderColor = 'rgba(255, 255, 255, 0.25)'
          e.target.style.transform = 'translateY(-1px)'
        }}
        onMouseLeave={(e) => {
          e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'
          e.target.style.borderColor = 'rgba(255, 255, 255, 0.15)'
          e.target.style.transform = 'translateY(0)'
        }}
      >
        ▶ Full Timecycle
      </button>
    </div>
  )
}
