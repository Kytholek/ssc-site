
import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useReactFlow } from "reactflow";
import ReactFlow, {
	Background,
	Controls,
	MiniMap,
	useNodesState,
	useEdgesState,
	Handle,
	Position,
} from "reactflow";
import "reactflow/dist/style.css";
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
	// Fallback to legacy SKILL_OBJECTIVES
	const obj = SKILL_OBJECTIVES[Number(numId)]?.find(o => o.difficulty === difficulty)
	return obj ? [obj.text] : ['(No objective defined)']
}

// Add unlock requirements to each stage
export const NUMBERS = [
	{
		id: "1", label: "POWER", subtitle: "Action / Initiative", icon: "⚡", color: "#FF4D00", glow: "#FF4D0066",
		stages: [
			{ stage: 1, name: "Act Without Delay",  quests: _skillText("1", 1), unlock: null },
			{ stage: 2, name: "Act Consistently",    quests: _skillText("1", 2), unlock: { prevStage: true } },
			{ stage: 3, name: "Initiate Naturally",  quests: _skillText("1", 3), unlock: { prevStage: true } },
		],
	},
	{
		id: "2", label: "SENSITIVITY", subtitle: "Relationships / Connection", icon: "🔗", color: "#00C9FF", glow: "#00C9FF66",
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


// Unlock logic — prev stage + stat threshold (innate seeds bypass stat gate)
function isStageUnlocked(numberId, stageIdx, completed, statValues = {}, seeds = {}) {
	if (stageIdx === 0) return true;
	const prevDone    = completed[numberId]?.[stageIdx - 1] === true;
	if (!prevDone) return false;
	const innate      = seeds?.[numberId] || [false, false, false]
	if (innate[stageIdx]) return true;          // innate seed bypasses stat gate
	const statVal     = statValues?.[numberId] || 0
	const threshold   = stageIdx === 1 ? THRESHOLDS.stage2 : THRESHOLDS.stage3
	return statVal >= threshold;
}

const STAGE_COLORS = {
	1: { bg: "#1a2a1a", border: "#22c55e", text: "#86efac", label: "Initiation" },
	2: { bg: "#2a2a0a", border: "#eab308", text: "#fde047", label: "Consistency" },
	3: { bg: "#2a0a0a", border: "#ef4444", text: "#fca5a5", label: "Mastery" },
};

const THRESHOLDS = { stage2: 5, stage3: 10 }

function SkillNode({ data }) {
	const { number, completed, onClick, active, seeds, statValues } = data;
	const stagesDone  = completed.filter(Boolean).length;
	const progress    = (stagesDone / 3) * 100;
	const { zoom = 1 } = useReactFlow();
	const minZoom = 0.5, maxZoom = 2;
	const clampedZoom = Math.max(minZoom, Math.min(maxZoom, zoom));
	const size        = FLOW_NODE_SIZE * clampedZoom;

	const innateStages = seeds?.[number.id] || [false, false, false]
	const isInnate     = innateStages[0]
	const statVal      = statValues?.[number.id] || 0
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

	const skillHandles = [
		{ type: 'target', position: Position.Top, id: 't-in' },
		{ type: 'source', position: Position.Top, id: 't-out' },
		{ type: 'target', position: Position.Bottom, id: 'b-in' },
		{ type: 'source', position: Position.Bottom, id: 'b-out' },
		{ type: 'target', position: Position.Left, id: 'l-in' },
		{ type: 'source', position: Position.Left, id: 'l-out' },
		{ type: 'target', position: Position.Right, id: 'r-in' },
		{ type: 'source', position: Position.Right, id: 'r-out' },
	]

	return (
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
			onClick={() => onClick(number)}
			withHandles
			handles={skillHandles}
		/>
	);
}

// Responsive helpers
function useIsMobile() {
	const [isMobile, setIsMobile] = useState(window.innerWidth < 700);
	useEffect(() => {
		const onResize = () => setIsMobile(window.innerWidth < 700);
		window.addEventListener("resize", onResize);
		return () => window.removeEventListener("resize", onResize);
	}, []);
	return isMobile;
}

const nodeTypes = { skillNode: SkillNode };

function buildGraph(numbers, completed, onNodeClick, activeId, seeds = {}, statValues = {}) {
	// Diamond/crystal layout with increased spacing
	//    2
	//  1   3
	// 4  5  6
	//  7   9
	//    8
	const SPACING_X = 170;
	const SPACING_Y = 115;
	const positions = [
		{ x: SPACING_X * 0.5, y: SPACING_Y * 0.8 },  // 1
		{ x: SPACING_X,       y: 0 },               // 2 (top center)
		{ x: SPACING_X * 1.5, y: SPACING_Y * 0.8 }, // 3
		{ x: 0,               y: SPACING_Y * 1.8 }, // 4 (left)
		{ x: SPACING_X,       y: SPACING_Y * 1.8 }, // 5 (center)
		{ x: SPACING_X * 2,   y: SPACING_Y * 1.8 }, // 6 (right)
		{ x: SPACING_X * 0.5, y: SPACING_Y * 2.8 }, // 7
		{ x: SPACING_X,       y: SPACING_Y * 3.8 }, // 8 (bottom center)
		{ x: SPACING_X * 1.5, y: SPACING_Y * 2.8 }, // 9
	];

	const nodes = numbers.map((num, i) => ({
		id: num.id,
		type: "skillNode",
		position: positions[i],
		data: {
			number: num,
			completed: completed[num.id] || [false, false, false],
			onClick: onNodeClick,
			active: activeId === num.id,
			seeds,
			statValues,
		},
	}));

	// Connector path: 1 → 2 → 3 → 5 → 7 → 8 → 9 → 5 → 1 (figure-8 through 5)
	const edges = [
		{ id: "e1-2", source: "1", sourceHandle: "sr", target: "2", targetHandle: "tl" },
		{ id: "e2-3", source: "2", sourceHandle: "sr", target: "3", targetHandle: "tl" },
		{ id: "e3-5", source: "3", sourceHandle: "b",  target: "5", targetHandle: "tr" },
		{ id: "e5-7", source: "5", sourceHandle: "b",  target: "7", targetHandle: "t" },
		{ id: "e7-8", source: "7", sourceHandle: "b",  target: "8", targetHandle: "tl" },
		{ id: "e8-9", source: "8", sourceHandle: "sr", target: "9", targetHandle: "b" },
		{ id: "e9-5", source: "9", sourceHandle: "sl", target: "5", targetHandle: "sr" },
		{ id: "e5-1", source: "5", sourceHandle: "sl", target: "1", targetHandle: "b" },
	].map((e) => ({
		...e,
		type: 'default',
	}));

	return { nodes, edges };
}

export default function SkillTree({ completed, activeNode, setActiveNode, seeds = {}, statValues = {} }) {
	const isMobile = useIsMobile();
	const [nodes, setNodes, onNodesChange] = useNodesState([]);
	const [edges, setEdges, onEdgesChange] = useEdgesState([]);
	const [showControls, setShowControls] = useState(false);

	const handleNodeClick = useCallback((number) => {
		setActiveNode((prev) => (prev?.id === number.id ? null : number));
	}, [setActiveNode]);

	useEffect(() => {
		const { nodes: n, edges: e } = buildGraph(NUMBERS, completed, handleNodeClick, activeNode?.id, seeds, statValues);
		setNodes(n);
		setEdges(e);
	}, [completed, activeNode, handleNodeClick, setNodes, setEdges, isMobile, statValues, seeds]);

	const activeData = activeNode ? NUMBERS.find((n) => n.id === activeNode.id) : null;
	const totalCompleted = Object.values(completed).flat().filter(Boolean).length;
	const totalQuests = NUMBERS.length * 3;

	// Accessibility: ARIA role for main container
	return (
		<div
			style={{
				width: "100%",
				height: isMobile ? "100dvh" : "100vh",
				background: "#06060f",
				fontFamily: "'Inter', sans-serif",
				display: "flex",
				flexDirection: "column",
				overflow: "hidden",
			}}
			role="main"
			aria-label="Numerology Skill Tree"
		>
			{/* Google Fonts and Animations */}
			<style>{`
				@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;900&family=Inter:wght@300;400;500&display=swap');
				@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
				@keyframes pulse { 0%,100% { opacity:0.6; } 50% { opacity:1; } }
				@keyframes pulse-aura { 0%,100% { opacity:0.5; transform:scale(1); } 50% { opacity:1; transform:scale(1.08); } }
				@keyframes slideIn { from { transform: translateY(100%); opacity:0; } to { transform: translateY(0); opacity:1; } }
				.quest-item:hover, .quest-item:focus-visible, .quest-item:active {
					background: rgba(255,255,255,0.08) !important;
					outline: none;
					box-shadow: 0 0 0 2px #fff2, 0 2px 8px #0002;
				}
				.skill-node-interactive:focus-visible {
					box-shadow: 0 0 0 4px #fff4, 0 0 24px #fff2;
					z-index: 2;
				}
				.skill-node-interactive:hover .skill-node-interactive-inner,
				.skill-node-interactive:focus-visible .skill-node-interactive-inner,
				.skill-node-interactive:active .skill-node-interactive-inner {
					filter: brightness(1.08) drop-shadow(0 0 12px #fff3);
					box-shadow: 0 0 32px #fff2, 0 0 0 4px #fff2;
					border-color: #fff8 !important;
				}
				.react-flow__controls button { background: #111128 !important; border-color: #ffffff22 !important; color: #fff !important; }
				.react-flow__controls button:hover { background: #1a1a40 !important; }
				.react-flow__minimap { background: #080810 !important; border: 1px solid #ffffff11 !important; }
				@media (max-width: 700px) {
					.side-panel-mobile { width: 100vw !important; left: 0 !important; right: 0 !important; border-radius: 18px 18px 0 0 !important; }
				}
			`}</style>

			{/* Header */}
			<div style={{
				padding: isMobile ? "12px 10px" : "16px 28px",
				borderBottom: "1px solid #ffffff0d",
				display: "flex",
				alignItems: "center",
				justifyContent: "space-between",
				background: "linear-gradient(to right, #06060f, #0d0d1e, #06060f)",
				flexShrink: 0,
			}}>
				   <div>
					   <p style={{
						   color: "#ffffff99",
						   fontSize: isMobile ? 11 : 14,
						   letterSpacing: "0.12em",
						   margin: 0,
						   fontFamily: "'Cinzel', serif",
						   fontWeight: 500,
					   }}>
						   Click on a skill to learn more about its structure.
					   </p>
				   </div>

				{/* Global progress */}
				<div style={{ textAlign: "right" }}>
					<div style={{ color: "#ffffff66", fontSize: isMobile ? 8 : 10, letterSpacing: "0.1em", marginBottom: 6 }}>
						OVERALL PROGRESS
					</div>
					<div style={{ display: "flex", alignItems: "center", gap: 12 }}>
						<div style={{
							width: isMobile ? 90 : 160,
							height: 4,
							background: "#ffffff11",
							borderRadius: 2,
							overflow: "hidden",
						}}>
							<div style={{
								width: `${(totalCompleted / totalQuests) * 100}%`,
								height: "100%",
								background: "linear-gradient(90deg, #7B61FF, #FF61D8, #FF4D00)",
								borderRadius: 2,
								transition: "width 0.5s ease",
							}} />
						</div>
						<span style={{
							fontFamily: "'Cinzel', serif",
							color: "#fff",
							fontSize: isMobile ? 10 : 13,
							fontWeight: 700,
						}}>
							{totalCompleted}/{totalQuests}
						</span>
					</div>
				</div>
			</div>

			{/* Main area */}
			<div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>
				{/* Flow canvas */}
				<div className="flow-canvas-wrap" style={{ flex: 1, minWidth: 0 }}>
					<ReactFlow
						nodes={nodes}
						edges={edges}
						onNodesChange={onNodesChange}
						onEdgesChange={onEdgesChange}
						nodeTypes={nodeTypes}
						onInit={(rf) => { setTimeout(() => { rf.fitView({ padding: 0.3, duration: 0 }); setTimeout(() => { const v = rf.getViewport(); rf.setViewport({ x: v.x, y: v.y - 50, zoom: v.zoom }) }, 50) }, 0) }}
						minZoom={isMobile ? 0.2 : 0.4}
						maxZoom={isMobile ? 3 : 2}
						proOptions={{ hideAttribution: true }}
						panOnScroll
						panOnDrag
						zoomOnPinch
						zoomOnScroll
						zoomOnDoubleClick
						style={{ touchAction: "pan-x pan-y" }}
						aria-label="Skill Tree Graph"
					>
						<Background color="#ffffff08" gap={28} size={1} />
						{showControls && <Controls />} {/* Hide controls by default, show with button */}
						{showControls && <MiniMap
							nodeColor={(n) => {
								const num = NUMBERS.find((x) => x.id === n.id);
								return num ? num.color + "88" : "#444";
							}}
							maskColor="#06060fcc"
						/>}
					</ReactFlow>
					{/* Floating button to show/hide controls */}
					<button
						aria-label="Show map and controls"
						style={{
							position: "absolute",
							bottom: isMobile ? 18 : 32,
							right: isMobile ? 18 : 32,
							zIndex: 20,
							background: "#222244cc",
							color: "#fff",
							border: "none",
							borderRadius: "50%",
							width: isMobile ? 38 : 48,
							height: isMobile ? 38 : 48,
							fontSize: isMobile ? 18 : 22,
							boxShadow: "0 2px 8px #0006",
							cursor: "pointer",
							outline: "none",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							transition: "background 0.2s",
						}}
						onClick={() => setShowControls((v) => !v)}
						tabIndex={0}
					>
						{showControls ? "✕" : "☰"}
					</button>
				</div>

				{/* Side Panel: modal overlay on mobile, side panel on desktop */}
				<AnimatePresence>
				{activeData && (
					<>
						{/* Backdrop on mobile */}
						{isMobile && (
							<motion.div
								key="skill-backdrop"
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								exit={{ opacity: 0 }}
								transition={{ duration: 0.2 }}
								onClick={() => setActiveNode(null)}
								style={{
									position: 'fixed',
									inset: 0,
									zIndex: 29,
									background: 'rgba(0,0,0,0.6)',
									backdropFilter: 'blur(4px)',
								}}
							/>
						)}
						<motion.div
							key={`skill-panel-${activeData.id}`}
							className={isMobile ? "side-panel-mobile" : ""}
							initial={isMobile ? { y: "100%" } : { x: "100%", opacity: 0 }}
							animate={{ y: 0, x: 0, opacity: 1 }}
							exit={isMobile ? { y: "100%" } : { x: "100%", opacity: 0 }}
							transition={{ type: "tween", duration: 0.25, ease: "easeOut" }}
							style={{
								width: isMobile ? "100vw" : 340,
								maxWidth: isMobile ? "100vw" : 340,
								position: isMobile ? "fixed" : "relative",
								left: isMobile ? 0 : undefined,
								right: isMobile ? 0 : undefined,
								bottom: isMobile ? 0 : undefined,
								top: isMobile ? "auto" : 0,
								zIndex: 30,
								background: "#0a0a18",
								borderLeft: isMobile ? "none" : `1px solid ${activeData.color}33`,
								borderTop: isMobile ? `3px solid ${activeData.color}33` : "none",
								borderRadius: isMobile ? "18px 18px 0 0" : 0,
								display: "flex",
								flexDirection: "column",
								overflowY: "auto",
								boxShadow: isMobile ? "0 -4px 32px #0008" : "none",
								minHeight: isMobile ? "40vh" : undefined,
								maxHeight: isMobile ? "80vh" : undefined,
							}}
							role="dialog"
							aria-modal="true"
							aria-label={activeData.label + " details"}
						>
						{/* Panel header */}
						<div style={{
							padding: isMobile ? "18px 16px 12px" : "24px 24px 16px",
							borderBottom: `1px solid ${activeData.color}22`,
							background: `linear-gradient(135deg, ${activeData.color}11 0%, transparent 60%)`,
							position: "sticky",
							top: 0,
							zIndex: 10,
							backdropFilter: "blur(10px)",
						}}>
							<div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
								<span style={{ fontSize: isMobile ? 22 : 28 }}>{activeData.icon}</span>
								<div>
									<div style={{
										fontFamily: "'Cinzel', serif",
										color: activeData.color,
										fontSize: isMobile ? 13 : 16,
										fontWeight: 700,
										letterSpacing: "0.1em",
									}}>
										{activeData.id}. {activeData.label}
									</div>
									<div style={{ color: "#ffffff55", fontSize: isMobile ? 9 : 11, letterSpacing: "0.1em" }}>
										{activeData.subtitle}
									</div>
								</div>
								{/* Close button for mobile */}
								{isMobile && (
									<button
										aria-label="Close details panel"
										style={{
											marginLeft: "auto",
											background: "none",
											border: "none",
											color: "#fff",
											fontSize: 22,
											cursor: "pointer",
											padding: 0,
										}}
										onClick={() => setActiveNode(null)}
									>✕</button>
								)}
							</div>

							{/* Per-skill progress */}
							<div style={{ display: "flex", gap: 6, marginTop: 12 }}>
								{[0, 1, 2].map((i) => (
									<div key={i} style={{ flex: 1 }}>
										<div style={{
											fontSize: isMobile ? 7 : 9,
											color: completed[activeData.id][i] ? STAGE_COLORS[i + 1].text : "#ffffff33",
											letterSpacing: "0.1em",
											marginBottom: 4,
										}}>
											{STAGE_COLORS[i + 1].label.toUpperCase()}
										</div>
										<div style={{
											height: 3,
											borderRadius: 2,
											background: completed[activeData.id][i] ? STAGE_COLORS[i + 1].border : "#ffffff11",
											boxShadow: completed[activeData.id][i] ? `0 0 6px ${STAGE_COLORS[i + 1].border}` : "none",
										}} />
									</div>
								))}
							</div>
						</div>

						{/* Stages */}
						<div style={{ padding: isMobile ? "10px 8px" : "16px 20px", flex: 1 }}>
							{activeData.stages.map((stage, sIdx) => {
								const sc = STAGE_COLORS[stage.stage];
								const isDone = completed[activeData.id][sIdx];
								const unlocked = isStageUnlocked(activeData.id, sIdx, completed, statValues, seeds);
								const innateStages = seeds?.[activeData.id] || [false, false, false]
								const statVal = statValues?.[activeData.id] || 0
								const threshold = sIdx === 1 ? THRESHOLDS.stage2 : sIdx === 2 ? THRESHOLDS.stage3 : null
								const needsPrev = sIdx > 0 && !completed[activeData.id][sIdx - 1]
								const needsStat = threshold && !innateStages[sIdx] && statVal < threshold
								const lockParts = []
								if (needsPrev) lockParts.push(`Complete Stage ${sIdx}`)
								if (needsStat) lockParts.push(`Stat ${statVal}/${threshold}`)
								const lockReason = lockParts.join(' · ')
								return (
									<div key={stage.stage} style={{ marginBottom: isMobile ? 12 : 20, opacity: unlocked ? 1 : 0.5 }}>
										{/* Stage header — quest-driven progress (read-only) */}
										<div
											className="quest-item"
											style={{
												display: "flex",
												alignItems: "center",
												gap: isMobile ? 7 : 10,
												padding: isMobile ? "8px 8px" : "10px 12px",
												borderRadius: 8,
												border: `1px solid ${isDone ? sc.border : sc.border + "44"}`,
												background: isDone ? sc.bg : unlocked ? "transparent" : "#222233",
												cursor: "default",
												marginBottom: 10,
												transition: "all 0.2s ease",
												filter: unlocked ? "none" : "grayscale(0.7)",
											}}
											title={unlocked ? undefined : lockReason || "Complete previous stage via quests"}
											aria-label={`Stage ${stage.stage}: ${stage.name}${isDone ? ' — complete' : ''}`}
										>
											<div style={{
												width: isMobile ? 18 : 22,
												height: isMobile ? 18 : 22,
												borderRadius: "50%",
												border: `2px solid ${sc.border}`,
												background: isDone ? sc.border : "transparent",
												display: "flex",
												alignItems: "center",
												justifyContent: "center",
												fontSize: isMobile ? 9 : 11,
												flexShrink: 0,
												transition: "all 0.2s",
												boxShadow: isDone ? `0 0 8px ${sc.border}` : "none",
											}}>
												{isDone ? "✓" : stage.stage}
											</div>
											<div>
												<div style={{
													fontSize: isMobile ? 7 : 9,
													color: sc.text,
													letterSpacing: "0.15em",
													fontWeight: 600,
												}}>
													STAGE {stage.stage} · {sc.label.toUpperCase()}
												</div>
												<div style={{
													color: isDone ? "#fff" : unlocked ? "#ffffff88" : "#8888aa",
													fontSize: isMobile ? 11 : 13,
													fontWeight: 500,
													marginTop: 1,
												}}>
													{stage.name}
													{!unlocked && (
														<span style={{ color: "#ffb800", fontSize: isMobile ? 8 : 10, marginLeft: 8 }}>
															🔒 {lockReason || 'Locked'}
														</span>
													)}
												</div>
											</div>
										</div>

										{/* Quests */}
										<div style={{ paddingLeft: isMobile ? 6 : 12 }}>
											{stage.quests.map((q, qi) => (
												<div
													key={qi}
													className="quest-item"
													tabIndex={0}
													style={{
														display: "flex",
														alignItems: "flex-start",
														gap: isMobile ? 7 : 10,
														padding: isMobile ? "6px 6px" : "8px 10px",
														borderRadius: 6,
														marginBottom: 4,
														cursor: "default",
														transition: "background 0.2s",
														outline: "none",
													}}
													aria-label={q}
												>
													<div style={{
														width: isMobile ? 4 : 5,
														height: isMobile ? 4 : 5,
														borderRadius: "50%",
														background: sc.border + (isDone ? "ff" : "66"),
														marginTop: 6,
														flexShrink: 0,
														boxShadow: isDone ? `0 0 4px ${sc.border}` : "none",
													}} />
													<span style={{
														color: isDone ? "#ffffff99" : unlocked ? "#ffffff44" : "#8888aa",
														fontSize: isMobile ? 10 : 12,
														lineHeight: 1.5,
														textDecoration: isDone ? "line-through" : "none",
													}}>
														{q}
													</span>
												</div>
											))}
										</div>
									</div>
								);
							})}
						</div>

						{/* Close hint */}
						<div style={{
							padding: isMobile ? "8px 8px" : "12px 20px",
							borderTop: `1px solid ${activeData.color}22`,
							color: "#ffffff33",
							fontSize: isMobile ? 8 : 10,
							letterSpacing: "0.1em",
							textAlign: "center",
						}}>
							{isMobile ? "TAP OUTSIDE OR ✕ TO CLOSE" : "CLICK NODE TO CLOSE · CLICK STAGE TO TOGGLE"}
						</div>
					</motion.div>
					</>
				)}
				</AnimatePresence>
			</div>
		</div>
	);
}
