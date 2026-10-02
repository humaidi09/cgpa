// Deck themes — a slide deck's whole personality lives here: the palette, the
// accent pair, and the type pairing. Every theme is defined once and consumed by
// both the on-screen preview and the .pptx exporter, so what a student sees is
// what they download.
//
// Design notes: the reference decks are dark, high-contrast and geometric —
// a near-black canvas, one bright accent used sparingly, and a large "ghost"
// numeral or shape doing the heavy visual lifting while the text stays quiet.
// Each theme below carries that same discipline with its own colour story.

export const THEMES = [
  {
    id: 'fjord',
    name: 'Fjord',
    note: 'Deep navy with a mint-to-teal accent — the classic infographic deck.',
    dark: true,
    bg: '0E1621',        // slide canvas
    bg2: '131F2E',       // raised panel
    ink: 'F4F7FA',       // primary text
    muted: '93A1B2',     // secondary text
    line: '26374B',      // hairlines
    accent: '7BE0C0',    // mint
    accent2: '3FB4A8',   // teal (paired with accent for layered shapes)
    accentInk: '0B141C', // text that sits ON the accent
    headFont: 'Trebuchet MS',
    bodyFont: 'Calibri',
    numFont: 'Impact',
  },
  {
    id: 'abyss',
    name: 'Abyss',
    note: 'Near-black with an electric cyan accent — sharp and technical.',
    dark: true,
    bg: '060A12',
    bg2: '0D1420',
    ink: 'F2F6FB',
    muted: '8894A6',
    line: '1B2636',
    accent: '35D8F0',
    accent2: '1E8FB8',
    accentInk: '04121A',
    headFont: 'Segoe UI',
    bodyFont: 'Segoe UI',
    numFont: 'Impact',
  },
  {
    id: 'violet',
    name: 'Violet Hour',
    note: 'Dark plum with a soft lilac accent — for creative and design topics.',
    dark: true,
    bg: '120E1F',
    bg2: '1B1530',
    ink: 'F5F1FB',
    muted: '9C93B5',
    line: '2C2344',
    accent: 'C39BFF',
    accent2: '8A5CD6',
    accentInk: '150E24',
    headFont: 'Trebuchet MS',
    bodyFont: 'Calibri',
    numFont: 'Impact',
  },
  {
    id: 'ember',
    name: 'Ember',
    note: 'Charcoal with a warm amber accent — confident and energetic.',
    dark: true,
    bg: '171310',
    bg2: '221B16',
    ink: 'FBF5EE',
    muted: 'B5A594',
    line: '3A2E24',
    accent: 'FFB454',
    accent2: 'E0803A',
    accentInk: '1C130A',
    headFont: 'Georgia',
    bodyFont: 'Calibri',
    numFont: 'Impact',
  },
  {
    id: 'graphite',
    name: 'Graphite',
    note: 'Monochrome dark with a single red accent — bold and editorial.',
    dark: true,
    bg: '101112',
    bg2: '191B1D',
    ink: 'F6F6F7',
    muted: '9A9DA2',
    line: '2A2D31',
    accent: 'FF5D5D',
    accent2: 'C93C3C',
    accentInk: '1A0B0B',
    headFont: 'Arial Black',
    bodyFont: 'Arial',
    numFont: 'Impact',
  },
  {
    id: 'atlas',
    name: 'Atlas',
    note: 'Clean light theme with a deep-blue accent — formal and academic.',
    dark: false,
    bg: 'FFFFFF',
    bg2: 'F2F5F9',
    ink: '131A24',
    muted: '5C6672',
    line: 'DCE2EA',
    accent: '1E5AA8',
    accent2: '10407C',
    accentInk: 'FFFFFF',
    headFont: 'Georgia',
    bodyFont: 'Calibri',
    numFont: 'Impact',
  },
]

export const THEME_BY_ID = Object.fromEntries(THEMES.map((t) => [t.id, t]))

export const DEFAULT_THEME = 'fjord'

export function themeById(id) {
  return THEME_BY_ID[id] || THEME_BY_ID[DEFAULT_THEME]
}
