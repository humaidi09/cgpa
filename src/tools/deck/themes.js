// Deck themes — a slide deck's whole personality lives here: the palette, the
// accent pair, and the type pairing. Every theme is defined once and consumed by
// both the on-screen preview and the .pptx exporter, so what a student sees is
// what they download.
//
// Design notes: the reference decks are dark, high-contrast and geometric —
// a near-black canvas, one bright accent used sparingly, and a huge "ghost"
// numeral or a faceted plate doing the visual lifting while the text stays
// quiet. Two rules keep these themes from reading as default PowerPoint:
//
//   1. No Impact, no Calibri body copy. The type pairing is condensed-grotesque
//      for figures, a serif or strong sans for headings, and a single humanist
//      sans for everything else. All of these ship with Windows/Office, so the
//      downloaded .pptx looks the same on a lab machine as it does here.
//   2. Every colour is one of five roles — canvas, raised panel, ink, quiet
//      text, hairline — plus a two-stop accent used for depth. Nothing else.

export const THEMES = [
  {
    id: 'fjord',
    name: 'Fjord',
    note: 'Deep navy with a mint accent — the classic dark infographic deck.',
    dark: true,
    bg: '0B1520',        // slide canvas
    bg2: '101E2C',       // raised panel / card
    ink: 'F6F9FC',       // primary text
    muted: '9FB0C2',     // secondary text
    line: '22384C',      // hairlines + card borders
    accent: '6FE3BE',    // mint — the one bright colour
    accent2: '2FA894',   // teal — depth partner for layered shapes
    accentInk: '061410', // text that sits ON the accent
    headFont: 'Georgia',
    bodyFont: 'Segoe UI',
    numFont: 'Bahnschrift',
  },
  {
    id: 'abyss',
    name: 'Abyss',
    note: 'Near-black with an electric cyan accent — sharp and technical.',
    dark: true,
    bg: '05090F',
    bg2: '0C1420',
    ink: 'F2F7FC',
    muted: '8593A6',
    line: '1A2738',
    accent: '3FD9F2',
    accent2: '1F8FB4',
    accentInk: '03131A',
    headFont: 'Bahnschrift',
    bodyFont: 'Segoe UI',
    numFont: 'Bahnschrift',
  },
  {
    id: 'violet',
    name: 'Violet Hour',
    note: 'Dark plum with a soft lilac accent — for creative and design topics.',
    dark: true,
    bg: '100C1C',
    bg2: '191230',
    ink: 'F6F2FD',
    muted: 'A296BE',
    line: '2A2144',
    accent: 'C7A2FF',
    accent2: '7F55D4',
    accentInk: '120C22',
    headFont: 'Georgia',
    bodyFont: 'Segoe UI',
    numFont: 'Bahnschrift',
  },
  {
    id: 'ember',
    name: 'Ember',
    note: 'Charcoal with a warm amber accent — confident and energetic.',
    dark: true,
    bg: '14100C',
    bg2: '201A14',
    ink: 'FCF6EE',
    muted: 'B8A794',
    line: '362B20',
    accent: 'FFB454',
    accent2: 'D97B2E',
    accentInk: '1A1108',
    headFont: 'Georgia',
    bodyFont: 'Segoe UI',
    numFont: 'Bahnschrift',
  },
  {
    id: 'graphite',
    name: 'Graphite',
    note: 'Monochrome dark with a single red accent — bold and editorial.',
    dark: true,
    bg: '0D0E10',
    bg2: '17191C',
    ink: 'F7F7F8',
    muted: '9C9FA4',
    line: '292C31',
    accent: 'FF6B5E',
    accent2: 'C7402F',
    accentInk: '1C0A07',
    headFont: 'Bahnschrift',
    bodyFont: 'Segoe UI',
    numFont: 'Bahnschrift',
  },
  {
    id: 'atlas',
    name: 'Atlas',
    note: 'Clean light theme with a deep-blue accent — formal and academic.',
    dark: false,
    bg: 'FFFFFF',
    bg2: 'F3F6FA',
    ink: '101821',
    muted: '5A6672',
    line: 'DAE1E9',
    accent: '1B5FA8',
    accent2: '11406F',
    accentInk: 'FFFFFF',
    headFont: 'Georgia',
    bodyFont: 'Segoe UI',
    numFont: 'Bahnschrift',
  },
]

export const THEME_BY_ID = Object.fromEntries(THEMES.map((t) => [t.id, t]))

export const DEFAULT_THEME = 'fjord'

export function themeById(id) {
  return THEME_BY_ID[id] || THEME_BY_ID[DEFAULT_THEME]
}
