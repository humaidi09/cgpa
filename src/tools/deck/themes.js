// Deck themes — a slide deck's whole personality lives here: the palette, the
// accent pair, and the type pairing. Every theme is defined once and consumed by
// both the on-screen preview and the .pptx exporter, so what a student sees is
// what they download.
//
// Design notes: each theme is grounded in a REAL object rather than a colour
// mood — an engineering pad, a slate board, a cyanotype drawing, a thesis page,
// a wall of sticky notes, a newspaper. That grounding is what makes them read as
// six different designs instead of one dark canvas recoloured. Two rules hold:
//
//   1. Fonts ship with Windows/Office, so the downloaded .pptx looks the same on
//      a university lab machine as it does here. Verified per theme below.
//   2. Every colour is one of five roles — canvas, raised panel, ink, quiet
//      text, hairline — plus a two-stop accent used for depth. Nothing else.
//
// Every palette below was checked with the WCAG relative-luminance formula:
// ink≥7:1 and muted≥4.5:1 against the canvas, accentInk≥4.5:1 on the accent,
// accent≥3:1 against the canvas. Change a colour and re-check those four.

export const THEMES = [
  {
    id: 'graphpaper',
    name: 'Graph Paper',
    note: 'Cream engineering pad, pale blue quad ruling, red margin mark.',
    dark: false,
    bg: 'FAF6EA',        // ivory pad
    bg2: 'FFFDF6',       // the raised card, a shade brighter than the pad
    ink: '14243D',       // navy engineering ink
    muted: '4E5F78',     // faded blue-grey annotation
    line: 'C3D3E6',      // the quad rule
    accent: 'C1272D',    // the red margin line — the one sharp mark on the page
    accent2: '8E1B20',   // deeper red for layered shapes
    accentInk: 'FFF8F0', // white chalk-ish text on the red
    headFont: 'Rockwell',
    bodyFont: 'Corbel',
    numFont: 'Consolas',
  },
  {
    id: 'chalkboard',
    name: 'Chalkboard',
    note: 'Deep slate-green board, soft chalk-white text, warm chalk accent.',
    dark: true,
    bg: '1E3A33',        // slate-green board, warm — deliberately not black
    bg2: '27473F',       // a panel of the same board, slightly lifted
    ink: 'E9EFE6',       // chalk white, softened — never pure #FFFFFF
    muted: 'A9BFB4',     // chalk dust
    line: '3E5C52',      // a faint edge between panels
    accent: 'F2C14E',    // yellow chalk
    accent2: 'C98A2B',   // the wooden frame, warming the depth partner
    accentInk: '20281F', // dark board showing through the chalk
    headFont: 'Georgia',
    bodyFont: 'Corbel',
    numFont: 'Consolas',
  },
  {
    id: 'blueprint',
    name: 'Blueprint',
    note: 'Cyanotype drafting blue, pale cyan linework, white annotation.',
    dark: true,
    bg: '0B2E4F',        // prussian drafting blue
    bg2: '123A5E',       // a lighter field for raised panels
    ink: 'EDF6FC',       // white annotation
    muted: '93B9D4',     // pale cyan text
    line: '2C587C',      // the fine drafting line
    accent: '3FD4EE',    // technical cyan
    accent2: '1B7FA6',   // deeper blue for layered shapes
    accentInk: '07243A', // the blue showing through the cyan
    headFont: 'Franklin Gothic Book',
    bodyFont: 'Corbel',
    numFont: 'Consolas',
  },
  {
    id: 'manuscript',
    name: 'Manuscript',
    note: 'Warm laid paper, iron-gall ink, rubric-red headings, hairline rules.',
    dark: false,
    bg: 'F3E9D6',        // aged warm paper
    bg2: 'E8DBC0',       // a darker leaf for panels
    ink: '2B2119',       // iron-gall brown-black
    muted: '6A5842',     // faded sepia
    line: 'C9B694',      // the hairline rule of a ruled page
    accent: 'A32E22',    // rubric red — what the scribes used for headings
    accent2: '6E1A14',   // the same red, dried darker
    accentInk: 'F7F0E2', // paper showing through the rubric
    headFont: 'Georgia',
    bodyFont: 'Constantia',
    numFont: 'Cambria',
  },
  {
    id: 'sticky',
    name: 'Sticky Notes',
    note: 'Warm paper board with manila-orange note accents.',
    dark: false,
    bg: 'F1ECE2',        // the board the notes are stuck to
    bg2: 'FBF8F0',       // a lifted note
    ink: '2A2620',       // marker ink
    muted: '6E675A',     // pencil note
    line: 'DCD3C2',      // the edge between notes
    accent: 'BE560B',    // manila orange — the single note colour we lead with
    accent2: '8A3D08',   // the same orange, shadowed
    accentInk: 'FFFFFF', // clean text on the orange
    headFont: 'Rockwell',
    bodyFont: 'Corbel',
    numFont: 'Consolas',
  },
  {
    id: 'newsprint',
    name: 'Newsprint',
    note: 'Cool grey newsprint, dense black type, masthead-red rules.',
    dark: false,
    bg: 'E8EAEC',        // cool grey pulp — the opposite of the manuscript's warmth
    bg2: 'F1F3F5',       // a lighter column
    ink: '14181C',       // dense news black
    muted: '5A626A',     // grey secondary type
    line: 'C3C9CE',      // the column rule
    accent: 'B01E28',    // masthead red — used like a masthead, sparingly
    accent2: '7A1219',   // the same red, pressed darker
    accentInk: 'F7F9FA', // paper showing through
    headFont: 'Rockwell',
    bodyFont: 'Georgia',
    numFont: 'Franklin Gothic Book',
  },
]

export const THEME_BY_ID = Object.fromEntries(THEMES.map((t) => [t.id, t]))

export const DEFAULT_THEME = 'graphpaper'

export function themeById(id) {
  return THEME_BY_ID[id] || THEME_BY_ID[DEFAULT_THEME]
}
