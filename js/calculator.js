/**
 * SSC — calculator.js
 * Number interpretations, calculation logic, and results rendering.
 * Depends on: nothing (standalone)
 * Required by: app.js (window.calculateReading, window.buildFreqChart)
 */

// Checkout API — Cloudflare Worker POST /api/session (see wrangler.jsonc).
var SSC_CHECKOUT_URL = '/api/session';

/* ═══════════════════════════════════════════════════════════════
   i18n helper — reads from SSC_TRANSLATIONS if available,
   falls back to the English value stored in the data objects.
═══════════════════════════════════════════════════════════════ */

function _t(key) {
  if (typeof SSC_TRANSLATIONS === 'undefined') return null;
  const lang  = (typeof getLang === 'function') ? getLang() : 'en';
  const entry = SSC_TRANSLATIONS[key];
  if (!entry) return null;
  return entry[lang] || entry['en'] || null;
}


/* ═══════════════════════════════════════════════════════════════
   ROOT INTERPRETATIONS — per frequency, per number (1–9, 11, 22, 33, 44)
   Keys used: name, essence, lp, ex, soul, outer, ach, theme
═══════════════════════════════════════════════════════════════ */

const ROOT = {
  1: {
    name: 'The Initiator', essence: 'Original Creative Force',
    lp:    'You are here to learn bold self-direction — to move first, pioneer new paths, and lead without waiting for permission. The simulation places you at the beginning of cycles and tests whether you will step forward or shrink back.',
    ex:    'You naturally carry leadership, pioneering instinct, and original thinking. You were made to start things without prompting, blaze new trails, and inspire others through confident action.',
    soul:  'Deep within, you crave autonomy, recognition, and the freedom to lead. Your soul yearns to be the initiator — the original spark that sets things in motion.',
    outer: 'The world sees you as confident, self-directed, and independent — a natural leader who moves forward without needing permission or approval.',
    ach:   'Your achievement energy centres on initiation and leadership. You accomplish most powerfully when you go first and forge new paths without hesitation.',
    theme: 'The overarching theme of your life involves initiating new cycles, developing independence, and learning that self-reliance is a gift — not a burden.',
  },
  2: {
    name: 'The Harmonizer', essence: 'Bridge & Balance',
    lp:    'You are here to master connection — to harmonize opposites, bridge divides, and find unity in duality. Every relationship the simulation brings is a mirror of your own inner polarities.',
    ex:    'You naturally carry diplomatic awareness, relational sensitivity, and dual-perspective vision. You see all sides, bring people together, and create peace from conflict.',
    soul:  'Deep within, you crave harmony, partnership, and the experience of being truly seen. Your soul yearns to belong — to meet and be met in genuine union.',
    outer: 'The world sees you as gentle, empathetic, and easy to trust — a natural mediator and peacemaker who brings calm to even the most charged situations.',
    ach:   'Your achievement energy centres on collaboration and partnership. You accomplish most powerfully through relationship and cooperative effort.',
    theme: 'The overarching theme of your life involves mastering relationship, learning to receive as well as give, and discovering wholeness through conscious connection.',
  },
  3: {
    name: 'The Creator', essence: 'Expression & Joy',
    lp:    'You are here to learn authentic self-expression — to channel creative force without performing for approval. The simulation blocks creativity until you stop seeking validation and start expressing truth.',
    ex:    'You naturally carry creative flow, expressiveness, and joyful energy. You communicate beautifully, uplift others naturally, and inspire through genuine authenticity.',
    soul:  'Deep within, you crave expression, joy, and creative freedom. Your soul yearns to be heard — to share its unique voice without apology or diminishment.',
    outer: 'The world sees you as charming, expressive, and magnetic — a natural communicator whose presence uplifts any room and inspires others to come alive.',
    ach:   'Your achievement energy centres on creative expression. You accomplish most powerfully when you allow authentic creativity to lead, free from the need for applause.',
    theme: 'The overarching theme of your life involves discovering and honouring your unique voice, finding joy through creation, and learning to complete what you begin.',
  },
  4: {
    name: 'The Builder', essence: 'Structure & Stability',
    lp:    'You are here to master discipline, order, and patient building. The simulation tests your relationship with structure — too rigid and it shatters you; too loose and chaos forces discipline upon you.',
    ex:    'You naturally carry organizational instinct, systematic thinking, and grounded presence. You create order from chaos and manifest through disciplined, sustained effort.',
    soul:  'Deep within, you crave stability, security, and the satisfaction of building something solid and lasting. Your soul yearns to create foundations that endure.',
    outer: 'The world sees you as reliable, methodical, and dependable — the one others count on to get things done and keep everything steady.',
    ach:   'Your achievement energy centres on building and consolidation. You accomplish most powerfully through sustained, disciplined effort compounded over time.',
    theme: "The overarching theme of your life involves learning the sacred nature of limitation, discovering that structure creates freedom, and building foundations that serve those who come after.",
  },
  5: {
    name: 'The Explorer', essence: 'Freedom Through Embodiment',
    lp:    'You are the central vessel — the interface between spirit and matter. Your lesson is full presence in the midst of constant change. The simulation provides endless variety to test whether you stay present or flee.',
    ex:    'You naturally carry adaptability, present-moment awareness, and dynamic responsiveness. You are the interface in the system — embodying freedom through presence, not escape.',
    soul:  'Deep within, you crave freedom, variety, and full sensory experience. Your soul yearns to explore — to taste life completely without being caged.',
    outer: 'The world sees you as adventurous, dynamic, and magnetically alive — someone who inhabits the present moment in a way others aspire to.',
    ach:   'Your achievement energy centres on adaptability and embodied presence. You accomplish most powerfully when you stay fully here and let each moment be enough.',
    theme: 'The overarching theme of your life involves mastering presence, discovering that true freedom is found within rather than through escape, and becoming the living interface between worlds.',
  },
  6: {
    name: 'The Nurturer', essence: 'Service & Responsibility',
    lp:    'You are here to learn that love requires boundaries — that serving others begins with serving yourself. The simulation places you in caretaking roles and tests whether you enable or empower.',
    ex:    'You naturally carry nurturing instinct, compassionate awareness, and integration ability. You are the integrator — nothing completes until it reaches you and becomes sustainable.',
    soul:  'Deep within, you crave love, belonging, and the fulfilment of being genuinely needed. Your soul yearns to nurture — to create a world where everyone feels cared for.',
    outer: 'The world sees you as warm, responsible, and caring — someone who shows up reliably and creates environments of safety and unconditional support.',
    ach:   'Your achievement energy centres on service and care. You accomplish most powerfully when you serve from wholeness rather than self-sacrifice.',
    theme: 'The overarching theme of your life involves mastering the balance between self-care and service, learning that boundaries are an act of love, and becoming a sustainable source of nurturance.',
  },
  7: {
    name: 'The Seeker', essence: 'Wisdom & Inner Knowing',
    lp:    'You are here to seek truth through direct experience — not merely intellectual knowing. The simulation enforces solitude until you stop looking to external authorities and begin trusting your own inner oracle.',
    ex:    'You naturally carry an analytical mind, introspective nature, and deep inner authority. You see beneath the surface and teach wisdom only after you have lived it.',
    soul:  'Deep within, you crave truth, understanding, and spiritual depth. Your soul yearns to pierce through illusion — to touch what is actually real beneath all the noise.',
    outer: 'The world sees you as introspective, intelligent, and quietly compelling — someone who observes carefully and carries a stillness others find deeply reassuring.',
    ach:   'Your achievement energy centres on investigation and inner mastery. You accomplish most powerfully when you trust your own knowing above any external validation.',
    theme: 'The overarching theme of your life involves the sacred quest for truth, learning to embody wisdom rather than merely accumulate knowledge, and finding the divine in the everyday.',
  },
  8: {
    name: 'The Power Master', essence: 'Authority & Manifestation',
    lp:    'You are here to master yourself — to discover that true power is self-mastery, not control of others. The simulation will make your temptations inescapable until you demonstrate dominion over impulse.',
    ex:    'You naturally carry authority, manifestation ability, and achievement drive. You demonstrate power-with rather than power-over, and you lead through earned respect.',
    soul:  'Deep within, you crave mastery, influence, and the satisfaction of tangible accomplishment. Your soul yearns to build something that proves what disciplined human will can achieve.',
    outer: 'The world sees you as authoritative, ambitious, and capable — someone who commands respect naturally and consistently delivers results.',
    ach:   'Your achievement energy centres on mastery and manifestation. You accomplish most powerfully when discipline, vision, and integrity are working in alignment.',
    theme: 'The overarching theme of your life involves learning the proper use of power, discovering that self-mastery precedes all other authority, and proving that material success is a spiritual test.',
  },
  9: {
    name: 'The Humanitarian', essence: 'Completion & Universal Service',
    lp:    'You are here to complete cycles with grace — to release what is finished and serve the greater good. The simulation brings repeated endings; your lesson is letting go with love.',
    ex:    'You naturally carry compassionate awareness, universal perspective, and completion orientation. You facilitate endings and serve collective evolution through wisdom freely shared.',
    soul:  'Deep within, you crave meaning, contribution, and the sense of having served something larger than yourself. Your soul yearns to give — to leave the world measurably better.',
    outer: 'The world sees you as compassionate, idealistic, and deeply wise — someone who holds all of humanity in their heart with genuine tenderness.',
    ach:   'Your achievement energy centres on completion and service to the whole. You accomplish most powerfully when you release attachment to outcomes and give freely.',
    theme: 'The overarching theme of your life involves learning graceful release, completing cycles consciously, and contributing your accumulated wisdom to collective evolution.',
  },
  11: {
    name: 'The Illuminated Bridge', essence: 'Master Channel Between Worlds',
    lp:    'A master number — your lesson is to channel higher wisdom while remaining grounded in human experience. Heightened sensitivity is your gift; rigorous daily grounding and energetic protection are its requirements.',
    ex:    'A master expression — you carry gateway frequency. You are literally wired to channel higher consciousness into material reality. Your sensitivity is a tool, not a burden.',
    soul:  'At the soul level, you carry an ancient yearning to bridge worlds — to bring something sacred through from the unseen into lived human experience.',
    outer: 'The world sees you as inspiring, otherworldly, and deeply intuitive — your presence seems to carry a light others feel but cannot name.',
    ach:   'Your achievement is in spiritual illumination and practical inspiration. You accomplish by grounding divine insight into real-world service that actually helps people.',
    theme: 'The overarching theme of your life is being a beacon — receiving higher frequencies and translating them faithfully into guidance that uplifts those around you.',
  },
  22: {
    name: 'The Master Builder', essence: 'Cosmic Architect of Material Reality',
    lp:    'A master number — you are here to manifest spiritual vision into lasting material form. Your mission is multi-generational. You will not see completion in this lifetime — build anyway.',
    ex:    'A master expression — you see what could be built and possess the strategic genius to make it real across generations. Patience and delegation are your essential disciplines.',
    soul:  'At the soul level, you carry a profound drive to create something that outlasts you — structures, movements, or systems that alter the course of what comes after.',
    outer: 'The world sees you as visionary, disciplined, and built for achievement at a scale most people cannot yet imagine.',
    ach:   'Your achievement is in monumental, lasting creation. You accomplish at a generational scale — your work serves long after your personal involvement ends.',
    theme: 'The overarching theme of your life is grounding cosmic vision into enduring material form — becoming the living bridge between the ideal and the real.',
  },
  33: {
    name: 'The Master Teacher', essence: 'Unconditional Love & Creative Service',
    lp:    'A master number — you embody unconditional love and creative service. You teach through beauty and heal through compassion. Your shadow is martyrdom; your master lesson is that self-care is not optional.',
    ex:    'A master expression — you carry double creative energy channelled into healing service. You teach through art and embody compassion as a lived demonstration.',
    soul:  'At the soul level, you carry the deepest possible longing to love without limit — to be a vessel through which healing moves into every life it touches.',
    outer: 'The world sees you as profoundly compassionate, creatively gifted, and spiritually seasoned — your presence alone carries a quality of healing others feel immediately.',
    ach:   'Your achievement is in teaching and healing through creative love. You accomplish by embodying unconditional compassion while maintaining the wholeness that makes it sustainable.',
    theme: 'The overarching theme of your life is learning to love sustainably — to be a channel for universal love without losing yourself in the current you are carrying.',
  },
  44: {
    name: 'The Master Manifestor', essence: 'Ultimate Material Mastery',
    lp:    'A master number — you carry supreme building and manifestation power. You create structures designed to stand for centuries. Your mission exceeds your lifetime; build knowing others will complete it.',
    ex:    'A master expression — you manifest what others call impossible and create systems built to outlast you. Legacy over ego is your north star.',
    soul:  'At the soul level, you carry an unshakeable drive to build — to demonstrate that human will, properly disciplined, can bring anything from spirit into permanent material form.',
    outer: 'The world sees you as extraordinarily capable, intensely focused, and built for achievement at a scale few people can comprehend.',
    ach:   'Your achievement is in century-level building. You accomplish by constructing systems and structures designed to function and serve long after your direct involvement ends.',
    theme: 'The overarching theme of your life is demonstrating that material mastery and spiritual integrity are not opposites — they are the same act performed at full power.',
  }
};

/* ═══════════════════════════════════════════════════════════════
   COMPOUND DESCRIPTIONS — pre-reduction two-digit numbers (10–99)
   Shown below the main reading when compound ≠ root
═══════════════════════════════════════════════════════════════ */

const COMPOUND_DESC = {
  10: 'The 10 carries the initiating force of 1 amplified to a new octave. Where 1 begins, 10 resets — it signals a clean slate arrived at through completion, not avoidance. The zero amplifies the 1\'s drive to near-absolute intensity. This compound belongs to those who seem to start from nothing and build everything, whose restarts are not failures but deliberate resets of the entire operating system.',
  12: 'The 12 holds the creative triad of 3 within a cooperative, service-oriented frame. The 1 pioneers; the 2 cooperates; together they form the teacher, the messenger, the bridge between self-expression and collective need. This compound tends toward sacrifice that doesn\'t feel like loss — a willingness to subordinate personal vision in service of something that reaches further.',
  13: 'The 13 is the transformer. It carries the 1\'s initiative and the 3\'s creativity, but reduces to the 4\'s discipline — meaning the creative impulse here is always asked to prove itself through work. Transformation is the theme: things that appear to end are actually changing form. This compound belongs to those who rebuild from rubble and find the new structure stronger than the original.',
  14: 'The 14 holds freedom and structure in creative tension. The 1 initiates, the 4 consolidates, and the root 5 demands full embodied presence — meaning this compound is always being tested by change. The lesson is that true freedom is built, not found. Discipline and adventure are not opposites here; they are the two legs of the same walk.',
  15: 'The 15 carries nurturing magnetic force. The 1\'s drive and the 5\'s aliveness combine to form the 6 root — meaning the mission of this compound is to care, but actively. Not passive service but pioneering love. These are the ones who create new forms of family, community, and care — who build the structures that hold others without becoming the structures themselves.',
  16: 'The 16 holds a difficult wisdom. The 1\'s ego-strength and the 6\'s love combine to form the 7 root — but the path runs through a particular lesson: the fall of what has been built on false foundations. This compound strips away what was constructed for the wrong reasons, making space for something built on genuine inner knowing. The destruction is the teaching.',
  17: 'The 17 is the star compound — spiritual aspiration meets practical authority. The 1\'s will and the 7\'s depth combine to form the 8 root — meaning the mission here is to build material power on a foundation of genuine spiritual knowing. This compound belongs to those who do not separate the inner and outer lives, who bring what they have discovered inward into the world in a form others can use.',
  18: 'The 18 holds the tension between personal ambition (1) and universal compassion (8/9). The compound reduces to 9, meaning all the authority and drive of the 1 and 8 must ultimately serve the whole. These are people who build power only to discover the power was never for them — it was the access point for a larger service.',
  19: 'The 19 is the prince of heaven who must learn through the fire of earth. The 1\'s independence and the 9\'s completion meet in a root 1 — but only after the lesson of interdependence is fully absorbed. This compound belongs to those who arrive at genuine self-reliance only after discovering they cannot do it alone. The ego is refined, not destroyed, through the encounter with the collective.',
  20: 'The 20 amplifies the 2\'s cooperative, receptive, bridge-building frequency to an absolute register. The zero doubles the sensitivity and the stakes. This compound belongs to those for whom relationship and partnership are not preferences but the actual vehicle of their purpose — those who build bridges between worlds, between people, between what is and what could be.',
  21: 'The 21 carries the creative communicator into the world. The 2\'s cooperation and the 1\'s initiative form the 3 root — but with a cooperative foundation, meaning the expression here serves connection rather than ego. The voice of the 21 is magnetic because it comes from a genuine desire to reach the other, not to perform.',
  23: 'The 23 is the royal star of the lion — a frequency of natural authority married to creative expression. The 2\'s attunement and the 3\'s joy combine through the 5 root to produce someone who moves easily through the world, adaptable and magnetically present, carrying the rare quality of being simultaneously royal and genuinely approachable.',
  24: 'The 24 builds love into permanent form. The 2\'s relational depth and the 4\'s constructive discipline combine to form the 6 root — meaning this compound is oriented toward creating lasting environments of genuine care. These are the builders of homes, communities, and organisations that carry a living warmth rather than mere structure.',
  25: 'The 25 seeks truth through experience. The 2\'s sensitivity and the 5\'s appetite for full embodied presence form the 7 root — meaning wisdom here is not theoretical. It is earned through relationship, through physical life, through allowing experience to become understanding. The inner life of the 25 is unusually rich precisely because the outer life has been lived fully.',
  26: 'The 26 carries material ambition in service of love. The 2\'s cooperation and the 6\'s nurturing combine to form the 8 root — meaning the drive for achievement here is not for personal accumulation but for the creation of environments where others can thrive. This compound builds power and uses it to care.',
  27: 'The 27 is a deeply spiritual compound — the combination of partnership (2) and inner seeking (7) forms the 9 root of universal service. These are people who have gone inward enough to bring something genuinely useful back. The wisdom of the 27 is intimate, not institutional. It arrives through the quieter rooms of direct experience.',
  28: 'The 28 holds material power and relational mastery in tension. The 2\'s attunement and the 8\'s authority combine to form the 1 root — meaning this compound ultimately must stand alone, having integrated the lessons of both deep partnership and genuine authority. Leadership here is not assumed but earned through the full experience of both receiving and commanding.',
  29: 'The 29 tests idealism. The 2\'s sensitivity and the 9\'s universal vision combine to form the 11 master number — meaning the emotional depth of this compound is not ordinary. These are people who carry visions so clear they are sometimes mistaken for demands, whose relational sensitivity is inseparable from their larger mission. The test is sustaining idealism through the difficulty of actual human contact.',
  30: 'The 30 is pure creative expression at full amplitude. The 3 at its most uninhibited, with the zero amplifying the frequency to its most essential register. This compound belongs to those who are here specifically to express — who suffer when the channel is blocked and flourish when the voice is free. The gift is original; the lesson is consistency.',
  31: 'The 31 applies creativity to practical construction. The 3\'s expressive power and the 1\'s initiating will combine to form the 4 root — meaning the creative impulse here is always being asked to build something real. These are the artists who also manage the studio, the writers who also build the platform, the visionaries who refuse to stop at the vision.',
  32: 'The 32 is a masterful communication compound. The 3\'s expression and the 2\'s cooperative sensitivity form the 5 root — meaning the communication here is not for performance but for genuine connection and movement. These are the voices that actually move people: teachers, speakers, writers who reach the specific nerve.',
  34: 'The 34 disciplines creativity into endurance. The 3\'s expressive flow and the 4\'s structural demand form the 7 root — meaning the creative work here runs deep, is refined over time, and arrives at the kind of insight that only sustained inquiry produces. Not prolific but precise — work that holds up under examination.',
  35: 'The 35 brings creative intelligence to the experience of full aliveness. The 3\'s expressive capacity and the 5\'s appetite for embodied freedom form the 8 root — meaning the creative power here can produce material results of genuine scale. These are people who make things with both artistic intelligence and commercial awareness.',
  36: 'The 36 carries visionary love. The 3\'s creative spirit and the 6\'s nurturing orientation combine to form the 9 root of universal service — meaning the creative work here is not private. It belongs to everyone. These are the artists, teachers, and voices whose work heals rather than merely entertains.',
  37: 'The 37 carries intuitive mastery. The 3\'s expressive gift and the 7\'s inner authority combine to form the 1 root — meaning this compound produces originals: those whose creative and intuitive capacities are so fused that what they make carries the unmistakable signature of direct inner knowing. Pioneers of the inner life who also make something visible.',
  38: 'The 38 holds the rare combination of creative expression (3), material power (8), and the master frequency of 11 as its root. The voice here is not merely communicative — it carries authority. The ideas are not merely interesting — they build. This compound belongs to those who are simultaneously the artist and the architect, the voice and the structure it speaks through.',
  39: 'The 39 carries creative completion. The 3\'s expression and the 9\'s universal orientation combine to form the 3 root again — meaning the creative gift here is entirely in service of the whole. These are the storytellers, artists, and voices whose work makes people feel less alone, whose expression carries the quality of something given rather than owned.',
  40: 'The 40 amplifies the 4\'s building frequency to an absolute register. Pure structural mastery — the capacity to organise, systematise, and build with total discipline. The zero doubles the dedication. This compound belongs to those for whom work is not a means but a calling, and whose patience with process is essentially limitless.',
  41: 'The 41 initiates structure. The 4\'s disciplined building and the 1\'s pioneering drive combine to form the 5 root — meaning the construction here eventually produces freedom. These are the builders who build toward liberation rather than containment, who create systems designed to make themselves unnecessary.',
  42: 'The 42 builds bridges. The 4\'s stable foundation and the 2\'s relational sensitivity combine to form the 6 root — meaning the construction here is always in service of relationship. These are the ones who build the infrastructure of connection: schools, families, organisations that function as genuine communities.',
  43: 'The 43 is the compound of practical creativity. The 4\'s structure and the 3\'s expression form the 7 root — meaning creative work here is disciplined to the point of mastery. The insight is not scattered but refined. These are people who practise their craft with the patience of the 4 and the love of the 3, and whose work eventually achieves a quality that could only come from time.',
  44: 'The 44 is a master compound — the supreme material builder. This frequency carries the weight of large-scale organisation, the mastery of physical reality, and the drive to construct systems that serve humanity across generations. The double 4 amplifies both the gift and the demand: the capacity to build at extraordinary scale and the requirement to do so with absolute integrity.',
  45: 'The 45 applies discipline to the experience of full aliveness. The 4\'s structural mastery and the 5\'s appetite for presence combine to form the 9 root — meaning the work of this compound ultimately serves the whole. The discipline is not for personal accumulation; it is for the development of a capacity that can be given away.',
  46: 'The 46 builds sustainable care. The 4\'s construction and the 6\'s nurturing combine to form the 1 root — meaning this compound ultimately produces something new in the world: environments, families, or organisations that did not exist before and that carry a living warmth. The new thing is always built carefully and loved into existence.',
  47: 'The 47 builds on inner authority. The 4\'s disciplined construction and the 7\'s depth of knowing combine to form the 11 master number — meaning this compound has access to a quality of spiritual intelligence that arrives through sustained inner work and rigorous building. What is constructed here is not merely functional; it transmits something.',
  48: 'The 48 combines structural mastery with absolute authority. The 4\'s building capacity and the 8\'s power orientation combine to form the 3 root — meaning what is built here ultimately becomes a voice, a platform, a creative legacy. The authority is earned through construction; the construction becomes a means of expression.',
  49: 'The 49 builds toward completion. The 4\'s patient construction and the 9\'s universal service combine to form the 4 root again — meaning this compound is in it for the long game. The work is methodical, deeply oriented toward serving something larger, and resistant to short-term thinking. These are the patient architects of genuine contribution.',
  50: 'The 50 amplifies the 5\'s aliveness and appetite for presence to an absolute register. The zero doubles the intensity of the freedom-seeking, experience-hungry, embodied quality of the 5. This compound belongs to those for whom half a life is not possible — who must be fully in or not at all, whose vitality is both their gift and the source of their most difficult lessons.',
  51: 'The 51 initiates into full presence. The 5\'s aliveness and the 1\'s pioneering will combine to form the 6 root — meaning the freedom-seeking here ultimately resolves into responsible love. The independence is real; the service is equally real. These are people who discover that the truest freedom is the freedom to give without resentment.',
  52: 'The 52 brings attunement to aliveness. The 5\'s dynamic presence and the 2\'s cooperative sensitivity combine to form the 7 root — meaning the full embodied experience of the 5 is constantly being integrated through the inner life of the 7. These are people who feel everything and understand most of it, whose inner world is as rich as their outer life is dynamic.',
  53: 'The 53 is dynamically expressive. The 5\'s aliveness and the 3\'s creative voice combine to form the 8 root — meaning the expression here has real material force. These are the performers, speakers, artists, and voices who do not merely entertain but compel — whose creative energy translates directly into results.',
  54: 'The 54 disciplines freedom. The 5\'s appetite for experience and the 4\'s structural mastery combine to form the 9 root of universal service — meaning the aliveness here is always being channelled toward something larger. These are the freedom-seekers who discover that the work itself is the freedom, that discipline is not a cage but a practice of presence.',
  55: 'The 55 is a master compound of freedom — double aliveness, doubled stakes. The master quality of the 55 means the frequency of full presence and embodied liberation is being carried at maximum intensity. These are people who are here to demonstrate, not describe, what complete aliveness looks like — whose lives are themselves the transmission.',
  56: 'The 56 brings aliveness to love. The 5\'s dynamic presence and the 6\'s nurturing care combine to form the 2 root — meaning the care here is alive rather than static, dynamic rather than dependent. These are the nurturers who stay interesting, whose love is both stable and surprising, who create environments that are simultaneously safe and fully alive.',
  57: 'The 57 combines full presence with deep inner knowing. The 5\'s embodied aliveness and the 7\'s inner authority combine to form the 3 root — meaning the wisdom here does not stay internal. It is expressed. These are people whose inner life is so rich that it naturally becomes art, teaching, or voice — who cannot help but give what they have found.',
  58: 'The 58 applies aliveness to material mastery. The 5\'s full presence and the 8\'s authority combine to form the 4 root — meaning the drive for material achievement here is grounded in direct experience. These are practical masters: people who know what works because they have lived it, whose authority is embodied rather than borrowed.',
  59: 'The 59 brings aliveness to completion. The 5\'s dynamic presence and the 9\'s universal orientation combine to form the 5 root again — meaning this compound is here to be fully alive in service of the whole, and then do it again. The cycle of experience and release is the pattern; the transmission is the full living of it.',
  60: 'The 60 amplifies the 6\'s nurturing, integrating frequency to its purest register. The zero doubles the love. This compound belongs to those for whom care is not an occasional act but a continuous quality of presence — whose entire orientation is toward the wholeness and wellbeing of those in their field.',
  61: 'The 61 initiates through love. The 6\'s nurturing orientation and the 1\'s pioneering drive combine to form the 7 root — meaning the care here is always searching, always going deeper, always asking what is really needed rather than what is comfortable to give. These are the bold carers: those who love enough to challenge as well as comfort.',
  62: 'The 62 integrates love and relationship at depth. The 6\'s care and the 2\'s cooperative sensitivity combine to form the 8 root — meaning the relational mastery here eventually produces genuine material authority. These are people who understand that the quality of their connections is their most important resource, and who build accordingly.',
  63: 'The 63 expresses love creatively. The 6\'s nurturing and the 3\'s creative voice combine to form the 9 root — meaning the creative work here is always in service of healing and wholeness. These are the artists, teachers, and voices whose work carries an inherent quality of care — whose expression itself is an act of love.',
  64: 'The 64 builds sustainable love. The 6\'s care and the 4\'s disciplined construction combine to form the 1 root — meaning the new things built here are always built to last and built with love. These are the patient constructors of genuine community: people who build not for recognition but because the thing needs to exist.',
  65: 'The 65 brings aliveness to care. The 6\'s nurturing and the 5\'s dynamic presence combine to form the 2 root — meaning the care here is alive and attentive, neither smothering nor distant. These are the nurturers who genuinely enjoy the ones they care for, whose love is expressed through presence and play as much as responsibility.',
  67: 'The 67 seeks wisdom in love. The 6\'s nurturing and the 7\'s inner authority combine to form the 4 root — meaning the care here is always seeking its own improvement. These are students of love: people who take relationship as seriously as any other discipline, who bring as much rigor to their connections as to their craft.',
  68: 'The 68 carries love and power in productive tension. The 6\'s nurturing and the 8\'s material authority combine to form the 5 root — meaning the integration of these two forces produces aliveness. These are people who have learned that power and love are not opposites, and whose lives demonstrate the possibility of holding both.',
  69: 'The 69 is the completion of love. The 6\'s care and the 9\'s universal orientation combine to form the 6 root again — meaning love here is not personal but universal, not conditional but freely given. These are the true servants of humanity: those whose care has no agenda and whose generosity has no floor.',
  70: 'The 70 amplifies the 7\'s inner seeking and quiet authority to its absolute register. The zero doubles the depth of the inner life. This compound belongs to those who have gone further in than most people know is possible — whose inner world is vast, intricate, and largely invisible to others, but whose presence carries the unmistakable weight of someone who knows.',
  71: 'The 71 initiates from inner knowing. The 7\'s depth and the 1\'s pioneering drive combine to form the 8 root — meaning the authority here is built on genuine inner foundation. These are people who do not claim territory they have not actually explored, whose leadership is grounded in verified inner knowing rather than performed confidence.',
  72: 'The 72 carries spiritual wisdom into relationship. The 7\'s depth and the 2\'s cooperative sensitivity combine to form the 9 root — meaning the inner knowing here is always being tested and refined through actual human connection. These are the wise ones who do not retreat from contact but use it as their most important teacher.',
  73: 'The 73 expresses deep knowing. The 7\'s inner authority and the 3\'s creative voice combine to form the 1 root — meaning what has been discovered inward is expressed outward, and the expression itself becomes a form of pioneering. These are the voices that say the true thing no one else has found the words for.',
  74: 'The 74 builds on deep knowing. The 7\'s inner authority and the 4\'s disciplined construction combine to form the 2 root — meaning what is known inwardly becomes the foundation for structures that connect people. These are the builders of meaning — those who take genuine inner insight and create lasting vehicles through which others can access it.',
  75: 'The 75 applies inner knowing to full aliveness. The 7\'s depth and the 5\'s embodied presence combine to form the 3 root — meaning wisdom here cannot stay theoretical. It must be lived, demonstrated, and ultimately expressed. These are the wisdom-keepers who also dance — who understand that genuine knowing must be embodied to be fully real.',
  76: 'The 76 applies inner knowing to love. The 7\'s depth and the 6\'s nurturing combine to form the 4 root — meaning the love here is both wise and patient, grounded in genuine understanding of human nature and expressed through steady, disciplined care. These are the therapists, guides, and teachers whose care is backed by genuine knowing.',
  77: 'The 77 is a profound spiritual compound — double inner seeking, doubled depth. The double 7 amplifies the inner life to extraordinary intensity. These are people for whom the inner world is as real and demanding as the outer — who live simultaneously in two registers, and whose outer expression carries the weight of a very long inner conversation with what is actually true.',
  78: 'The 78 carries spiritual authority into material mastery. The 7\'s inner knowing and the 8\'s material power combine to form the 6 root — meaning the achievement here is always in service of care and wholeness. These are people who have both the inner authority and the outer capacity to create environments that genuinely heal.',
  79: 'The 79 brings inner knowing to completion. The 7\'s depth and the 9\'s universal orientation combine to form the 7 root again — meaning this compound goes inward in service of the whole and returns with something genuinely useful. The cycle is: seek, find, give, seek again. The transmission carries the particular authority of someone who has completed many such cycles.',
  80: 'The 80 amplifies the 8\'s material mastery and authority to its absolute register. The zero doubles the capacity for power and the weight of the responsibility that comes with it. This compound belongs to those for whom achievement at scale is not optional but essential — whose ability to organise, command, and produce is essentially their entire vehicle.',
  81: 'The 81 initiates from power. The 8\'s material authority and the 1\'s pioneering drive combine to form the 9 root of universal service — meaning all the power and drive here is ultimately in service of the collective. The achievement is real; the beneficiary is everyone. These are the leaders who build not for personal legacy but for what comes after them.',
  82: 'The 82 carries power into relationship. The 8\'s material authority and the 2\'s cooperative sensitivity combine to form the 1 root — meaning genuine self-mastery here is achieved through the discipline of real partnership. These are people who discover that their greatest power is unlocked through cooperation rather than domination.',
  83: 'The 83 expresses power creatively. The 8\'s material authority and the 3\'s expressive gift combine to form the 2 root — meaning the creative work here is built to connect, to reach, to bridge. These are the creators who also deliver at scale — whose artistic or communicative capacity is matched by their ability to build the platform it needs.',
  84: 'The 84 disciplines power. The 8\'s material authority and the 4\'s structural mastery combine to form the 3 root — meaning the power here finds its most natural expression through creative building. These are the master builders whose constructions carry a creative signature, whose discipline is in service of something genuinely original.',
  85: 'The 85 applies power to full presence. The 8\'s material authority and the 5\'s dynamic aliveness combine to form the 4 root — meaning the power here must always be grounded. These are the dynamic achievers who discover that their most lasting accomplishments come from slowing down and building — that the energy of the 5 is most potent when channelled by the structure of the 4.',
  86: 'The 86 applies power to love. The 8\'s material authority and the 6\'s nurturing care combine to form the 5 root — meaning the integration of power and love produces genuine aliveness. These are people who have learned to command without dominating and to care without losing themselves — whose presence is simultaneously strong and warm.',
  87: 'The 87 applies power to inner authority. The 8\'s material mastery and the 7\'s depth of knowing combine to form the 6 root — meaning the power here is always checked against inner truth, and the inner truth is always translated into practical service. These are the wise leaders: those who know what they know and use what they have built in genuine service of others.',
  88: 'The 88 is a profound material mastery compound — double power, doubled responsibility. The double 8 amplifies both the capacity for achievement and the weight of the accountability that comes with it. These are people who carry an extraordinary ability to organise and manifest in the material world, and whose lives demand absolute integrity as the price of that power.',
  89: 'The 89 carries power to its completion. The 8\'s material authority and the 9\'s universal orientation combine to form the 8 root again — meaning the power here is always circling back to its source and asking whether it is being used rightly. The cycle of achievement and release is the pattern; the integrity of the use is the lesson.',
  90: 'The 90 amplifies the 9\'s universal service, completion, and compassion to an absolute register. The zero doubles the scope. This compound belongs to those for whom personal preference and collective service have become nearly indistinguishable — whose desire is to serve the whole, and whose lives are organised around that desire at every level.',
  91: 'The 91 initiates from completion. The 9\'s universal orientation and the 1\'s pioneering drive combine to form the 1 root — meaning the new things begun here are always informed by a vast perspective. These are the pioneers who have already lived many cycles and who begin again not from naivety but from the authority of someone who knows what is worth building.',
  92: 'The 92 brings universal compassion to relationship. The 9\'s completion and the 2\'s cooperative sensitivity combine to form the 2 root again — meaning the relational work here is entirely oriented toward genuine service and bridge-building. These are the mediators, peacemakers, and bridge-builders whose love has no preference for outcome.',
  93: 'The 93 expresses universal compassion creatively. The 9\'s universal orientation and the 3\'s creative voice combine to form the 3 root again — meaning the creative work here is an unmediated expression of universal love. These are the artists, teachers, and voices whose work has no agenda other than the transmission of what is most essentially true and most genuinely loving.',
  94: 'The 94 builds toward completion. The 9\'s universal service and the 4\'s disciplined construction combine to form the 4 root again — meaning this compound is here for the long work. Patient, universal, disciplined service. These are the ones who build the things that outlast them without needing to see the results.',
  95: 'The 95 brings aliveness to completion. The 9\'s universal orientation and the 5\'s dynamic presence combine to form the 5 root again — meaning this compound is here to be fully alive in service of the whole, moving through experience after experience, always remaining present, always releasing what has been lived. The transmission is the living itself.',
  96: 'The 96 is love at its most universal. The 9\'s completion and the 6\'s nurturing combine to form the 6 root again — meaning the care here has no preference, no agenda, and no limit. These are the great nurturers: those whose love is genuinely impersonal and therefore genuinely unlimited, who care for strangers as they care for the ones closest to them.',
  97: 'The 97 carries universal wisdom. The 9\'s universal orientation and the 7\'s inner authority combine to form the 7 root again — meaning this compound has completed many cycles of inner seeking and has arrived at something that feels less like knowledge and more like a quality of presence. The wisdom here is not held; it is embodied.',
  98: 'The 98 carries universal power. The 9\'s completion and the 8\'s material authority combine to form the 8 root again — meaning the power here has completed many cycles and arrived at something different from ordinary ambition. These are people who have used power, released it, used it again, and discovered in the repetition what power is actually for.',
  99: 'The 99 is the highest compound before return to zero — universal service at its most absolute. Double completion, doubled scope. This compound belongs to those whose entire existence is oriented toward the completion and service of the whole — who carry the weight and the grace of many lifetimes of service, and who give without any residue of personal claim.',
};

/* ═══════════════════════════════════════════════════════════════
   LIFE CALLING INTERPRETATIONS — name, essence, summary
═══════════════════════════════════════════════════════════════ */

const CALLING = {
  1:  { name: 'The Pioneer Leader',        essence: 'Initiating New Realities',        summary: 'Your mission is to go first — to initiate new realities through bold, authentic leadership. The simulation places you at the beginning of movements and innovations so others can follow your trail.' },
  2:  { name: 'The Sacred Harmonizer',     essence: 'Bridging Divides Through Unity',  summary: 'Your mission is to bridge divides and create unity from separation. You are the relational glue — positioned exactly where opposites meet and collaboration is the only path forward.' },
  3:  { name: 'The Creative Catalyst',     essence: 'Inspiring Through Expression',    summary: 'Your mission is to inspire through authentic creative expression — to translate the unseen into seen and the felt into expressed.' },
  4:  { name: 'The Sacred Architect',      essence: 'Building Foundations That Last',  summary: 'Your mission is to build systems, structures, and foundations that outlast you. You create the containers others inhabit — transforming chaos into order.' },
  5:  { name: 'The Freedom Embodier',      essence: 'Teaching Presence Through Being', summary: 'Your mission is to experience fully and teach freedom through embodiment. You are the pivot point — demonstrating that true freedom is being completely here.' },
  6:  { name: 'The Compassionate Guardian',essence: 'Nurturing from Wholeness',        summary: 'Your mission is to nurture in balanced, sustainable ways. You are the integrator — ensuring growth becomes grounded in reality.' },
  7:  { name: 'The Mystic Teacher',        essence: 'Revealing Truth Through Wisdom',  summary: 'Your mission is to seek truth and share wisdom born from direct experience.' },
  8:  { name: 'The Power Master',          essence: 'Wielding Authority With Wisdom',  summary: 'Your mission is to master power and demonstrate responsible authority.' },
  9:  { name: 'The World Server',          essence: 'Completing Cycles With Grace',    summary: 'Your mission is to complete cycles and serve humanity.' },
  11: { name: 'The Illuminated Channel',   essence: 'Bridging Spirit and Matter',      summary: 'A master calling — your mission is to bridge spiritual and material realms.' },
  22: { name: 'The Master Builder',        essence: 'Manifesting Grand Visions',       summary: 'A master calling — your mission is to build at the largest scale.' },
  33: { name: 'The Master Healer',         essence: 'Embodying Compassionate Service', summary: 'A master calling — your mission is to heal through unconditional love.' },
  44: { name: 'The Master Organizer',      essence: 'Creating Universal Systems',      summary: 'A master calling — your mission is to organize chaos at the grandest scale.' },
  55: { name: 'The Master Liberator',      essence: 'Embodying Total Freedom',          summary: 'A master calling — your mission is to become freedom itself so completely that others remember they can be free in your presence. You are not here to seek liberation — you are here to be it.' },
  66: { name: 'The Master Heart Healer',   essence: 'Loving at Full Capacity',          summary: 'A master calling — your mission is to carry and transmit double heart frequency. You hold enough love to heal a room, a lineage, a generation — but the work is learning to love cleanly, without martyrdom.' },
  77: { name: 'The Master Mystic',         essence: 'Perceiving the Code of Reality',   summary: 'A master calling — your mission is to perceive what others cannot and give it voice. Your connection to universal intelligence is not metaphorical. You know what you were never taught. The work is complete trust in your own perception.' },
  88: { name: 'The Master of Power',       essence: 'Wielding Absolute Integrity',      summary: 'A master calling — your mission is to carry double power frequency and demonstrate that true authority and complete integrity are the same thing. You manifest at a scale that reshapes material reality.' },
  99: { name: 'The Universal Completer',   essence: 'Completing What Cannot Be Left',   summary: 'A master calling — your mission is to close loops so old they predate your awareness of them. You carry the frequency of absolute completion — the final exhale of cycles that have been running for lifetimes.' }
};

/* ═══════════════════════════════════════════════════════════════
   FREQUENCY METADATA — labels and role descriptions
═══════════════════════════════════════════════════════════════ */

// Static fallbacks (English) — used if translations.js hasn't loaded yet
const FREQ_LABELS_EN = ['Life Path','Expression','Life Calling','Soul','Outer','Achievement','Theme'];
const FREQ_ROLES_EN  = ['What You Learn','What You Carry','Your Mission','Your Inner Desire','Your Public Persona','How You Accomplish','Your Life Curriculum'];

function getFreqLabel(i) { return _t('calc.freq.label.' + i) || FREQ_LABELS_EN[i]; }
function getFreqRole(i)  { return _t('calc.freq.role.'  + i) || FREQ_ROLES_EN[i];  }
const FREQ_DESC = {
  1:  'Independence, leadership, originality. You are here to forge your own path.',
  2:  'Harmony, cooperation, sensitivity. You are here to build bridges between worlds.',
  3:  'Creativity, expression, joy. You are here to bring beauty and communication into being.',
  4:  'Structure, discipline, foundation. You are here to build something that lasts.',
  5:  'Freedom, change, versatility. You are here to experience and catalyse transformation.',
  6:  'Love, responsibility, nurturing. You are here to care, heal, and create beauty.',
  7:  'Wisdom, introspection, mystery. You are here to seek truth beneath appearances.',
  8:  'Power, ambition, manifestation. You are here to master the material and leave a legacy.',
  9:  'Compassion, completion, universality. You are here to serve the greater whole.',
  11: 'Illumination, inspiration, spiritual sensitivity. A master number — heightened purpose.',
  22: 'Master builder, visionary pragmatism. A master number — world-scale creation.',
  33: 'Master teacher, compassionate wisdom. A master number — the highest service.'
};

// Maps each frequency index to its ROOT key
// numbers array order: [lp, exp, calling, soul, outer, achieve, theme]
const FREQ_ROOT_KEYS = ['lp', 'ex', null, 'soul', 'outer', 'ach', 'theme'];

/* ═══════════════════════════════════════════════════════════════
   CODEX — placement helpers live in codex-data.js
═══════════════════════════════════════════════════════════════ */

function buildCodexCardHtml(n, accentDim, accentLight) {
  var meta = typeof getCodexNodeMeta === 'function' ? getCodexNodeMeta(n) : {};
  if (!meta.placement) return '';
  var codexPrefix = _t('calc.codex.label') || '◈ Codex · Node';
  var linkTpl = _t('calc.codex.explore') || 'Explore node {n} in the Codex →';
  var linkText = linkTpl.replace('{n}', meta.root);
  var line = codexPrefix + ' ' + meta.root + ' · ' + meta.placement + (meta.name ? ' · ' + meta.name : '');
  var href = '/codex/?node=' + meta.root;
  var onclick = "if(typeof navigateCodexNode==='function'){event.preventDefault();navigateCodexNode(" + meta.root + ",event);}";
  return '<div class="ssc-cdx" style="font-family:\'Cinzel\',serif;letter-spacing:.22em;text-transform:uppercase;color:' + accentDim + ';margin-bottom:8px;line-height:1.5">' + line + '</div>'
    + '<a href="' + href + '" class="ssc-cdx-link" style="display:inline-block;font-family:\'Cinzel\',serif;font-size:9px;letter-spacing:.18em;text-transform:uppercase;color:' + accentLight + ';text-decoration:none;margin-bottom:12px;opacity:.85" onclick="' + onclick + '">' + linkText + '</a>';
}

var CODEX_GRID_XY = {
  '1': { x: 96, y: 96, r: 16 },
  '2': { x: 204, y: 96, r: 16 },
  '3': { x: 150, y: 42, r: 16 },
  '4': { x: 42, y: 150, r: 16 },
  '5': { x: 258, y: 150, r: 16 },
  '6': { x: 150, y: 258, r: 16 },
  '7': { x: 96, y: 204, r: 16 },
  '8': { x: 204, y: 204, r: 16 },
  '9': { x: 150, y: 150, r: 22 }
};

function buildCodexFootprintMap(lp, exp, calling) {
  var highlights = [
    { key: 'lp', root: getCodexRoot(lp.root), label: _t('calc.codex.legend_lp') || 'Life Path', color: '#7ec8c8' },
    { key: 'exp', root: getCodexRoot(exp.root), label: _t('calc.codex.legend_exp') || 'Expression', color: '#c898f0' },
    { key: 'calling', root: getCodexRoot(calling.root), label: _t('calc.codex.legend_calling') || 'Life Calling', color: '#e8c96b' }
  ];

  var byNode = {};
  highlights.forEach(function (h) {
    var k = String(h.root);
    if (!byNode[k]) byNode[k] = [];
    byNode[k].push(h);
  });

  var lpMeta = getCodexNodeMeta(lp.root);
  var expMeta = getCodexNodeMeta(exp.root);
  var callMeta = getCodexNodeMeta(calling.root);

  var narrativeTpl = _t('calc.codex.narrative') ||
    'Your Life Path sits at Node {lpn} · {lpp}. Your Expression at Node {expn} · {expp}. They converge in Life Calling · Node {calln}.';
  var narrative = narrativeTpl
    .replace('{lpn}', lpMeta.root).replace('{lpp}', lpMeta.placement)
    .replace('{expn}', expMeta.root).replace('{expp}', expMeta.placement)
    .replace('{calln}', callMeta.root);

  var ariaTpl = _t('calc.codex.map_aria') || 'Codex map: {details}';
  var ariaDetails = highlights.map(function (h) { return h.label + ' node ' + h.root; }).join(', ');
  var ariaLabel = ariaTpl.replace('{details}', ariaDetails);

  var title = _t('calc.codex.footprint_title') || 'Your Codex Footprint';
  var subtitle = _t('calc.codex.footprint_subtitle') || 'Where your Purpose triangle sits in the universal field';

  var lines = [
    [150, 42, 96, 96], [150, 42, 204, 96], [96, 96, 150, 150], [204, 96, 150, 150],
    [96, 204, 150, 150], [204, 204, 150, 150], [150, 258, 96, 204], [150, 258, 204, 204],
    [42, 150, 150, 150], [258, 150, 150, 150]
  ];
  var lineHtml = lines.map(function (l) {
    return '<line class="ssc-cdx-map-line" x1="' + l[0] + '" y1="' + l[1] + '" x2="' + l[2] + '" y2="' + l[3] + '"/>';
  }).join('');

  function ringHtml(cx, cy, baseR, colors) {
    if (colors.length === 1) {
      return '<circle class="ssc-cdx-map-ring ssc-cdx-map-pulse" cx="' + cx + '" cy="' + cy + '" r="' + (baseR + 5) + '" fill="none" stroke="' + colors[0].color + '" stroke-width="2.5" opacity="0.9"/>';
    }
    var seg = Math.PI * (baseR + 5) * 2 / colors.length;
    var dash = seg.toFixed(1);
    return colors.map(function (c, i) {
      var r = baseR + 5 + i * 4;
      var offset = (seg * i).toFixed(1);
      return '<circle class="ssc-cdx-map-ring" cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="' + c.color + '" stroke-width="2.5" stroke-dasharray="' + dash + ' ' + dash + '" stroke-dashoffset="' + offset + '" opacity="0.92"/>';
    }).join('');
  }

  var nodeOrder = ['3', '4', '5', '6', '1', '2', '7', '8', '9'];
  var nodesHtml = nodeOrder.map(function (num) {
    var pos = CODEX_GRID_XY[num];
    var active = byNode[num];
    var openLabel = (_t('calc.codex.open_node') || 'Open Node {n} in Codex').replace('{n}', num);
    var meta = (window.CODEX_NODES && window.CODEX_NODES[num]) || {};
    var titleAttr = meta.name ? num + ' — ' + meta.name : 'Node ' + num;
    var fill = active ? 'rgba(8,12,18,0.92)' : 'rgba(5,4,10,0.75)';
    var stroke = active ? (active.length === 1 ? active[0].color : 'rgba(201,168,76,0.5)') : 'rgba(201,168,76,0.18)';
    var textFill = active ? (active.length === 1 ? active[0].color : '#e8c96b') : 'rgba(201,168,76,0.35)';
    var ring = active ? ringHtml(pos.x, pos.y, pos.r, active) : '';
    var pulseClass = active && active.length === 1 ? ' ssc-cdx-map-node--active' : (active ? ' ssc-cdx-map-node--fusion' : '');
    var onclick = "if(typeof navigateCodexNode==='function'){event.preventDefault();navigateCodexNode(" + num + ",event);}";
    return '<a class="ssc-cdx-map-node' + pulseClass + '" href="/codex/?node=' + num + '" aria-label="' + openLabel + '" onclick="' + onclick + '">'
      + ring
      + '<circle cx="' + pos.x + '" cy="' + pos.y + '" r="' + pos.r + '" fill="' + fill + '" stroke="' + stroke + '" stroke-width="' + (active ? 2 : 1) + '"/>'
      + '<text x="' + pos.x + '" y="' + pos.y + '" fill="' + textFill + '">' + num + '</text>'
      + '<title>' + titleAttr + (active ? ' · ' + active.map(function (a) { return a.label; }).join(', ') : '') + '</title>'
      + '</a>';
  }).join('');

  var legendHtml = highlights.map(function (h) {
    return '<span class="ssc-cdx-legend-item"><span class="ssc-cdx-legend-dot" style="background:' + h.color + '"></span>' + h.label + '</span>';
  }).join('');

  return '<section class="ssc-cdx-footprint ssc-mobile-chart" aria-labelledby="ssc-cdx-footprint-title">'
    + '<div class="ssc-cdx-footprint-head">'
    + '<div class="ssc-cdx-footprint-eyebrow" data-i18n="calc.codex.footprint_eyebrow">Codex Placement</div>'
    + '<h3 id="ssc-cdx-footprint-title" class="ssc-cdx-footprint-title" data-i18n="calc.codex.footprint_title">' + title + '</h3>'
    + '<p class="ssc-cdx-footprint-sub" data-i18n="calc.codex.footprint_subtitle">' + subtitle + '</p>'
    + '</div>'
    + '<div class="ssc-cdx-map-wrap">'
    + '<svg class="ssc-cdx-map-svg" viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="' + ariaLabel + '">'
    + '<desc>' + ariaLabel + '</desc>'
    + lineHtml
    + nodesHtml
    + '</svg>'
    + '</div>'
    + '<div class="ssc-cdx-legend" aria-hidden="false">' + legendHtml + '</div>'
    + '<p class="ssc-cdx-narrative">' + narrative + '</p>'
    + '</section>';
}

/* ═══════════════════════════════════════════════════════════════
   TRINITY RESULT CARD HELPERS
═══════════════════════════════════════════════════════════════ */

// Builds one frequency card within a trinity block
// rootKey: 'lp','ex','soul','outer','ach','theme', or null for Life Calling
function buildFreqCard(n, rootKey, freqIndex, opts) {
  opts = opts || {};
  var label       = getFreqLabel(freqIndex);
  var role        = getFreqRole(freqIndex);
  var entry       = ROOT[n] || {};
  var accent      = opts.accent      || '#e8c96b';
  var accentDim   = opts.accentDim   || 'rgba(201,168,76,0.4)';
  var accentLight = opts.accentLight || '#e8c96b';
  var isLast      = opts.isLast      || false;
  var showCodex   = opts.showCodex   || false;

  var displayName, displayEssence, interp;
  if (rootKey === null) {
    var c       = CALLING[n] || {};
    displayName    = _t('calc.calling.' + n + '.name')    || c.name    || '';
    displayEssence = _t('calc.calling.' + n + '.essence') || c.essence || '';
    interp         = _t('calc.calling.' + n + '.summary') || c.summary || 'A powerful mission frequency.';
  } else {
    displayName    = _t('calc.root.' + n + '.name')    || entry.name    || '';
    displayEssence = _t('calc.root.' + n + '.essence') || entry.essence || '';
    interp         = _t('calc.root.' + n + '.' + rootKey) || entry[rootKey] || 'A deep frequency.';
  }

  var compound    = opts.compound;
  var hasCompound = compound && compound !== n && compound > 9;
  var borderStyle = isLast ? '' : 'border-right:1px solid rgba(255,255,255,0.06)';
  var codexHtml   = showCodex
    ? buildCodexCardHtml(n, accentDim, accentLight)
    : '';
  var essenceHtml = displayEssence
    ? '<div class="ssc-ess" style="font-family:\'Cinzel\',serif;letter-spacing:.14em;text-transform:uppercase;color:' + accentDim + ';margin-bottom:10px">' + displayEssence + '</div>'
    : '';
  var displayNum  = hasCompound ? compound + '/' + n : n;
  var extraClass  = opts.extraClass ? ' ' + opts.extraClass : '';
  var compoundHtml = (hasCompound && COMPOUND_DESC[compound])
    ? '<div style="margin-top:14px;padding-top:10px;border-top:1px solid rgba(255,255,255,0.06);position:relative">'
      + '<div style="font-family:\'Cinzel\',serif;font-size:9px;font-weight:600;letter-spacing:.3em;text-transform:uppercase;color:' + accentLight + ';margin-bottom:8px;text-shadow:0 0 12px rgba(201,168,76,0.2)">◈&nbsp;&nbsp;Compound Frequency · ' + compound + '&nbsp;&nbsp;◈</div>'
      + '<div style="position:relative;overflow:hidden">'
      + '<p style="font-family:\'EB Garamond\',serif;font-size:12px;color:rgba(255,255,255,0.38);margin:0;line-height:1.65;font-style:italic;filter:blur(4px);user-select:none;pointer-events:none">' + COMPOUND_DESC[compound] + '</p>'
      + '<div style="position:absolute;top:0;left:0;right:0;bottom:0;display:flex;align-items:center;justify-content:center;background:linear-gradient(180deg,rgba(5,4,10,0.3) 0%,rgba(5,4,10,0.6) 50%,rgba(5,4,10,0.3) 100%)">'
      + '<div style="font-size:18px;opacity:.8">🔒</div>'
      + '</div>'
      + '</div>'
      + '</div>'
    : '';

  return '<div class="ssc-fc' + extraClass + '" style="' + borderStyle + ';min-width:0;box-sizing:border-box">'
    + codexHtml
    + '<div class="ssc-fn" style="font-family:\'Cinzel Decorative\',serif;color:' + accent + ';line-height:1;margin-bottom:10px">' + displayNum + '</div>'
    + '<div class="ssc-role" style="font-family:\'Cinzel\',serif;letter-spacing:.2em;text-transform:uppercase;color:var(--text-muted);margin-bottom:7px">' + role + '</div>'
    + '<div class="ssc-lbl" style="font-family:\'Cinzel\',serif;letter-spacing:.1em;text-transform:uppercase;color:' + accentLight + ';margin-bottom:8px">' + label + (displayName ? ' · ' + displayName : '') + '</div>'
    + essenceHtml
    + '<p class="ssc-fp" style="font-family:\'EB Garamond\',serif;color:var(--text);margin:0;line-height:1.82">' + interp + '</p>'
    + compoundHtml
    + '</div>';
}

// Builds a full trinity section: styled header + 3-column card grid
// cards: array of [n, rootKey, freqIndex] triples
function buildTrinitySection(titleSuffix, subtitle, borderColor, bgColor, cards, opts) {
  opts = opts || {};
  var accentLight = opts.accentLight || '#e8c96b';
  var cardHtml = cards.map(function(c, idx) {
    return buildFreqCard(c[0], c[1], c[2], {
      accent:      opts.accent,
      accentDim:   opts.accentDim,
      accentLight: opts.accentLight,
      showCodex:   c[4] || opts.showCodex || false,
      isLast:      idx === cards.length - 1,
      compound:    c[3],
      extraClass:  c[5] || ''
    });
  }).join('');

  return '<div class="ssc-tr" style="margin-bottom:28px;border:1px solid ' + borderColor + ';border-radius:12px;overflow:hidden">'
    + '<div style="height:2px;background:linear-gradient(90deg,transparent,' + accentLight + ',' + accentLight + ',transparent);opacity:0.5"></div>'
    + '<div class="ssc-th" style="padding:14px 20px;background:' + bgColor + ';border-bottom:1px solid ' + borderColor + '">'
    + '<div style="font-family:\'Cinzel\',serif;font-size:9px;letter-spacing:.34em;text-transform:uppercase;color:rgba(255,255,255,0.32);margin-bottom:6px">Trinity</div>'
    + '<div style="font-family:\'Cinzel\',serif;font-size:14px;letter-spacing:.16em;text-transform:uppercase;color:' + accentLight + '">' + titleSuffix + '</div>'
    + '<div style="font-family:\'EB Garamond\',serif;font-size:15px;color:rgba(255,255,255,0.62);margin-top:6px;font-style:italic;letter-spacing:.01em">' + subtitle + '</div>'
    + '</div>'
    + '<div class="ssc-tg" style="display:grid;grid-template-columns:repeat(3,1fr)">'
    + cardHtml
    + '</div></div>';
}

/* ═══════════════════════════════════════════════════════════════
   CALCULATION FUNCTIONS
═══════════════════════════════════════════════════════════════ */

function reduceNumber(n) {
  while (n > 9 && n !== 11 && n !== 22 && n !== 33 && n !== 44) {
    n = String(n).split('').reduce((a, d) => a + parseInt(d), 0);
  }
  return n;
}

const LETTER_VALUES = {
  A:1,B:2,C:3,D:4,E:5,F:6,G:7,H:8,I:9,
  J:1,K:11,L:3,M:4,N:5,O:6,P:7,Q:8,R:9,
  S:1,T:2,U:3,V:22,W:5,X:6,Y:7,Z:8
};
const VOWELS = new Set(['A','E','I','O','U','Y']);

function nameToValues(name) {
  return name.toUpperCase().replace(/[^A-Z]/g,'').split('');
}

function calcLifePath(m, d, y) {
  const compound = [...String(m), ...String(d), ...String(y)].reduce((a,c) => a + parseInt(c), 0);
  return { root: reduceNumber(compound), compound };
}

function calcExpression(full) {
  // Reduce each name separately, then sum
  const compound = full.trim().split(/\s+/).reduce((total, word) => {
    const wordSum = word.toUpperCase().replace(/[^A-Z]/g,'').split('').reduce((a,c) => a + (LETTER_VALUES[c]||0), 0);
    return total + reduceNumber(wordSum);
  }, 0);
  return { root: reduceNumber(compound), compound };
}

function calcSoul(full) {
  const compound = nameToValues(full).filter(c => VOWELS.has(c)).reduce((a,c) => a + (LETTER_VALUES[c]||0), 0);
  return { root: reduceNumber(compound), compound };
}

function calcOuter(full) {
  const compound = nameToValues(full).filter(c => !VOWELS.has(c)).reduce((a,c) => a + (LETTER_VALUES[c]||0), 0);
  return { root: reduceNumber(compound), compound };
}

var _lastCalculatorLead = null;

function _setCalculatorLeadMessage(message, isError) {
  var messageEl = document.getElementById('calc-lead-message');
  if (!messageEl) return;
  messageEl.textContent = message || '';
  messageEl.classList.toggle('is-error', !!isError);
  messageEl.classList.toggle('is-success', !!message && !isError);
}

function _setFieldMessage(id, message, isError) {
  var messageEl = document.getElementById(id + '-message');
  if (!messageEl) return;
  messageEl.textContent = message || '';
  messageEl.classList.toggle('is-error', !!isError);
  messageEl.classList.toggle('is-success', !!message && !isError);
}

function _clearCalculatorFieldMessages() {
  ['calc-month', 'calc-day', 'calc-year', 'calc-fullname'].forEach(function(id) {
    _setFieldMessage(id, '', false);
  });
  _setCalculatorLeadMessage('', false);
}

function _isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function _scrollResultIntoViewIfNeeded(resultsTarget) {
  if (!resultsTarget || typeof resultsTarget.getBoundingClientRect !== 'function') return;
  var rect = resultsTarget.getBoundingClientRect();
  if (rect.top > window.innerHeight * 0.72 || rect.bottom < 0) {
    resultsTarget.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function submitCalculatorLead() {
  var emailInput = document.getElementById('calc-lead-email');
  var email = (emailInput ? emailInput.value : '').trim();

  if (!_lastCalculatorLead) {
    _setCalculatorLeadMessage('Calculate your blueprint first.', true);
    return;
  }

  if (!email || !_isValidEmail(email)) {
    _setCalculatorLeadMessage('Please enter a valid email address.', true);
    if (emailInput) emailInput.focus();
    return;
  }

  _setCalculatorLeadMessage('', false);

  fetch('/submit-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(Object.assign({}, _lastCalculatorLead, {
      email: email,
      source: 'calculator',
    })),
  })
  .then(function(res) {
    if (!res.ok) {
      return res.text().then(function(text) {
        var data = {};
        try { data = JSON.parse(text); } catch (_) {}
        throw new Error(data.error || text || ('HTTP ' + res.status));
      });
    }
    return res.json();
  })
  .then(function() {
    _setCalculatorLeadMessage('Your blueprint summary is saved.', false);
    if (emailInput) emailInput.value = '';
  })
  .catch(function(err) {
    _setCalculatorLeadMessage('Could not save right now. Please try again.', true);
    console.error('calculator lead error:', err);
  })
  .finally(function() {
    // No button state to restore: calculator leads submit from the main decode action.
  });
}

function calculateReading() {
  const monthEl = document.getElementById('calc-month');
  const dayEl   = document.getElementById('calc-day');
  const yearEl  = document.getElementById('calc-year');
  const nameEl  = document.getElementById('calc-fullname');
  const emailEl = document.getElementById('calc-lead-email');

  if (!monthEl || !dayEl || !yearEl || !nameEl) {
    console.warn('Calculator form is not available yet.');
    return;
  }

  const month = parseInt(monthEl.value);
  const day   = parseInt(dayEl.value);
  const year  = parseInt(yearEl.value);
  const fullName = nameEl.value.trim();

  // ── Inline validation ─────────────────────────────────────
  var hasError = false;
  _clearCalculatorFieldMessages();
  [monthEl, dayEl, yearEl, nameEl, emailEl].forEach(function(el) {
    if (el) el.classList.remove('ssc-input-error');
  });
  if (!month) {
    monthEl.classList.add('ssc-input-error');
    _setFieldMessage('calc-month', 'Choose your birth month.', true);
    hasError = true;
  }
  if (!day) {
    dayEl.classList.add('ssc-input-error');
    _setFieldMessage('calc-day', 'Enter your birth day.', true);
    hasError = true;
  }
  if (!year) {
    yearEl.classList.add('ssc-input-error');
    _setFieldMessage('calc-year', 'Enter your birth year.', true);
    hasError = true;
  }
  if (!fullName) {
    nameEl.classList.add('ssc-input-error');
    _setFieldMessage('calc-fullname', 'Enter your full birth name.', true);
    hasError = true;
  }
  if (emailEl && emailEl.value.trim() && !_isValidEmail(emailEl.value.trim())) {
    emailEl.classList.add('ssc-input-error');
    _setCalculatorLeadMessage('Please enter a valid email address.', true);
    hasError = true;
  }

  if (hasError) {
    var firstErr = document.querySelector('.ssc-input-error');
    if (firstErr) firstErr.focus();
    return;
  }

  _lastCalculatorLead = null;
  _setCalculatorLeadMessage('', false);

  // ── Loading state ─────────────────────────────────────────
  var btn = document.querySelector('.calc-btn') || document.getElementById('modal-calc-btn');
  var origBtnText = btn ? btn.textContent : '';
  if (btn) {
    btn.disabled = true;
    btn.setAttribute('aria-busy', 'true');
    btn.textContent = '· Decoding Your Map ·';
    btn.classList.add('ssc-btn-loading');
  }

  setTimeout(function() {
    _doCalculateReading(month, day, year, fullName, btn, origBtnText);
  }, 300);
}

function _doCalculateReading(month, day, year, fullName, btn, origBtnText, resultsEl) {
  var resultsTarget = resultsEl || document.getElementById('results-area');
  if (!resultsTarget) return;

  const lp      = calcLifePath(month, day, year);
  const exp     = calcExpression(fullName);
  const soul    = calcSoul(fullName);
  const outer   = calcOuter(fullName);
  // Life Calling: concatenate Expression root + Life Path root, then reduce
  const clComp  = parseInt(String(exp.root) + String(lp.root));
  const calling = { root: reduceNumber(clComp), compound: clComp };
  // Achievement: Month + Day
  const achComp = month + day;
  const achieve = { root: reduceNumber(achComp), compound: achComp };
  // Theme: sum of year digits
  const thComp  = String(year).split('').reduce((a,c) => a + parseInt(c), 0);
  const theme   = { root: reduceNumber(thComp), compound: thComp };

  _lastCalculatorLead = {
    full_name: fullName,
    month: month,
    day: day,
    year: year,
    birth_date: month + '/' + day + '/' + year,
    life_path: lp.root,
    expression: exp.root,
    life_calling: calling.root,
  };

  const numbers = [lp.root, exp.root, calling.root, soul.root, outer.root, achieve.root, theme.root];

  // ── Build trinity sections ───────────────────────────────────
  const lessonsBlock = buildTrinitySection(
    'of Lessons', 'Achievement · Theme · Life Path',
    'rgba(74,148,148,0.22)', 'rgba(8,20,20,0.65)',
    [[achieve.root, 'ach', 5, achieve.compound], [theme.root, 'theme', 6, theme.compound], [lp.root, 'lp', 0, lp.compound]],
    { accent: '#7ec8c8', accentDim: 'rgba(126,200,200,0.4)', accentLight: '#7ec8c8' }
  );

  const expressionBlock = buildTrinitySection(
    'of Expression', 'Soul · Outer · Expression',
    'rgba(123,79,166,0.22)', 'rgba(18,11,26,0.65)',
    [[soul.root, 'soul', 3, soul.compound], [outer.root, 'outer', 4, outer.compound], [exp.root, 'ex', 1, exp.compound]],
    { accent: '#c898f0', accentDim: 'rgba(169,110,212,0.4)', accentLight: '#c898f0' }
  );

  const purposeBlock = buildTrinitySection(
    'of Purpose', 'Expression · Life Path · Life Calling',
    'rgba(201,168,76,0.22)', 'rgba(26,20,8,0.65)',
    [[exp.root, 'ex', 1, exp.compound, true, 'ssc-fc--purpose-anchor'], [lp.root, 'lp', 0, lp.compound, true, 'ssc-fc--purpose-anchor'], [calling.root, null, 2, calling.compound, true]],
    { accent: '#e8c96b', accentDim: 'rgba(201,168,76,0.4)', accentLight: '#e8c96b' }
  );

  const readingFor = _t('calc.results.reading_for') || 'Reading for';
  const firstName  = fullName.split(' ')[0];

  const hookCopy = buildResultHook(firstName, lp.root, exp.root, calling.root);

  const coreSummary = buildCoreSummary(lp, exp, calling);
  const codexFootprint = buildCodexFootprintMap(lp, exp, calling);

  resultsTarget.innerHTML = `
    <style>
      .ssc-rw { }
      .ssc-fc  { padding: 22px 18px; }
      .ssc-fn  { font-size: 34px; }
      .ssc-fp  { font-size: 16px; }
      .ssc-role{ font-size: 10px; }
      .ssc-lbl { font-size: 12px; }
      .ssc-ess { font-size: 10px; }
      .ssc-cdx { font-size: 10px; }
      .ssc-reveal { opacity: 0; transform: translateY(14px); animation: sscResultReveal .58s ease forwards; }
      .ssc-delay-1 { animation-delay: .08s; }
      .ssc-delay-2 { animation-delay: .16s; }
      .ssc-delay-3 { animation-delay: .24s; }
      .ssc-delay-4 { animation-delay: .32s; }
      .ssc-delay-5 { animation-delay: .40s; }
      @keyframes sscResultReveal { to { opacity: 1; transform: translateY(0); } }
      .ssc-core-summary { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin:0 auto 34px; max-width:880px; }
      .ssc-core-card { background:linear-gradient(135deg, rgba(13,11,24,.92), rgba(8,20,20,.7)); border:1px solid rgba(126,200,200,.22); border-radius:12px; padding:18px 14px; text-align:center; position:relative; overflow:hidden; }
      .ssc-core-card::before { content:''; position:absolute; top:0; left:0; right:0; height:1px; background:linear-gradient(90deg, transparent, rgba(126,200,200,.5), transparent); }
      .ssc-core-label { font-family:'Cinzel',serif; font-size:8px; letter-spacing:.24em; text-transform:uppercase; color:var(--text-muted); margin-bottom:8px; }
      .ssc-core-num { font-family:'Cinzel Decorative',serif; font-size:34px; color:var(--gold-light); line-height:1; margin-bottom:8px; }
      .ssc-core-meta { font-family:'EB Garamond',serif; font-size:14px; color:var(--text-dim); font-style:italic; }
      .ssc-fc--purpose-anchor { position:relative; background:linear-gradient(180deg, rgba(201,168,76,.055), rgba(13,11,24,.18)); box-shadow:inset 0 0 0 1px rgba(201,168,76,.13); }
      .ssc-fc--purpose-anchor::before { content:''; position:absolute; top:0; left:18px; right:18px; height:1px; background:linear-gradient(90deg, transparent, rgba(201,168,76,.55), transparent); }
      .ssc-fc--purpose-anchor .ssc-fn { color:var(--gold-light) !important; text-shadow:0 0 24px rgba(201,168,76,.22); }
      .ssc-fc--purpose-anchor .ssc-role { color:rgba(232,201,107,.68) !important; }
      @media (min-width: 680px) {
        .ssc-rw  { max-width: 1100px; margin: 0 auto; }
        .ssc-fc  { padding: 28px 22px !important; }
        .ssc-fn  { font-size: 48px !important; margin-bottom: 14px !important; }
        .ssc-fp  { font-size: 17px !important; line-height: 1.82 !important; }
        .ssc-role{ font-size: 10px !important; margin-bottom: 7px !important; }
        .ssc-lbl { font-size: 12px !important; margin-bottom: 8px !important; }
        .ssc-ess { font-size: 10px !important; margin-bottom: 12px !important; }
        .ssc-cdx { font-size: 10px !important; margin-bottom: 14px !important; }
        .ssc-th  { padding: 18px 26px !important; }
        .ssc-tr  { border-radius: 14px !important; margin-bottom: 32px !important; }
      }
      @media (max-width: 679px) {
        .ssc-mobile-head { margin-bottom: 30px !important; padding-bottom: 24px !important; }
        .ssc-core-summary { grid-template-columns:1fr !important; gap:10px !important; margin-bottom:28px !important; }
        .ssc-core-card { padding:16px 14px !important; }
        .ssc-core-num { font-size:32px !important; }
        .ssc-mobile-chart { margin-bottom: 32px !important; }
        .ssc-tg  { grid-template-columns: 1fr !important; }
        .ssc-fc  { border-right: none !important; border-bottom: 1px solid rgba(255,255,255,0.06); padding: 26px 20px !important; }
        .ssc-fc:last-child { border-bottom: none !important; }
        .ssc-fn  { font-size: 40px !important; margin-bottom: 12px !important; }
        .ssc-fp  { font-size: 17px !important; line-height: 1.88 !important; }
        .ssc-role{ font-size: 11px !important; margin-bottom: 8px !important; }
        .ssc-lbl { font-size: 13px !important; margin-bottom: 10px !important; }
        .ssc-ess { font-size: 11px !important; margin-bottom: 12px !important; }
        .ssc-cdx { font-size: 11px !important; margin-bottom: 14px !important; }
        .ssc-th  { padding: 16px 18px !important; }
        .ssc-tr  { margin-bottom: 28px !important; border-radius: 14px !important; }
        .ssc-compound-p { font-size: 12px !important; }
      }
    </style>
    <div class="ssc-rw">
      <div class="ssc-mobile-head" style="text-align:center;margin-bottom:40px;padding-bottom:32px;position:relative">
        <div style="font-family:'Cinzel',serif;font-size:10px;letter-spacing:.34em;text-transform:uppercase;color:var(--gold-dim);margin-bottom:12px">${readingFor}</div>
        <div style="font-family:'Cinzel Decorative',serif;font-size:26px;color:var(--gold);letter-spacing:.04em;line-height:1.2">${fullName}</div>
        <div style="font-family:'Cormorant SC',serif;font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:var(--text-muted);margin-top:12px;opacity:.85">Your Complete Frequency Blueprint</div>
        <div style="position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:90px;height:1px;background:linear-gradient(90deg,transparent,var(--gold),transparent)"></div>
      </div>
      ${coreSummary}
      <div class="ssc-mobile-chart ssc-reveal ssc-delay-1" style="display:flex;justify-content:center;margin-bottom:44px">
        ${buildFreqChart(numbers)}
      </div>
      <div class="ssc-reveal ssc-delay-2">${codexFootprint}</div>
      <div class="ssc-reveal ssc-delay-3">${lessonsBlock}</div>
      <div class="ssc-reveal ssc-delay-4">${expressionBlock}</div>
      <div class="ssc-reveal ssc-delay-5">${purposeBlock}</div>
      <div class="ssc-reveal ssc-delay-5">${hookCopy}</div>
    </div>
  `;

  // ── Show the Unlock CTA ──────────────────────────────────────
  var cta = document.getElementById('unlock-cta');
  if (cta) {
    cta.style.display = 'block';
    cta.removeAttribute('aria-hidden');
  }

  _setCalculatorLeadMessage('', false);
  var leadEmailEl = document.getElementById('calc-lead-email');
  if (leadEmailEl && leadEmailEl.value.trim()) {
    submitCalculatorLead();
  }

  _scrollResultIntoViewIfNeeded(resultsTarget);

  // ── Reset button state ─────────────────────────────────────
  if (btn) {
    btn.disabled = false;
    btn.removeAttribute('aria-busy');
    btn.textContent = '⬡  Decode Another Reading ⬡';
    btn.classList.remove('ssc-btn-loading');
  }

  // Keep users on their reading; no auto-focus jump to purchase fields.
}



function buildCoreSummary(lp, exp, calling) {
  const items = [
    ['Life Path', lp.root, lp.compound, 'External curriculum'],
    ['Expression', exp.root, exp.compound, 'Authentic signal'],
    ['Life Calling', calling.root, calling.compound, 'Purpose directive'],
  ];

  return `
    <div class="ssc-core-summary ssc-reveal" aria-label="Core numerology summary">
      ${items.map(function(item) {
        return `
          <div class="ssc-core-card">
            <div class="ssc-core-label">${item[0]}</div>
            <div class="ssc-core-num">${item[1]}</div>
            <div class="ssc-core-meta">${item[3]} · ${item[2]}/${item[1]}</div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// ── Dynamic result hook — sells the guidebook ────────────────────────────
function buildResultHook(firstName, lp, exp, calling) {

  // Friction phrases — what the LP/Expression tension creates
  const frictionMap = {
    // LP: message about what the simulation keeps presenting
    1: 'keep finding yourself at new beginnings — situations that demand you go first, even when you feel unready',
    2: 'keep encountering dynamics that test your ability to hold your own while staying connected to others',
    3: 'keep being pulled toward creative expression but hitting blocks around follow-through and self-doubt',
    4: 'keep running into situations that demand structure, discipline, and long-term commitment',
    5: 'keep attracting experiences that push you out of comfort zones — the simulation keeps moving the ground beneath you',
    6: 'keep finding yourself responsible for others — carrying, nurturing, holding things together',
    7: 'keep being driven inward — situations that strip away surface certainty and demand real self-knowledge',
    8: 'keep encountering power dynamics — situations where authority, control, and self-mastery are the central lesson',
    9: 'keep being drawn toward completion, release, and contribution — the simulation keeps asking you to let go and give back',
    11: 'keep being placed in the role of bridge — between people, between ideas, between what is and what could be',
    22: 'keep being handed visions larger than what feels practical — the simulation keeps testing whether you can build them',
    33: 'keep being called to serve, teach, and hold space — the simulation keeps placing people who need your clarity in your path',
    44: 'keep being tasked with building things that last — structures, systems, legacies that go beyond the personal',
  };

  // Expression phrases — what they're encoded to express
  const expressionMap = {
    1: 'encoded to initiate — to cut through, begin, and demonstrate independence',
    2: 'encoded to connect — to bridge, harmonise, and bring people into coherence',
    3: 'encoded to express — through communication, creativity, and authentic voice',
    4: 'encoded to build — to create order, structure, and lasting foundations',
    5: 'encoded to experience — to be present, adapt, and embody freedom',
    6: 'encoded to nurture — to care, integrate, and hold the wellbeing of the whole',
    7: 'encoded to seek — to go deep, question, and carry real inner wisdom',
    8: 'encoded to master — to accumulate real authority and demonstrate it through results',
    9: 'encoded to complete — to serve, release, and hold a universal perspective',
    11: 'encoded to illuminate — to channel insight and bridge seen and unseen',
    22: 'encoded to build at scale — to manifest vision in structures that serve many',
    33: 'encoded to teach through compassion — to express healing through presence',
    44: 'encoded to organise power — to create systems of enduring strength',
  };

  const friction   = frictionMap[lp]  || 'keep encountering situations that reflect your core frequencies back to you';
  const expression = expressionMap[exp] || 'encoded to express your unique frequency in the world';

  return `
    <div class="ssc-hook-wrap" style="
      margin-top: 36px;
      opacity: 0;
      animation: sscFadeIn 0.8s ease 1.6s forwards;
    ">
    <div style="
      background: linear-gradient(135deg, rgba(13,11,24,0.92), rgba(8,20,20,0.72));
      border: 1px solid rgba(126,200,200,0.16);
      border-radius: 12px;
      padding: 26px 24px 24px;
      position: relative;
      overflow: hidden;
      box-shadow: 0 18px 56px rgba(0,0,0,0.22), inset 0 0 26px rgba(255,255,255,0.012);
    ">
      <div style="
        position: absolute; top: 0; left: 0; right: 0; height: 1px;
        background: linear-gradient(90deg, transparent, rgba(126,200,200,0.38), rgba(201,168,76,0.2), transparent);
      "></div>

      <div style="
        font-family: 'Cinzel', serif;
        font-size: 8px;
        letter-spacing: .4em;
        text-transform: uppercase;
        color: rgba(126,200,200,0.72);
        margin-bottom: 16px;
        padding: 9px 12px;
        border: 1px solid rgba(126,200,200,0.12);
        border-radius: 999px;
        background: rgba(126,200,200,0.035);
        display: inline-block;
      ">What This Means For You</div>

      <p style="font-size: 16px; line-height: 1.85; color: var(--text-dim); margin-bottom: 14px;">
        ${firstName}, your <strong style="color:rgba(232,201,107,0.92)">${lp} Life Path</strong> means you will
        ${friction}. This is not bad luck — it is the curriculum your simulation is running.
      </p>

      <p style="font-size: 16px; line-height: 1.85; color: var(--text-dim); margin-bottom: 14px;">
        At the same time, your <strong style="color:rgba(232,201,107,0.92)">${exp} Expression</strong> means you are
        ${expression}. The tension between what life presents and what you are built to express
        is the engine of your growth.
      </p>

      <p style="font-size: 16px; line-height: 1.85; color: var(--text-dim);">
        Your <strong style="color:rgba(232,201,107,0.92)">${calling} Life Calling</strong> is where these two circuits
        converge into a single directive. Understanding it — the compound story, the shadow,
        the integration — is what the Complete Blueprint covers in full.
      </p>

      <div style="
        margin-top: 20px;
        padding-top: 18px;
        border-top: 1px solid rgba(126,200,200,0.1);
        font-family: 'Cinzel', serif;
        font-size: 9px;
        letter-spacing: .25em;
        text-transform: uppercase;
        color: rgba(192,192,216,0.62);
      ">Your Complete Blueprint reveals the full story of each number above.</div>
    </div>
    </div>
  `;
}

// ─── Frequency Chart (Star of David / Hexagram) ───────────────
function buildFreqChart(numbers) {
  // numbers: [lifePath, expression, calling, soul, outer, achieve, theme]
  // Positions:
  //   expression  = -90°  top           → numbers[3]
  //   soul        = 150°  bottom-left   → numbers[1]
  //   outer       = 30°   bottom-right  → numbers[4]
  //   lifePath    = 90°   bottom        → numbers[0]
  //   achievement = -150° top-left      → numbers[5]
  //   theme       = -30°  top-right     → numbers[6]
  //   center                            → numbers[2]

  const W = 380, H = 380, cx = 190, cy = 190, r = 148;

  function pt(angle) {
    const rad = angle * Math.PI / 180;
    return { x: +(cx + r * Math.cos(rad)).toFixed(2),
             y: +(cy + r * Math.sin(rad)).toFixed(2) };
  }

  const soul       = pt(150);
  const expression = pt(-90);
  const outer      = pt(30);
  const lifePath   = pt(90);
  const achievement= pt(-150);
  const theme      = pt(-30);

  const gold   = '#c9a84c';
  const purple = '#7b4fa6';
  const teal   = '#4a9494';

  const COLORS = {
    soul:        { stroke: purple, fill: '#120b1a', text: '#a96ed4' },
    expression:  { stroke: gold,   fill: '#1a1408', text: '#e8c96b' },
    outer:       { stroke: teal,   fill: '#081414', text: '#7ec8c8' },
    lifePath:    { stroke: gold,   fill: '#1a1408', text: '#e8c96b' },
    achievement: { stroke: purple, fill: '#120b1a', text: '#a96ed4' },
    theme:       { stroke: teal,   fill: '#081414', text: '#7ec8c8' },
  };

  // ── Animation helpers ──────────────────────────────────────
  // Each element gets a class + inline animation-delay via a <style> block

  // Animated line: draws from center outward using stroke-dasharray trick
  function aLine(a, b, color, opacity, w, delay) {
    const len = Math.hypot(b.x - a.x, b.y - a.y).toFixed(1);
    return `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"
      stroke="${color}" stroke-width="${w}" opacity="${opacity}" stroke-linecap="round"
      stroke-dasharray="${len}" stroke-dashoffset="${len}"
      style="animation: sscDash 0.6s cubic-bezier(0.4,0,0.2,1) ${delay}s forwards"/>`;
  }

  // Triangle that scales from center
  function aTri(a, b, c, fill, stroke, delay) {
    return `<polygon points="${a.x},${a.y} ${b.x},${b.y} ${c.x},${c.y}"
      fill="${fill}" stroke="${stroke}" stroke-width="1.2" stroke-linejoin="round"
      transform-origin="${cx} ${cy}"
      style="animation: sscScale 0.7s cubic-bezier(0.34,1.56,0.64,1) ${delay}s both"/>`;
  }

  // Node group: scales up from cx,cy
  function aNode(x, y, num, label, color, r2, delay) {
    const labelDy = y < cy - 10 ? -(r2 + 22) : r2 + 14;
    return `<g transform-origin="${x} ${y}"
        style="animation: sscNodePop 0.5s cubic-bezier(0.34,1.56,0.64,1) ${delay}s both">
      <circle cx="${x}" cy="${y}" r="${r2 + 7}" fill="${color.fill}" stroke="${color.stroke}"
        stroke-width="1" opacity="0.4"/>
      <circle cx="${x}" cy="${y}" r="${r2}" fill="${color.fill}" stroke="${color.stroke}"
        stroke-width="1.5"/>
      <text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central"
        font-family="'Cinzel Decorative',serif" font-size="${num > 9 ? 13 : 16}"
        fill="${color.text}" font-weight="700">${num}</text>
      <text x="${x}" y="${y + labelDy}" text-anchor="middle"
        font-family="'Cinzel',serif" font-size="8" fill="${color.text}"
        letter-spacing="0.12em" opacity="0.9">${label.toUpperCase()}</text>
    </g>`;
  }

  function aCenterNode(num, delay) {
    return `<g transform-origin="${cx} ${cy}"
        style="animation: sscNodePop 0.6s cubic-bezier(0.34,1.56,0.64,1) ${delay}s both">
      <circle cx="${cx}" cy="${cy}" r="38" fill="rgba(201,168,76,0.06)" stroke="${gold}"
        stroke-width="1" opacity="0.5"/>
      <circle cx="${cx}" cy="${cy}" r="28" fill="#100e04" stroke="${gold}" stroke-width="1.5"/>
      <text x="${cx}" y="${cy - 4}" text-anchor="middle" dominant-baseline="central"
        font-family="'Cinzel Decorative',serif" font-size="${num > 9 ? 13 : 16}"
        fill="#e8c96b" font-weight="700">${num}</text>
      <text x="${cx}" y="${cy + 16}" text-anchor="middle"
        font-family="'Cinzel',serif" font-size="6.5" fill="${gold}"
        letter-spacing="0.14em" opacity="0.85">LIFE CALLING</text>
    </g>`;
  }

  // ── Timing (seconds) ──────────────────────────────────────
  // 0.0  background circle fades in
  // 0.1  center node pops
  // 0.2  spokes draw out
  // 0.5  triangle fills scale up
  // 0.7  triangle edges draw
  // 0.85 cross lines draw
  // 1.0–1.6  outer nodes pop in staggered

  const bgCircle = `<circle cx="${cx}" cy="${cy}" r="175"
    fill="url(#bgGrad)" stroke="rgba(201,168,76,0.12)" stroke-width="1"
    style="animation: sscFadeIn 0.4s ease 0s both"/>`;

  // Pulsating glow layers — start after all nodes have appeared (~1.5s)
  const pulseDelay = 1.6;
  const glowLayers = `
    <circle cx="${cx}" cy="${cy}" r="162" fill="none" stroke="${gold}" stroke-width="18"
      opacity="0" filter="url(#sscGlow)"
      style="animation: sscPulse1 3.2s ease-in-out ${pulseDelay}s infinite"/>
    <circle cx="${cx}" cy="${cy}" r="148" fill="none" stroke="${purple}" stroke-width="12"
      opacity="0" filter="url(#sscGlow)"
      style="animation: sscPulse2 3.2s ease-in-out ${pulseDelay + 0.4}s infinite"/>
    <circle cx="${cx}" cy="${cy}" r="175" fill="url(#pulseGrad)"
      opacity="0"
      style="animation: sscPulse3 3.2s ease-in-out ${pulseDelay + 0.8}s infinite"/>
  `;

  const centerPulse = `<circle cx="${cx}" cy="${cy}" r="0" fill="none" stroke="${gold}" stroke-width="1.5" opacity="0.6"
    style="animation: sscRipple 1.2s ease-out 0.15s both"/>`;

  const spokes = [soul, expression, outer, lifePath, achievement, theme]
    .map((p, i) => aLine({x:cx,y:cy}, p, gold, 0.18, 0.8, 0.2 + i*0.03))
    .join('');

  const upFill   = aTri(soul, expression, outer,      'rgba(201,168,76,0.07)',  gold,   0.5);
  const downFill = aTri(lifePath, achievement, theme, 'rgba(123,79,166,0.07)', purple, 0.55);

  const upEdges = [
    aLine(soul, expression,  gold,   0.55, 1.4, 0.70),
    aLine(expression, outer, gold,   0.55, 1.4, 0.76),
    aLine(outer, soul,       gold,   0.55, 1.4, 0.82),
  ].join('');
  const downEdges = [
    aLine(lifePath, achievement, purple, 0.55, 1.4, 0.72),
    aLine(achievement, theme,    purple, 0.55, 1.4, 0.78),
    aLine(theme, lifePath,       purple, 0.55, 1.4, 0.84),
  ].join('');

  const crossLines = [
    aLine(soul, lifePath,     purple, 0.25, 1.2, 0.88),
    aLine(expression, theme,  gold,   0.25, 1.2, 0.92),
    aLine(outer, achievement, teal,   0.25, 1.2, 0.96),
  ].join('');

  const outerNodes = [
    aNode(soul.x,        soul.y,        numbers[3], 'Soul',        COLORS.soul,        22, 1.05),
    aNode(theme.x,       theme.y,       numbers[6], 'Theme',       COLORS.theme,       22, 1.15),
    aNode(outer.x,       outer.y,       numbers[4], 'Outer',       COLORS.outer,       22, 1.20),
    aNode(lifePath.x,    lifePath.y,    numbers[0], 'Life Path',   COLORS.lifePath,    22, 1.25),
    aNode(achievement.x, achievement.y, numbers[5], 'Achievement', COLORS.achievement, 22, 1.35),
    aNode(expression.x,  expression.y,  numbers[1], 'Expression',  COLORS.expression,  22, 1.40),
  ].join('');

  return `
    <style>
      @keyframes sscFadeIn  { from { opacity:0 } to { opacity:1 } }
      @keyframes sscScale   { from { transform:scale(0); opacity:0 } to { transform:scale(1); opacity:1 } }
      @keyframes sscNodePop { from { transform:scale(0); opacity:0 } to { transform:scale(1); opacity:1 } }
      @keyframes sscDash    { to   { stroke-dashoffset:0 } }
      @keyframes sscRipple  { from { r:0; opacity:0.8 } to { r:160; opacity:0 } }
      @keyframes sscPulse1  { 0%,100% { r:162; opacity:0.10 } 50% { r:178; opacity:0.28 } }
      @keyframes sscPulse2  { 0%,100% { r:148; opacity:0.08 } 50% { r:168; opacity:0.20 } }
      @keyframes sscPulse3  { 0%,100% { opacity:0.06 } 50% { opacity:0.18 } }
    </style>
    <div class="ssc-chart-wrap" style="max-width:${W}px;width:100%;margin:0 auto">
    <svg viewBox="0 0 ${W} ${H}" width="100%" height="100%"
      style="overflow:visible;display:block"
      xmlns="http://www.w3.org/2000/svg">

      <defs>
        <radialGradient id="bgGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stop-color="#1a1620" stop-opacity="1"/>
          <stop offset="100%" stop-color="#05040a" stop-opacity="1"/>
        </radialGradient>
        <radialGradient id="pulseGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stop-color="#7b4fa6" stop-opacity="0"/>
          <stop offset="60%"  stop-color="#c9a84c" stop-opacity="0.04"/>
          <stop offset="100%" stop-color="#4a9494" stop-opacity="0.10"/>
        </radialGradient>
        <filter id="sscGlow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      ${bgCircle}
      ${glowLayers}
      ${centerPulse}
      ${upFill}
      ${downFill}
      ${upEdges}
      ${downEdges}
      ${crossLines}
      ${spokes}
      ${outerNodes}
      ${aCenterNode(numbers[2], 0.1)}

    </svg></div>`;
}

function handleUnlockPayment() {
  var emailInput = document.getElementById('unlock-email');
  var errorEl    = document.getElementById('unlock-email-error');
  var btn        = document.getElementById('unlock-pay-btn');
  var email      = (emailInput ? emailInput.value : '').trim();

  console.log('=== handleUnlockPayment called ===');
  console.log('Email:', email);
  console.log('Button element:', btn);
  console.log('Button data attributes:', btn ? btn.dataset : 'N/A');

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.log('Invalid email, returning');
    if (errorEl) {
      errorEl.textContent = 'Please enter a valid email address.';
      errorEl.style.color = 'var(--rose-light)';
    }
    if (emailInput) emailInput.focus();
    return;
  }
  if (errorEl) errorEl.textContent = '';

  var payload = {
    email: email,
    name:  (document.getElementById('calc-fullname') || {}).value || '',
    month: (document.getElementById('calc-month')    || {}).value || '',
    day:   (document.getElementById('calc-day')      || {}).value || '',
    year:  (document.getElementById('calc-year')     || {}).value || '',
  };

  try { sessionStorage.setItem('ssc_pending_order', JSON.stringify(payload)); } catch(e) {}

  btn.disabled    = true;
  btn.textContent = '· Connecting to Stripe ·';

  console.log('Sending payload:', JSON.stringify(payload));

  fetch(SSC_CHECKOUT_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  })
  .then(function(res) {
    console.log('Fetch response status:', res.status);
    if (!res.ok) {
      return res.text().then(function(text) {
        var data = {};
        try { data = JSON.parse(text); } catch (_) {}
        var msg = data.error || text || ('HTTP ' + res.status);
        console.error('Error response:', msg);
        throw new Error(msg);
      });
    }
    return res.json();
  })
  .then(function(data) {
    console.log('Checkout response:', data);
    if (data.success) {
      window.location.href = '/thank-you/?email=' + encodeURIComponent(email) + '&product=guidebook';
    } else if (data.url) {
      console.log('Redirecting to:', data.url);
      window.location.href = data.url;
    } else {
      throw new Error(data.error || 'No checkout URL returned');
    }
  })
  .catch(function(err) {
    console.error('Checkout error:', err);
    if (errorEl) {
      errorEl.textContent = 'Checkout failed: ' + err.message;
      errorEl.style.color = 'var(--rose-light)';
    }
    btn.disabled    = false;
    btn.textContent = '⬡  Receive My Guidebook  ⬡';
  });
}

window.handleUnlockPayment = handleUnlockPayment;

/* ═══════════════════════════════════════════════════════════════
   EXPOSE TO WINDOW
═══════════════════════════════════════════════════════════════ */

window.calculateReading = calculateReading;
window.submitCalculatorLead = submitCalculatorLead;
window.buildFreqChart   = buildFreqChart;
window.COMPOUND_DESC    = COMPOUND_DESC;

window.handleUnlockPayment = handleUnlockPayment;

document.addEventListener('click', function(e) {
  if (e.target && e.target.id === 'unlock-pay-btn') {
    handleUnlockPayment();
  }
});

document.addEventListener('keydown', function(e) {
  if (e.key === 'Enter' && e.target && e.target.id === 'calc-lead-email') {
    e.preventDefault();
    calculateReading();
  }
});

