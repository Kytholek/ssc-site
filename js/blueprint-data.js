/**
 * Browser bootstrap — attaches blueprint data to window for legacy scripts.
 */
import {
  TRINITY_ARTICLES,
  TRINITIES,
  FREQUENCIES,
  JOURNEY_CHAPTERS,
  FAQ_ITEMS,
  getFrequency,
  getTrinity,
  getFrequencyLinks,
} from './blueprint-data.mjs';

window.BLUEPRINT_TRINITY_ARTICLES = TRINITY_ARTICLES;
window.BLUEPRINT_TRINITIES = TRINITIES;
window.BLUEPRINT_FREQUENCIES = FREQUENCIES;
window.BLUEPRINT_JOURNEY_CHAPTERS = JOURNEY_CHAPTERS;
window.BLUEPRINT_FAQ = FAQ_ITEMS;
window.getBlueprintFrequency = getFrequency;
window.getBlueprintTrinity = getTrinity;
window.getBlueprintFrequencyLinks = getFrequencyLinks;
