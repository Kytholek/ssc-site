import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getSkillTreeTierObjectives, SKILL_OBJECTIVES } from '../../lib/objectives';
import FlowProgressNode from '../flow/FlowProgressNode';
import { FLOW_NODE_SIZE } from '../flow/flowNodeConstants';

const TIER_MAP = { 1: 'initiate', 2: 'consistency', 3: 'mastery' }

function _skillText(numId, difficulty) {
	const tier = TIER_MAP[difficulty]
	if (tier) {
		const objs = getSkillTreeTierObjectives(Number(numId), tier)
		if (objs.length) return objs.map(o => o.text)
	}
	const obj = SKILL_OBJECTIVES[Number(numId)]?.find(o => o.difficulty === difficulty)
	return obj ? [obj.text] : ['(No objective defined)']
}

export const NUMBERS = [
	{
		id: "1", label: "POWER", subtitle: "Action / Initiative", icon: "▲", color: "#FF4D00", glow: "#FF4D0066",
		stages: [
			{ stage: 1, name: "Act Without Delay",  quests: _skillText("1", 1), unlock: null },
			{ stage: 2, name: "Act Consistently",    quests: _skillText("1", 2), unlock: { prevStage: true } },
			{ stage: 3, name: "Initiate Naturally",  quests: _skillText("1", 3), unlock: { prevStage: true } },
		],
	},
	{
		id: "2", label: "SENSITIVITY", subtitle: "Relationships / Connection", icon: "◎", color: "#00C9FF", glow: "#00C9FF66",
		stages: [
			{ stage: 1, name: "Reach Out",              quests: _skillText("2", 1), unlock: null },
			{ stage: 2, name: "Stay Engaged",            quests: _skillText("2", 2), unlock: { prevStage: true } },
			{ stage: 3, name: "Maintain Relationships",  quests: _skillText("2", 3), unlock: { prevStage: true } },
		],
	},
	{
		id: "3", label: "EXPRESSION", subtitle: "Communication / Creativity", icon: "✦", color: "#FFB800", glow: "#FFB80066",
		stages: [
			{ stage: 1, name: "Express Freely",        quests: _skillText("3", 1), unlock: null },
			{ stage: 2, name: "Express Consistently",   quests: _skillText("3", 2), unlock: { prevStage: true } },
			{ stage: 3, name: "Express Clearly",        quests: _skillText("3", 3), unlock: { prevStage: true } },
		],
	},
	{
		id: "4", label: "STRUCTURE", subtitle: "Discipline / Systems", icon: "▣", color: "#00FF94", glow: "#00FF9466",
		stages: [
			{ stage: 1, name: "Follow Structure",   quests: _skillText("4", 1), unlock: null },
			{ stage: 2, name: "Maintain Structure",  quests: _skillText("4", 2), unlock: { prevStage: true } },
			{ stage: 3, name: "Build Systems",       quests: _skillText("4", 3), unlock: { prevStage: true } },
		],
	},
	{
		id: "5", label: "ADAPTABILITY", subtitle: "Change / Exploration", icon: "◈", color: "#FF61D8", glow: "#FF61D866",
		stages: [
			{ stage: 1, name: "Try New Things",              quests: _skillText("5", 1), unlock: null },
			{ stage: 2, name: "Handle Change",                quests: _skillText("5", 2), unlock: { prevStage: true } },
			{ stage: 3, name: "Seek Growth Through Change",  quests: _skillText("5", 3), unlock: { prevStage: true } },
		],
	},
	{
		id: "6", label: "RESPONSIBILITY", subtitle: "Care / Reliability", icon: "⬡", color: "#7B61FF", glow: "#7B61FF66",
		stages: [
			{ stage: 1, name: "Take Responsibility",  quests: _skillText("6", 1), unlock: null },
			{ stage: 2, name: "Follow Through",        quests: _skillText("6", 2), unlock: { prevStage: true } },
			{ stage: 3, name: "Be Relied Upon",        quests: _skillText("6", 3), unlock: { prevStage: true } },
		],
	},
	{
		id: "7", label: "AWARENESS", subtitle: "Reflection / Insight", icon: "◉", color: "#00E5FF", glow: "#00E5FF66",
		stages: [
			{ stage: 1, name: "Reflect",              quests: _skillText("7", 1), unlock: null },
			{ stage: 2, name: "Understand Patterns",  quests: _skillText("7", 2), unlock: { prevStage: true } },
			{ stage: 3, name: "Act With Insight",      quests: _skillText("7", 3), unlock: { prevStage: true } },
		],
	},
	{
		id: "8", label: "MASTERY", subtitle: "Results / Performance", icon: "◆", color: "#FF9500", glow: "#FF950066",
		stages: [
			{ stage: 1, name: "Work With Focus",          quests: _skillText("8", 1), unlock: null },
			{ stage: 2, name: "Improve Performance",      quests: _skillText("8", 2), unlock: { prevStage: true } },
			{ stage: 3, name: "Produce Results Reliably",  quests: _skillText("8", 3), unlock: { prevStage: true } },
		],
	},
	{
		id: "9", label: "IMPACT", subtitle: "Completion / Contribution", icon: "✺", color: "#FF2D55", glow: "#FF2D5566",
		stages: [
			{ stage: 1, name: "Complete Actions",          quests: _skillText("9", 1), unlock: null },
			{ stage: 2, name: "Complete Meaningfully",      quests: _skillText("9", 2), unlock: { prevStage: true } },
			{ stage: 3, name: "Contribute Beyond Self",    quests: _skillText("9", 3), unlock: { prevStage: true } },
		],
	},
];

function isStageUnlocked(numberId, stageIdx, completed, statValues = {}, seeds = {}) {
	if (stageIdx === 0) return true;
	const prevDone = completed[numberId]?.[stageIdx - 1] === true;
	if (!prevDone) return false;
	const innate = seeds?.[numberId] || [false, false, false]
	if (innate[stageIdx]) return true;
	const statVal = statValues?.[numberId] || 0
	const threshold = stageIdx === 1 ? THRESHOLDS.stage2 : THRESHOLDS.stage3
	return statVal >= threshold;
}

const STAGE_COLORS = {
	1: { bg: "#1a2a1a", border: "#22c55e", text: "#86efac", label: "Initiation" },
	2: { bg: "#2a2a0a", border: "#eab308", text: "#fde047", label: "Consistency" },
	3: { bg: "#2a0a0a", border: "#ef4444", text: "#fca5a5", label: "Mastery" },
};

const THRESHOLDS = { stage2: 5, stage3: 10 }

function SkillSeal({ number, completed, active, seeds, statValues, size, onSelect }) {
	const stagesDone = completed.filter(Boolean).length;
	const progress = (stagesDone / 3) * 100;
	const innateStages = seeds?.[number.id] || [false, false, false]
	const isInnate = innateStages[0]
	const statVal = statValues?.[number.id] || 0
	const fullyAligned = stagesDone === 3 && statVal >= THRESHOLDS.stage3

	const eligible = [
		true,
		innateStages[1] || statVal >= THRESHOLDS.stage2,
		innateStages[2] || statVal >= THRESHOLDS.stage3,
	]

	const pipStates = [0, 1, 2].map((i) => ({
		done: completed[i],
		eligible: eligible[i],
		innate: innateStages[i],
	}))

	return (
		<div className="skills-grid-cell">
			<FlowProgressNode
				color={number.color}
				icon={number.icon}
				displayNum={number.id}
				label={number.label}
				subtitle={number.subtitle}
				isSelected={active}
				progressPct={progress}
				stagesDone={stagesDone}
				pipStates={pipStates}
				innateGlow={isInnate}
				fullyAligned={fullyAligned}
				size={size}
				onClick={() => onSelect(number)}
				ariaLabel={`${number.label}${active ? ', selected' : ''}`}
				ariaPressed={active}
			/>
		</div>
	);
}

function useIsMobile() {
	const [isMobile, setIsMobile] = useState(window.innerWidth < 700);
	useEffect(() => {
		const onResize = () => setIsMobile(window.innerWidth < 700);
		window.addEventListener("resize", onResize);
		return () => window.removeEventListener("resize", onResize);
	}, []);
	return isMobile;
}

export default function SkillTree({ completed, activeNode, setActiveNode, seeds = {}, statValues = {} }) {
	const isMobile = useIsMobile();
	const wrapRef = useRef(null);
	const [sealSize, setSealSize] = useState(FLOW_NODE_SIZE);
	const measureRaf = useRef(0);

	const toggleNode = useCallback((number) => {
		setActiveNode((prev) => (prev?.id === number.id ? null : number));
	}, [setActiveNode]);

	// Scale seals from cell size — debounce + hysteresis so sheet open / scrollbars
	// cannot thrash ResizeObserver into an infinite setState loop (UI freeze).
	useEffect(() => {
		const el = wrapRef.current;
		if (!el || typeof ResizeObserver === "undefined") return undefined;

		const measure = () => {
			const w = el.clientWidth || 0;
			const h = el.clientHeight || 0;
			if (w < 40 || h < 40) return;
			const pad = 12;
			const gap = 8;
			const cellW = (w - pad * 2 - gap * 2) / 3;
			const cellH = (h - pad * 2 - gap * 2) / 3;
			const next = Math.max(48, Math.min(100, Math.floor(Math.min(cellW, cellH) * 0.82)));
			setSealSize((prev) => (Math.abs(prev - next) < 2 ? prev : next));
		};

		const schedule = () => {
			if (measureRaf.current) cancelAnimationFrame(measureRaf.current);
			measureRaf.current = requestAnimationFrame(measure);
		};

		measure();
		const ro = new ResizeObserver(schedule);
		ro.observe(el);
		return () => {
			ro.disconnect();
			if (measureRaf.current) cancelAnimationFrame(measureRaf.current);
		};
	}, []);

	const activeData = activeNode ? NUMBERS.find((n) => n.id === activeNode.id) : null;
	const activeStages = activeData
		? (completed[activeData.id] || [false, false, false])
		: [false, false, false];
	const sheetOpen = !!activeData;
	const totalCompleted = Object.values(completed).flat().filter(Boolean).length;
	const totalQuests = NUMBERS.length * 3;

	const gridClass = [
		"skills-grid",
		sheetOpen && !isMobile ? "skills-grid--sheet-desktop" : "",
		sheetOpen && isMobile ? "skills-grid--sheet-mobile" : "",
	].filter(Boolean).join(" ");

	return (
		<div className="skills-stage" aria-label="Numerology Skill Tree">
			<style>{`
				.quest-item:hover, .quest-item:focus-visible, .quest-item:active {
					background: rgba(255,255,255,0.08) !important;
					outline: none;
					box-shadow: 0 0 0 2px #fff2, 0 2px 8px #0002;
				}
				@media (max-width: 700px) {
					.side-panel-mobile { width: 100vw !important; left: 0 !important; right: 0 !important; border-radius: 18px 18px 0 0 !important; }
				}
			`}</style>

			<header className="skills-stage-header">
				<p className="skills-thesis">Your nine frequencies — select a seal to train it.</p>
				<div className="skills-progress" aria-label="Overall skill progress">
					<span className="skills-progress-label">PROGRESS</span>
					<div className="skills-progress-track">
						<div
							className="skills-progress-fill"
							style={{ width: `${(totalCompleted / totalQuests) * 100}%` }}
						/>
					</div>
					<span className="skills-progress-val">{totalCompleted}/{totalQuests}</span>
				</div>
			</header>

			<div className="skills-stage-body">
				<div ref={wrapRef} className="skills-flow-wrap">
					{!activeData && (
						<p className="skills-idle-hint" aria-hidden="true">
							Select a skill to view its path.
						</p>
					)}
					<div className={gridClass} aria-label="Skill Tree">
						{NUMBERS.map((num) => (
							<SkillSeal
								key={num.id}
								number={num}
								completed={completed[num.id] || [false, false, false]}
								active={activeNode?.id === num.id}
								seeds={seeds}
								statValues={statValues}
								size={sealSize}
								onSelect={toggleNode}
							/>
						))}
					</div>
				</div>

				<AnimatePresence>
				{activeData && (
					<motion.div
						key={`skill-sheet-root-${activeData.id}`}
						className="skills-sheet-root"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.15 }}
					>
						{isMobile && (
							<motion.div
								key="skill-backdrop"
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								exit={{ opacity: 0 }}
								transition={{ duration: 0.2 }}
								onClick={() => setActiveNode(null)}
								className="skills-sheet-backdrop"
							/>
						)}
						<motion.div
							key={`skill-panel-${activeData.id}`}
							className={`skills-sheet${isMobile ? " side-panel-mobile skills-sheet--mobile" : " skills-sheet--desktop"}`}
							initial={isMobile ? { y: "100%" } : { x: "100%", opacity: 0 }}
							animate={{ y: 0, x: 0, opacity: 1 }}
							exit={isMobile ? { y: "100%" } : { x: "100%", opacity: 0 }}
							transition={{ type: "tween", duration: 0.25, ease: "easeOut" }}
							style={{ "--skill-color": activeData.color }}
							role="dialog"
							aria-modal="true"
							aria-label={activeData.label + " details"}
						>
						<div className="skills-sheet-header">
							<div className="skills-sheet-hero">
								<span className="skills-sheet-num">{activeData.id}</span>
								<div className="skills-sheet-meta">
									<div className="skills-sheet-title">
										<span className="skills-sheet-glyph" aria-hidden="true">{activeData.icon}</span>
										{activeData.label}
									</div>
									<div className="skills-sheet-sub">{activeData.subtitle}</div>
								</div>
								<button
									type="button"
									aria-label="Close details panel"
									className="skills-sheet-close"
									onClick={() => setActiveNode(null)}
								>✕</button>
							</div>

							<div className="skills-sheet-pips">
								{[0, 1, 2].map((i) => (
									<div key={i} className="skills-sheet-pip">
										<div
											className={`skills-sheet-pip-label${activeStages[i] ? " skills-sheet-pip-label--done" : ""}`}
											style={activeStages[i] ? { color: STAGE_COLORS[i + 1].text } : undefined}
										>
											{STAGE_COLORS[i + 1].label.toUpperCase()}
										</div>
										<div
											className="skills-sheet-pip-bar"
											style={{
												background: activeStages[i] ? STAGE_COLORS[i + 1].border : "#ffffff11",
												boxShadow: activeStages[i] ? `0 0 6px ${STAGE_COLORS[i + 1].border}` : "none",
											}}
										/>
									</div>
								))}
							</div>
						</div>

						<div className="skills-sheet-body">
							{activeData.stages.map((stage, sIdx) => {
								const sc = STAGE_COLORS[stage.stage];
								const isDone = !!activeStages[sIdx];
								const unlocked = isStageUnlocked(activeData.id, sIdx, completed, statValues, seeds);
								const innateStages = seeds?.[activeData.id] || [false, false, false]
								const statVal = statValues?.[activeData.id] || 0
								const threshold = sIdx === 1 ? THRESHOLDS.stage2 : sIdx === 2 ? THRESHOLDS.stage3 : null
								const needsPrev = sIdx > 0 && !activeStages[sIdx - 1]
								const needsStat = threshold && !innateStages[sIdx] && statVal < threshold
								const lockParts = []
								if (needsPrev) lockParts.push(`Complete Stage ${sIdx}`)
								if (needsStat) lockParts.push(`Stat ${statVal}/${threshold}`)
								const lockReason = lockParts.join(' · ')
								return (
									<div key={stage.stage} className={`skills-stage-block${unlocked ? "" : " skills-stage-block--locked"}`}>
										<div
											className="quest-item skills-stage-row"
											style={{
												border: `1px solid ${isDone ? sc.border : sc.border + "44"}`,
												background: isDone ? sc.bg : unlocked ? "transparent" : "#222233",
												filter: unlocked ? "none" : "grayscale(0.7)",
											}}
											title={unlocked ? undefined : lockReason || "Complete previous stage via quests"}
											aria-label={`Stage ${stage.stage}: ${stage.name}${isDone ? ' — complete' : ''}`}
										>
											<div
												className="skills-stage-badge"
												style={{
													border: `2px solid ${sc.border}`,
													background: isDone ? sc.border : "transparent",
													boxShadow: isDone ? `0 0 8px ${sc.border}` : "none",
												}}
											>
												{isDone ? "✓" : stage.stage}
											</div>
											<div>
												<div className="skills-stage-kicker" style={{ color: sc.text }}>
													STAGE {stage.stage} · {sc.label.toUpperCase()}
												</div>
												<div className={`skills-stage-name${isDone ? " skills-stage-name--done" : unlocked ? "" : " skills-stage-name--locked"}`}>
													{stage.name}
													{!unlocked && (
														<span className="skills-stage-lock">◇ {lockReason || 'Locked'}</span>
													)}
												</div>
											</div>
										</div>

										<div className="skills-stage-quests">
											{stage.quests.map((q, qi) => (
												<div
													key={qi}
													className="quest-item skills-quest-row"
													tabIndex={0}
													aria-label={q}
												>
													<div
														className="skills-quest-dot"
														style={{
															background: sc.border + (isDone ? "ff" : "66"),
															boxShadow: isDone ? `0 0 4px ${sc.border}` : "none",
														}}
													/>
													<span className={`skills-quest-text${isDone ? " skills-quest-text--done" : unlocked ? "" : " skills-quest-text--locked"}`}>
														{q}
													</span>
												</div>
											))}
										</div>
									</div>
								);
							})}
						</div>

						<div className="skills-sheet-foot">
							{isMobile ? "TAP OUTSIDE OR ✕ TO CLOSE" : "✕ OR CLICK SEAL TO CLOSE"}
						</div>
					</motion.div>
					</motion.div>
				)}
				</AnimatePresence>
			</div>
		</div>
	);
}
