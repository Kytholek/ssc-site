/**
 * objectives.js — Single source of truth for all quest objectives.
 *
 * Replaces three scattered objects from data.js:
 *   QUEST_OBJECTIVES        → PLACEMENT_OBJECTIVES
 *   TIERED_OBJECTIVES       → TIERED_PROGRESSION
 *   CURRENT_QUEST_OBJECTIVES → CYCLE_OBJECTIVES
 *
 * Every entry: { id, text, duration }
 *   duration: 'day' | 'week' | 'month' | 'cycle'
 */

import { reduceToSimple } from './numerology'

// ─── Placement labels ────────────────────────────────────────────────────────
export const PLACEMENTS = {
  lp: 'Life Path',
  ex: 'Expression',
  cl: 'Life Calling',
  so: 'Soul',
  ou: 'Outer',
  ac: 'Achievement',
  th: 'Theme',
}

// ─── Placement objectives ────────────────────────────────────────────────────
// Rotation pool per placement × root. System selects by day-of-year.
// Structure: PLACEMENT_OBJECTIVES[placement][root] = { id, text, duration }[]

export const PLACEMENT_OBJECTIVES = {
  lp: {
    1:  [{ id:'lp_1_0',  text:'Take the lead in one area of your life where you have been waiting for permission.', duration:'week' },{ id:'lp_1_1',  text:'Begin the project you have been circling. Start before it is ready.', duration:'week' },{ id:'lp_1_2',  text:'Make one significant decision this week using only your own authority — no consensus.', duration:'week' },{ id:'lp_1_3',  text:'Identify one space where you are following when your code says lead. Reverse it.', duration:'week' }],
    2:  [{ id:'lp_2_0',  text:'Build one genuine bridge between two people in your world who should know each other.', duration:'week' },{ id:'lp_2_1',  text:"In your next conflict, state the other person's position fully before defending your own.", duration:'week' },{ id:'lp_2_2',  text:'Speak your truth in one relationship where diplomatic silence has been keeping a false peace.', duration:'week' },{ id:'lp_2_3',  text:'Ask for what you need from someone today instead of waiting to be offered it.', duration:'day' }],
    3:  [{ id:'lp_3_0',  text:'Create something this week without showing it to anyone. Let it exist for itself.', duration:'week' },{ id:'lp_3_1',  text:'Say one completely honest thing in a conversation where the safe version was ready.', duration:'day' },{ id:'lp_3_2',  text:'Finish one creative project you have left incomplete. Completion is the practice.', duration:'week' },{ id:'lp_3_3',  text:'Express one opinion publicly that you have been keeping private out of fear of judgment.', duration:'week' }],
    4:  [{ id:'lp_4_0',  text:'Design one system for an area of your life currently running on improvisation.', duration:'week' },{ id:'lp_4_1',  text:'Show up to your most important work every day this week — inspired or not.', duration:'week' },{ id:'lp_4_2',  text:'Build something with your hands: cook, repair, assemble, craft. Ground the 4 energy physically.', duration:'week' },{ id:'lp_4_3',  text:'Complete one half-finished structure before starting anything new.', duration:'week' }],
    5:  [{ id:'lp_5_0',  text:'Spend 10 minutes daily in complete stillness — no content, no planning. Just this moment.', duration:'week' },{ id:'lp_5_1',  text:'When the urge to escape or avoid arises today, pause for two minutes and stay.', duration:'day' },{ id:'lp_5_2',  text:'Make one commitment you have been avoiding and stay fully present to keeping it.', duration:'week' },{ id:'lp_5_3',  text:'Say yes to one experience you have been indefinitely postponing.', duration:'week' }],
    6:  [{ id:'lp_6_0',  text:'Identify one way you are currently over-giving and renegotiate it this week.', duration:'week' },{ id:'lp_6_1',  text:'Let someone care for you today without immediately returning the gesture.', duration:'day' },{ id:'lp_6_2',  text:'Set one clear boundary with someone you have been over-accommodating.', duration:'week' },{ id:'lp_6_3',  text:'Design a daily self-care ritual that cannot be cancelled for other people. Hold it.', duration:'week' }],
    7:  [{ id:'lp_7_0',  text:'Spend 30 uninterrupted minutes in genuine solitude today — no input, no content.', duration:'day' },{ id:'lp_7_1',  text:"Act on one intuitive signal this week without seeking anyone's confirmation first.", duration:'week' },{ id:'lp_7_2',  text:'Share one piece of insight from your own direct experience, not from a book or teacher.', duration:'week' },{ id:'lp_7_3',  text:'Identify where analysis is being used to avoid a decision you already know to make.', duration:'week' }],
    8:  [{ id:'lp_8_0',  text:'Name the pattern that most consistently leaks your power. Observe it in operation today.', duration:'day' },{ id:'lp_8_1',  text:'Make one significant decision this week based purely on what is correct, not comfortable.', duration:'week' },{ id:'lp_8_2',  text:'Build one non-negotiable discipline this month — wake time, movement, or sustained practice.', duration:'month' },{ id:'lp_8_3',  text:'Use your authority today to genuinely empower someone rather than direct them.', duration:'day' }],
    9:  [{ id:'lp_9_0',  text:'Identify one relationship, project, or belief you are holding past its natural end. Begin releasing it.', duration:'week' },{ id:'lp_9_1',  text:'Practise forgiveness of one person or past version of yourself this week. Even just internally.', duration:'week' },{ id:'lp_9_2',  text:'Give something away you have been hoarding: time, knowledge, money, or attention.', duration:'week' },{ id:'lp_9_3',  text:'Complete one open cycle — formally, consciously, with gratitude for what it gave you.', duration:'week' }],
    11: [{ id:'lp_11_0', text:'Build a daily grounding ritual — movement, breath, or time in nature. Make it non-negotiable.', duration:'week' },{ id:'lp_11_1', text:'Share one piece of channelled insight with someone who genuinely needs it this week.', duration:'week' },{ id:'lp_11_2', text:'Notice where your sensitivity is causing you to withdraw. Step toward that discomfort once.', duration:'week' },{ id:'lp_11_3', text:'Practice distinguishing your feelings from the feelings of those around you.', duration:'week' }],
    22: [{ id:'lp_22_0', text:'Write your largest vision for what you are building. Let the scale be uncomfortable.', duration:'week' },{ id:'lp_22_1', text:'Identify one place where you are thinking small to avoid the weight of thinking large. Restore it.', duration:'week' },{ id:'lp_22_2', text:'Delegate one task and invest the recovered time in your most important long-horizon project.', duration:'week' },{ id:'lp_22_3', text:'Make one decision this week based on 10-year impact rather than immediate return.', duration:'week' }],
    33: [{ id:'lp_33_0', text:'Draw the line between compassion and martyrdom in your life right now. Where is it blurred?', duration:'week' },{ id:'lp_33_1', text:'Teach something this week from direct experience — not from theory or secondhand knowledge.', duration:'week' },{ id:'lp_33_2', text:'Receive care completely and gratefully this week. Let yourself be seen in your need.', duration:'week' },{ id:'lp_33_3', text:'Create one thing intended purely to heal or comfort someone else.', duration:'week' }],
  },
  cl: {
    1:  [{ id:'cl_1_0',  text:'Step into a leadership role in your field or community that you have been circling.', duration:'week' },{ id:'cl_1_1',  text:'Initiate one collaboration or project this week — you make the first move.', duration:'week' },{ id:'cl_1_2',  text:'Identify where your calling asks you to go first and where you have been waiting. Go first.', duration:'week' },{ id:'cl_1_3',  text:'Launch one idea from your calling this week, imperfect and early.', duration:'week' }],
    2:  [{ id:'cl_2_0',  text:'Your calling is amplified through partnership. Identify one person to build something with.', duration:'week' },{ id:'cl_2_1',  text:'Listen for what is needed in your community before deciding how to contribute this week.', duration:'week' },{ id:'cl_2_2',  text:'Bring two people together whose work or energy would benefit from connection.', duration:'week' },{ id:'cl_2_3',  text:'Find one place your calling asks you to support rather than lead. Show up fully there.', duration:'week' }],
    3:  [{ id:'cl_3_0',  text:'Share your work or ideas in a new format or channel you have not used before.', duration:'week' },{ id:'cl_3_1',  text:'Collaborate with someone whose style is different from yours. Let the contrast strengthen the work.', duration:'week' },{ id:'cl_3_2',  text:'Express one aspect of your calling publicly that you have been keeping internal.', duration:'week' },{ id:'cl_3_3',  text:'Create something this week that is in full service of your calling — without overthinking it.', duration:'week' }],
    4:  [{ id:'cl_4_0',  text:'Identify the structural foundation your calling requires right now. Begin laying it.', duration:'week' },{ id:'cl_4_1',  text:'Work on your most important calling-related project for a dedicated block each day this week.', duration:'week' },{ id:'cl_4_2',  text:'Build one repeatable system or process in your calling that does not require you to improvise.', duration:'week' },{ id:'cl_4_3',  text:'Review your commitments: which ones are aligned with your calling? Which ones are consuming it?', duration:'week' }],
    5:  [{ id:'cl_5_0',  text:'Your calling is asking for a pivot or expansion. Identify what that is and take one step toward it.', duration:'week' },{ id:'cl_5_1',  text:'Bring your calling into an unexpected context this week. Take it somewhere new.', duration:'week' },{ id:'cl_5_2',  text:'Release one structure in your calling that has become a constraint rather than a foundation.', duration:'week' },{ id:'cl_5_3',  text:'Say yes to one opportunity in your calling that involves genuine uncertainty.', duration:'week' }],
    6:  [{ id:'cl_6_0',  text:'Your calling serves others. Identify one person or group currently underserved by your contribution. Reach toward them.', duration:'week' },{ id:'cl_6_1',  text:'Ensure your calling work this week comes from genuine care, not obligation or performance.', duration:'week' },{ id:'cl_6_2',  text:'Create one environment, event, or offering in your calling that genuinely nourishes someone.', duration:'week' },{ id:'cl_6_3',  text:'Check: is your calling currently giving from overflow or from depletion? Adjust accordingly.', duration:'week' }],
    7:  [{ id:'cl_7_0',  text:'Spend one session this week in genuine inquiry about your calling — no outputs, just questions.', duration:'week' },{ id:'cl_7_1',  text:'Research or study one aspect of your calling that you have been taking for granted.', duration:'week' },{ id:'cl_7_2',  text:'Trust one piece of inner knowing about your calling direction this week without seeking external validation.', duration:'week' },{ id:'cl_7_3',  text:'What is your calling actually asking of you right now beneath the noise? Sit with that question.', duration:'week' }],
    8:  [{ id:'cl_8_0',  text:'Bring your full authority to your calling work this week. Do not soften, diminish, or hedge.', duration:'week' },{ id:'cl_8_1',  text:'Make one significant move in your calling this week — the ask, the offer, the decision.', duration:'week' },{ id:'cl_8_2',  text:'Identify where your calling is being undermined by your own ambivalence about your power. Address it.', duration:'week' },{ id:'cl_8_3',  text:'Use your calling to empower one other person this week. Give real power, not instruction.', duration:'week' }],
    9:  [{ id:'cl_9_0',  text:'Your calling is in service of something larger than yourself. Identify what that is clearly.', duration:'week' },{ id:'cl_9_1',  text:'Complete one calling-related cycle you have been dragging through. Close it with full presence.', duration:'week' },{ id:'cl_9_2',  text:'Release one aspect of your calling that belonged to a previous chapter. Let it complete.', duration:'week' },{ id:'cl_9_3',  text:'Give freely from your calling this week with zero expectation of return.', duration:'week' }],
    11: [{ id:'cl_11_0', text:'Your calling is to illuminate. Share one inspired insight in your field this week — channelled, not performed.', duration:'week' },{ id:'cl_11_1', text:'Notice where your intuitive perceptions about your calling are being filtered by self-doubt. Offer one unfiltered.', duration:'week' },{ id:'cl_11_2', text:'Ground your calling in practice this week — the vision is real but it needs a body to move through.', duration:'week' },{ id:'cl_11_3', text:'Identify one place your calling is asking you to go ahead of others. Trust that.', duration:'week' }],
    22: [{ id:'cl_22_0', text:"Your calling is to build at scale. Identify the largest version of what you are building and orient today's work to it.", duration:'week' },{ id:'cl_22_1', text:"Find one way to amplify your calling's reach — through partnership, platform, or structure.", duration:'week' },{ id:'cl_22_2', text:"Make one decision in your calling based on generational impact rather than near-term return.", duration:'week' },{ id:'cl_22_3', text:"Your calling requires legacy thinking. What will this work mean 20 years from now?", duration:'week' }],
    33: [{ id:'cl_33_0', text:'Your calling is to heal and teach. Identify one person whose growth you can genuinely serve this week.', duration:'week' },{ id:'cl_33_1', text:'Create one piece of work in your calling that is designed entirely to uplift someone else.', duration:'week' },{ id:'cl_33_2', text:'Ensure your calling is coming from wholeness this week, not sacrifice. Fill your cup first.', duration:'week' },{ id:'cl_33_3', text:'Teach one thing from direct, lived experience. Not from what you have read — from what you know.', duration:'week' }],
  },
  ex: {
    1:  [{ id:'ex_1_0',  text:'Express one bold, original idea this week that you have been softening for the room.', duration:'week' },{ id:'ex_1_1',  text:'Introduce yourself first in one group or new context this week. Claim your presence.', duration:'week' },{ id:'ex_1_2',  text:'Share one creative or strategic vision publicly before it is fully formed.', duration:'week' },{ id:'ex_1_3',  text:'Speak up once this week in a situation where you would normally let someone else take the lead.', duration:'week' }],
    2:  [{ id:'ex_2_0',  text:"Express yourself in a way that genuinely connects today — not performs, connects.", duration:'day' },{ id:'ex_2_1',  text:"Write or speak something today that acknowledges someone else's perspective fully before offering your own.", duration:'day' },{ id:'ex_2_2',  text:'Find the most diplomatic way to say one honest thing you have been holding back.', duration:'week' },{ id:'ex_2_3',  text:'Collaborate in a creative or communicative project this week. Let the work be shared.', duration:'week' }],
    3:  [{ id:'ex_3_0',  text:'Publish or share one creative expression this week without waiting for it to be perfect.', duration:'week' },{ id:'ex_3_1',  text:'Say the most interesting true thing in every conversation today instead of the safest.', duration:'day' },{ id:'ex_3_2',  text:'Start a creative project you have been planning. Expression deferred is expression denied.', duration:'week' },{ id:'ex_3_3',  text:'Express appreciation or admiration for one person today in genuinely specific terms.', duration:'day' }],
    4:  [{ id:'ex_4_0',  text:'Structure your most important communication this week before you deliver it. Preparation is power.', duration:'week' },{ id:'ex_4_1',  text:'Express yourself with precision today — say exactly what you mean in as few words as needed.', duration:'day' },{ id:'ex_4_2',  text:'Build a consistent communication practice this week: write, record, or speak at the same time daily.', duration:'week' },{ id:'ex_4_3',  text:'Deliver one piece of work or communication that demonstrates your reliability and thoroughness.', duration:'week' }],
    5:  [{ id:'ex_5_0',  text:'Express yourself in a medium or format you have never used before this week.', duration:'week' },{ id:'ex_5_1',  text:'Take one communicative risk today — say the unexpected thing, take the unconventional angle.', duration:'day' },{ id:'ex_5_2',  text:'Bring curiosity rather than control to your expression today. Let it go somewhere new.', duration:'day' },{ id:'ex_5_3',  text:'Tell one story this week that is fully alive — not rehearsed, not safe.', duration:'week' }],
    6:  [{ id:'ex_6_0',  text:"Express care for someone today in words they will actually receive, not just words that feel true to you.", duration:'day' },{ id:'ex_6_1',  text:"Use your voice or creative expression this week in service of someone else's wellbeing.", duration:'week' },{ id:'ex_6_2',  text:'Express a boundary clearly and warmly today in a situation where you have been staying silent.', duration:'day' },{ id:'ex_6_3',  text:'Create one piece of communication this week that is intended purely to nurture.', duration:'week' }],
    7:  [{ id:'ex_7_0',  text:'Express one insight this week that you have arrived at through direct experience, not received wisdom.', duration:'week' },{ id:'ex_7_1',  text:'Write or speak something today that reflects what you actually know, not what you are supposed to say.', duration:'day' },{ id:'ex_7_2',  text:'Share one genuine question you are sitting with rather than pretending to have an answer.', duration:'week' },{ id:'ex_7_3',  text:'Express yourself slowly today — let each word carry actual weight.', duration:'day' }],
    8:  [{ id:'ex_8_0',  text:'Speak with full authority in one high-stakes conversation this week. Do not hedge or soften.', duration:'week' },{ id:'ex_8_1',  text:'Express your vision or position clearly and directly in a context where you have been equivocating.', duration:'week' },{ id:'ex_8_2',  text:'Use your communication today to open a door for someone — make an introduction, write a recommendation, offer a platform.', duration:'day' },{ id:'ex_8_3',  text:'Identify where your expression is leaking power through over-explanation. Say less, mean more.', duration:'week' }],
    9:  [{ id:'ex_9_0',  text:'Express something that completes a cycle: a thank you, an apology, a final word on something long open.', duration:'week' },{ id:'ex_9_1',  text:'Speak to someone this week in a way that helps them release something they have been carrying.', duration:'week' },{ id:'ex_9_2',  text:'Write or record one piece of expression this week that is in full service of something larger than yourself.', duration:'week' },{ id:'ex_9_3',  text:'Let your expression today be generous — give your best insight, your clearest thinking, your genuine warmth.', duration:'day' }],
    11: [{ id:'ex_11_0', text:'Express one intuitive perception this week without softening it with qualifications.', duration:'week' },{ id:'ex_11_1', text:'Channel something today — let your expression come from a deeper place than your analytical mind.', duration:'day' },{ id:'ex_11_2', text:'Share one transmission this week that you feel rather than think. Trust the feeling.', duration:'week' },{ id:'ex_11_3', text:'Speak to the invisible reality in one conversation this week, not just the surface content.', duration:'week' }],
    22: [{ id:'ex_22_0', text:'Express the full scale of your vision this week without diminishing it for the audience.', duration:'week' },{ id:'ex_22_1', text:'Communicate your most important strategic idea to one person who has the capacity to help build it.', duration:'week' },{ id:'ex_22_2', text:'Write or speak about what you are building in terms of its 10-year impact, not its current status.', duration:'week' },{ id:'ex_22_3', text:'Find the most structurally elegant way to express a complex idea this week.', duration:'week' }],
    33: [{ id:'ex_33_0', text:'Express one deeply felt truth this week that has the power to help someone heal.', duration:'week' },{ id:'ex_33_1', text:'Create something this week through your expression that is designed to last — something teaching-quality.', duration:'week' },{ id:'ex_33_2', text:'Let your expression today be a gift with nothing attached. No credit needed.', duration:'day' },{ id:'ex_33_3', text:'Speak from love in one conversation where judgment or frustration would have been the default.', duration:'week' }],
  },
  so: {
    1:  [{ id:'so_1_0',  text:'Your soul craves genuine autonomy. Identify one area where you are still seeking permission and withdraw it.', duration:'week' },{ id:'so_1_1',  text:'Do one thing today that is completely, authentically yours — no audience, no approval.', duration:'day' },{ id:'so_1_2',  text:'Your soul needs you to lead your own life. Where are you following a script someone else wrote?', duration:'week' },{ id:'so_1_3',  text:'Take one action today that your soul has been waiting for your personality to catch up with.', duration:'day' }],
    2:  [{ id:'so_2_0',  text:'Your soul craves deep connection. Reach out to one person today with full presence — no agenda.', duration:'day' },{ id:'so_2_1',  text:'What relationship is your soul currently invested in? Give it genuine attention this week.', duration:'week' },{ id:'so_2_2',  text:'Your soul finds peace in harmony. Identify one internal conflict that needs honest resolution.', duration:'week' },{ id:'so_2_3',  text:'Let yourself be genuinely moved by someone today. Allow the connection to land.', duration:'day' }],
    3:  [{ id:'so_3_0',  text:'Your soul craves authentic expression. Create one thing today purely for the joy of making it.', duration:'day' },{ id:'so_3_1',  text:'Say one thing today that your soul has been wanting to express and your mind has been editing out.', duration:'day' },{ id:'so_3_2',  text:'What does your soul genuinely want to communicate right now? Give it a channel.', duration:'week' },{ id:'so_3_3',  text:'Your soul is fed by creativity. Spend 20 minutes making something with no purpose beyond expression.', duration:'day' }],
    4:  [{ id:'so_4_0',  text:'Your soul craves stability and meaningful work. Identify what you are genuinely building and tend to it today.', duration:'day' },{ id:'so_4_1',  text:'What does your soul need to feel secure right now? Take one practical step to provide that.', duration:'week' },{ id:'so_4_2',  text:'Your soul is nourished by doing real, tangible work. Put in undivided effort on something that matters today.', duration:'day' },{ id:'so_4_3',  text:'Build one thing this week — physical, creative, or structural — that your soul can feel proud of.', duration:'week' }],
    5:  [{ id:'so_5_0',  text:'Your soul craves freedom through presence, not escape. Find the freedom available right here, right now.', duration:'day' },{ id:'so_5_1',  text:'What is your soul actually curious about right now? Follow that thread for 30 minutes today.', duration:'day' },{ id:'so_5_2',  text:'Your soul is not restless — it is alive. Let that aliveness express itself in one concrete way today.', duration:'day' },{ id:'so_5_3',  text:'Say yes to one experience today that your soul is drawn to and your habit-mind is avoiding.', duration:'day' }],
    6:  [{ id:'so_6_0',  text:'Your soul craves to love and be loved without conditions. Let someone in more fully today.', duration:'day' },{ id:'so_6_1',  text:'What does your soul need to feel cared for right now? Provide it for yourself today.', duration:'day' },{ id:'so_6_2',  text:'Your soul is nourished by beauty and belonging. Create one moment of genuine warmth today.', duration:'day' },{ id:'so_6_3',  text:'Identify where you are giving from soul versus giving from obligation. Let only the former guide you today.', duration:'day' }],
    7:  [{ id:'so_7_0',  text:'Your soul craves depth and inner knowing. Spend 20 minutes today in undistracted stillness.', duration:'day' },{ id:'so_7_1',  text:'What does your soul actually know that your mind has been overriding? Listen for it today.', duration:'day' },{ id:'so_7_2',  text:'Your soul is fed by truth-seeking. Ask one question today that you genuinely do not yet know the answer to.', duration:'day' },{ id:'so_7_3',  text:'Trust one quiet inner perception today without explaining it away.', duration:'day' }],
    8:  [{ id:'so_8_0',  text:'Your soul craves genuine power — not control, but mastery. Identify one discipline to deepen this week.', duration:'week' },{ id:'so_8_1',  text:"What is your soul's actual ambition — beneath the approved version? Acknowledge it clearly.", duration:'week' },{ id:'so_8_2',  text:'Your soul is fed by integrity. Identify one place where your actions and your deepest values are not aligned.', duration:'week' },{ id:'so_8_3',  text:'Do one thing today from a place of genuine inner authority, not external pressure.', duration:'day' }],
    9:  [{ id:'so_9_0',  text:'Your soul craves completion and universal love. Identify one cycle ready to close and help it finish.', duration:'week' },{ id:'so_9_1',  text:'What is your soul ready to release that your personality is still gripping? Take one step toward letting go.', duration:'week' },{ id:'so_9_2',  text:'Your soul is nourished by service. Do something generous today with no return expected.', duration:'day' },{ id:'so_9_3',  text:'Practise seeing the larger pattern in one situation that has been frustrating you today.', duration:'day' }],
    11: [{ id:'so_11_0', text:'Your soul craves illumination and transmission. What are you receiving right now that wants to be given?', duration:'week' },{ id:'so_11_1', text:"Ground your soul's sensitivity today — move your body, spend time in nature, breathe consciously.", duration:'day' },{ id:'so_11_2', text:"Your soul's knowing is accurate. Trust one perception today that your mind wants to dismiss.", duration:'day' },{ id:'so_11_3', text:'Identify what your soul most needs to feel safe right now. Provide it with care.', duration:'week' }],
    22: [{ id:'so_22_0', text:"Your soul craves building something that matters beyond your lifetime. Tend to that work today.", duration:'day' },{ id:'so_22_1', text:"What is your soul's vision for your life at full scale? Write it down without editing.", duration:'week' },{ id:'so_22_2', text:"Your soul is nourished by meaningful impact. Identify one action today that serves your largest purpose.", duration:'day' },{ id:'so_22_3', text:"Let your soul's ambition be as large as it actually is. Stop making it smaller.", duration:'week' }],
    33: [{ id:'so_33_0', text:"Your soul craves to heal and uplift. Do one thing today specifically intended to lighten someone's load.", duration:'day' },{ id:'so_33_1', text:'Your soul is fed by giving from wholeness. Fill your cup first today before offering anything to anyone.', duration:'day' },{ id:'so_33_2', text:'What does your soul most want to teach right now? Find one way to express it this week.', duration:'week' },{ id:'so_33_3', text:'Let yourself receive care today with genuine openness. Your soul needs that too.', duration:'day' }],
  },
  ou: {
    1:  [{ id:'ou_1_0',  text:'Others experience you as a pioneer. Step into one room this week as if that is simply true.', duration:'week' },{ id:'ou_1_1',  text:'Your outer presence signals leadership. Use it deliberately in one situation this week.', duration:'week' },{ id:'ou_1_2',  text:'Arrive first, speak first, act first in one context today. Embody the 1 frequency visibly.', duration:'day' },{ id:'ou_1_3',  text:'Let your outer confidence invite rather than intimidate today. Lead with warmth and direction.', duration:'day' }],
    2:  [{ id:'ou_2_0',  text:'Others experience you as a mediator and connector. Use that gift deliberately in one situation today.', duration:'day' },{ id:'ou_2_1',  text:'Your outer presence creates safety for others. Show up fully present in your most important interaction today.', duration:'day' },{ id:'ou_2_2',  text:'Be the calm in one situation today where others are reactive. Your outer 2 is a resource.', duration:'day' },{ id:'ou_2_3',  text:'Let your natural attentiveness be your most visible quality in one interaction this week.', duration:'week' }],
    3:  [{ id:'ou_3_0',  text:'Others experience you as vibrant and expressive. Let that be genuine rather than performed today.', duration:'day' },{ id:'ou_3_1',  text:'Your outer presence lights up rooms. Bring that energy to one interaction that needs it.', duration:'week' },{ id:'ou_3_2',  text:'Let your natural creativity be visible in one exchange today — in how you speak, create, or connect.', duration:'day' },{ id:'ou_3_3',  text:'Smile with intent today. Your outer warmth is a real contribution to people around you.', duration:'day' }],
    4:  [{ id:'ou_4_0',  text:'Others experience you as reliable and grounded. Honour that today by being completely trustworthy in one commitment.', duration:'day' },{ id:'ou_4_1',  text:'Your outer presence signals stability. Be the steadiest person in the room in one situation this week.', duration:'week' },{ id:'ou_4_2',  text:'Let your thoroughness be visible today — do one thing with complete care and attention to detail.', duration:'day' },{ id:'ou_4_3',  text:'Your outer 4 builds trust over time. Identify one relationship where consistent reliability is the gift needed.', duration:'week' }],
    5:  [{ id:'ou_5_0',  text:'Others experience you as dynamic and engaging. Bring your most alive, present self to one interaction today.', duration:'day' },{ id:'ou_5_1',  text:'Your outer presence invites others to loosen up. Use that gift consciously in one situation this week.', duration:'week' },{ id:'ou_5_2',  text:'Let your natural adaptability be visible — navigate one unexpected change today with visible ease.', duration:'day' },{ id:'ou_5_3',  text:'Your outer energy is energising to others. Bring it fully to your most important interaction today.', duration:'day' }],
    6:  [{ id:'ou_6_0',  text:'Others experience you as warm and caring. Let that be real today, not just behavioural.', duration:'day' },{ id:'ou_6_1',  text:'Your outer presence creates a feeling of being seen. Give that gift fully to one person today.', duration:'day' },{ id:'ou_6_2',  text:'Be the person who makes the space feel safer in one situation today. Your outer 6 does this naturally.', duration:'day' },{ id:'ou_6_3',  text:'Let your genuine care be visible in one small, specific act today. Not grand — precise.', duration:'day' }],
    7:  [{ id:'ou_7_0',  text:'Others experience you as deep and considered. Honour that with real thoughtfulness in one exchange today.', duration:'day' },{ id:'ou_7_1',  text:'Your outer presence signals trustworthiness through depth. Let people see that you have actually thought.', duration:'week' },{ id:'ou_7_2',  text:'Speak with genuine precision today — fewer words, each one chosen.', duration:'day' },{ id:'ou_7_3',  text:'Your outer 7 creates a sense of mystery and depth. Let your silence speak as clearly as your words.', duration:'week' }],
    8:  [{ id:'ou_8_0',  text:'Others experience you as powerful and authoritative. Step into that today without apology.', duration:'day' },{ id:'ou_8_1',  text:'Your outer presence signals competence. Demonstrate it concretely in one high-stakes situation this week.', duration:'week' },{ id:'ou_8_2',  text:'Let your authority be felt in one interaction today — not through force, through unshakeable clarity.', duration:'day' },{ id:'ou_8_3',  text:'Your outer 8 opens doors. Walk through one of them this week that you have been standing outside of.', duration:'week' }],
    9:  [{ id:'ou_9_0',  text:'Others experience you as wise and compassionate. Offer that wisdom generously in one situation today.', duration:'day' },{ id:'ou_9_1',  text:'Your outer presence contains others. Be the most spacious person in the room in one interaction today.', duration:'day' },{ id:'ou_9_2',  text:'Let your genuine acceptance of people be visible today. Someone near you needs to feel that.', duration:'day' },{ id:'ou_9_3',  text:'Your outer 9 signals completion and perspective. Bring that energy to one situation needing resolution.', duration:'week' }],
    11: [{ id:'ou_11_0', text:"Others experience you as intuitive and illuminating. Share one perception today that others haven't voiced.", duration:'day' },{ id:'ou_11_1', text:'Your outer presence carries unusual frequency. Ground it today so it is felt as warmth, not intensity.', duration:'day' },{ id:'ou_11_2', text:'Let your sensitivity be a visible gift in one interaction today — notice what others miss.', duration:'day' },{ id:'ou_11_3', text:'Your outer 11 can inspire. Bring one genuinely inspired thought into one conversation this week.', duration:'week' }],
    22: [{ id:'ou_22_0', text:'Others experience you as visionary and structurally powerful. Let that be evident in one interaction today.', duration:'day' },{ id:'ou_22_1', text:'Your outer presence signals that big things are possible. Confirm that perception in one situation this week.', duration:'week' },{ id:'ou_22_2', text:'Let your strategic thinking be visible and useful to one person today.', duration:'day' },{ id:'ou_22_3', text:'Your outer 22 builds confidence in others. Be the person who makes the vision feel real today.', duration:'day' }],
    33: [{ id:'ou_33_0', text:'Others experience you as healing and deeply caring. Let that be unconditional in one interaction today.', duration:'day' },{ id:'ou_33_1', text:'Your outer presence creates space for people to be seen. Offer that to one person who needs it.', duration:'week' },{ id:'ou_33_2', text:'Let your compassion be precise today — not general warmth, but attunement to what one specific person needs.', duration:'day' },{ id:'ou_33_3', text:'Your outer 33 can shift rooms. Show up with full love in one difficult or tense situation today.', duration:'week' }],
  },
  ac: {
    1:  [{ id:'ac_1_0',  text:"Your achievement frequency calls you to initiate. What is the one thing you are here to start that hasn't started yet?", duration:'week' },{ id:'ac_1_1',  text:"Make one move this week toward your most important goal that requires no one's permission.", duration:'week' },{ id:'ac_1_2',  text:'Your greatest achievements begin alone. Identify the solo step that needs to happen this week.', duration:'week' },{ id:'ac_1_3',  text:'Take the first action on the project your achievement frequency is pointing at. Not the plan — the action.', duration:'week' }],
    2:  [{ id:'ac_2_0',  text:'Your achievement is amplified through partnership. Identify one alliance that would accelerate your most important work.', duration:'week' },{ id:'ac_2_1',  text:'What collective goal are you positioned to help achieve right now? Step fully into that role.', duration:'week' },{ id:'ac_2_2',  text:'Your achievement frequency is cooperative, not competitive. Where can you build something greater together?', duration:'week' },{ id:'ac_2_3',  text:'Reach out to one person this week whose skills complement yours. Your achievement needs this connection.', duration:'week' }],
    3:  [{ id:'ac_3_0',  text:'Your achievement comes through creative expression and communication. Create or communicate something today that advances it.', duration:'day' },{ id:'ac_3_1',  text:'What is the creative output your achievement frequency is calling for right now? Begin it.', duration:'week' },{ id:'ac_3_2',  text:'Your greatest achievement is leaving something expressive in the world. What wants to be made?', duration:'week' },{ id:'ac_3_3',  text:'Share work in progress this week. Your achievement frequency rewards visibility over perfection.', duration:'week' }],
    4:  [{ id:'ac_4_0',  text:'Your achievement is built through sustained, disciplined effort. Work on your most important project every day this week.', duration:'week' },{ id:'ac_4_1',  text:'Identify the foundational work your achievement requires. Do the unglamorous part today.', duration:'day' },{ id:'ac_4_2',  text:'Build one system that advances your most important achievement goal without requiring daily decisions.', duration:'week' },{ id:'ac_4_3',  text:'Your greatest achievements are the result of patience and precision. Slow down and do this right.', duration:'week' }],
    5:  [{ id:'ac_5_0',  text:'Your achievement thrives on versatility and adaptability. Where is a pivot needed right now?', duration:'week' },{ id:'ac_5_1',  text:'What opportunity in your achievement path requires a yes before you are fully ready? Say yes.', duration:'week' },{ id:'ac_5_2',  text:'Your achievement frequency needs movement. Take one concrete step today even if direction is not yet perfect.', duration:'day' },{ id:'ac_5_3',  text:'Bring your achievement into one new context or channel this week. Expand the reach.', duration:'week' }],
    6:  [{ id:'ac_6_0',  text:'Your achievement is in service of others. Identify who benefits most from your work and orient toward them.', duration:'week' },{ id:'ac_6_1',  text:'What can you accomplish this week that would make a genuine difference to someone who needs it?', duration:'week' },{ id:'ac_6_2',  text:'Your achievement frequency is relational. Invest in one key relationship that your work depends on.', duration:'week' },{ id:'ac_6_3',  text:'Create one thing this week in your domain of achievement that is designed to genuinely help.', duration:'week' }],
    7:  [{ id:'ac_7_0',  text:'Your achievement requires mastery through depth. Invest in one skill or area of knowledge this week.', duration:'week' },{ id:'ac_7_1',  text:'What do you need to learn, understand, or master to advance your most important achievement? Begin that.', duration:'week' },{ id:'ac_7_2',  text:'Your achievement is built on inner authority. Spend time this week deepening your expertise alone.', duration:'week' },{ id:'ac_7_3',  text:'Trust your own assessment of the next step in your achievement path. Stop seeking external confirmation.', duration:'week' }],
    8:  [{ id:'ac_8_0',  text:'Your achievement frequency is aligned with significant accomplishment. Raise the bar on one goal this week.', duration:'week' },{ id:'ac_8_1',  text:'Make one bold move toward your most important achievement this week. The 8 rewards decisive action.', duration:'week' },{ id:'ac_8_2',  text:'Your achievement requires you to claim your power fully. Where are you still playing small?', duration:'week' },{ id:'ac_8_3',  text:'Identify your most significant achievement goal and make the single most direct move toward it today.', duration:'day' }],
    9:  [{ id:'ac_9_0',  text:'Your achievement is in service of something larger than personal success. What is that larger purpose?', duration:'week' },{ id:'ac_9_1',  text:'Complete one achievement-level goal or project that has been left open. Close it properly.', duration:'week' },{ id:'ac_9_2',  text:'Give away one piece of your best work, knowledge, or insight this week with no return expected.', duration:'week' },{ id:'ac_9_3',  text:'Your achievement frequency calls for completion before new beginnings. What needs to finish first?', duration:'week' }],
    11: [{ id:'ac_11_0', text:'Your achievement is to inspire and illuminate. What insight or vision are you here to bring into the world?', duration:'week' },{ id:'ac_11_1', text:'Share one inspired idea this week that your achievement frequency is pointing toward.', duration:'week' },{ id:'ac_11_2', text:'Your greatest achievement may be what you transmit to others. What are you passing forward?', duration:'week' },{ id:'ac_11_3', text:'Ground your vision in one practical step this week. Achievement requires both inspiration and action.', duration:'week' }],
    22: [{ id:'ac_22_0', text:'Your achievement frequency calls for building at a scale that outlasts you. What are you building today toward that?', duration:'day' },{ id:'ac_22_1', text:'Identify the most structurally important action in your most important achievement goal. Do it this week.', duration:'week' },{ id:'ac_22_2', text:'Your achievement needs a 10-year frame. Define what success looks like at that horizon.', duration:'week' },{ id:'ac_22_3', text:'Find one way to leverage your work so it extends beyond your direct effort. Build for scale.', duration:'week' }],
    33: [{ id:'ac_33_0', text:'Your achievement is to heal and teach at scale. What is one way to bring that forward this week?', duration:'week' },{ id:'ac_33_1', text:'Create one piece of work in your achievement domain that could help someone you will never meet.', duration:'week' },{ id:'ac_33_2', text:'Your greatest achievement is being a clear channel for healing. Tend to your own wholeness first.', duration:'week' },{ id:'ac_33_3', text:'Teach from your deepest experience this week. That is where your achievement frequency lives.', duration:'week' }],
  },
  th: {
    1:  [{ id:'th_1_0',  text:'Your life theme is new beginnings. Where in your life is something genuinely starting? Give it your full attention.', duration:'week' },{ id:'th_1_1',  text:'Your theme calls you to be the one who initiates. What has been waiting for you to go first?', duration:'week' },{ id:'th_1_2',  text:"The 1 theme asks: are you living your own life or someone else's version of it? Take one step toward your own.", duration:'week' },{ id:'th_1_3',  text:'Your theme is originality. Do one thing today that could only have come from you.', duration:'day' }],
    2:  [{ id:'th_2_0',  text:'Your life theme is cooperation and sensitivity. Where are you being called to partner more deeply right now?', duration:'week' },{ id:'th_2_1',  text:'Your theme asks you to trust that patience is productive. Rest in the collaborative process today.', duration:'day' },{ id:'th_2_2',  text:'The 2 theme is relationship. Identify the most important relationship in your current chapter and invest in it.', duration:'week' },{ id:'th_2_3',  text:'Your theme is attunement. What is the subtlest thing happening in your environment right now? Pay attention to it.', duration:'day' }],
    3:  [{ id:'th_3_0',  text:'Your life theme is creative expression. What wants to be made by you that only you can make?', duration:'week' },{ id:'th_3_1',  text:'Your theme calls you to communicate authentically. What truth have you been softening that wants to be spoken?', duration:'week' },{ id:'th_3_2',  text:'The 3 theme is joy and expression. When did you last do something purely for the pleasure of doing it?', duration:'week' },{ id:'th_3_3',  text:'Your theme is creativity. Create something today — not for outcome, for expression.', duration:'day' }],
    4:  [{ id:'th_4_0',  text:'Your life theme is foundation building. What are you constructing right now that will still be standing in 10 years?', duration:'week' },{ id:'th_4_1',  text:'Your theme calls for discipline and consistency. Identify the one daily practice that, if held, transforms everything.', duration:'week' },{ id:'th_4_2',  text:'The 4 theme is patience and permanence. Are you building something real, or accumulating the appearance of building?', duration:'week' },{ id:'th_4_3',  text:'Your theme is structure. Design or refine one system in your life that removes the need for daily decisions.', duration:'week' }],
    5:  [{ id:'th_5_0',  text:'Your life theme is freedom and presence. Where are you still chasing the idea of freedom instead of inhabiting it?', duration:'week' },{ id:'th_5_1',  text:"Your theme calls for adaptability. What change is arriving in your life that you are trying to manage instead of embrace?", duration:'week' },{ id:'th_5_2',  text:'The 5 theme is aliveness. What makes you feel most fully alive? Do more of that deliberately.', duration:'week' },{ id:'th_5_3',  text:'Your theme is versatility. What have you been treating as fixed that is actually movable?', duration:'week' }],
    6:  [{ id:'th_6_0',  text:'Your life theme is love and responsibility. Where are you called to care more deeply right now?', duration:'week' },{ id:'th_6_1',  text:'Your theme asks: are you giving from love or from fear? Check your motivations in your most important commitments.', duration:'week' },{ id:'th_6_2',  text:'The 6 theme is beauty and belonging. Create one moment of genuine beauty in your daily environment today.', duration:'day' },{ id:'th_6_3',  text:'Your theme is service with boundaries. Where is your care sustainable, and where is it costing you too much?', duration:'week' }],
    7:  [{ id:'th_7_0',  text:'Your life theme is truth and inner wisdom. What do you know that you have not yet fully trusted?', duration:'week' },{ id:'th_7_1',  text:'Your theme calls you inward. Spend time this week in genuine solitude without agenda.', duration:'week' },{ id:'th_7_2',  text:'The 7 theme is depth over breadth. Where are you spreading yourself thin when mastery is what is needed?', duration:'week' },{ id:'th_7_3',  text:'Your theme is spiritual intelligence. What is the deeper meaning in the pattern you are currently living through?', duration:'week' }],
    8:  [{ id:'th_8_0',  text:'Your life theme is power and mastery. Where in your life are you still giving your power away?', duration:'week' },{ id:'th_8_1',  text:'Your theme calls for material engagement. Your spirituality includes your finances, your body, your results.', duration:'week' },{ id:'th_8_2',  text:'The 8 theme is abundance through integrity. Where are power and integrity currently misaligned in your life?', duration:'week' },{ id:'th_8_3',  text:'Your theme is authority. In one domain of your life, step fully into the authority you actually carry.', duration:'week' }],
    9:  [{ id:'th_9_0',  text:'Your life theme is completion and service. What cycle in your life is at its natural end right now?', duration:'week' },{ id:'th_9_1',  text:"Your theme calls for generosity and release. Give something away this week that someone else needs more than you.", duration:'week' },{ id:'th_9_2',  text:'The 9 theme is wisdom through experience. What is the deepest lesson from your life so far that you are being asked to share?', duration:'week' },{ id:'th_9_3',  text:'Your theme is universal love. Practice seeing one difficult person or situation through the lens of compassion today.', duration:'day' }],
    11: [{ id:'th_11_0', text:'Your life theme is illumination and mastery. What insight are you carrying that the world needs to hear?', duration:'week' },{ id:'th_11_1', text:'Your theme calls for grounded inspiration. Ensure your vision is connected to daily, embodied practice.', duration:'week' },{ id:'th_11_2', text:'The 11 theme is the bridge between worlds. Where are you translating higher understanding into practical guidance for others?', duration:'week' },{ id:'th_11_3', text:'Your theme is sensitivity as a superpower. What are you perceiving that others are not yet seeing?', duration:'week' }],
    22: [{ id:'th_22_0', text:'Your life theme is master building. What are you building that could outlast you? Work on it today.', duration:'day' },{ id:'th_22_1', text:'Your theme calls for vision at scale. Stop making your vision small enough to be comfortable.', duration:'week' },{ id:'th_22_2', text:'The 22 theme is structure and legacy. What foundational work are you doing right now that will matter in 20 years?', duration:'week' },{ id:'th_22_3', text:'Your theme is practical idealism. Take the grandest vision you carry and make one tangible move toward it today.', duration:'day' }],
    33: [{ id:'th_33_0', text:'Your life theme is compassionate mastery. Are you serving from genuine love or from a need to be needed?', duration:'week' },{ id:'th_33_1', text:'Your theme calls for healing through presence. Simply being fully yourself is often the most powerful thing you can offer.', duration:'week' },{ id:'th_33_2', text:'The 33 theme is the master teacher. What is the most important thing you know that you are not yet teaching?', duration:'week' },{ id:'th_33_3', text:'Your theme is love as a structural force. Bring unconditional positive regard to one difficult relationship this week.', duration:'week' }],
  },
}

// ─── Tiered life-quest progression ──────────────────────────────────────────
// Structure: TIERED_PROGRESSION[root][tier] = { label, objectives: {id,text,duration}[] }
// Tier 1 = APPRENTICE (7-day), Tier 2 = ADEPT (14-day), Tier 3 = MASTER (30-day)

export const TIERED_PROGRESSION = {
  1: {
    1: { label:'APPRENTICE', objectives:[{ id:'tp_1_t1_0', text:'Identify one thing you have been waiting for permission to start. Begin it today without asking anyone.', duration:'day' },{ id:'tp_1_t1_1', text:'Take the lead in one conversation or decision this week.', duration:'week' },{ id:'tp_1_t1_2', text:'For 7 consecutive days, initiate one meaningful action before noon that you would normally delay.', duration:'week' }]},
    2: { label:'ADEPT',      objectives:[{ id:'tp_1_t2_0', text:'Initiate something this week with no safety net — no approval guarantee, no fallback.', duration:'week' },{ id:'tp_1_t2_1', text:'Step into a leadership role you have been circling: volunteer, propose, or own a direction publicly.', duration:'week' },{ id:'tp_1_t2_2', text:'For 14 consecutive days, make one significant decision without seeking external approval.', duration:'week' }]},
    3: { label:'MASTER',     objectives:[{ id:'tp_1_t3_0', text:'Launch something that has never existed before — not a plan, the thing itself.', duration:'month' },{ id:'tp_1_t3_1', text:'Take full public ownership of a direction others are uncertain about. Lead from conviction alone.', duration:'month' },{ id:'tp_1_t3_2', text:'For 30 consecutive days, lead from the front — initiate, decide, and act without waiting for permission or certainty.', duration:'month' }]},
  },
  2: {
    1: { label:'APPRENTICE', objectives:[{ id:'tp_2_t1_0', text:"In your next disagreement, state the other person's position fully before stating your own.", duration:'day' },{ id:'tp_2_t1_1', text:'Reach out to one person you have been distant from. One message. No agenda.', duration:'day' },{ id:'tp_2_t1_2', text:'For 7 consecutive days, reach out to someone with genuine attention — no agenda, no distraction.', duration:'week' }]},
    2: { label:'ADEPT',      objectives:[{ id:'tp_2_t2_0', text:'Facilitate a genuine resolution between two people in conflict this week. Stay fully neutral.', duration:'week' },{ id:'tp_2_t2_1', text:'State your truth clearly in one relationship where silence has been keeping a false peace.', duration:'week' },{ id:'tp_2_t2_2', text:'For 14 consecutive days, practise full presence in at least one conversation — no phone, no half-listening.', duration:'week' }]},
    3: { label:'MASTER',     objectives:[{ id:'tp_2_t3_0', text:'Repair a relationship you have written off. Do it fully — not as a gesture, as a completion.', duration:'month' },{ id:'tp_2_t3_1', text:'Be fully yourself and fully connected at the same time, in the same space. Hold both.', duration:'month' },{ id:'tp_2_t3_2', text:'For 30 consecutive days, choose connection over withdrawal — show up fully in your relationships, even when you want to retreat.', duration:'month' }]},
  },
  3: {
    1: { label:'APPRENTICE', objectives:[{ id:'tp_3_t1_0', text:'Say something out loud you have been holding inside. One true thing, to one real person.', duration:'day' },{ id:'tp_3_t1_1', text:'Finish one creative project you started and abandoned. Any size. Completion is the point.', duration:'week' },{ id:'tp_3_t1_2', text:'For 7 consecutive days, create something — however small — without showing it to anyone.', duration:'week' }]},
    2: { label:'ADEPT',      objectives:[{ id:'tp_3_t2_0', text:'Identify one area where you are performing for approval instead of expressing truth. Drop it.', duration:'week' },{ id:'tp_3_t2_1', text:'Collaborate where your distinct voice is the contribution — not your effort or reliability.', duration:'week' },{ id:'tp_3_t2_2', text:'For 14 consecutive days, express something true about yourself in writing, art, or conversation.', duration:'week' }]},
    3: { label:'MASTER',     objectives:[{ id:'tp_3_t3_0', text:'Begin a body of work — not a single piece, but a complete vision expressed across multiple outputs.', duration:'month' },{ id:'tp_3_t3_1', text:'Stand fully in your creative identity in a room where it makes others uncomfortable. Do not shrink.', duration:'month' },{ id:'tp_3_t3_2', text:'For 30 consecutive days, create daily and share at least one piece publicly before the cycle ends.', duration:'month' }]},
  },
  4: {
    1: { label:'APPRENTICE', objectives:[{ id:'tp_4_t1_0', text:'Choose one area of your life in disorder. Create one simple rule for it and follow it today.', duration:'day' },{ id:'tp_4_t1_1', text:'Show up to one commitment exactly when you said you would — no adjustment, no exception.', duration:'day' },{ id:'tp_4_t1_2', text:'For 7 consecutive days, complete your three most important tasks before touching anything optional.', duration:'week' }]},
    2: { label:'ADEPT',      objectives:[{ id:'tp_4_t2_0', text:'Design a weekly structure for your most important work and run it without deviation.', duration:'week' },{ id:'tp_4_t2_1', text:'Identify the system in your life that breaks most often. Rebuild it properly — do not just patch it.', duration:'week' },{ id:'tp_4_t2_2', text:'For 14 consecutive days, follow a fixed daily structure without deviation — same wake time, same sequence.', duration:'week' }]},
    3: { label:'MASTER',     objectives:[{ id:'tp_4_t3_0', text:'Architect a system that runs without your constant presence in it. Build it to outlast this chapter.', duration:'month' },{ id:'tp_4_t3_1', text:'Review every major commitment you hold. Release what is misaligned. Deepen everything that remains.', duration:'month' },{ id:'tp_4_t3_2', text:'For 30 consecutive days, build toward one long-term goal with a minimum daily action — no skipping, no exceptions.', duration:'month' }]},
  },
  5: {
    1: { label:'APPRENTICE', objectives:[{ id:'tp_5_t1_0', text:'Spend 10 minutes today in complete stillness — no phone, no input, no planning. Just this moment.', duration:'day' },{ id:'tp_5_t1_1', text:'Say yes to one sensory experience you have been avoiding or indefinitely postponing.', duration:'week' },{ id:'tp_5_t1_2', text:'For 7 consecutive days, do one thing completely outside your established routine.', duration:'week' }]},
    2: { label:'ADEPT',      objectives:[{ id:'tp_5_t2_0', text:'Make one commitment you have been avoiding. Stay present to the discomfort of keeping it.', duration:'week' },{ id:'tp_5_t2_1', text:'Choose one constraint and inhabit it completely. Find the freedom that lives inside structure.', duration:'week' },{ id:'tp_5_t2_2', text:'For 14 consecutive days, stay fully present to what is — no escape mechanisms, no numbing.', duration:'week' }]},
    3: { label:'MASTER',     objectives:[{ id:'tp_5_t3_0', text:'Choose one fixed commitment in an area you have always kept deliberately fluid. Hold it a full cycle.', duration:'month' },{ id:'tp_5_t3_1', text:'Bring complete presence to your most important relationship for one full week. No distraction.', duration:'week' },{ id:'tp_5_t3_2', text:'For 30 consecutive days, choose freedom through engagement rather than avoidance — meet every experience with full presence.', duration:'month' }]},
  },
  6: {
    1: { label:'APPRENTICE', objectives:[{ id:'tp_6_t1_0', text:'List three ways you are currently over-giving. Pick one and renegotiate it today.', duration:'day' },{ id:'tp_6_t1_1', text:'Set one clear boundary with someone you have been over-accommodating. Say it clearly and kindly.', duration:'week' },{ id:'tp_6_t1_2', text:'For 7 consecutive days, perform one act of genuine care for someone other than yourself.', duration:'week' }]},
    2: { label:'ADEPT',      objectives:[{ id:'tp_6_t2_0', text:'Identify where you are giving from obligation rather than genuine love. Redirect that energy.', duration:'week' },{ id:'tp_6_t2_1', text:'Have one honest conversation with someone you have been protecting through silence.', duration:'week' },{ id:'tp_6_t2_2', text:'For 14 consecutive days, practise one act of real self-care — not as a reward, as a standard.', duration:'week' }]},
    3: { label:'MASTER',     objectives:[{ id:'tp_6_t3_0', text:'Heal one dynamic where care has quietly become control. Release the outcome completely.', duration:'month' },{ id:'tp_6_t3_1', text:'Create an environment — a space, a gathering — that genuinely transforms someone who enters it.', duration:'month' },{ id:'tp_6_t3_2', text:'For 30 consecutive days, show up as a source of genuine support for at least one person — consistently, without keeping score.', duration:'month' }]},
  },
  7: {
    1: { label:'APPRENTICE', objectives:[{ id:'tp_7_t1_0', text:'Act on one intuitive signal today without consulting anyone else first. Trust the knowing.', duration:'day' },{ id:'tp_7_t1_1', text:'Write one thing you know from direct personal experience — not from a book or someone else.', duration:'week' },{ id:'tp_7_t1_2', text:'For 7 consecutive days, spend 20 minutes in complete solitude and silence — no input, no content.', duration:'week' }]},
    2: { label:'ADEPT',      objectives:[{ id:'tp_7_t2_0', text:'Identify one area where analysis is avoiding a commitment you already know to make. Decide.', duration:'week' },{ id:'tp_7_t2_1', text:'Share one piece of inner knowing publicly — without qualification, apology, or softening.', duration:'week' },{ id:'tp_7_t2_2', text:'For 14 consecutive days, sit in daily undistracted solitude at the same time each day.', duration:'week' }]},
    3: { label:'MASTER',     objectives:[{ id:'tp_7_t3_0', text:'Write the thing you know — the complete version, the full map. Give it to the world without editing it safe.', duration:'month' },{ id:'tp_7_t3_1', text:'Become so still inside that the depth of your knowing is the first thing people feel when near you.', duration:'month' },{ id:'tp_7_t3_2', text:'For 30 consecutive days, operate primarily from your own inner authority. Track every external deflection.', duration:'month' }]},
  },
  8: {
    1: { label:'APPRENTICE', objectives:[{ id:'tp_8_t1_0', text:'Name the pattern that most consistently leaks your power. Watch it today without acting from it.', duration:'day' },{ id:'tp_8_t1_1', text:'Make one decision today based purely on what is correct — not comfortable or likely to be approved.', duration:'day' },{ id:'tp_8_t1_2', text:'For 7 consecutive days, complete your single highest-value task first — before anything else.', duration:'week' }]},
    2: { label:'ADEPT',      objectives:[{ id:'tp_8_t2_0', text:'Identify your primary power leak and build one structural change that permanently closes it.', duration:'week' },{ id:'tp_8_t2_1', text:'Use your influence this week to genuinely empower someone else — give them power, not instruction.', duration:'week' },{ id:'tp_8_t2_2', text:'For 14 consecutive days, track one key metric that matters to your goals — and act on what it reveals.', duration:'week' }]},
    3: { label:'MASTER',     objectives:[{ id:'tp_8_t3_0', text:'Audit your entire life for where power and integrity are misaligned. Close every gap as a permanent standard.', duration:'month' },{ id:'tp_8_t3_1', text:'Build something that generates sustained power without requiring your daily presence to maintain it.', duration:'month' },{ id:'tp_8_t3_2', text:'For 30 consecutive days, operate from full personal authority — no complaining, no blaming, no waiting for conditions to improve.', duration:'month' }]},
  },
  9: {
    1: { label:'APPRENTICE', objectives:[{ id:'tp_9_t1_0', text:'Identify one relationship, habit, or belief at its natural end. Take one step toward releasing it.', duration:'week' },{ id:'tp_9_t1_1', text:'Give something away you have been hoarding: time, knowledge, money, attention, or a physical object.', duration:'week' },{ id:'tp_9_t1_2', text:'For 7 consecutive days, identify and release one thing — a thought, a habit, a resentment — before the day ends.', duration:'week' }]},
    2: { label:'ADEPT',      objectives:[{ id:'tp_9_t2_0', text:'Complete one cycle you have been dragging on. Close it formally, consciously, with full presence.', duration:'week' },{ id:'tp_9_t2_1', text:'Give time or energy this week to something larger than your personal interests — no return expected.', duration:'week' },{ id:'tp_9_t2_2', text:'For 14 consecutive days, give one meaningful contribution to something beyond your personal interests.', duration:'week' }]},
    3: { label:'MASTER',     objectives:[{ id:'tp_9_t3_0', text:'Identify the oldest unfinished cycle in your life. Complete it this month — fully, with gratitude.', duration:'month' },{ id:'tp_9_t3_1', text:'Release something you treasure deeply that has already completed its purpose. Let it go without conditions.', duration:'month' },{ id:'tp_9_t3_2', text:'For 30 consecutive days, live as if completing a chapter — full presence, full giving, full willingness to release what is finished.', duration:'month' }]},
  },
  11: {
    1: { label:'APPRENTICE', objectives:[{ id:'tp_11_t1_0', text:'Sit in 20 minutes of unstructured silence today. Do not interpret what surfaces — only observe it.', duration:'day' },{ id:'tp_11_t1_1', text:'Share one vision or inner knowing with another person without softening it for their comfort.', duration:'week' },{ id:'tp_11_t1_2', text:'For 7 consecutive days, record every intuitive signal — then act on at least one before the day ends.', duration:'week' }]},
    2: { label:'ADEPT',      objectives:[{ id:'tp_11_t2_0', text:'Identify where you are performing sensitivity rather than living from it. Drop the performance.', duration:'week' },{ id:'tp_11_t2_1', text:'Deliver one piece of illuminated truth into a space that has none — a conversation, a room, a relationship.', duration:'week' },{ id:'tp_11_t2_2', text:'For 14 consecutive days, receive without broadcasting — gather impressions, resist the urge to immediately share.', duration:'week' }]},
    3: { label:'MASTER',     objectives:[{ id:'tp_11_t3_0', text:'Commit fully to both your human life and your higher sensitivity at once. Stop choosing between them.', duration:'month' },{ id:'tp_11_t3_1', text:"Transmit one vision at its fullest frequency to the world. Not a hint of it — all of it.", duration:'month' },{ id:'tp_11_t3_2', text:'For 30 consecutive days, operate as a clear channel — note every moment your ego distorts the signal, and correct it.', duration:'month' }]},
  },
  22: {
    1: { label:'APPRENTICE', objectives:[{ id:'tp_22_t1_0', text:"Identify the largest-scale thing you have been thinking about but never written down. Write the full vision today.", duration:'day' },{ id:'tp_22_t1_1', text:'Examine one structure in your immediate world — a system, process, or organisation — and identify its single greatest flaw and fix.', duration:'week' },{ id:'tp_22_t1_2', text:'For 7 consecutive days, take one practical action toward the largest vision you hold — however small.', duration:'week' }]},
    2: { label:'ADEPT',      objectives:[{ id:'tp_22_t2_0', text:'Identify where your vision has stayed theoretical. Convert one concept into a concrete, working component.', duration:'week' },{ id:'tp_22_t2_1', text:'Bring a group of people together around a shared mission you believe in. Facilitate rather than control.', duration:'week' },{ id:'tp_22_t2_2', text:'For 14 consecutive days, work on a structure or system that serves more people than just yourself.', duration:'week' }]},
    3: { label:'MASTER',     objectives:[{ id:'tp_22_t3_0', text:'Identify the legacy dimension of your current work. Rebuild anything that is not designed to outlast you.', duration:'month' },{ id:'tp_22_t3_1', text:'Operate at the intersection of the visionary and the builder simultaneously. Hold the full scale without collapsing into detail or disappearing into the abstract.', duration:'month' },{ id:'tp_22_t3_2', text:'For 30 consecutive days, build the thing — not plan it, build it — and measure your progress each day.', duration:'month' }]},
  },
  33: {
    1: { label:'APPRENTICE', objectives:[{ id:'tp_33_t1_0', text:'Offer one act of unconditional service today — not for recognition, reciprocity, or relationship leverage.', duration:'day' },{ id:'tp_33_t1_1', text:'Choose love as a deliberate act in one situation where judgement or withdrawal would be easier.', duration:'week' },{ id:'tp_33_t1_2', text:'For 7 consecutive days, give your best energy to someone without tracking what returns.', duration:'week' }]},
    2: { label:'ADEPT',      objectives:[{ id:'tp_33_t2_0', text:'Identify where your compassion is actually control wearing a kind face. Release the outcome you are managing.', duration:'week' },{ id:'tp_33_t2_1', text:'Bring your full presence — spiritual, emotional, and creative — into the service of someone who cannot yet access those qualities in themselves.', duration:'week' },{ id:'tp_33_t2_2', text:'For 14 consecutive days, bring full presence to every interaction — no performing, no half-presence.', duration:'week' }]},
    3: { label:'MASTER',     objectives:[{ id:'tp_33_t3_0', text:'Embody unconditional love in a situation designed to exhaust it. Hold it completely, without martyrdom or resentment.', duration:'month' },{ id:'tp_33_t3_1', text:'Create something — a space, a work, a body of teaching — whose sole purpose is the elevation of those who encounter it.', duration:'month' },{ id:'tp_33_t3_2', text:'For 30 consecutive days, choose love as a deliberate act in every interaction — especially the difficult ones.', duration:'month' }]},
  },
  44: {
    1: { label:'APPRENTICE', objectives:[{ id:'tp_44_t1_0', text:'Identify the one structure in your life most in need of redesign. Map it in full before touching it.', duration:'week' },
          { id:'tp_44_t1_1', text:'Build one physical or systemic discipline into your daily life that you have been postponing indefinitely.', duration:'week' },
          { id:'tp_44_t1_2', text:'For 7 consecutive days, show up to your most important commitment with complete reliability — no excuses.', duration:'week' }]},
    2: { label:'ADEPT',      objectives:[{ id:'tp_44_t2_0', text:'Identify every place where you are sustaining effort but not building. Redirect that energy into construction.', duration:'week' },{ id:'tp_44_t2_1', text:'Commit to one project of enduring structural value that will outlast the current season of your life. Begin the foundation this week.', duration:'week' },{ id:'tp_44_t2_2', text:'For 14 consecutive days, work on the architecture of one enduring structure — physical, financial, or systemic.', duration:'week' }]},
    3: { label:'MASTER',     objectives:[{ id:'tp_44_t3_0', text:'Build the masterwork. Not the idea of it — the actual thing, at full scale, with full accountability for every component.', duration:'month' },{ id:'tp_44_t3_1', text:'Leave one domain of the world more ordered, more functional, and more enduring than you found it. Make it permanent.', duration:'month' },{ id:'tp_44_t3_2', text:'For 30 consecutive days, operate at full structural integrity — every commitment kept, every standard held, every system improved.', duration:'month' }]},
  },
}

// ─── Cycle-based objectives ──────────────────────────────────────────────────
// Structure: CYCLE_OBJECTIVES[cycleType][root] = { id, text, duration }[]

export const CYCLE_OBJECTIVES = {
  personalYear: {
    1:  [{ id:'cy_yr_1_0',  text:'Begin one project or initiative you have been postponing — this year rewards the one who starts first.', duration:'year' },
         { id:'cy_yr_1_1',  text:'Declare one area of your life where you are now leading rather than following.', duration:'year' },
         { id:'cy_yr_1_2',  text:'Release one identity or role that belongs to a previous cycle. Let this year be genuinely new.', duration:'year' }],
    2:  [{ id:'cy_yr_2_0',  text:'Identify one relationship that needs patient tending this year. Water it, don\'t force it.', duration:'year' },
         { id:'cy_yr_2_1',  text:'Practise asking for what you need instead of waiting to be offered it.', duration:'month' },
         { id:'cy_yr_2_2',  text:'Find one place where cooperation would move things faster than solo effort. Choose it deliberately.', duration:'month' }],
    3:  [{ id:'cy_yr_3_0',  text:'Create and share something every week — writing, art, voice, or conversation. Let expression be your primary tool this year.', duration:'week' },
         { id:'cy_yr_3_1',  text:'Identify where you are performing rather than expressing. Drop the performance once a week.', duration:'week' },
         { id:'cy_yr_3_2',  text:'Say yes to at least two social or creative opportunities you would normally decline.', duration:'month' }],
    4:  [{ id:'cy_yr_4_0',  text:'Choose one area of your life that needs structure and build a system around it this month.', duration:'month' },
         { id:'cy_yr_4_1',  text:'Show up to your most important work every day, even when uninspired. This year, consistency is the magic.', duration:'week' },
         { id:'cy_yr_4_2',  text:'Complete one half-finished project before starting anything new.', duration:'month' }],
    5:  [{ id:'cy_yr_5_0',  text:'Say yes to one unexpected opportunity this month without over-planning it.', duration:'month' },
         { id:'cy_yr_5_1',  text:'Identify one area of your life that has become too rigid. Deliberately disrupt it.', duration:'month' },
         { id:'cy_yr_5_2',  text:'Stay fully present for one interaction daily that you would normally rush through.', duration:'day' }],
    6:  [{ id:'cy_yr_6_0',  text:'Name one relationship in your life that needs more of your presence this year. Show up to it.', duration:'year' },
         { id:'cy_yr_6_1',  text:'Create or restore one daily ritual of self-care that is non-negotiable.', duration:'week' },
         { id:'cy_yr_6_2',  text:'Set one boundary this month that protects your energy for what actually matters.', duration:'month' }],
    7:  [{ id:'cy_yr_7_0',  text:'Schedule at least one hour of genuine solitude daily — no content, no input. Just your own mind.', duration:'day' },
         { id:'cy_yr_7_1',  text:'Act on one intuitive knowing this month without seeking external confirmation first.', duration:'month' },
         { id:'cy_yr_7_2',  text:'Read, study, or research one topic that genuinely compels you. Go deep, not wide.', duration:'month' }],
    8:  [{ id:'cy_yr_8_0',  text:'Identify one area where you are playing small. Make one significant move toward full expression of your capacity.', duration:'month' },
         { id:'cy_yr_8_1',  text:'Negotiate, ask, or claim something you have been waiting to be given.', duration:'month' },
         { id:'cy_yr_8_2',  text:'Build or strengthen one discipline this month that supports your authority and results.', duration:'month' }],
    9:  [{ id:'cy_yr_9_0',  text:'Identify one thing you are carrying from the past that is taking up present-moment space. Begin releasing it.', duration:'month' },
         { id:'cy_yr_9_1',  text:'Complete one open loop — a conversation, a project, an apology, a decision — that has been lingering.', duration:'month' },
         { id:'cy_yr_9_2',  text:'Give something away this month: time, knowledge, a physical object, an old story about yourself.', duration:'month' }],
    11: [{ id:'cy_yr_11_0', text:'Ground your intuitive insights daily — journal, walk, or move before acting on what you receive.', duration:'day' },
         { id:'cy_yr_11_1', text:"Share one inspired perception with someone who needs it this week. Channel, don't perform.", duration:'week' },
         { id:'cy_yr_11_2', text:'Identify where your sensitivity is protecting you from something you actually need to face.', duration:'month' }],
    22: [{ id:'cy_yr_22_0', text:'Write out your largest vision for this year. Let it be uncomfortable in its scale.', duration:'year' },
         { id:'cy_yr_22_1', text:'Identify one place where you are managing when you should be building. Shift the approach.', duration:'month' },
         { id:'cy_yr_22_2', text:'Delegate one task to someone else and invest that recovered time in your most important project.', duration:'month' }],
  },
  fourMonthCycle: {
    1:  [{ id:'cy_4m_1_0',  text:'Launch or restart one project this cycle. Begin before you are ready.', duration:'cycle' },
         { id:'cy_4m_1_1',  text:'Introduce yourself or your work to one new person or audience this month.', duration:'month' },
         { id:'cy_4m_1_2',  text:'Clear one old commitment that is blocking the space needed for what is beginning.', duration:'month' }],
    2:  [{ id:'cy_4m_2_0',  text:'Resist forcing a result this cycle. Choose cooperation over competition in one key area.', duration:'cycle' },
         { id:'cy_4m_2_1',  text:'Reach out to one person you have been meaning to connect with. Build the bridge.', duration:'month' },
         { id:'cy_4m_2_2',  text:'Listen more than you speak in your most important conversations this month.', duration:'month' }],
    3:  [{ id:'cy_4m_3_0',  text:"Publish, share, or express something every week of this cycle — don't wait until it's perfect.", duration:'week' },
         { id:'cy_4m_3_1',  text:'Organise or attend one gathering, collaboration, or creative exchange.', duration:'month' },
         { id:'cy_4m_3_2',  text:'Say the thing you have been holding back in one important relationship or context.', duration:'month' }],
    4:  [{ id:'cy_4m_4_0',  text:'Identify the most important structural task in your life right now. Work on it every day this cycle.', duration:'cycle' },
         { id:'cy_4m_4_1',  text:'Clear physical and digital clutter from one environment. Prepare your space for what comes next.', duration:'month' },
         { id:'cy_4m_4_2',  text:'Review your finances, calendar, and commitments. Align them with your actual priorities.', duration:'month' }],
    5:  [{ id:'cy_4m_5_0',  text:'Accept one invitation or opportunity you would normally decline due to uncertainty.', duration:'month' },
         { id:'cy_4m_5_1',  text:'Travel, change your routine, or expose yourself to a completely different environment this cycle.', duration:'cycle' },
         { id:'cy_4m_5_2',  text:'When something unexpected arrives, ask "what is this opening?" before asking "how do I manage this?"', duration:'month' }],
    6:  [{ id:'cy_4m_6_0',  text:'Schedule quality time with one person who matters to you and give them your full presence.', duration:'month' },
         { id:'cy_4m_6_1',  text:'Create or restore one home environment or daily practice that nourishes you.', duration:'month' },
         { id:'cy_4m_6_2',  text:'Identify one area where you are over-functioning for someone else. Gently reduce it.', duration:'month' }],
    7:  [{ id:'cy_4m_7_0',  text:'Take at least one full day of genuine rest and reflection this cycle — no agenda.', duration:'cycle' },
         { id:'cy_4m_7_1',  text:'Read one book or pursue one topic that genuinely interests your inner life.', duration:'month' },
         { id:'cy_4m_7_2',  text:'Journal three times this week about what you actually know versus what you have been told to think.', duration:'week' }],
    8:  [{ id:'cy_4m_8_0',  text:'Make one significant ask this cycle — a raise, a partnership, an opportunity. Name what you want clearly.', duration:'cycle' },
         { id:'cy_4m_8_1',  text:'Review your current results. Identify one bottleneck and clear it with focused effort.', duration:'month' },
         { id:'cy_4m_8_2',  text:'Take one action that demonstrates genuine authority in your field or domain.', duration:'month' }],
    9:  [{ id:'cy_4m_9_0',  text:'List three things you are completing this cycle. Commit to finishing them before the next one begins.', duration:'cycle' },
         { id:'cy_4m_9_1',  text:'Release one digital, physical, or relational space that is holding energy in the past.', duration:'month' },
         { id:'cy_4m_9_2',  text:'Identify one grudge or unresolved feeling. Take one step toward resolution.', duration:'month' }],
    11: [{ id:'cy_4m_11_0', text:'Keep a daily note of intuitive impressions for this entire cycle. Review at the end.', duration:'cycle' },
         { id:'cy_4m_11_1', text:'Share one inspired idea or creative work publicly this month.', duration:'month' },
         { id:'cy_4m_11_2', text:'Identify where you are withholding your perceptions out of self-doubt. Offer them once without qualification.', duration:'month' }],
    22: [{ id:'cy_4m_22_0', text:'Map the largest project or vision you are currently working on. Where is the next structural decision?', duration:'month' },
         { id:'cy_4m_22_1', text:'Find one person to mentor or support in a meaningful way this cycle.', duration:'cycle' },
         { id:'cy_4m_22_2', text:'Make one decision based on 10-year impact rather than immediate return.', duration:'month' }],
  },
  personalMonth: {
    1: {
      apprentice: [
        { id:'cy_mo_1_ap_0', text:'Start something new this month — even one small, deliberate beginning.', duration:'month' },
        { id:'cy_mo_1_ap_1', text:'Send the email. Make the call. Take the step you have been delaying.', duration:'week' },
        { id:'cy_mo_1_ap_2', text:'Declare one intention for this month, out loud or in writing, before the first week ends.', duration:'week' },
      ],
      adept: [
        { id:'cy_mo_1_ad_0', text:'Lead one conversation or situation this month where you would normally hold back or compromise.', duration:'month' },
        { id:'cy_mo_1_ad_1', text:'Take one significant risk this month that moves you toward something you genuinely want.', duration:'month' },
        { id:'cy_mo_1_ad_2', text:'Identify one place where you are waiting for permission and claim your own authority there.', duration:'month' },
      ],
      master: [
        { id:'cy_mo_1_ma_0', text:'Initiate something this month that will benefit others beyond yourself — a project, a movement, a shift.', duration:'month' },
        { id:'cy_mo_1_ma_1', text:'Make one bold decision this month based on your inner knowing, without needing external validation.', duration:'month' },
        { id:'cy_mo_1_ma_2', text:'Build one system or structure this month that will outlast your personal involvement.', duration:'month' },
      ],
    },
    2: {
      apprentice: [
        { id:'cy_mo_2_ap_0', text:'Prioritise one relationship this month with genuine attentiveness.', duration:'month' },
        { id:'cy_mo_2_ap_1', text:'Ask for what you need from one person instead of hoping they will guess.', duration:'week' },
        { id:'cy_mo_2_ap_2', text:'In one conversation, reflect back what you heard before responding.', duration:'week' },
      ],
      adept: [
        { id:'cy_mo_2_ad_0', text:'Build a genuine bridge between two people in your world who should know each other.', duration:'month' },
        { id:'cy_mo_2_ad_1', text:'Have one difficult conversation where you speak your truth with compassion.', duration:'month' },
        { id:'cy_mo_2_ad_2', text:'Mediate one conflict or tension in your community with patience and presence.', duration:'month' },
      ],
      master: [
        { id:'cy_mo_2_ma_0', text:'Deepen one partnership this month through radical honesty and mutual vulnerability.', duration:'month' },
        { id:'cy_mo_2_ma_1', text:'Foster understanding between two groups or perspectives by holding space for both.', duration:'month' },
        { id:'cy_mo_2_ma_2', text:'Model the peace and harmony you want to see in your relationships through consistent, conscious presence.', duration:'month' },
      ],
    },
    3: {
      apprentice: [
        { id:'cy_mo_3_ap_0', text:'Create something this month and share it with at least one person.', duration:'month' },
        { id:'cy_mo_3_ap_1', text:'Have one conversation that is honest in a way you usually avoid.', duration:'week' },
        { id:'cy_mo_3_ap_2', text:'Spend time with people who make you feel alive and expressive.', duration:'month' },
      ],
      adept: [
        { id:'cy_mo_3_ad_0', text:'Express something creative this month in a format or medium you have not tried before.', duration:'month' },
        { id:'cy_mo_3_ad_1', text:'Say three completely original things in different contexts this month — not borrowed, not performed.', duration:'month' },
        { id:'cy_mo_3_ad_2', text:'Collaborate with someone whose creative style is different from yours and let the contrast strengthen the work.', duration:'month' },
      ],
      master: [
        { id:'cy_mo_3_ma_0', text:'Create something this month that is designed entirely to move, inspire, or uplift others.', duration:'month' },
        { id:'cy_mo_3_ma_1', text:'Publish or publicly share work this month that reflects your deepest creative truth.', duration:'month' },
        { id:'cy_mo_3_ma_2', text:'Build a creative container this month — a space, a community, a practice — that allows others to express themselves fully.', duration:'month' },
      ],
    },
    4: {
      apprentice: [
        { id:'cy_mo_4_ap_0', text:'Choose one task that has been sitting on your list and complete it fully this month.', duration:'month' },
        { id:'cy_mo_4_ap_1', text:'Improve one system in your daily life — a morning routine, a workspace, a workflow.', duration:'month' },
        { id:'cy_mo_4_ap_2', text:'Do the practical work this month without requiring it to feel inspired.', duration:'month' },
      ],
      adept: [
        { id:'cy_mo_4_ad_0', text:'Design and implement a new system in one area of your life that has been chaotic or disorganised.', duration:'month' },
        { id:'cy_mo_4_ad_1', text:'Work steadily on your most important project for a non-negotiable block of time each week this month.', duration:'month' },
        { id:'cy_mo_4_ad_2', text:'Build one repeatable process or structure that takes work off your plate and runs reliably.', duration:'month' },
      ],
      master: [
        { id:'cy_mo_4_ma_0', text:'Architect one significant long-term project or legacy this month — something built to last.', duration:'month' },
        { id:'cy_mo_4_ma_1', text:'Create a framework or methodology this month that others can use and build on.', duration:'month' },
        { id:'cy_mo_4_ma_2', text:'Build something this month that becomes the foundation for something much larger.', duration:'month' },
      ],
    },
    5: {
      apprentice: [
        { id:'cy_mo_5_ap_0', text:'Accept one unplanned change this month with curiosity instead of resistance.', duration:'month' },
        { id:'cy_mo_5_ap_1', text:'Do one thing this month that is genuinely new to you — a place, a person, an experience.', duration:'month' },
        { id:'cy_mo_5_ap_2', text:'When you feel the urge to control an outcome, practise releasing it and staying present instead.', duration:'month' },
      ],
      adept: [
        { id:'cy_mo_5_ad_0', text:'Explore one significant territory this month — geographical, intellectual, relational — and let it change you.', duration:'month' },
        { id:'cy_mo_5_ad_1', text:'Release one structure or belief this month that has become a constraint rather than a container.', duration:'month' },
        { id:'cy_mo_5_ad_2', text:'Say yes to one opportunity this month that involves genuine uncertainty and requires real trust.', duration:'month' },
      ],
      master: [
        { id:'cy_mo_5_ma_0', text:'Pivot one significant area of your life this month in a direction that excites you more than the current path.', duration:'month' },
        { id:'cy_mo_5_ma_1', text:'Lead others through a transition or change this month with vision and confidence.', duration:'month' },
        { id:'cy_mo_5_ma_2', text:'Open one completely new territory this month — a market, a relationship, a possibility — and pioneer it with grace.', duration:'month' },
      ],
    },
    6: {
      apprentice: [
        { id:'cy_mo_6_ap_0', text:'Reach out to one person in your life who could use support. Show up for them.', duration:'week' },
        { id:'cy_mo_6_ap_1', text:'Create one moment of genuine warmth or comfort for yourself or someone else.', duration:'week' },
        { id:'cy_mo_6_ap_2', text:'Review your commitments. Are they expressions of love or obligations disguised as care?', duration:'month' },
      ],
      adept: [
        { id:'cy_mo_6_ad_0', text:'Be the person someone can truly count on this month — consistently, without drama, without keeping score.', duration:'month' },
        { id:'cy_mo_6_ad_1', text:'Create one environment or space this month where people feel genuinely safe and cared for.', duration:'month' },
        { id:'cy_mo_6_ad_2', text:'Set one clear boundary this month with someone you love, in service of mutual wellbeing.', duration:'month' },
      ],
      master: [
        { id:'cy_mo_6_ma_0', text:'Be a healing presence this month for someone going through a difficult transition or loss.', duration:'month' },
        { id:'cy_mo_6_ma_1', text:'Create a practice or ritual this month that nourishes your community or circle.', duration:'month' },
        { id:'cy_mo_6_ma_2', text:'Teach or model something this month that helps others learn to care for themselves with wisdom.', duration:'month' },
      ],
    },
    7: {
      apprentice: [
        { id:'cy_mo_7_ap_0', text:'Carve out three periods of genuine quiet this month — no input, just presence.', duration:'month' },
        { id:'cy_mo_7_ap_1', text:'Write down what you actually think about one question you have been outsourcing to others.', duration:'week' },
        { id:'cy_mo_7_ap_2', text:'Read or study one thing that genuinely interests you at depth.', duration:'month' },
      ],
      adept: [
        { id:'cy_mo_7_ad_0', text:'Spend significant time this month in genuine inquiry — asking questions without rushing to answers.', duration:'month' },
        { id:'cy_mo_7_ad_1', text:'Trust and follow one intuitive perception this month, even if you cannot fully explain it.', duration:'month' },
        { id:'cy_mo_7_ad_2', text:'Develop or deepen one esoteric or philosophical practice this month.', duration:'month' },
      ],
      master: [
        { id:'cy_mo_7_ma_0', text:'Channel or transmit one deep insight this month that could benefit others on a similar path.', duration:'month' },
        { id:'cy_mo_7_ma_1', text:'Access and trust your inner oracle this month — your direct knowing — on a key life question.', duration:'month' },
        { id:'cy_mo_7_ma_2', text:'Mentor or guide someone this month through your wisdom and understanding.', duration:'month' },
      ],
    },
    8: {
      apprentice: [
        { id:'cy_mo_8_ap_0', text:'Name one concrete result you want to produce this month. Take the most direct action toward it.', duration:'month' },
        { id:'cy_mo_8_ap_1', text:'Ask for something you want with directness and without apology.', duration:'month' },
        { id:'cy_mo_8_ap_2', text:'Eliminate one energy drain and invest that energy in something that builds.', duration:'month' },
      ],
      adept: [
        { id:'cy_mo_8_ad_0', text:'Make one significant power move this month — a bold ask, a bold decision, a bold boundary.', duration:'month' },
        { id:'cy_mo_8_ad_1', text:'Demonstrate your mastery this month in a visible way that opens doors for you.', duration:'month' },
        { id:'cy_mo_8_ad_2', text:'Use your authority this month to empower someone else — give real power, not just instruction.', duration:'month' },
      ],
      master: [
        { id:'cy_mo_8_ma_0', text:'Lead or oversee something significant this month that has real stakes and real impact.', duration:'month' },
        { id:'cy_mo_8_ma_1', text:'Make one decision this month that affects multiple people and sets a new standard.', duration:'month' },
        { id:'cy_mo_8_ma_2', text:'Build your legacy this month through one action that demonstrates your deepest values and power.', duration:'month' },
      ],
    },
    9: {
      apprentice: [
        { id:'cy_mo_9_ap_0', text:'Finish one thing this month that has been dragging. Complete it cleanly.', duration:'month' },
        { id:'cy_mo_9_ap_1', text:'Let go of one expectation or outcome you have been holding too tightly.', duration:'month' },
        { id:'cy_mo_9_ap_2', text:'Forgive one thing — a person, a circumstance, or yourself — and mean it.', duration:'month' },
      ],
      adept: [
        { id:'cy_mo_9_ad_0', text:'Complete one significant cycle this month with conscious gratitude for what it gave you.', duration:'month' },
        { id:'cy_mo_9_ad_1', text:'Release one relationship, belief, or pattern this month that no longer serves your evolution.', duration:'month' },
        { id:'cy_mo_9_ad_2', text:'Give something substantial this month — time, knowledge, resources — with no expectation of return.', duration:'month' },
      ],
      master: [
        { id:'cy_mo_9_ma_0', text:'Close one major chapter this month and consciously step into what comes next.', duration:'month' },
        { id:'cy_mo_9_ma_1', text:'Forgive and help others forgive this month — carry completion energy into your community.', duration:'month' },
        { id:'cy_mo_9_ma_2', text:'Give back this month in a way that reflects your accumulated wisdom and gratitude for the journey.', duration:'month' },
      ],
    },
    11: {
      apprentice: [
        { id:'cy_mo_11_ap_0', text:'Pay close attention to what arrives quietly this month — impressions, ideas, coincidences.', duration:'month' },
        { id:'cy_mo_11_ap_1', text:'Act on one intuitive signal without waiting to rationalise it fully.', duration:'month' },
        { id:'cy_mo_11_ap_2', text:'Create or consume one piece of work that genuinely moves you. Let it in.', duration:'month' },
      ],
      adept: [
        { id:'cy_mo_11_ad_0', text:'Channel one clear message or insight this month and share it with those who need to hear it.', duration:'month' },
        { id:'cy_mo_11_ad_1', text:'Use your heightened perception this month to illuminate something for others.', duration:'month' },
        { id:'cy_mo_11_ad_2', text:'Build a practice this month that keeps you grounded while accessing higher insight.', duration:'month' },
      ],
      master: [
        { id:'cy_mo_11_ma_0', text:'Transmit one powerful truth this month that you have been holding — share the gift.', duration:'month' },
        { id:'cy_mo_11_ma_1', text:'Activate your highest light this month — be an illumination for others on their path.', duration:'month' },
        { id:'cy_mo_11_ma_2', text:'Work with the master number frequency to catalyse significant shifts this month.', duration:'month' },
      ],
    },
    22: {
      apprentice: [
        { id:'cy_mo_22_ap_0', text:'Identify the most important structural project in your life. Do one thing to advance it this month.', duration:'month' },
        { id:'cy_mo_22_ap_1', text:'Think at a larger scale than usual. Write down one vision that currently feels too big.', duration:'month' },
        { id:'cy_mo_22_ap_2', text:'Find one person who could benefit from your strategic thinking and offer it to them.', duration:'month' },
      ],
      adept: [
        { id:'cy_mo_22_ad_0', text:'Design one significant structure or system this month that serves a vision larger than yourself.', duration:'month' },
        { id:'cy_mo_22_ad_1', text:'Think and act at a 10-year scale this month — what are you building for the long game?', duration:'month' },
        { id:'cy_mo_22_ad_2', text:'Bring others into your vision this month — make the large thing real through collaboration.', duration:'month' },
      ],
      master: [
        { id:'cy_mo_22_ma_0', text:'Build something this month that will create lasting positive impact for generations.', duration:'month' },
        { id:'cy_mo_22_ma_1', text:'Make a master-level strategic decision this month that shapes your entire trajectory.', duration:'month' },
        { id:'cy_mo_22_ma_2', text:'Establish a legacy framework this month that outlives you and serves your highest vision.', duration:'month' },
      ],
    },
    33: {
      apprentice: [
        { id:'cy_mo_33_ap_0', text:'Offer one act of unconditional service this month — not for recognition or reciprocity.', duration:'month' },
        { id:'cy_mo_33_ap_1', text:'Choose love as a deliberate act in one situation where judgement would be easier.', duration:'month' },
        { id:'cy_mo_33_ap_2', text:'Teach or share one insight from direct experience with someone who needs it.', duration:'month' },
      ],
      adept: [
        { id:'cy_mo_33_ad_0', text:'Bring your full presence — spiritual, emotional, and creative — into service of someone going through difficulty.', duration:'month' },
        { id:'cy_mo_33_ad_1', text:'Identify where compassion has become control. Release the outcome you are managing.', duration:'month' },
        { id:'cy_mo_33_ad_2', text:'Create one environment this month where people feel genuinely safe, seen, and cared for.', duration:'month' },
      ],
      master: [
        { id:'cy_mo_33_ma_0', text:'Embody unconditional love in a situation designed to exhaust it — without martyrdom or resentment.', duration:'month' },
        { id:'cy_mo_33_ma_1', text:'Create something this month whose sole purpose is the elevation of those who encounter it.', duration:'month' },
        { id:'cy_mo_33_ma_2', text:'Model healing and teaching this month — let your presence be the lesson.', duration:'month' },
      ],
    },
  },
  personalDay: {
    1:  [{ id:'cy_day_1_0',  text:'Do the one thing you have been putting off this morning, before anything else.', duration:'day' },{ id:'cy_day_1_1',  text:'Introduce yourself, your idea, or your work to one new person today.', duration:'day' },{ id:'cy_day_1_2',  text:"Make one decision today without seeking anyone's opinion first.", duration:'day' }],
    2:  [{ id:'cy_day_2_0',  text:'Reach out to one person today — not for a reason, just to connect.', duration:'day' },{ id:'cy_day_2_1',  text:'Listen more than you speak in every conversation today. Notice what you learn.', duration:'day' },{ id:'cy_day_2_2',  text:'Ask for help with something small today. Practise receiving.', duration:'day' }],
    3:  [{ id:'cy_day_3_0',  text:"Say something true and creative in one conversation today — don't self-censor.", duration:'day' },{ id:'cy_day_3_1',  text:'Spend 20 minutes making something: writing, drawing, cooking, music.', duration:'day' },{ id:'cy_day_3_2',  text:'Express appreciation to one person today in specific, genuine terms.', duration:'day' }],
    4:  [{ id:'cy_day_4_0',  text:'Work on your most important project for at least 30 uninterrupted minutes today.', duration:'day' },{ id:'cy_day_4_1',  text:'Clear one small backlog: emails, messages, tasks. Get it done.', duration:'day' },{ id:'cy_day_4_2',  text:'Tidy or organise one physical space today, however small. Ground the energy.', duration:'day' }],
    5:  [{ id:'cy_day_5_0',  text:'Take a different route, try a different approach, or change one element of your usual day.', duration:'day' },{ id:'cy_day_5_1',  text:'Say yes to one spontaneous or unexpected invitation today.', duration:'day' },{ id:'cy_day_5_2',  text:'When plans shift today, respond with curiosity rather than frustration.', duration:'day' }],
    6:  [{ id:'cy_day_6_0',  text:'Do one small act of care for someone in your life today — without being asked.', duration:'day' },{ id:'cy_day_6_1',  text:'Take 10 minutes today to genuinely care for your own body: move, eat well, rest.', duration:'day' },{ id:'cy_day_6_2',  text:"Check in with someone you haven't spoken to in a while.", duration:'day' }],
    7:  [{ id:'cy_day_7_0',  text:'Spend 15 minutes today in complete silence — no phone, no content, just your own mind.', duration:'day' },{ id:'cy_day_7_1',  text:"Write down one thing you know but haven't said yet.", duration:'day' },{ id:'cy_day_7_2',  text:"Avoid making any major decision today. Let today be for observing and gathering.", duration:'day' }],
    8:  [{ id:'cy_day_8_0',  text:'Make the most important ask or move of your week today — authority energy is high.', duration:'day' },{ id:'cy_day_8_1',  text:'Do one thing today that demonstrates your capability in your domain.', duration:'day' },{ id:'cy_day_8_2',  text:"Review what you are building. Is today's effort aligned with your actual goals?", duration:'day' }],
    9:  [{ id:'cy_day_9_0',  text:'Complete one thing today — fully, properly, without leaving loose ends.', duration:'day' },{ id:'cy_day_9_1',  text:'Let go of one small grievance or irritation today. It is not worth the energy.', duration:'day' },{ id:'cy_day_9_2',  text:'Do one generous act today with no expectation of return.', duration:'day' }],
    11: [{ id:'cy_day_11_0', text:'Notice and record every intuitive impression that arrives today. Trust the quiet signals.', duration:'day' },{ id:'cy_day_11_1', text:'Speak one true perception today that you would normally keep to yourself.', duration:'day' },{ id:'cy_day_11_2', text:'Slow down twice today and ask: what is this moment actually asking of me?', duration:'day' }],
    22: [{ id:'cy_day_22_0', text:'Focus on the largest, most structurally important task on your list today. Give it first priority.', duration:'day' },{ id:'cy_day_22_1', text:'Think beyond today. What you build right now can carry further than you expect.', duration:'day' },{ id:'cy_day_22_2', text:'Invest in one person today — with your attention, your feedback, or your genuine support.', duration:'day' }],
  },
}

// ─── Pinnacle month lens phrases ────────────────────────────────────────────
// Short context phrase per pinnacle root, shown in the monthly quest detail panel.
// Connects the current month's work to the larger pinnacle chapter narrative.
export const PINNACLE_MONTH_LENS = {
  1:  'Pinnacle 1 · What you initiate this month is part of a longer act of self-authorship.',
  2:  'Pinnacle 2 · The relational work you do this month builds the foundation of your chapter.',
  3:  'Pinnacle 3 · Let this month\'s expression serve the voice you are developing across years.',
  4:  'Pinnacle 4 · Each disciplined month is one brick in the structure this chapter is asking you to build.',
  5:  'Pinnacle 5 · This month\'s changes are not disruptions — they are the curriculum of your chapter.',
  6:  'Pinnacle 6 · The love and service you give this month is the practise of your larger lesson.',
  7:  'Pinnacle 7 · This month\'s inner work is the chapter\'s deeper work. Go quiet. Go further.',
  8:  'Pinnacle 8 · Every move you make this month either builds or drains your chapter\'s authority.',
  9:  'Pinnacle 9 · What you release this month creates space for the universal work your chapter is calling for.',
  11: 'Pinnacle 11 · The sensitivity you navigate this month is sharpening the instrument your chapter needs.',
  22: 'Pinnacle 22 · The large vision of your chapter is assembled, month by month, in moments like this one.',
}

// ─── Skill-tree tiered objectives ─────────────────────────────────────────────
// Each number (1-9) has 3 tiers: initiate, consistency, mastery
// Each tier has 3 objectives: 2 from daily (personalDay), 1 from monthly (personalMonth)
// IDs follow pattern: sk{number}_{tier}_{index}
//   tier: init (initiate), cons (consistency), mast (mastery)

export const SKILL_TREE_TIERS = {
  1: { // POWER / Initiative
    initiate: [
      { id:'sk1_init_0', text:'Do the one thing you have been putting off this morning, before anything else.', duration:'day', source:'daily' },
      { id:'sk1_init_1', text:"Make one decision today without seeking anyone's opinion first.", duration:'day', source:'daily' },
      { id:'sk1_init_2', text:'Start something new this month — even one small, deliberate beginning.', duration:'month', source:'monthly' },
    ],
    consistency: [
      { id:'sk1_cons_0', text:'Introduce yourself, your idea, or your work to one new person today.', duration:'day', source:'daily' },
      { id:'sk1_cons_1', text:'Speak up once this week in a situation where you would normally let someone else take the lead.', duration:'week', source:'daily' },
      { id:'sk1_cons_2', text:'Send the email. Make the call. Take the step you have been delaying.', duration:'day', source:'monthly' },
    ],
    mastery: [
      { id:'sk1_mast_0', text:'Declare one area of your life where you are now leading rather than following.', duration:'year', source:'daily' },
      { id:'sk1_mast_1', text:'Launch something that has never existed before — not a plan, the thing itself.', duration:'month', source:'daily' },
      { id:'sk1_mast_2', text:'Declare one intention for this month, out loud or in writing, before the first week ends.', duration:'week', source:'monthly' },
    ],
  },
  2: { // SENSITIVITY / Connection
    initiate: [
      { id:'sk2_init_0', text:'Reach out to one person today — not for a reason, just to connect.', duration:'day', source:'daily' },
      { id:'sk2_init_1', text:'Ask for help with something small today. Practise receiving.', duration:'day', source:'daily' },
      { id:'sk2_init_2', text:'Prioritise one relationship this month with genuine attentiveness.', duration:'month', source:'monthly' },
    ],
    consistency: [
      { id:'sk2_cons_0', text:'Listen more than you speak in every conversation today. Notice what you learn.', duration:'day', source:'daily' },
      { id:'sk2_cons_1', text:'In your next disagreement, state the other person\'s position fully before stating your own.', duration:'day', source:'daily' },
      { id:'sk2_cons_2', text:'Ask for what you need from one person instead of hoping they will guess.', duration:'week', source:'monthly' },
    ],
    mastery: [
      { id:'sk2_mast_0', text:'Practise asking for what you need instead of waiting to be offered it.', duration:'month', source:'daily' },
      { id:'sk2_mast_1', text:'Repair a relationship you have written off. Do it fully — not as a gesture, as a completion.', duration:'month', source:'daily' },
      { id:'sk2_mast_2', text:'In one key conversation, reflect back what you heard before responding.', duration:'week', source:'monthly' },
    ],
  },
  3: { // EXPRESSION / Creativity
    initiate: [
      { id:'sk3_init_0', text:'Spend 20 minutes making something: writing, drawing, cooking, music.', duration:'day', source:'daily' },
      { id:'sk3_init_1', text:'Express appreciation to one person today in specific, genuine terms.', duration:'day', source:'daily' },
      { id:'sk3_init_2', text:'Create something this month and share it with at least one person.', duration:'month', source:'monthly' },
    ],
    consistency: [
      { id:'sk3_cons_0', text:'Say something true and creative in one conversation today — don\'t self-censor.', duration:'day', source:'daily' },
      { id:'sk3_cons_1', text:'Publish or share one creative expression this week without waiting for it to be perfect.', duration:'week', source:'daily' },
      { id:'sk3_cons_2', text:'Have one conversation this month that is honest in a way you usually avoid.', duration:'month', source:'monthly' },
    ],
    mastery: [
      { id:'sk3_mast_0', text:'Identify where you are performing rather than expressing. Drop the performance.', duration:'week', source:'daily' },
      { id:'sk3_mast_1', text:'Begin a body of work — not a single piece, but a complete vision expressed across multiple outputs.', duration:'month', source:'daily' },
      { id:'sk3_mast_2', text:'Spend time with people who make you feel alive and expressive. Seek their company deliberately.', duration:'month', source:'monthly' },
    ],
  },
  4: { // STRUCTURE / Discipline
    initiate: [
      { id:'sk4_init_0', text:'Work on your most important project for at least 30 uninterrupted minutes today.', duration:'day', source:'daily' },
      { id:'sk4_init_1', text:'Tidy or organise one physical space today, however small. Ground the energy.', duration:'day', source:'daily' },
      { id:'sk4_init_2', text:'Choose one task that has been sitting on your list and complete it fully this month.', duration:'month', source:'monthly' },
    ],
    consistency: [
      { id:'sk4_cons_0', text:'Clear one small backlog: emails, messages, tasks. Get it done.', duration:'day', source:'daily' },
      { id:'sk4_cons_1', text:'Show up to your most important commitment every day this week — inspired or not.', duration:'week', source:'daily' },
      { id:'sk4_cons_2', text:'Improve one system in your daily life — a morning routine, a workspace, a workflow.', duration:'month', source:'monthly' },
    ],
    mastery: [
      { id:'sk4_mast_0', text:'Choose one area of your life that needs structure and build a system around it this month.', duration:'month', source:'daily' },
      { id:'sk4_mast_1', text:'Architect a system that runs without your constant presence in it. Build it to outlast this chapter.', duration:'month', source:'daily' },
      { id:'sk4_mast_2', text:'Do the practical work this month without requiring it to feel inspired.', duration:'month', source:'monthly' },
    ],
  },
  5: { // ADAPTABILITY / Freedom
    initiate: [
      { id:'sk5_init_0', text:'Take a different route, try a different approach, or change one element of your usual day.', duration:'day', source:'daily' },
      { id:'sk5_init_1', text:'When plans shift today, respond with curiosity rather than frustration.', duration:'day', source:'daily' },
      { id:'sk5_init_2', text:'Accept one unplanned change this month with curiosity instead of resistance.', duration:'month', source:'monthly' },
    ],
    consistency: [
      { id:'sk5_cons_0', text:'Say yes to one spontaneous or unexpected invitation today.', duration:'day', source:'daily' },
      { id:'sk5_cons_1', text:'Say yes to one invitation this week that involves genuine uncertainty.', duration:'week', source:'daily' },
      { id:'sk5_cons_2', text:'Do one thing this month that is genuinely new to you — a place, a person, an experience.', duration:'month', source:'monthly' },
    ],
    mastery: [
      { id:'sk5_mast_0', text:'Identify one area of your life that has become too rigid. Deliberately disrupt it.', duration:'month', source:'daily' },
      { id:'sk5_mast_1', text:'Choose one fixed commitment in an area you have always kept deliberately fluid. Hold it a full cycle.', duration:'month', source:'daily' },
      { id:'sk5_mast_2', text:'When you feel the urge to control an outcome, practise releasing it and staying present instead.', duration:'month', source:'monthly' },
    ],
  },
  6: { // RESPONSIBILITY / Care
    initiate: [
      { id:'sk6_init_0', text:'Do one small act of care for someone in your life today — without being asked.', duration:'day', source:'daily' },
      { id:'sk6_init_1', text:'Take 10 minutes today to genuinely care for your own body: move, eat well, rest.', duration:'day', source:'daily' },
      { id:'sk6_init_2', text:'Reach out to one person in your life who could use support. Show up for them.', duration:'week', source:'monthly' },
    ],
    consistency: [
      { id:'sk6_cons_0', text:'Check in with someone you haven\'t spoken to in a while.', duration:'day', source:'daily' },
      { id:'sk6_cons_1', text:'Provide genuine care for one person this week with no expectation of return.', duration:'week', source:'daily' },
      { id:'sk6_cons_2', text:'Create one moment of genuine warmth or comfort for yourself or someone else.', duration:'week', source:'monthly' },
    ],
    mastery: [
      { id:'sk6_mast_0', text:'Ensure your calling work this week comes from genuine care, not obligation or performance.', duration:'week', source:'daily' },
      { id:'sk6_mast_1', text:'Heal one dynamic where care has quietly become control. Release the outcome completely.', duration:'month', source:'daily' },
      { id:'sk6_mast_2', text:'Review your commitments. Are they expressions of love or obligations disguised as care?', duration:'month', source:'monthly' },
    ],
  },
  7: { // AWARENESS / Wisdom
    initiate: [
      { id:'sk7_init_0', text:'Spend 15 minutes today in complete silence — no phone, no content, just your own mind.', duration:'day', source:'daily' },
      { id:'sk7_init_1', text:'Avoid making any major decision today. Let today be for observing and gathering.', duration:'day', source:'daily' },
      { id:'sk7_init_2', text:'Carve out three periods of genuine quiet this month — no input, just presence.', duration:'month', source:'monthly' },
    ],
    consistency: [
      { id:'sk7_cons_0', text:'Write down one thing you know but haven\'t said yet.', duration:'day', source:'daily' },
      { id:'sk7_cons_1', text:'Act on one intuitive signal this week without external verification.', duration:'week', source:'daily' },
      { id:'sk7_cons_2', text:'Write down what you actually think about one question you have been outsourcing to others.', duration:'week', source:'monthly' },
    ],
    mastery: [
      { id:'sk7_mast_0', text:'Schedule at least one hour of genuine solitude daily — no content, no input. Just your own mind.', duration:'day', source:'daily' },
      { id:'sk7_mast_1', text:'Write the thing you know — the complete version, the full map. Give it to the world without editing it safe.', duration:'month', source:'daily' },
      { id:'sk7_mast_2', text:'Read or study one thing that genuinely interests you at depth.', duration:'month', source:'monthly' },
    ],
  },
  8: { // MASTERY / Power
    initiate: [
      { id:'sk8_init_0', text:'Make the most important ask or move of your week today — authority energy is high.', duration:'day', source:'daily' },
      { id:'sk8_init_1', text:'Do one thing today that demonstrates your capability in your domain.', duration:'day', source:'daily' },
      { id:'sk8_init_2', text:'Name one concrete result you want to produce this month. Take the most direct action toward it.', duration:'month', source:'monthly' },
    ],
    consistency: [
      { id:'sk8_cons_0', text:'Review what you are building. Is today\'s effort aligned with your actual goals?', duration:'day', source:'daily' },
      { id:'sk8_cons_1', text:'Make one significant decision this week based entirely on what is correct, not comfortable.', duration:'week', source:'daily' },
      { id:'sk8_cons_2', text:'Ask for something you want with directness and without apology.', duration:'month', source:'monthly' },
    ],
    mastery: [
      { id:'sk8_mast_0', text:'Identify one area where you are playing small. Make one significant move toward full expression of your capacity.', duration:'month', source:'daily' },
      { id:'sk8_mast_1', text:'Audit your entire life for where power and integrity are misaligned. Close every gap as a permanent standard.', duration:'month', source:'daily' },
      { id:'sk8_mast_2', text:'Eliminate one energy drain and invest that energy in something that builds.', duration:'month', source:'monthly' },
    ],
  },
  9: { // IMPACT / Completion
    initiate: [
      { id:'sk9_init_0', text:'Complete one thing today — fully, properly, without leaving loose ends.', duration:'day', source:'daily' },
      { id:'sk9_init_1', text:'Do one generous act today with no expectation of return.', duration:'day', source:'daily' },
      { id:'sk9_init_2', text:'Finish one thing this month that has been dragging. Complete it cleanly.', duration:'month', source:'monthly' },
    ],
    consistency: [
      { id:'sk9_cons_0', text:'Let go of one small grievance or irritation today. It is not worth the energy.', duration:'day', source:'daily' },
      { id:'sk9_cons_1', text:'Complete one open cycle this week — close it formally, with full presence.', duration:'week', source:'daily' },
      { id:'sk9_cons_2', text:'Let go of one expectation or outcome you have been holding too tightly.', duration:'month', source:'monthly' },
    ],
    mastery: [
      { id:'sk9_mast_0', text:'Identify one thing you are carrying from the past that is taking up present-moment space. Begin releasing it.', duration:'month', source:'daily' },
      { id:'sk9_mast_1', text:'Identify the oldest unfinished cycle in your life. Complete it this month — fully, with gratitude.', duration:'month', source:'daily' },
      { id:'sk9_mast_2', text:'Forgive one thing — a person, a circumstance, or yourself — and mean it.', duration:'month', source:'monthly' },
    ],
  },
}

// ─── Legacy skill objectives (kept for backwards compatibility) ───────────────
export const SKILL_OBJECTIVES = {
  1: [{ id:'sk_1_0', text:'In one situation this week, be the first to speak, act, or decide.', duration:'week', category:'pioneer', difficulty:1 },{ id:'sk_1_1', text:'Create or lead something from scratch with no template or prior example to follow.', duration:'week', category:'pioneer', difficulty:2 },{ id:'sk_1_2', text:'For 21 days, begin each day with one self-initiated action before responding to any external demand.', duration:'month', category:'pioneer', difficulty:3 }],
  2: [{ id:'sk_2_0', text:'Facilitate one conversation where two people leave feeling genuinely heard.', duration:'week', category:'harmony', difficulty:1 },{ id:'sk_2_1', text:'Hold your own perspective and stay fully connected to someone who disagrees — at the same time.', duration:'week', category:'harmony', difficulty:2 },{ id:'sk_2_2', text:'Build one partnership this month where both people are stronger together than apart.', duration:'month', category:'harmony', difficulty:3 }],
  3: [{ id:'sk_3_0', text:'Create and share one thing this week without waiting for it to be ready.', duration:'week', category:'expression', difficulty:1 },{ id:'sk_3_1', text:'Develop a consistent creative practice and hold it for 14 days without missing.', duration:'week', category:'expression', difficulty:2 },{ id:'sk_3_2', text:'Build a body of creative work this month — multiple pieces, one coherent vision.', duration:'month', category:'expression', difficulty:3 }],
  4: [{ id:'sk_4_0', text:'Design one system for a recurring problem in your life and run it for a full week.', duration:'week', category:'foundation', difficulty:1 },{ id:'sk_4_1', text:'Show up to your most important commitment every single day this week — inspired or not.', duration:'week', category:'foundation', difficulty:2 },{ id:'sk_4_2', text:'Build one structure this month that operates without requiring your daily decisions to function.', duration:'month', category:'foundation', difficulty:3 }],
  5: [{ id:'sk_5_0', text:'Say yes to one invitation this week that involves genuine uncertainty.', duration:'week', category:'freedom', difficulty:1 },{ id:'sk_5_1', text:'Navigate one unexpected disruption this week with full presence and zero resistance.', duration:'week', category:'freedom', difficulty:2 },{ id:'sk_5_2', text:'For 21 days, choose one experience daily that is completely outside your established pattern.', duration:'month', category:'freedom', difficulty:3 }],
  6: [{ id:'sk_6_0', text:'Provide genuine care for one person this week with no expectation of return.', duration:'week', category:'service', difficulty:1 },{ id:'sk_6_1', text:'Create or restore one environment this week that makes someone feel genuinely safe.', duration:'week', category:'service', difficulty:2 },{ id:'sk_6_2', text:'For 21 days, give from overflow rather than depletion — fill your own cup first, every day.', duration:'month', category:'service', difficulty:3 }],
  7: [{ id:'sk_7_0', text:'Act on one intuitive signal this week without external verification.', duration:'week', category:'wisdom', difficulty:1 },{ id:'sk_7_1', text:'Spend 30 minutes daily in complete silence this week. No input. Just your own knowing.', duration:'week', category:'wisdom', difficulty:2 },{ id:'sk_7_2', text:'For 21 days, operate primarily from inner authority. Log every moment you defer to external validation instead.', duration:'month', category:'wisdom', difficulty:3 }],
  8: [{ id:'sk_8_0', text:'Make one significant decision this week based entirely on what is correct, not comfortable.', duration:'week', category:'mastery', difficulty:1 },{ id:'sk_8_1', text:'Build one non-negotiable daily discipline this week and hold it without exception.', duration:'week', category:'mastery', difficulty:2 },{ id:'sk_8_2', text:'For 21 days, operate from full personal authority — no complaining, no waiting, no deflecting.', duration:'month', category:'mastery', difficulty:3 }],
  9: [{ id:'sk_9_0', text:'Complete one open cycle this week — close it formally, with full presence.', duration:'week', category:'completion', difficulty:1 },{ id:'sk_9_1', text:'Give something of genuine value away this week with zero expectation of return.', duration:'week', category:'completion', difficulty:2 },{ id:'sk_9_2', text:'For 21 days, serve something larger than your personal interests with one concrete action each day.', duration:'month', category:'completion', difficulty:3 }],
}

// ─── Tier name mapping ────────────────────────────────────────────────────────
const TIER_NAMES = { initiate: 'initiate', consistency: 'consistency', mastery: 'mastery' }

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Get the placement objective for a given placement + root, rotated by day-of-year.
 * Replaces the old QUEST_OBJECTIVES[placement][root][dayOfYear % 4] pattern.
 */
export function getPlacementObjective(placement, root, dayOfYear) {
  const pool = PLACEMENT_OBJECTIVES[placement]?.[root]
  if (!pool?.length) return null
  return pool[dayOfYear % pool.length]
}

/**
 * Get tiered progression objectives for a root number and tier (1-3).
 * Replaces window.__scl_TIERED_OBJECTIVES__[root][tier].
 */
export function getTieredObjectives(root, tier) {
  return TIERED_PROGRESSION[root]?.[tier]?.objectives ?? []
}

/**
 * Get the text strings only for a tier (backwards-compatible with old string[] shape).
 */
export function getTieredObjectiveTexts(root, tier) {
  return getTieredObjectives(root, tier).map(o => o.text)
}



/**
 * Get cycle objectives filtered by freqLevel tier.
 * Each root has 3 entries; tiers unlock as: [0] always, [1] at LV 10, [2] at LV 25.
 * Backwards compatible: omitting freqLevel defaults to 1 (show only tier 1).
 */
const CYCLE_OBJECTIVE_TIER_LEVELS = [1, 10, 25]

export const TIER_COMMITMENT_DAYS = { 1: 7, 2: 14, 3: 30 }

export function getTierObjectiveCount(root, tier) {
  return getTieredObjectives(root, tier).length
}

/**
 * Returns the tier commitment objective (index 2) with commitmentDays metadata.
 */
export function getCommitmentObjective(root, tier) {
  const objs = getTieredObjectives(root, tier)
  const obj = objs[2]
  if (!obj) return null
  const days = TIER_COMMITMENT_DAYS[tier] || detectCommitmentDays(obj.text) || 7
  return { ...obj, days, commitmentDays: days, objIdx: 2 }
}

function detectCommitmentDays(text) {
  const m = text?.match(/(\d+)\s+consecutive\s+days?/i) || text?.match(/For\s+(\d+)\s+consecutive/i)
  return m ? parseInt(m[1], 10) : null
}

export function getCycleObjectives(cycleType, root, freqLevel = 1, lqpTier = null) {
  const simple = reduceToSimple(root)
  const all = CYCLE_OBJECTIVES[cycleType]?.[simple] ?? CYCLE_OBJECTIVES[cycleType]?.[root] ?? []

  if (cycleType === 'personalMonth' && all.apprentice) {
    const tier = lqpTier ?? (freqLevel >= 25 ? 3 : freqLevel >= 10 ? 2 : 1)
    return getMonthlyObjectivesForTier(simple, tier)
  }

  if (!Array.isArray(all)) return []

  const maxTier = CYCLE_OBJECTIVE_TIER_LEVELS.filter(lv => freqLevel >= lv).length
  return all.slice(0, Math.max(1, maxTier))
}

export function getPersonalDayGlyphPool(dayRoot) {
  const simple = reduceToSimple(dayRoot)
  const pool = CYCLE_OBJECTIVES.personalDay?.[simple]
    ?? CYCLE_OBJECTIVES.personalDay?.[dayRoot]
    ?? []
  return Array.isArray(pool) ? pool : []
}

/**
 * Third daily glyph: skill-tree objective matching today's personal day root (1–9).
 * Rotates through initiate-tier daily objectives for that number.
 */
export function getDailySkillGlyph(dayRoot) {
  const num = reduceToSimple(dayRoot)
  const now = new Date()
  const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000)
  const initiate = getSkillTreeTierObjectives(num, 'initiate')
  const pool = initiate.filter((o) => o.source === 'daily')
  const list = pool.length ? pool : initiate

  if (!list.length) {
    const dayFallback = CYCLE_OBJECTIVES.personalDay?.[num]
    const flat = Array.isArray(dayFallback)
      ? dayFallback
      : Object.values(dayFallback || {}).flat()
    const picked = flat[dayOfYear % Math.max(flat.length, 1)] || flat[0]
    if (!picked) return null
    return {
      id: picked.id,
      text: picked.text,
      duration: picked.duration,
      icon: '◈',
      slot: 'skill',
      skillNumber: num,
    }
  }

  const picked = list[dayOfYear % list.length]
  return {
    id: picked.id,
    text: picked.text,
    duration: picked.duration,
    icon: '◈',
    slot: 'skill',
    skillNumber: num,
  }
}

/**
 * Get 3 personal day glyphs for today's LP root (for daily gating).
 * Rotates PLACEMENT_OBJECTIVES.lp[root][dayOfYear % pool.length].slice(0,3)
 * Adds icon based on root.
 */
export function getPersonalDayGlyphs(root) {
  const now = new Date();
  const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
  const pool = PLACEMENT_OBJECTIVES.lp?.[root];
  if (!pool?.length) return [];
  const idx = dayOfYear % pool.length;
  const mapObj = obj => ({ id: obj.id, text: obj.text, duration: obj.duration, icon: '★' });
  let picked = pool.slice(idx, idx + 3);
  if (picked.length < 3) {
    // wrap around to fill remaining slots from the start of the pool
    picked = picked.concat(pool.slice(0, 3 - picked.length));
  }
  const glyphs = picked.map(mapObj);
  return glyphs.length ? glyphs : pool.slice(0, 3).map(mapObj);
}

/**
 * Get skill tree tier objectives for a given number (1-9) and tier name.
 * @param {number} number - The skill tree number (1-9)
 * @param {'initiate'|'consistency'|'mastery'} tier - The tier name
 * @returns {Array<{id:string, text:string, duration:string, source:string}>}
 */
export function getSkillTreeTierObjectives(number, tier) {
  return SKILL_TREE_TIERS[number]?.[tier] ?? []
}

/**
 * Get all skill tree tiers for a given number (1-9).
 * @param {number} number - The skill tree number (1-9)
 * @returns {{initiate: Array, consistency: Array, mastery: Array}}
 */
export function getAllSkillTreeTiers(number) {
  return SKILL_TREE_TIERS[number] ?? { initiate: [], consistency: [], mastery: [] }
}

/**
 * Get monthly objectives for a given root and life quest tier.
 * Maps LQP tier (1-3) to monthly objective tier (apprentice, adept, master).
 * @param {number} root - Numerology root number (1-9, 11, 22, 33)
 * @param {number} lqpTier - Life quest tier (1, 2, or 3)
 * @returns {Array<{id:string, text:string, duration:string}>}
 */
export function getMonthlyObjectivesForTier(root, lqpTier) {
  const tierNames = ['apprentice', 'adept', 'master']
  const tierName = tierNames[Math.max(0, Math.min(2, lqpTier - 1))] || 'apprentice'
  const simple = reduceToSimple(root)
  return CYCLE_OBJECTIVES.personalMonth[simple]?.[tierName] ?? CYCLE_OBJECTIVES.personalMonth[1].apprentice
}


