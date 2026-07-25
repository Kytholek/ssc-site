import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { calcTimeCycles } from '../js/time-cycles.mjs';
import { buildTimeCyclePdfHtml } from '../js/time-cycle-reading.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const DEMO = {
  fullName: 'Kyle Thomas Chwalek',
  month: 11,
  day: 17,
  year: 1987,
  asOf: new Date('2026-07-25'),
};

const cycles = calcTimeCycles({
  month: DEMO.month,
  day: DEMO.day,
  year: DEMO.year,
  asOf: DEMO.asOf,
});
const cp = cycles.currentPinnacle;
const s = cycles.meaningSeeds;
const alignments = cycles.alignments || [];
const adj = cycles.adjacent;
const planMonths = cycles.planMonths;
const firstName = DEMO.fullName.split(' ')[0];
const dobLabel = 'Nov 17, 1987';
const lp = `${cycles.lifePathCompound}/${cycles.lifePathRoot}`;

const alignmentLead = alignments.length
  ? alignments.map((a) => {
      const layers = a.layers.map((l) => l.label.toLowerCase()).join(' and ');
      return `Your ${layers} are both <strong>${a.number}</strong> — this stretch is a double ${a.evolution.stage.toLowerCase()}.`;
    }).join(' ')
  : '';

function reinforce(rootNum) {
  const hit = alignments.find((a) => a.number === rootNum || a.number === Number(rootNum));
  if (!hit) return '';
  const also = hit.layers.map((l) => l.label).join(' and ');
  return `<p>Same number again: <strong>${rootNum}</strong> also shows up in ${also}. Keep the plan simple — one clean start, not five.</p>`;
}

const pinnacleMapHtml = s.pinnacles.map((p) => {
  const end = p.endAge === null ? 'onward' : p.endAge;
  const cur = p.isCurrent ? ' <strong>(current)</strong>' : '';
  return `<p><strong>Pinnacle ${p.index} · ${p.root}</strong> (ages ${p.startAge}–${end})${cur}. ${p.meaning.summary} Main trap: ${p.meaning.shadow}</p>`;
}).join('\n');

function monthPlanBlock(pm, extras) {
  return `
<h3>${pm.heading}</h3>
<p>${extras.meaning}</p>
<p><strong>Focus:</strong> ${extras.focus}</p>
<p><strong>Do this:</strong></p>
<ul>
${extras.actions.map((a) => `<li>${a}</li>`).join('\n')}
</ul>
<p><strong>Watch for:</strong> ${extras.watch}</p>
<p><strong>Done looks like:</strong> ${extras.done}</p>`;
}

const m0 = planMonths[0];
const m1 = planMonths[1];
const m2 = planMonths[2];

const readingBody = `
<p>${firstName} — right now you are in a Pinnacle ${cp.root} chapter (${s.currentPinnacle.theme.toLowerCase()}), inside a 9-year Cycle ${cycles.n9.index}, in a Personal Year ${cycles.personalYear.root}. ${alignmentLead} This season’s timing serves Life Path ${lp}. You are about ${cycles.anchor.daysSinceBd} days into the personal year that began ${cycles.anchor.lastBirthday}. Read this as a timing brief: what the longer cycles ask for, then a precise plan for the next three personal months.</p>

<h2 id="season-stack">Season Stack</h2>
<p>Your multi-year chapter (Pinnacle ${cp.root}) wants depth: study, stillness, and decisions that come from inner knowing rather than noise. At the same time, your 9-year Cycle ${cycles.n9.index} is a liberation band — midlife years where living out of date structures stops working. Personal Year ${cycles.personalYear.root} is a start year: it wants first moves, not finishing old loops.</p>
<p>Put together: start carefully, but do not start shallow. Use Year ${cycles.personalYear.root} to open doors that your Pinnacle ${cp.root} chapter can actually inhabit for years — while Cycle ${cycles.n9.index} gives you permission to leave what is no longer true.</p>
${alignments.length ? `<p>Because ${alignments[0].number} repeats in ${alignments[0].layers.map((l) => l.label.toLowerCase()).join(' and ')}, the next stretch is not a vague “new vibe.” It is a concrete double start: plant fewer seeds, plant them on purpose.</p>` : ''}
<p><strong>Season objective:</strong> Choose one craft of knowing to deepen (Pinnacle ${cp.root}), and one outer beginning that proves Year ${cycles.personalYear.root} has started — then refuse busywork that is neither.</p>

<h2 id="current-pinnacle">Current Pinnacle — ${cp.root}</h2>
<h3>What ${cp.root} Means in This Chapter</h3>
<p>From age ${cp.startAge} to ${cp.endAge === null ? 'onward' : cp.endAge}, your chapter theme is ${s.currentPinnacle.theme.toLowerCase()}. In plain terms: the wins that last will come from going inward first — study, reflection, and trusting what you know when the room gets loud. ${s.currentPinnacle.evolution.summary}</p>
<p>Applied to you now: do not let Year-${cycles.personalYear.root} urgency turn this chapter into a rebrand. New starts should still sound like your real work after a quiet hour alone.</p>
${reinforce(cp.root)}
<h3>Maximize This Chapter</h3>
<ul>
<li><strong>Work:</strong> Pick one body of knowledge or craft you will deepen for the next three years. Publish or teach from it once per quarter.</li>
<li><strong>Relationships:</strong> Keep one weekly conversation with someone who can challenge your conclusions without flooding you.</li>
<li><strong>Practice:</strong> Protect 90+ minutes of solitude each week for study or stillness — no devices.</li>
</ul>
<h3>Challenges to Watch</h3>
<ul>
<li>${s.currentPinnacle.shadow}</li>
<li>Using “I need more research” to delay a Year-${cycles.personalYear.root} first move that is already clear.</li>
</ul>

<h2 id="pinnacle-map">Your Pinnacle Map</h2>
${pinnacleMapHtml}

<h2 id="nine-year">9-Year Epoch — Cycle ${cycles.n9.index}</h2>
<h3>What Cycle ${cycles.n9.index} Means in This Epoch</h3>
<p>Ages ${cycles.n9.ageBandStart}–${cycles.n9.ageBandEnd} (about ${cycles.n9.yearsRemainingInBand} years left in this band): ${s.n9.summary} In everyday language, this is a freedom decade — question what you built because it was expected, and keep what still feels true.</p>
<p>With Pinnacle ${cp.root} active, freedom cannot mean chaos. Liberate the false role; keep the deep practice.</p>
${reinforce(cycles.n9.index)}
<h3>Maximize This Epoch</h3>
<ul>
<li><strong>Work:</strong> Audit one role, offer, or identity that no longer matches you. Put a written exit or redesign date on the calendar.</li>
<li><strong>Relationships:</strong> Have one honest conversation this quarter where you have been postponing authenticity.</li>
<li><strong>Practice:</strong> Keep a one-sentence “what this decade is for” note and update it on each birthday.</li>
</ul>
<h3>Challenges to Watch</h3>
<ul>
<li>${s.n9.shadow}</li>
<li>Burning useful containers because restlessness feels like liberation.</li>
</ul>

<h2 id="personal-year">Personal Year — ${cycles.personalYear.root}</h2>
<h3>What ${cycles.personalYear.root} Means This Year</h3>
<p>${s.personalYear.summary} You are ~${cycles.anchor.daysSinceBd} days into this personal year (started ${cycles.personalYear.cycleStartYear}). A 1-year is for planting, not harvesting. Momentum from careful starts can shape the next eight years.</p>
${reinforce(cycles.personalYear.root)}
<h3>Maximize This Year</h3>
<ul>
<li><strong>Work:</strong> Lock three priorities for the next 90 days with owners and dates — not vibes.</li>
<li><strong>Relationships:</strong> Invite one ally into a beginning; stop waiting for perfect consensus.</li>
<li><strong>Practice:</strong> Weekly review: what did I start, what did I abandon, what still has a root?</li>
</ul>
<h3>Challenges to Watch</h3>
<ul>
<li>${s.personalYear.shadow}</li>
<li>Comparing your pace to people in different personal years.</li>
</ul>

<h2 id="four-month">4-Month Window — ${cycles.fourMonth.root}</h2>
<p>Current window: <strong>${cycles.fourMonth.startMonthName}–${cycles.fourMonth.endMonthName}</strong>. You left a ${adj.fourMonth.previous.root} window (${adj.fourMonth.previous.startMonthName}–${adj.fourMonth.previous.endMonthName}); next is ${adj.fourMonth.next.root} (${adj.fourMonth.next.startMonthName}–${adj.fourMonth.next.endMonthName}).</p>
<h3>What ${cycles.fourMonth.root} Means in This Window</h3>
<p>${s.fourMonth.summary} This block favors expression — putting work and voice into the world so Year-${cycles.personalYear.root} seeds become visible, without abandoning Pinnacle ${cp.root} depth.</p>
${reinforce(cycles.fourMonth.root)}
<h3>Maximize This Window</h3>
<ul>
<li><strong>Work:</strong> Ship one public piece, talk, offer page, or demo before ${cycles.fourMonth.endMonthName} ends.</li>
<li><strong>Relationships:</strong> Host or join three conversations that advance the work — not status socializing.</li>
<li><strong>Practice:</strong> One weekly creation block tied to a single message you are willing to repeat.</li>
</ul>
<h3>Challenges to Watch</h3>
<ul>
<li>${s.fourMonth.shadow}</li>
<li>Dragging unfinished goals from the previous ${adj.fourMonth.previous.root} window without a reset.</li>
</ul>

<h2 id="personal-month">Personal Month — ${cycles.personalMonth.root}</h2>
<p>Personal month ${cycles.personalMonth.monthNum} of 12. You left month-root ${adj.personalMonth.previous.root}; you are in ${cycles.personalMonth.root}; next is ${adj.personalMonth.next.root}.</p>
<h3>What ${cycles.personalMonth.root} Means This Month</h3>
<p>${s.personalMonth.summary} Because this month’s number matches your personal year, treat it as a double start: one clean beginning that feeds the year, not a pile of impulses.</p>
${reinforce(cycles.personalMonth.root)}
<h3>Maximize This Month</h3>
<ul>
<li><strong>Work:</strong> Open one new thread that serves a Year-${cycles.personalYear.root} priority. Define the first deliverable this week.</li>
<li><strong>Relationships:</strong> Tell one person what you are beginning and ask for a specific form of support.</li>
<li><strong>Practice:</strong> Before each Friday, complete one initiation action tied to this month.</li>
</ul>
<h3>Challenges to Watch</h3>
<ul>
<li>${s.personalMonth.shadow}</li>
<li>Letting calendar noise erase the assignment before next month’s ${adj.personalMonth.next.root} arrives.</li>
</ul>

<h2 id="operating-plan">90-Day Operating Plan</h2>
<p>Below is the next ~90 days broken into your three personal-month windows (birthday-based). Follow the months in order. Each month has one focus, four actions, one trap, and one finish line.</p>

${monthPlanBlock(m0, {
  meaning: `This is the current window (${m0.startLabel} to ${m0.endLabel}). Personal month ${m0.monthNum} carries number ${m0.root}, and it matches your Personal Year ${cycles.personalYear.root}. That means the job is initiation: open one real beginning that your Pinnacle ${cp.root} chapter can still recognize a year from now. Do not scatter.`,
  focus: `One deliberate start that serves Year ${cycles.personalYear.root} and can survive Pinnacle ${cp.root} scrutiny.`,
  actions: [
    'By this Friday: write one sentence naming the single project or practice you are beginning, and put the first work block on the calendar.',
    'Clear or pause one unfinished obligation that blocks a clean start (email, half-built offer, or lingering commitment).',
    'Schedule two 90-minute solitude blocks before ' + m0.endLabel.split(',')[0] + ' for Pinnacle ' + cp.root + ' depth — study or stillness only.',
    'Tell one ally what you are starting and ask them to check in once before ' + m0.endLabel + '.',
  ],
  watch: m0.meaning.shadow + ' If you open five threads, you opened none.',
  done: 'One named beginning exists in writing, has a first deliverable date, and has at least one completed action toward it.',
})}

${monthPlanBlock(m1, {
  meaning: `Next window (${m1.startLabel} to ${m1.endLabel}). Personal month ${m1.monthNum} is ${m1.root} — a master illumination month. After the double-1 start, this month sharpens insight. Use it to refine what you began, not to abandon it for a shinier idea. Ground daily or the sensitivity scatters.`,
  focus: `Clarify and refine the Year-${cycles.personalYear.root} beginning through insight — then make one adjusted move.`,
  actions: [
    'Week 1: review the start from the previous month. Keep, cut, or reshape — write the decision in one paragraph.',
    'Add a daily 10-minute grounding practice (walk, breath, or journaling) for the whole month so ' + m1.root + ' insight stays usable.',
    'Translate one insight into a concrete change in the offer, message, or schedule — ship the change before ' + m1.endLabel + '.',
    'Have one deep conversation with a trusted person about what you are seeing; capture three takeaways.',
  ],
  watch: m1.meaning.shadow + ' Do not use “downloads” as a reason to restart from zero.',
  done: 'The original beginning still exists, with one clear refinement shipped and a grounding practice logged most days.',
})}

${monthPlanBlock(m2, {
  meaning: `Third window (${m2.startLabel} to ${m2.endLabel}). Personal month ${m2.monthNum} is ${m2.root} — expression. This is when the start becomes audible: communicate, create, and put the work where others can see it. Stay inside the July–October ${cycles.fourMonth.root}-window job of expression; finish something public before this month ends.`,
  focus: `Make the Year-${cycles.personalYear.root} beginning visible through one public expression.`,
  actions: [
    'Choose the format (article, talk, demo, page, or video) by the first week of this month.',
    'Draft in week 2; revise in week 3; publish or present before ' + m2.endLabel + '.',
    'Book or host two conversations that move the work forward with real people, not only online posting.',
    'Sunday of the final week: write what worked, what to drop, and the single priority for the following personal month.',
  ],
  watch: m2.meaning.shadow + ' Visibility without a finished artifact is just noise.',
  done: 'One public expression is live or delivered, and a written handoff note exists for the next month.',
})}

<h3>Weekly Rhythm</h3>
<p>Every Sunday, 20 minutes. Same checklist for all three months:</p>
<ul>
<li>What did I start or advance this week toward the month’s focus?</li>
<li>Did I protect Pinnacle ${cp.root} solitude, or did I only react?</li>
<li>Was any “freedom” move actually escape from Cycle ${cycles.n9.index} discomfort?</li>
<li>What is the one calendar action for the coming week?</li>
<li>What am I refusing this week so the plan stays clean?</li>
</ul>

<h2 id="quest-directive">Quest Directive</h2>
<p><strong>Primary aim for 90 days:</strong> Open one real beginning under Year ${cycles.personalYear.root}, refine it under the ${m1.root} month, and make it visible under the ${m2.root} month — while keeping Pinnacle ${cp.root} depth intact.</p>
<p><strong>Refuse:</strong> Treating each week as a new personality. When year and month both say ${cycles.personalYear.root}, the work is a clean start and follow-through — not endless seeking dressed up as strategy.</p>
`;

const banner = `<div style="position:sticky;top:0;z-index:9;background:rgba(74,148,148,.15);border-bottom:1px solid rgba(126,200,200,.35);color:#7ec8c8;font-family:Cinzel,serif;font-size:10px;letter-spacing:.2em;text-transform:uppercase;text-align:center;padding:10px 16px">Sample Time Cycle Preview · ${DEMO.fullName} · ${dobLabel}</div>`;

const html = buildTimeCyclePdfHtml({ name: DEMO.fullName, cycles, readingBody })
  .replace('<head>', '<head>\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>Sample Time Cycle · SSC</title>')
  .replace(
    '.page{width:100%;min-height:297mm;padding:56px 64px 72px;page-break-after:always;position:relative;background:#05040a}',
    '.page{width:100%;min-height:auto;max-width:820px;margin:0 auto;padding:40px 28px 48px;page-break-after:always;position:relative;background:#05040a}'
  )
  .replace(
    '.footer{position:absolute;bottom:28px;left:64px;right:64px;display:flex;justify-content:space-between;border-top:1px solid rgba(201,168,76,.08);padding-top:10px;font-family:Cinzel,serif;font-size:7px;letter-spacing:.2em;text-transform:uppercase;color:#5c5448}',
    '.footer{position:relative;margin-top:48px;display:flex;justify-content:space-between;border-top:1px solid rgba(201,168,76,.08);padding-top:10px;font-family:Cinzel,serif;font-size:7px;letter-spacing:.2em;text-transform:uppercase;color:#5c5448}'
  )
  .replace(
    '.content h2{font-family:"Cormorant SC",serif;font-weight:300;font-size:26px;color:#e8c96b;margin:36px 0 14px;letter-spacing:.03em;page-break-after:avoid;page-break-before:always}',
    '.content h2{font-family:"Cormorant SC",serif;font-weight:300;font-size:26px;color:#e8c96b;margin:36px 0 14px;letter-spacing:.03em;page-break-after:avoid;page-break-before:auto}'
  )
  .replace('<body>', `<body>\n${banner}\n`);

writeFileSync(join(root, 'sample-time-cycle.html'), html);
console.log('Wrote sample-time-cycle.html');
console.log(JSON.stringify({
  name: DEMO.fullName,
  planMonths: planMonths.map((p) => p.heading),
  alignments: alignments.map((a) => ({ number: a.number, layers: a.layers.map((l) => l.label) })),
}, null, 2));
