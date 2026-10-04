// Professional_Presentation_Template.pptx — a premium, fully-editable template.
//
// Every slide is built from native PowerPoint shapes, text boxes, lines, native
// charts and native tables — never a flattened image — so once the file opens,
// every colour, word, number and position is editable. Run headlessly:
//   node scripts/build-template.mjs
//
// Design system (one palette, two surfaces):
//   DARK  canvas 0B1520 — the deck's identity; most slides.
//   LIGHT canvas FFFFFF — a deliberate cluster for data / tables / team.
//   Accent pair: amber FFB454 + burnt amber D97B2E, used sparingly.
//   Type: Montserrat (display) + Inter (body). Both free; guide slide explains.
// Signature motif: concentric amber rings bleeding off a corner (hero/section/
// closing) + an amber eyebrow tick as the recurring structural device everywhere.

import PptxGenJS from 'pptxgenjs'
import JSZip from 'jszip'
import { writeFileSync, mkdirSync } from 'node:fs'

// ---------------------------------------------------------------- design tokens
const PAGE = { W: 13.333, H: 7.5 }
const ML = 0.9                 // left margin
const MR = 0.9                 // right margin
const CW = PAGE.W - ML - MR    // content width = 11.533
const RX = PAGE.W - MR         // right content edge = 12.433
const FONT = { display: 'Montserrat', body: 'Inter', num: 'Montserrat' }

// Dark surface roles.
const D = {
  bg: '0B1520', panel: '101E2C', panel2: '17293B', ink: 'F6F9FC', muted: '9FB0C2',
  line: '22384C', accent: 'FFB454', accent2: 'D97B2E', accentInk: '1A1108',
}
// Light surface roles (a deeper bronze reads on white where bright amber glares).
const L = {
  bg: 'FFFFFF', panel: 'F4F7FA', panel2: 'E9EFF5', ink: '101821', muted: '5A6672',
  line: 'DCE6EC', accent: 'A9681A', accent2: 'D97B2E', accentInk: 'FFFFFF',
}

const BRAND = 'DIGITAL TRANSFORMATION STRATEGY'
const EPS = 0.02

// ------------------------------------------------------------------- Deck class
// Thin wrapper over pptxgenjs that bounds-checks every element against the slide
// so QC catches anything off-canvas before the file ships.
class Deck {
  constructor() {
    this.p = new PptxGenJS()
    this.p.defineLayout({ name: 'W169', width: PAGE.W, height: PAGE.H })
    this.p.layout = 'W169'
    this.p.title = 'Professional Presentation Template'
    this.p.author = 'Template'
    this.warnings = []
    this.n = 0
    this.captured = []
    this._defineMasters()
  }

  _check(kind, o, bleed) {
    if (bleed) return
    const { x, y, w = 0, h = 0 } = o
    if (x < -EPS || y < -EPS || x + w > PAGE.W + EPS || y + h > PAGE.H + EPS) {
      this.warnings.push(`[slide ${this.n}] ${kind} out of bounds: x=${x} y=${y} w=${w} h=${h}`)
    }
  }

  _defineMasters() {
    const foot = (t) => ([
      { line: { x: ML, y: 6.92, w: CW, h: 0, line: { color: t.line, width: 1 } } },
      { text: { text: BRAND, options: { x: ML, y: 6.97, w: 8, h: 0.32, fontFace: FONT.body, fontSize: 8.5, color: t.muted, charSpacing: 2, align: 'left', valign: 'middle' } } },
    ])
    const num = (t) => ({ x: 11.9, y: 6.97, w: 0.53, h: 0.32, align: 'right', color: t.accent, fontFace: FONT.num, fontSize: 10.5, bold: true })
    // HERO — clean dark canvas for cover & closing (no footer / no number).
    this.p.defineSlideMaster({ title: 'HERO', background: { color: D.bg } })
    // DARK — content slides with footer + auto page number.
    this.p.defineSlideMaster({ title: 'DARK', background: { color: D.bg }, objects: foot(D), slideNumber: num(D) })
    // LIGHT — data / table / team cluster with footer + number.
    this.p.defineSlideMaster({ title: 'LIGHT', background: { color: L.bg }, objects: foot(L), slideNumber: num(L) })
  }

  slide(master = 'DARK') {
    this.n += 1
    const s = this.p.addSlide({ masterName: master })
    const bg = master === 'LIGHT' ? L.bg : D.bg
    const cap = { master, bg, els: [] }
    this.captured.push(cap)
    const self = this
    return {
      _s: s,
      rect(o, bleed) { self._check('rect', o, bleed); s.addShape(o.shape || 'rect', toShape(o)); cap.els.push({ k: 'shape', o }); return this },
      text(t, o, bleed) { self._check('text', o, bleed); s.addText(t, toText(o)); cap.els.push({ k: 'text', o, t }); return this },
      line(o, bleed) {
        const x = Math.min(o.x, o.x + o.w)
        const y = Math.min(o.y, o.y + o.h)
        const bb = { x, y, w: Math.abs(o.w), h: Math.abs(o.h) }
        self._check('line', bb, bleed)
        // pptxgenjs 4.0.1 emits negative <a:ext> for up/left deltas (invalid
        // OOXML → repair prompt), so normalise to a top-left origin and encode
        // direction with flipH/flipV instead.
        s.addShape('line', { x, y, w: bb.w, h: bb.h, flipH: o.w < 0, flipV: o.h < 0, line: { color: o.color, width: o.width || 1, dashType: o.dash, beginArrowType: o.beginArrow, endArrowType: o.endArrow, transparency: o.transparency || 0 } })
        cap.els.push({ k: 'line', o })
        return this
      },
      chart(type, data, o) { self._check('chart', o, false); s.addChart(type, data, o); cap.els.push({ k: 'chart', o, type }); return this },
      table(rows, o) { self._check('table', o, false); s.addTable(rows, o); cap.els.push({ k: 'table', o }); return this },
      raw() { return s },
    }
  }

  async write(path) {
    const buf = await this.p.write({ outputType: 'nodebuffer' })
    const withFade = await postProcess(buf)
    writeFileSync(path, withFade)
    return withFade.length
  }
}

function toShape(o) {
  const opts = { x: o.x, y: o.y, w: o.w, h: o.h }
  opts.fill = o.fill === 'none' ? { type: 'none' } : { color: o.fill || D.panel, transparency: o.transparency || 0 }
  if (o.line) opts.line = { color: o.line, width: o.lineW || 1, dashType: o.dash, transparency: o.lineTrans || 0 }
  else opts.line = { type: 'none' }
  if (o.radius != null) opts.rectRadius = o.radius
  if (o.rotate) opts.rotate = o.rotate
  if (o.shadow) opts.shadow = o.shadow
  return opts
}
function toText(o) {
  return {
    x: o.x, y: o.y, w: o.w, h: o.h,
    fontFace: o.font || FONT.body, fontSize: o.size || 14, color: o.color || D.ink,
    bold: !!o.bold, italic: !!o.italic, align: o.align || 'left', valign: o.valign || 'top',
    charSpacing: o.spacing, lineSpacing: o.lineSpacing, margin: o.margin ?? 0, wrap: true,
    isTextBox: true, fit: o.fit, transparency: o.transparency, breakLine: o.breakLine,
  }
}

// Re-open the written .pptx (a zip of XML) for the two things pptxgenjs has no
// API for: a Fade transition on each slide, and retuning the Office theme's
// colour scheme so PowerPoint's own UI (the colour picker, "recolor by theme",
// new shapes) speaks the deck's palette instead of the stock Office blues.
//
// The theme is what a person meets the moment they insert a shape or pick a
// theme colour — leaving it Office blue while every slide is amber is the kind
// of seam that makes an otherwise bespoke deck read as a recoloured template.
// We keep dk1/lt1 as the sysClr pair (windowText/window) so text stays
// automatic, and keep hlink/folHlink stock so links stay recognisably links.
const THEME = {
  dk2: '0B1520',       // deep navy — the deck's canvas, was Office 44546A
  lt2: 'E9EFF5',       // the light panel tint, was Office E7E6E6
  accent1: D.accent,   // amber — primary theme accent, was Office blue 4472C4
  accent2: D.accent2,  // burnt amber — depth partner, was 4472C4→ED7D31
  accent3: '9FB0C2',   // slate — the deck's muted, was Office grey A5A5A5
  accent4: L.accent,   // bronze — the light-surface amber, was FFC000
  accent5: 'FFD9A0',   // pale amber tint — reads on navy, was 5B9BD5
  accent6: '22384C',   // navy hairline, was 70AD47
}

// Rewrite one <a:accentN>/<a:dk2>/<a:lt2> slot (an <a:srgbClr> or <a:sysClr>)
// to a new solid colour, preserving the tag's position in the scheme.
function retintScheme(xml) {
  let out = xml
  for (const [slot, hex] of Object.entries(THEME)) {
    const re = new RegExp(`(<a:${slot}>)(<a:(?:srgbClr|sysClr)[^>]*/>)(</a:${slot}>)`)
    out = out.replace(re, `$1<a:srgbClr val="${hex}"/>$3`)
  }
  return out
}

// Point the theme's headline/body faces at the deck's own fonts. Every slide
// already sets fontFace per run, so the deck looks right regardless — but this
// is what governs text a person *adds later* in PowerPoint. The panose hint is
// dropped with the swap: it encodes Calibri's metrics, and leaving it on a
// Montserrat run invites PowerPoint to substitute against the wrong skeleton.
// The per-script <a:font> fallbacks (Jpan/Hang/Hans/…) are deliberately left
// alone — Montserrat and Inter carry no CJK glyphs, so those must keep pointing
// at the system faces that actually have them.
const THEME_FONTS = { majorFont: FONT.display, minorFont: FONT.body }

function retintFonts(xml) {
  let out = xml
  for (const [slot, face] of Object.entries(THEME_FONTS)) {
    const re = new RegExp(`<a:${slot}><a:latin typeface="[^"]*"(?:\\s+panose="[^"]*")?/>`)
    out = out.replace(re, `<a:${slot}><a:latin typeface="${face}"/>`)
  }
  return out
}

async function postProcess(buf) {
  try {
    const zip = await JSZip.loadAsync(buf)
    const node = '<p:transition spd="med"><p:fade/></p:transition>'
    const names = Object.keys(zip.files).filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
    await Promise.all(names.map(async (name) => {
      let xml = await zip.file(name).async('string')
      if (xml.includes('<p:transition')) return
      if (xml.includes('</p:clrMapOvr>')) xml = xml.replace('</p:clrMapOvr>', `</p:clrMapOvr>${node}`)
      else if (/<p:clrMapOvr\s*\/>/.test(xml)) xml = xml.replace(/<p:clrMapOvr\s*\/>/, (m) => m + node)
      else xml = xml.replace('</p:sld>', `${node}</p:sld>`)
      zip.file(name, xml)
    }))
    const themes = Object.keys(zip.files).filter((n) => /^ppt\/theme\/theme\d+\.xml$/.test(n))
    await Promise.all(themes.map(async (name) => {
      const x = await zip.file(name).async('string')
      zip.file(name, retintFonts(retintScheme(x)))
    }))
    return await zip.generateAsync({ type: 'nodebuffer' })
  } catch {
    return buf
  }
}

// ------------------------------------------------------------- shared components
// Concentric amber rings bleeding off a corner — the deck's signature mark.
function rings(s, cx, cy, maxR, n = 5) {
  s.rect({ shape: 'ellipse', x: cx - maxR, y: cy - maxR, w: maxR * 2, h: maxR * 2, fill: D.accent, transparency: 93 }, true)
  for (let i = 0; i < n; i += 1) {
    const r = maxR * (1 - i / (n + 0.4))
    s.rect({ shape: 'ellipse', x: cx - r, y: cy - r, w: r * 2, h: r * 2, fill: 'none', line: D.accent, lineW: 1, lineTrans: 15 + i * 6 }, true)
  }
}

// Eyebrow tick + label — the recurring structural device on content slides.
function eyebrow(s, label, t = D, x = ML, y = 0.82) {
  s.rect({ x, y: y + 0.02, w: 0.26, h: 0.26, fill: t.accent })
  const lw = Math.min(8, RX - (x + 0.42))
  s.text(label, { x: x + 0.42, y, w: lw, h: 0.3, size: 11, bold: true, color: t.accent, font: FONT.body, spacing: 2.4, valign: 'middle' })
}

// Standard slide header: eyebrow + big title (+ optional kicker line).
function header(s, eb, title, t = D, kicker) {
  eyebrow(s, eb, t)
  s.text(title, { x: ML, y: 1.16, w: CW, h: 0.9, size: 30, bold: true, color: t.ink, font: FONT.display, lineSpacing: 32 })
  if (kicker) s.text(kicker, { x: ML, y: 2.0, w: CW, h: 0.4, size: 13, color: t.muted, font: FONT.body })
}

// A geometric icon tile — consistent, font-independent, fully editable.
function iconTile(s, x, y, size, kind, t = D, tone = 'accent') {
  const fill = tone === 'accent' ? t.accent : t.panel2
  const mk = tone === 'accent' ? t.accentInk : t.accent
  s.rect({ shape: 'roundRect', x, y, w: size, h: size, radius: 0.08, fill, line: tone === 'accent' ? undefined : t.line })
  const c = x + size / 2
  const m = y + size / 2
  const u = size * 0.3
  if (kind === 'target') {
    s.rect({ shape: 'ellipse', x: c - u, y: m - u, w: u * 2, h: u * 2, fill: 'none', line: mk, lineW: 1.5 })
    s.rect({ shape: 'ellipse', x: c - u * 0.32, y: m - u * 0.32, w: u * 0.64, h: u * 0.64, fill: mk })
  } else if (kind === 'flow') {
    s.rect({ shape: 'rightArrow', x: c - u, y: m - u * 0.55, w: u * 2, h: u * 1.1, fill: mk })
  } else if (kind === 'layers') {
    s.rect({ x: c - u, y: m - u * 0.1, w: u * 1.7, h: u * 0.7, fill: mk })
    s.rect({ x: c - u * 0.5, y: m - u * 0.85, w: u * 1.7, h: u * 0.7, fill: mk, transparency: 35 })
  } else if (kind === 'spark') {
    s.rect({ shape: 'diamond', x: c - u, y: m - u, w: u * 2, h: u * 2, fill: mk })
  } else if (kind === 'up') {
    s.rect({ shape: 'triangle', x: c - u, y: m - u, w: u * 2, h: u * 2, fill: mk })
  } else if (kind === 'grid') {
    const g = u * 0.7
    for (const [dx, dy] of [[-g, -g], [g, -g], [-g, g], [g, g]]) s.rect({ shape: 'ellipse', x: c + dx - u * 0.3, y: m + dy - u * 0.3, w: u * 0.6, h: u * 0.6, fill: mk })
  } else {
    s.rect({ shape: 'ellipse', x: c - u * 0.7, y: m - u * 0.7, w: u * 1.4, h: u * 1.4, fill: mk })
  }
}

// Labelled image placeholder — panel + frame marks + centred label.
function imagePlaceholder(s, x, y, w, h, label = 'IMAGE', t = D) {
  s.rect({ x, y, w, h, fill: t.panel, line: t.line, dash: 'dash' })
  const cx = x + w / 2
  const cy = y + h / 2
  // simple mountain + sun glyph from shapes, so it reads as "picture"
  s.rect({ shape: 'ellipse', x: cx - 0.72, y: cy - 0.52, w: 0.3, h: 0.3, fill: t.accent, transparency: 25 })
  s.rect({ shape: 'triangle', x: cx - 0.55, y: cy - 0.28, w: 0.7, h: 0.55, fill: t.muted, transparency: 35 })
  s.rect({ shape: 'triangle', x: cx - 0.1, y: cy - 0.44, w: 0.9, h: 0.72, fill: t.muted, transparency: 15 })
  s.text(label, { x: cx - 2, y: cy + 0.42, w: 4, h: 0.3, size: 10.5, bold: true, color: t.muted, align: 'center', spacing: 2, font: FONT.body })
}

// A tidy bullet row with amber tick.
function bulletRow(s, x, y, w, title, body, t = D) {
  s.rect({ x, y: y + 0.05, w: 0.16, h: 0.16, fill: t.accent, rotate: 45 })
  s.text(title, { x: x + 0.4, y, w: w - 0.4, h: 0.32, size: 14.5, bold: true, color: t.ink, font: FONT.body })
  if (body) s.text(body, { x: x + 0.4, y: y + 0.34, w: w - 0.4, h: 0.5, size: 11.5, color: t.muted, font: FONT.body, lineSpacing: 15 })
}

// =============================================================== build the deck
const deck = new Deck()

// 1 — COVER -------------------------------------------------------------------
;(() => {
  const s = deck.slide('HERO')
  rings(s, 12.7, 1.0, 3.7, 6)
  s.rect({ x: 0, y: 0, w: 0.16, h: PAGE.H, fill: D.accent2, transparency: 40 }, true)
  s.rect({ x: 0.16, y: 0, w: 0.09, h: 2.9, fill: D.accent }, true)
  s.text('COURSE · CODE  ·  2025', { x: ML, y: 1.5, w: 8, h: 0.3, size: 11, bold: true, color: D.accent, spacing: 2.6, font: FONT.body })
  s.text('Digital Transformation Strategy', { x: ML, y: 2.0, w: 9.4, h: 2.0, size: 52, bold: true, color: D.ink, font: FONT.display, lineSpacing: 54 })
  s.text('A practical framework for building scalable, resilient digital operations.', { x: ML, y: 4.35, w: 8.2, h: 0.7, size: 17, color: D.muted, font: FONT.body, lineSpacing: 24 })
  s.rect({ x: ML, y: 5.5, w: 1.5, h: 0.045, fill: D.accent })
  s.text('Presented by  ·  Your Name', { x: ML, y: 5.7, w: 8, h: 0.3, size: 12.5, color: D.muted, font: FONT.body })
})()

// 2 — MINIMAL TITLE -----------------------------------------------------------
;(() => {
  const s = deck.slide('HERO')
  s.text('01', { x: 0, y: 1.3, w: PAGE.W, h: 2.2, size: 150, bold: true, color: D.panel, align: 'center', font: FONT.num })
  s.rect({ x: PAGE.W / 2 - 0.75, y: 3.6, w: 1.5, h: 0.045, fill: D.accent })
  s.text('A Minimal Opening', { x: 1, y: 3.85, w: PAGE.W - 2, h: 0.8, size: 36, bold: true, color: D.ink, align: 'center', font: FONT.display })
  s.text('Set the tone with one clear statement and plenty of space around it.', { x: 2, y: 4.75, w: PAGE.W - 4, h: 0.5, size: 14, color: D.muted, align: 'center', font: FONT.body })
})()

// 3 — AGENDA ------------------------------------------------------------------
;(() => {
  const s = deck.slide('DARK')
  header(s, 'AGENDA', 'What we will cover today', D)
  const items = [
    ['01', 'The opportunity', 'Why transformation, and why now.'],
    ['02', 'Current landscape', 'Where the organisation stands.'],
    ['03', 'Strategic framework', 'The model we will apply.'],
    ['04', 'Execution roadmap', 'Phased plan across four quarters.'],
    ['05', 'Expected outcomes', 'Metrics, targets and payback.'],
    ['06', 'Next steps', 'Decisions we need today.'],
  ]
  const colW = (CW - 0.6) / 2
  items.forEach((it, i) => {
    const col = i % 2
    const row = Math.floor(i / 2)
    const x = ML + col * (colW + 0.6)
    const y = 2.5 + row * 1.25
    s.text(it[0], { x, y: y - 0.05, w: 1.0, h: 0.8, size: 34, bold: true, color: D.accent, font: FONT.num })
    s.text(it[1], { x: x + 1.1, y: y - 0.02, w: colW - 1.1, h: 0.4, size: 16, bold: true, color: D.ink, font: FONT.body })
    s.text(it[2], { x: x + 1.1, y: y + 0.38, w: colW - 1.1, h: 0.4, size: 11.5, color: D.muted, font: FONT.body })
    s.line({ x: x + 1.1, y: y + 0.86, w: colW - 1.1, h: 0, color: D.line, width: 1 })
  })
})()

// 4 — SECTION DIVIDER ---------------------------------------------------------
const divider = (num, eb, title, sub) => () => {
  const s = deck.slide('DARK')
  rings(s, 12.4, 6.6, 3.3, 6)
  s.text(num, { x: ML, y: 2.1, w: 3, h: 2, size: 130, bold: true, color: D.panel, font: FONT.num })
  s.rect({ x: ML + 0.08, y: 4.35, w: 0.9, h: 0.05, fill: D.accent })
  s.text(eb, { x: ML + 0.1, y: 2.5, w: 7, h: 0.3, size: 12, bold: true, color: D.accent, spacing: 2.6, font: FONT.body })
  s.text(title, { x: ML + 0.08, y: 4.5, w: 9.5, h: 1.1, size: 40, bold: true, color: D.ink, font: FONT.display, lineSpacing: 42 })
  if (sub) s.text(sub, { x: ML + 0.1, y: 5.65, w: 8.5, h: 0.5, size: 14, color: D.muted, font: FONT.body })
}
divider('01', 'SECTION ONE', 'The opportunity', 'Why digital transformation is the defining priority this year.')()

// 5 — EXECUTIVE SUMMARY -------------------------------------------------------
;(() => {
  const s = deck.slide('DARK')
  header(s, 'EXECUTIVE SUMMARY', 'The case in one slide', D)
  s.rect({ x: ML, y: 2.35, w: 6.7, h: 3.9, fill: D.panel, line: D.line, radius: 0.06 })
  s.text('Our operations have outgrown the tools that run them. A focused, phased transformation can lift efficiency and cut cost without disrupting delivery — paying for itself inside four quarters.', { x: ML + 0.4, y: 2.7, w: 5.9, h: 2.2, size: 16, color: D.ink, font: FONT.body, lineSpacing: 26 })
  s.rect({ x: ML + 0.4, y: 5.4, w: 1.3, h: 0.045, fill: D.accent })
  s.text('The recommendation: approve Phase 1 funding today.', { x: ML + 0.4, y: 5.6, w: 5.9, h: 0.5, size: 12.5, italic: true, color: D.muted, font: FONT.body })
  const kpis = [['72%', 'Process efficiency'], ['48%', 'Cost reduction'], ['3.2×', 'Growth potential']]
  kpis.forEach((k, i) => {
    const y = 2.35 + i * 1.33
    s.rect({ x: 7.9, y, w: CW - (7.9 - ML), h: 1.18, fill: D.panel2, line: D.line, radius: 0.06 })
    s.text(k[0], { x: 8.2, y: y + 0.12, w: 2.2, h: 0.8, size: 34, bold: true, color: D.accent, font: FONT.num, valign: 'middle' })
    s.text(k[1], { x: 10.4, y, w: RX - 10.4 - 0.1, h: 1.18, size: 12.5, color: D.muted, font: FONT.body, valign: 'middle' })
  })
})()

// 6 — BIG NUMBER --------------------------------------------------------------
;(() => {
  const s = deck.slide('DARK')
  eyebrow(s, 'THE HEADLINE METRIC', D)
  s.text('72%', { x: ML, y: 1.8, w: 8, h: 2.6, size: 190, bold: true, color: D.accent, font: FONT.num })
  s.rect({ x: ML + 0.1, y: 4.75, w: 1.4, h: 0.05, fill: D.ink })
  s.text('improvement in end-to-end process efficiency', { x: ML + 0.1, y: 4.95, w: 7.2, h: 0.9, size: 22, bold: true, color: D.ink, font: FONT.display, lineSpacing: 28 })
  s.text('Measured across the three pilot teams over a 90-day window, versus the prior-year baseline.', { x: 8.4, y: 2.6, w: CW - (8.4 - ML), h: 2, size: 13, color: D.muted, font: FONT.body, lineSpacing: 20 })
  s.line({ x: 8.4, y: 2.4, w: 0, h: 2.0, color: D.accent, width: 2 })
})()

// 7 — KEY METRICS (KPI row) ---------------------------------------------------
;(() => {
  const s = deck.slide('DARK')
  header(s, 'KEY METRICS', 'Performance at a glance', D)
  const data = [['target', '72%', 'Process efficiency', '+18 pts YoY'], ['up', '48%', 'Cost reduction', 'vs. 2024 run-rate'], ['flow', '3.2×', 'Growth potential', 'addressable uplift'], ['spark', '9.4', 'CSAT score', 'out of 10']]
  const gap = 0.4
  const w = (CW - gap * 3) / 4
  data.forEach((d, i) => {
    const x = ML + i * (w + gap)
    s.rect({ x, y: 2.5, w, h: 3.4, fill: D.panel, line: D.line, radius: 0.06 })
    iconTile(s, x + 0.3, 2.8, 0.72, d[0], D)
    s.text(d[1], { x: x + 0.3, y: 3.75, w: w - 0.6, h: 0.9, size: 42, bold: true, color: D.accent, font: FONT.num })
    s.text(d[2], { x: x + 0.3, y: 4.75, w: w - 0.6, h: 0.4, size: 14, bold: true, color: D.ink, font: FONT.body })
    s.text(d[3], { x: x + 0.3, y: 5.15, w: w - 0.6, h: 0.4, size: 10.5, color: D.muted, font: FONT.body })
  })
})()

// 8 — THREE-COLUMN ------------------------------------------------------------
;(() => {
  const s = deck.slide('DARK')
  header(s, 'CAPABILITIES', 'Three pillars of the programme', D)
  const cols = [['layers', 'Unified data', 'One source of truth replaces a dozen disconnected spreadsheets and inboxes.'], ['flow', 'Automated flow', 'Repeatable work runs itself, freeing the team for judgement calls.'], ['target', 'Clear ownership', 'Every process has a named owner, a metric, and a review cadence.']]
  const gap = 0.5
  const w = (CW - gap * 2) / 3
  cols.forEach((c, i) => {
    const x = ML + i * (w + gap)
    s.rect({ x, y: 2.5, w, h: 3.5, fill: D.panel, line: D.line, radius: 0.06 })
    iconTile(s, x + 0.4, 2.9, 0.8, c[0], D)
    s.text(c[1], { x: x + 0.4, y: 3.95, w: w - 0.8, h: 0.5, size: 19, bold: true, color: D.ink, font: FONT.display })
    s.text(c[2], { x: x + 0.4, y: 4.55, w: w - 0.8, h: 1.3, size: 12.5, color: D.muted, font: FONT.body, lineSpacing: 18 })
  })
})()

// 9 — FOUR-COLUMN -------------------------------------------------------------
;(() => {
  const s = deck.slide('DARK')
  header(s, 'OPERATING MODEL', 'Four principles we work by', D)
  const cols = [['01', 'Customer first', 'Start from the outcome a person actually needs.'], ['02', 'Ship small', 'Release in thin slices and learn fast.'], ['03', 'Measure it', 'If it matters, it has a number on a dashboard.'], ['04', 'Automate toil', 'Humans do judgement; machines do repetition.']]
  const gap = 0.4
  const w = (CW - gap * 3) / 4
  cols.forEach((c, i) => {
    const x = ML + i * (w + gap)
    s.text(c[0], { x, y: 2.5, w: w, h: 0.7, size: 30, bold: true, color: D.accent, font: FONT.num })
    s.line({ x, y: 3.3, w, h: 0, color: D.line, width: 1 })
    s.text(c[1], { x, y: 3.45, w, h: 0.4, size: 16, bold: true, color: D.ink, font: FONT.body })
    s.text(c[2], { x, y: 3.9, w, h: 1.6, size: 12, color: D.muted, font: FONT.body, lineSpacing: 17 })
  })
})()

// 10 — FIVE-STEP PROCESS ------------------------------------------------------
;(() => {
  const s = deck.slide('DARK')
  header(s, 'PROCESS', 'Five steps from idea to impact', D)
  const steps = ['Research', 'Strategy', 'Planning', 'Execution', 'Optimisation']
  const n = steps.length
  const gap = 0.3
  const w = (CW - gap * (n - 1)) / n
  const y = 3.3
  s.line({ x: ML + w / 2, y: y + 0.5, w: CW - w, h: 0, color: D.line, width: 1.5 })
  steps.forEach((st, i) => {
    const x = ML + i * (w + gap)
    const cx = x + w / 2
    s.rect({ shape: 'ellipse', x: cx - 0.5, y, w: 1.0, h: 1.0, fill: i === 0 ? D.accent : D.panel, line: i === 0 ? undefined : D.accent, lineW: 1.5 })
    s.text(String(i + 1).padStart(2, '0'), { x: cx - 0.5, y, w: 1.0, h: 1.0, size: 24, bold: true, color: i === 0 ? D.accentInk : D.accent, align: 'center', valign: 'middle', font: FONT.num })
    s.text(st, { x: x - 0.1, y: y + 1.2, w: w + 0.2, h: 0.4, size: 14, bold: true, color: D.ink, align: 'center', font: FONT.body })
    s.text('A short line describing step ' + (i + 1) + '.', { x: x - 0.15, y: y + 1.6, w: w + 0.3, h: 0.8, size: 10.5, color: D.muted, align: 'center', font: FONT.body, lineSpacing: 14 })
  })
})()

// 11 — SEVEN-STEP PROCESS -----------------------------------------------------
;(() => {
  const s = deck.slide('DARK')
  header(s, 'DETAILED PROCESS', 'A seven-stage delivery pipeline', D)
  const steps = ['Discover', 'Define', 'Design', 'Build', 'Test', 'Launch', 'Learn']
  const n = steps.length
  const gap = 0.18
  const w = (CW - gap * (n - 1)) / n
  const y = 3.4
  steps.forEach((st, i) => {
    const x = ML + i * (w + gap)
    const on = i % 2 === 0
    s.rect({ shape: 'chevron', x, y, w: w + 0.1, h: 1.1, fill: on ? D.accent : D.panel2, line: on ? undefined : D.line })
    s.text(String(i + 1), { x, y: y + 0.08, w: w, h: 0.4, size: 13, bold: true, color: on ? D.accentInk : D.accent, align: 'center', font: FONT.num })
    s.text(st, { x, y: y + 0.5, w: w, h: 0.5, size: 12.5, bold: true, color: on ? D.accentInk : D.ink, align: 'center', font: FONT.body })
  })
  s.text('Odd and even stages alternate colour so the eye can track progress across the pipeline.', { x: ML, y: 5.2, w: CW, h: 0.5, size: 12, color: D.muted, align: 'center', font: FONT.body })
})()

// 12 — CIRCULAR INFOGRAPHIC ---------------------------------------------------
;(() => {
  const s = deck.slide('DARK')
  header(s, 'FRAMEWORK', 'A connected operating cycle', D)
  const cx = 4.3
  const cy = 4.35
  s.rect({ shape: 'ellipse', x: cx - 1.9, y: cy - 1.9, w: 3.8, h: 3.8, fill: 'none', line: D.line, lineW: 1.5 })
  s.rect({ shape: 'ellipse', x: cx - 1.0, y: cy - 1.0, w: 2.0, h: 2.0, fill: D.panel, line: D.accent, lineW: 1.5 })
  s.text('CORE', { x: cx - 1.0, y: cy - 1.0, w: 2.0, h: 2.0, size: 18, bold: true, color: D.accent, align: 'center', valign: 'middle', font: FONT.display, spacing: 1 })
  const nodes = [[-90, 'Sense'], [-18, 'Decide'], [54, 'Act'], [126, 'Measure'], [198, 'Adapt']]
  nodes.forEach(([deg, label], i) => {
    const rad = (deg * Math.PI) / 180
    const nx = cx + Math.cos(rad) * 1.9
    const ny = cy + Math.sin(rad) * 1.9
    s.rect({ shape: 'ellipse', x: nx - 0.42, y: ny - 0.42, w: 0.84, h: 0.84, fill: D.accent })
    s.text(String(i + 1), { x: nx - 0.42, y: ny - 0.42, w: 0.84, h: 0.84, size: 18, bold: true, color: D.accentInk, align: 'center', valign: 'middle', font: FONT.num })
    s.text(label, { x: nx - 0.7, y: ny + 0.44, w: 1.4, h: 0.3, size: 11.5, bold: true, color: D.ink, align: 'center', font: FONT.body })
  })
  // legend on the right
  nodes.forEach(([, label], i) => {
    const y = 2.6 + i * 0.72
    s.rect({ x: 8.6, y, w: 0.3, h: 0.3, fill: D.accent, radius: 0.04 })
    s.text(String(i + 1), { x: 8.6, y, w: 0.3, h: 0.3, size: 11, bold: true, color: D.accentInk, align: 'center', valign: 'middle', font: FONT.num })
    s.text(label, { x: 9.05, y: y - 0.03, w: 1.8, h: 0.36, size: 13.5, bold: true, color: D.ink, font: FONT.body, valign: 'middle' })
    s.text('One line on this stage of the loop.', { x: 9.05, y: y + 0.3, w: RX - 9.05, h: 0.3, size: 10, color: D.muted, font: FONT.body })
  })
})()

// 13 — RADIAL DIAGRAM ---------------------------------------------------------
;(() => {
  const s = deck.slide('DARK')
  header(s, 'OVERVIEW', 'How the parts connect', D)
  const cx = PAGE.W / 2
  const cy = 4.4
  const spokes = [[-90, 'Data'], [-26, 'People'], [38, 'Process'], [-154, 'Tools'], [154, 'Culture'], [90, 'Metrics']]
  s.rect({ shape: 'ellipse', x: cx - 1.1, y: cy - 1.1, w: 2.2, h: 2.2, fill: D.panel, line: D.accent, lineW: 1.75 })
  s.text('STRATEGY', { x: cx - 1.1, y: cy - 1.1, w: 2.2, h: 2.2, size: 16, bold: true, color: D.accent, align: 'center', valign: 'middle', font: FONT.display })
  spokes.forEach(([deg, label], i) => {
    const rad = (deg * Math.PI) / 180
    const nx = cx + Math.cos(rad) * 2.6
    const ny = cy + Math.sin(rad) * 1.95
    s.line({ x: cx + Math.cos(rad) * 1.1, y: cy + Math.sin(rad) * 1.1, w: Math.cos(rad) * 1.5, h: Math.sin(rad) * 0.85, color: D.accent2, width: 1.5 })
    s.rect({ shape: 'ellipse', x: nx - 0.55, y: ny - 0.55, w: 1.1, h: 1.1, fill: D.panel2, line: D.accent, lineW: 1.25 })
    s.text(label, { x: nx - 0.55, y: ny - 0.55, w: 1.1, h: 1.1, size: 12, bold: true, color: D.ink, align: 'center', valign: 'middle', font: FONT.body })
  })
})()

// 14 — TIMELINE (milestones) --------------------------------------------------
;(() => {
  const s = deck.slide('DARK')
  header(s, 'TIMELINE', 'Key milestones this year', D)
  const ms = [['Q1', 'Pilot launch', 'Three teams onboarded.'], ['Q2', 'Platform rollout', 'Company-wide access.'], ['Q3', 'Automation', 'Top 10 workflows live.'], ['Q4', 'Scale & optimise', 'Targets locked in.']]
  const y = 3.9
  s.line({ x: ML, y, w: CW, h: 0, color: D.line, width: 2 })
  const seg = CW / ms.length
  ms.forEach((m, i) => {
    const x = ML + seg * i + seg / 2
    const up = i % 2 === 0
    s.rect({ shape: 'ellipse', x: x - 0.14, y: y - 0.14, w: 0.28, h: 0.28, fill: D.accent })
    const by = up ? y - 1.4 : y + 0.35
    s.line({ x, y: up ? y - 0.14 : y + 0.14, w: 0, h: up ? -0.9 : 0.9, color: D.accent2, width: 1.25 })
    s.text(m[0], { x: x - 1.1, y: by, w: 2.2, h: 0.4, size: 20, bold: true, color: D.accent, align: 'center', font: FONT.num })
    s.text(m[1], { x: x - 1.3, y: by + (up ? 0.42 : 0.42), w: 2.6, h: 0.34, size: 13.5, bold: true, color: D.ink, align: 'center', font: FONT.body })
    s.text(m[2], { x: x - 1.4, y: by + 0.76, w: 2.8, h: 0.5, size: 10.5, color: D.muted, align: 'center', font: FONT.body, lineSpacing: 14 })
  })
})()

// 15 — HORIZONTAL TIMELINE (cards) --------------------------------------------
;(() => {
  const s = deck.slide('DARK')
  header(s, 'DELIVERY PLAN', 'Phased over four stages', D)
  const ph = [['01', 'Assess', 'Audit the current state.'], ['02', 'Pilot', 'Prove value with one team.'], ['03', 'Scale', 'Roll out across the org.'], ['04', 'Embed', 'Make it the default way.']]
  const gap = 0.4
  const w = (CW - gap * 3) / 4
  const y = 2.9
  s.line({ x: ML + 0.3, y: y - 0.25, w: CW - 0.6, h: 0, color: D.accent2, width: 1.5 })
  ph.forEach((p, i) => {
    const x = ML + i * (w + gap)
    s.rect({ shape: 'ellipse', x: x + w / 2 - 0.1, y: y - 0.35, w: 0.2, h: 0.2, fill: D.accent })
    s.rect({ x, y, w, h: 2.9, fill: D.panel, line: D.line, radius: 0.06 })
    s.text(p[0], { x, y: y + 0.3, w, h: 0.9, size: 40, bold: true, color: D.accent, align: 'center', font: FONT.num })
    s.text(p[1], { x, y: y + 1.3, w, h: 0.4, size: 17, bold: true, color: D.ink, align: 'center', font: FONT.display })
    s.text(p[2], { x: x + 0.25, y: y + 1.8, w: w - 0.5, h: 0.9, size: 11.5, color: D.muted, align: 'center', font: FONT.body, lineSpacing: 16 })
  })
})()

// 16 — VERTICAL TIMELINE ------------------------------------------------------
;(() => {
  const s = deck.slide('DARK')
  header(s, 'JOURNEY', 'A vertical sequence of events', D)
  const ev = [['2021', 'Foundations', 'Core systems consolidated onto one platform.'], ['2023', 'Acceleration', 'Automation extended across operations.'], ['2025', 'Transformation', 'Data-driven decisions become the default.']]
  const x0 = ML + 1.6
  s.line({ x: x0, y: 2.6, w: 0, h: 3.3, color: D.line, width: 2 })
  ev.forEach((e, i) => {
    const y = 2.6 + i * 1.2
    s.rect({ shape: 'ellipse', x: x0 - 0.16, y: y - 0.16, w: 0.32, h: 0.32, fill: D.accent })
    s.text(e[0], { x: ML - 0.2, y: y - 0.12, w: 1.5, h: 0.4, size: 20, bold: true, color: D.accent, align: 'right', font: FONT.num })
    s.text(e[1], { x: x0 + 0.5, y: y - 0.16, w: CW - 2.4, h: 0.4, size: 17, bold: true, color: D.ink, font: FONT.display })
    s.text(e[2], { x: x0 + 0.5, y: y + 0.26, w: CW - 2.4, h: 0.6, size: 12.5, color: D.muted, font: FONT.body, lineSpacing: 17 })
  })
})()

// 17 — ROADMAP ----------------------------------------------------------------
;(() => {
  const s = deck.slide('DARK')
  header(s, 'ROADMAP', 'Workstreams across the year', D)
  const lanes = ['Platform', 'Automation', 'Enablement']
  const quarters = ['Q1', 'Q2', 'Q3', 'Q4']
  const gridX = ML + 1.9
  const gridW = RX - gridX
  const qW = gridW / 4
  const y0 = 2.7
  const laneH = 0.95
  quarters.forEach((q, i) => {
    s.text(q, { x: gridX + i * qW, y: y0 - 0.45, w: qW, h: 0.35, size: 13, bold: true, color: D.muted, align: 'center', font: FONT.num })
    if (i > 0) s.line({ x: gridX + i * qW, y: y0 - 0.1, w: 0, h: laneH * 3 + 0.2, color: D.line, width: 1, dash: 'dash' })
  })
  const bars = [[0, 0, 2.4, D.accent2], [1, 1, 2.6, D.accent], [2, 2, 1.5, D.accent2]]
  lanes.forEach((lane, i) => {
    const y = y0 + i * laneH
    s.text(lane, { x: ML, y: y + 0.12, w: 1.8, h: 0.5, size: 13, bold: true, color: D.ink, font: FONT.body, valign: 'middle' })
    s.rect({ x: gridX, y: y + 0.1, w: gridW, h: 0.5, fill: D.panel, radius: 0.04 })
  })
  bars.forEach(([lane, qStart, qLen, col]) => {
    const y = y0 + lane * laneH
    s.rect({ shape: 'roundRect', x: gridX + qStart * qW + 0.08, y: y + 0.14, w: qLen * qW - 0.16, h: 0.42, radius: 0.1, fill: col })
    s.text('Workstream ' + (lane + 1), { x: gridX + qStart * qW + 0.2, y: y + 0.14, w: qLen * qW - 0.3, h: 0.42, size: 10.5, bold: true, color: col === D.accent ? D.accentInk : D.ink, valign: 'middle', font: FONT.body })
  })
})()

// 18 — STRATEGY FRAMEWORK (pillars) -------------------------------------------
;(() => {
  const s = deck.slide('DARK')
  header(s, 'FRAMEWORK', 'Built on four pillars and a base', D)
  const pillars = [['People', 'spark'], ['Process', 'flow'], ['Platform', 'layers'], ['Data', 'grid']]
  const gap = 0.4
  const w = (CW - gap * 3) / 4
  const topY = 2.55
  const pH = 2.5
  pillars.forEach((p, i) => {
    const x = ML + i * (w + gap)
    s.rect({ x, y: topY, w, h: pH, fill: D.panel, line: D.line, radius: 0.06 })
    iconTile(s, x + w / 2 - 0.4, topY + 0.35, 0.8, p[1], D)
    s.text(p[0], { x, y: topY + 1.35, w, h: 0.5, size: 17, bold: true, color: D.ink, align: 'center', font: FONT.display })
    s.text('Supporting detail for this pillar.', { x: x + 0.2, y: topY + 1.85, w: w - 0.4, h: 0.6, size: 10.5, color: D.muted, align: 'center', font: FONT.body, lineSpacing: 14 })
  })
  s.rect({ shape: 'roundRect', x: ML, y: topY + pH + 0.25, w: CW, h: 0.8, radius: 0.08, fill: D.accent })
  s.text('A shared foundation: vision, governance and funding', { x: ML, y: topY + pH + 0.25, w: CW, h: 0.8, size: 15, bold: true, color: D.accentInk, align: 'center', valign: 'middle', font: FONT.body })
})()

// 19 — BUSINESS MODEL (blocks) ------------------------------------------------
;(() => {
  const s = deck.slide('DARK')
  header(s, 'BUSINESS MODEL', 'The canvas on one page', D)
  const blocks = ['Partners', 'Activities', 'Value', 'Relationships', 'Segments', 'Resources', 'Channels', 'Cost structure', 'Revenue']
  const gap = 0.25
  const cols = 3
  const w = (CW - gap * (cols - 1)) / cols
  const h = 1.15
  blocks.forEach((b, i) => {
    const col = i % cols
    const row = Math.floor(i / cols)
    const x = ML + col * (w + gap)
    const y = 2.5 + row * (h + gap)
    const hero = b === 'Value'
    s.rect({ x, y, w, h, fill: hero ? D.accent : D.panel, line: hero ? undefined : D.line, radius: 0.06 })
    s.text(b, { x: x + 0.25, y: y + 0.15, w: w - 0.5, h: 0.4, size: 13.5, bold: true, color: hero ? D.accentInk : D.ink, font: FONT.body })
    s.text('Short note', { x: x + 0.25, y: y + 0.58, w: w - 0.5, h: 0.4, size: 10.5, color: hero ? D.accentInk : D.muted, font: FONT.body })
  })
})()

// 20 — COMPARISON -------------------------------------------------------------
;(() => {
  const s = deck.slide('DARK')
  header(s, 'COMPARISON', 'Two options, side by side', D)
  const mkCol = (x, title, hero, rows) => {
    s.rect({ x, y: 2.5, w: 5.4, h: 3.7, fill: hero ? D.panel2 : D.panel, line: hero ? D.accent : D.line, lineW: hero ? 1.5 : 1, radius: 0.06 })
    s.rect({ shape: 'roundRect', x: x + 0.4, y: 2.3, w: 2.4, h: 0.5, radius: 0.1, fill: hero ? D.accent : D.panel2 })
    s.text(title, { x: x + 0.4, y: 2.3, w: 2.4, h: 0.5, size: 13, bold: true, color: hero ? D.accentInk : D.ink, align: 'center', valign: 'middle', font: FONT.body })
    rows.forEach((r, i) => {
      const y = 3.15 + i * 0.7
      s.rect({ x: x + 0.4, y: y + 0.05, w: 0.16, h: 0.16, fill: hero ? D.accent : D.muted, rotate: 45 })
      s.text(r, { x: x + 0.75, y, w: 4.3, h: 0.6, size: 12.5, color: D.ink, font: FONT.body, lineSpacing: 16 })
    })
  }
  mkCol(ML, 'OPTION A', false, ['Lower upfront cost', 'Familiar tooling', 'Limited scalability', 'Manual handoffs remain'])
  mkCol(ML + 5.73, 'OPTION B', true, ['Higher initial investment', 'Modern platform', 'Scales with demand', 'Automated end to end'])
})()

// 21 — BEFORE vs AFTER --------------------------------------------------------
;(() => {
  const s = deck.slide('DARK')
  header(s, 'IMPACT', 'Before and after', D)
  const panel = (x, tag, col, rows) => {
    s.rect({ x, y: 2.55, w: 5.2, h: 3.6, fill: D.panel, line: D.line, radius: 0.06 })
    s.text(tag, { x: x + 0.4, y: 2.85, w: 4.4, h: 0.5, size: 20, bold: true, color: col, font: FONT.display })
    s.line({ x: x + 0.4, y: 3.45, w: 4.4, h: 0, color: D.line, width: 1 })
    rows.forEach((r, i) => s.text(r, { x: x + 0.4, y: 3.65 + i * 0.62, w: 4.4, h: 0.55, size: 12.5, color: D.muted, font: FONT.body, lineSpacing: 16 }))
  }
  panel(ML, 'Before', D.muted, ['12 disconnected tools', '3-day approval cycles', 'Reports built by hand', 'No single source of truth'])
  s.rect({ shape: 'ellipse', x: PAGE.W / 2 - 0.45, y: 4.0, w: 0.9, h: 0.9, fill: D.accent })
  s.rect({ shape: 'rightArrow', x: PAGE.W / 2 - 0.26, y: 4.22, w: 0.52, h: 0.46, fill: D.accentInk })
  panel(ML + 6.33, 'After', D.accent, ['1 unified platform', 'Same-day approvals', 'Live automated dashboards', 'Trusted shared data'])
})()

// 22 — PROBLEM vs SOLUTION ----------------------------------------------------
;(() => {
  const s = deck.slide('DARK')
  header(s, 'PROBLEM & SOLUTION', 'From pain point to resolution', D)
  const rows = [['Fragmented data', 'A single warehouse everyone trusts.'], ['Slow manual work', 'Automation for the repetitive 80%.'], ['Unclear ownership', 'Named owners and live metrics.']]
  const y0 = 2.6
  const boxW = 5.0
  const solX = 7.43
  s.text('PROBLEM', { x: ML, y: y0 - 0.45, w: 5, h: 0.35, size: 12, bold: true, color: D.muted, spacing: 2, font: FONT.body })
  s.text('SOLUTION', { x: solX, y: y0 - 0.45, w: 5, h: 0.35, size: 12, bold: true, color: D.accent, spacing: 2, font: FONT.body })
  rows.forEach((r, i) => {
    const y = y0 + i * 1.1
    s.rect({ x: ML, y, w: boxW, h: 0.9, fill: D.panel, line: D.line, radius: 0.06 })
    s.text(r[0], { x: ML + 0.35, y, w: boxW - 0.6, h: 0.9, size: 14, bold: true, color: D.ink, valign: 'middle', font: FONT.body })
    s.rect({ shape: 'ellipse', x: 6.47, y: y + 0.25, w: 0.4, h: 0.4, fill: D.accent })
    s.rect({ shape: 'rightArrow', x: 6.55, y: y + 0.34, w: 0.24, h: 0.22, fill: D.accentInk })
    s.rect({ x: solX, y, w: boxW, h: 0.9, fill: D.panel2, line: D.accent, lineW: 1, radius: 0.06 })
    s.text(r[1], { x: solX + 0.35, y, w: boxW - 0.6, h: 0.9, size: 13, color: D.ink, valign: 'middle', font: FONT.body, lineSpacing: 16 })
  })
})()

// 23 — SWOT -------------------------------------------------------------------
;(() => {
  const s = deck.slide('DARK')
  header(s, 'ANALYSIS', 'SWOT at a glance', D)
  const cells = [['STRENGTHS', D.accent, ['Strong brand equity', 'Loyal customer base']], ['WEAKNESSES', D.muted, ['Legacy systems', 'Siloed teams']], ['OPPORTUNITIES', D.accent2, ['New market segments', 'Automation upside']], ['THREATS', 'C77D63', ['Agile competitors', 'Rising costs']]]
  const gap = 0.4
  const w = (CW - gap) / 2
  const h = 1.85
  cells.forEach((c, i) => {
    const col = i % 2
    const row = Math.floor(i / 2)
    const x = ML + col * (w + gap)
    const y = 2.5 + row * (h + 0.3)
    s.rect({ x, y, w, h, fill: D.panel, line: D.line, radius: 0.06 })
    s.rect({ x, y, w: 0.1, h, fill: c[1] })
    s.text(c[0], { x: x + 0.4, y: y + 0.25, w: w - 0.8, h: 0.4, size: 15, bold: true, color: c[1], spacing: 1.5, font: FONT.body })
    c[2].forEach((b, j) => {
      s.rect({ x: x + 0.42, y: y + 0.85 + j * 0.45 + 0.05, w: 0.12, h: 0.12, fill: c[1], rotate: 45 })
      s.text(b, { x: x + 0.7, y: y + 0.85 + j * 0.45, w: w - 1.1, h: 0.4, size: 12, color: D.ink, font: FONT.body })
    })
  })
})()

// 24 — PYRAMID ----------------------------------------------------------------
;(() => {
  const s = deck.slide('DARK')
  header(s, 'HIERARCHY', 'What builds on what', D)
  const tiers = [['Vision', D.accent, 3.2], ['Strategy', D.accent2, 5.2], ['Capabilities', '2C7F72', 7.2], ['Foundations', D.panel2, 9.2]]
  const cx = 4.6
  const topY = 2.6
  const tierH = 0.92
  tiers.forEach((t, i) => {
    const w = t[2] * 0.62
    const y = topY + i * tierH
    if (i === 0) s.rect({ shape: 'triangle', x: cx - w / 2, y, w, h: tierH - 0.08, fill: t[1] })
    else s.rect({ shape: 'trapezoid', x: cx - w / 2, y, w, h: tierH - 0.08, fill: t[1], line: D.bg, lineW: 1.5 })
    s.text(t[0], { x: cx - w / 2, y: y + (i === 0 ? 0.28 : 0), w, h: tierH - 0.08, size: 14, bold: true, color: i < 2 ? D.accentInk : D.ink, align: 'center', valign: 'middle', font: FONT.body })
    s.text('Layer ' + (i + 1) + ' — a short description of what sits at this level of the model.', { x: 8.9, y: y + 0.12, w: RX - 8.9, h: 0.7, size: 11, color: D.muted, font: FONT.body, lineSpacing: 15 })
    s.rect({ x: 8.5, y: y + 0.18, w: 0.18, h: 0.18, fill: t[1] === D.panel2 ? D.muted : t[1], rotate: 45 })
  })
})()

// 25 — CYCLE ------------------------------------------------------------------
;(() => {
  const s = deck.slide('DARK')
  header(s, 'CONTINUOUS CYCLE', 'A loop that never stops', D)
  const cx = PAGE.W / 2
  const cy = 4.4
  const r = 1.55
  const steps = [[-90, 'Plan'], [0, 'Do'], [90, 'Check'], [180, 'Act']]
  // curved arrows approximated by arc chevrons around the ring
  steps.forEach(([deg], i) => {
    const a = (deg * Math.PI) / 180
    const ax = cx + Math.cos(a + 0.6) * r
    const ay = cy + Math.sin(a + 0.6) * r
    s.rect({ shape: 'chevron', x: ax - 0.3, y: ay - 0.22, w: 0.6, h: 0.44, fill: D.accent2, rotate: deg + 110 }, true)
  })
  steps.forEach(([deg, label], i) => {
    const a = (deg * Math.PI) / 180
    const nx = cx + Math.cos(a) * r
    const ny = cy + Math.sin(a) * r
    s.rect({ shape: 'ellipse', x: nx - 0.7, y: ny - 0.7, w: 1.4, h: 1.4, fill: i === 0 ? D.accent : D.panel, line: i === 0 ? undefined : D.accent, lineW: 1.5 })
    s.text(label, { x: nx - 0.7, y: ny - 0.72, w: 1.4, h: 1.0, size: 15, bold: true, color: i === 0 ? D.accentInk : D.ink, align: 'center', valign: 'middle', font: FONT.body })
    s.text(String(i + 1), { x: nx - 0.7, y: ny + 0.12, w: 1.4, h: 0.4, size: 11, color: i === 0 ? D.accentInk : D.accent, align: 'center', font: FONT.num })
  })
})()

// 26 — FUNNEL -----------------------------------------------------------------
;(() => {
  const s = deck.slide('DARK')
  header(s, 'FUNNEL', 'From reach to result', D)
  const stages = [['Reach', '100%', 'Everyone who saw it', 7.4], ['Interest', '64%', 'Those who engaged', 6.0], ['Intent', '38%', 'Those who tried it', 4.4], ['Action', '19%', 'Those who converted', 2.8]]
  const cx = 4.6
  const topY = 2.55
  const h = 0.82
  stages.forEach((st, i) => {
    const wTop = st[3] * 0.62
    const y = topY + i * (h + 0.08)
    s.rect({ shape: 'trapezoid', x: cx - wTop / 2, y, w: wTop, h, fill: D.accent, transparency: i * 16, line: D.bg, lineW: 1.5, rotate: 180 })
    s.text(st[0], { x: cx - wTop / 2, y, w: wTop, h, size: 14, bold: true, color: D.accentInk, align: 'center', valign: 'middle', font: FONT.body })
    s.text(st[1], { x: 8.9, y: y + 0.06, w: 1.4, h: 0.5, size: 22, bold: true, color: D.accent, font: FONT.num })
    s.text(st[2], { x: 10.3, y, w: RX - 10.3, h, size: 11.5, color: D.muted, valign: 'middle', font: FONT.body })
  })
})()

// 27 — WORKFLOW ---------------------------------------------------------------
;(() => {
  const s = deck.slide('DARK')
  header(s, 'WORKFLOW', 'A decision flow with a branch', D)
  const y = 3.4
  const node = (x, w, label, kind, fill, ny = y) => {
    const h = kind === 'diamond' ? 1.3 : 0.8
    const yy = kind === 'diamond' ? ny - 0.25 : ny
    s.rect({ shape: kind === 'diamond' ? 'diamond' : 'roundRect', x, y: yy, w, h, radius: 0.1, fill, line: fill === D.panel ? D.line : undefined })
    s.text(label, { x, y: yy, w, h, size: 12, bold: true, color: fill === D.accent ? D.accentInk : D.ink, align: 'center', valign: 'middle', font: FONT.body })
  }
  node(ML, 1.9, 'Request in', 'box', D.panel)
  s.line({ x: ML + 1.9, y: y + 0.4, w: 0.5, h: 0, color: D.accent, width: 1.5, endArrow: 'triangle' })
  node(ML + 2.5, 1.9, 'Valid?', 'diamond', D.panel2)
  s.line({ x: ML + 4.4, y: y + 0.4, w: 0.5, h: 0, color: D.accent, width: 1.5, endArrow: 'triangle' })
  s.text('Yes', { x: ML + 4.42, y: y - 0.02, w: 0.5, h: 0.28, size: 10, color: D.muted, font: FONT.body })
  node(ML + 5.0, 1.9, 'Process', 'box', D.accent)
  s.line({ x: ML + 6.9, y: y + 0.4, w: 0.5, h: 0, color: D.accent, width: 1.5, endArrow: 'triangle' })
  node(ML + 7.5, 1.9, 'Notify & log', 'box', D.panel)
  // "No" branch drops below the diamond
  s.text('No', { x: ML + 3.6, y: y + 1.12, w: 0.7, h: 0.28, size: 10, color: D.muted, font: FONT.body })
  s.line({ x: ML + 3.45, y: y + 1.05, w: 0, h: 0.62, color: D.muted, width: 1.5, endArrow: 'triangle' })
  node(ML + 2.5, 1.9, 'Reject & return', 'box', D.panel, y + 1.75)
})()

// 28 — RESEARCH / METHODOLOGY -------------------------------------------------
;(() => {
  const s = deck.slide('DARK')
  header(s, 'METHODOLOGY', 'How the study was run', D)
  const steps = [['Sample', '1,240 responses across 6 regions.'], ['Method', 'Mixed quantitative survey + interviews.'], ['Analysis', 'Regression on 14 variables.'], ['Validation', 'Cross-checked against 2024 panel.']]
  steps.forEach((st, i) => {
    const y = 2.55 + i * 0.95
    s.rect({ x: ML, y, w: CW, h: 0.78, fill: D.panel, line: D.line, radius: 0.06 })
    s.rect({ shape: 'roundRect', x: ML + 0.18, y: y + 0.14, w: 0.5, h: 0.5, radius: 0.08, fill: D.accent })
    s.text(String(i + 1), { x: ML + 0.18, y: y + 0.14, w: 0.5, h: 0.5, size: 16, bold: true, color: D.accentInk, align: 'center', valign: 'middle', font: FONT.num })
    s.text(st[0], { x: ML + 0.9, y, w: 2.4, h: 0.78, size: 15, bold: true, color: D.ink, valign: 'middle', font: FONT.body })
    s.text(st[1], { x: ML + 3.4, y, w: CW - 3.6, h: 0.78, size: 12.5, color: D.muted, valign: 'middle', font: FONT.body })
  })
})()

// 29 — DATA / CHART (native) --------------------------------------------------
;(() => {
  const s = deck.slide('LIGHT')
  header(s, 'RESULTS', 'Growth across the pilot', L)
  s.chart('bar', [
    { name: 'Revenue', labels: ['Q1', 'Q2', 'Q3', 'Q4'], values: [30, 45, 52, 70] },
    { name: 'Cost', labels: ['Q1', 'Q2', 'Q3', 'Q4'], values: [22, 24, 23, 21] },
  ], {
    x: ML, y: 2.4, w: 6.6, h: 3.6, barDir: 'col', chartColors: [L.accent2, '9FB0C2'],
    showLegend: true, legendPos: 'b', legendColor: L.muted, legendFontFace: FONT.body, legendFontSize: 11,
    catAxisLabelColor: L.ink, valAxisLabelColor: L.muted, catAxisLabelFontFace: FONT.body, valAxisLabelFontFace: FONT.body,
    catAxisLabelFontSize: 11, valAxisLabelFontSize: 10, valGridLine: { color: L.line, style: 'solid', size: 0.5 },
    catGridLine: { style: 'none' }, showTitle: false, barGapWidthPct: 60,
  })
  s.chart('doughnut', [{ name: 'Mix', labels: ['Organic', 'Paid', 'Referral', 'Direct'], values: [42, 27, 18, 13] }], {
    x: 7.3, y: 2.4, w: 4.5, h: 3.6, holeSize: 64, chartColors: [L.accent2, L.accent, '9FB0C2', 'C9D6E0'],
    showLegend: true, legendPos: 'r', legendColor: L.muted, legendFontFace: FONT.body, legendFontSize: 11,
    showValue: false, dataLabelColor: 'FFFFFF', dataLabelFontFace: FONT.body, dataLabelFontSize: 10, showTitle: false,
  })
})()

// 30 — TABLE / MATRIX (native) ------------------------------------------------
;(() => {
  const s = deck.slide('LIGHT')
  header(s, 'COMPARISON MATRIX', 'Plans and features', L)
  const head = (t) => ({ text: t, options: { bold: true, color: 'FFFFFF', fill: { color: D.bg }, fontFace: FONT.body, fontSize: 13, align: 'center', valign: 'middle' } })
  const cell = (t, hero) => ({ text: t, options: { color: hero ? L.accent : L.ink, bold: hero, fontFace: FONT.body, fontSize: 12, align: t.includes('·') || t === '✓' || t === '—' ? 'center' : 'left', valign: 'middle', fill: { color: 'FFFFFF' } } })
  const rows = [
    [head('Feature'), head('Starter'), head('Growth'), head('Enterprise')],
    [cell('Seats'), cell('3'), cell('25'), cell('Unlimited', true)],
    [cell('Automation workflows'), cell('5'), cell('50'), cell('Unlimited', true)],
    [cell('Advanced analytics'), cell('—'), cell('✓'), cell('✓', true)],
    [cell('Dedicated support'), cell('—'), cell('—'), cell('✓', true)],
    [cell('Monthly price'), cell('$0'), cell('$49'), cell('Custom', true)],
  ]
  s.table(rows, {
    x: ML, y: 2.5, w: CW, colW: [4.133, 2.466, 2.467, 2.467], rowH: [0.55, 0.6, 0.6, 0.6, 0.6, 0.6],
    border: { type: 'solid', color: L.line, pt: 0.75 }, align: 'left', valign: 'middle', margin: [4, 10, 4, 10],
  })
})()

// 31 — TEAM -------------------------------------------------------------------
;(() => {
  const s = deck.slide('LIGHT')
  header(s, 'THE TEAM', 'People behind the work', L)
  const people = [['Alex Morgan', 'Programme Lead'], ['Sam Rivera', 'Data & Analytics'], ['Jordan Lee', 'Automation'], ['Taylor Kim', 'Change & Enablement']]
  const gap = 0.5
  const w = (CW - gap * 3) / 4
  people.forEach((p, i) => {
    const x = ML + i * (w + gap)
    const cx = x + w / 2
    s.rect({ shape: 'ellipse', x: cx - 0.85, y: 2.6, w: 1.7, h: 1.7, fill: L.panel, line: L.line, lineW: 1.25 })
    s.rect({ shape: 'ellipse', x: cx - 0.3, y: 2.95, w: 0.6, h: 0.6, fill: L.accent2 })
    s.rect({ shape: 'ellipse', x: cx - 0.55, y: 3.6, w: 1.1, h: 0.9, fill: L.accent2 })
    s.rect({ shape: 'ellipse', x: cx - 0.85, y: 2.6, w: 1.7, h: 1.7, fill: 'none', line: L.accent, lineW: 1.5 })
    s.text(p[0], { x, y: 4.55, w, h: 0.4, size: 15, bold: true, color: L.ink, align: 'center', font: FONT.display })
    s.text(p[1], { x, y: 4.95, w, h: 0.35, size: 11.5, color: L.accent, align: 'center', font: FONT.body })
    s.line({ x: cx - 0.4, y: 5.4, w: 0.8, h: 0, color: L.line, width: 1 })
  })
})()

// 32 — IMAGE + TEXT -----------------------------------------------------------
;(() => {
  const s = deck.slide('DARK')
  imagePlaceholder(s, 0, 0, 5.9, PAGE.H, 'YOUR IMAGE', D)
  eyebrow(s, 'CASE STUDY', D, 6.4, 0.9)
  s.text('A story worth telling', { x: 6.4, y: 1.5, w: RX - 6.4, h: 1.2, size: 30, bold: true, color: D.ink, font: FONT.display, lineSpacing: 34 })
  s.text('Pair a strong image with a focused message. Keep the copy tight — one idea, a few supporting lines, and a clear takeaway.', { x: 6.4, y: 2.9, w: RX - 6.4, h: 1.4, size: 14, color: D.muted, font: FONT.body, lineSpacing: 21 })
  ;['Replace the panel with your own photo', 'Right-click → Change Picture', 'The frame keeps its size and crop'].forEach((b, i) => bulletRow(s, 6.4, 4.5 + i * 0.6, RX - 6.4, b, '', D))
})()

// 33 — FULL IMAGE -------------------------------------------------------------
;(() => {
  const s = deck.slide('HERO')
  imagePlaceholder(s, 0, 0, PAGE.W, PAGE.H, 'FULL-BLEED IMAGE', D)
  s.rect({ x: 0, y: 4.6, w: PAGE.W, h: 2.9, fill: D.bg, transparency: 15 }, true)
  s.rect({ x: ML, y: 5.1, w: 0.9, h: 0.05, fill: D.accent })
  s.text('An image that fills the frame', { x: ML, y: 5.25, w: 9, h: 0.8, size: 30, bold: true, color: D.ink, font: FONT.display })
  s.text('Overlay a caption on a darkened band so the text stays readable over any photo.', { x: ML, y: 6.05, w: 9, h: 0.5, size: 13.5, color: D.ink, font: FONT.body })
})()

// 34 — QUOTE ------------------------------------------------------------------
;(() => {
  const s = deck.slide('DARK')
  rings(s, 1.0, 6.8, 2.6, 5)
  s.text('“', { x: ML - 0.1, y: 1.3, w: 3, h: 2, size: 150, bold: true, color: D.accent, font: FONT.display })
  s.text('The best way to predict the future is to design the system that creates it.', { x: 2.2, y: 2.5, w: 9.0, h: 2.4, size: 32, bold: true, color: D.ink, font: FONT.display, lineSpacing: 42 })
  s.rect({ x: 2.2, y: 5.3, w: 0.6, h: 0.05, fill: D.accent })
  s.text('A. Visionary  ·  Chief Strategy Officer', { x: 2.95, y: 5.12, w: 7, h: 0.4, size: 14, color: D.muted, font: FONT.body })
})()

// 35 — SECTION DIVIDER 02 -----------------------------------------------------
divider('02', 'SECTION TWO', 'Execution & outcomes', 'The plan, the metrics, and what we need to decide today.')()

// 36 — CLOSING ----------------------------------------------------------------
;(() => {
  const s = deck.slide('HERO')
  rings(s, 12.6, 6.9, 3.6, 6)
  s.rect({ x: 0, y: 0, w: 0.16, h: PAGE.H, fill: D.accent2, transparency: 40 }, true)
  s.rect({ x: 0.16, y: 0, w: 0.09, h: 2.9, fill: D.accent }, true)
  s.text('THANK YOU', { x: ML, y: 2.3, w: 8, h: 0.4, size: 13, bold: true, color: D.accent, spacing: 3, font: FONT.body })
  s.text('Questions?', { x: ML, y: 2.8, w: 9, h: 1.3, size: 60, bold: true, color: D.ink, font: FONT.display })
  s.text('Let’s talk about where to start.', { x: ML, y: 4.2, w: 8, h: 0.5, size: 18, color: D.muted, font: FONT.body })
  const contacts = [['Email', 'you@company.com'], ['Web', 'www.company.com'], ['Phone', '+1 (555) 012-3456']]
  contacts.forEach((c, i) => {
    const y = 5.3 + i * 0.5
    s.text(c[0], { x: ML, y, w: 1.4, h: 0.35, size: 12, bold: true, color: D.accent, font: FONT.body })
    s.text(c[1], { x: ML + 1.5, y, w: 6, h: 0.35, size: 12.5, color: D.ink, font: FONT.body })
  })
})()

// 37 — TEMPLATE GUIDE ---------------------------------------------------------
;(() => {
  const s = deck.slide('LIGHT')
  header(s, 'TEMPLATE GUIDE', 'How to use this template', L)
  const tips = [
    ['Edit text', 'Click any text and type. Fonts and sizes are preset — just replace the words.'],
    ['Replace images', 'Right-click a placeholder → Change Picture. The frame keeps its size and crop.'],
    ['Change colours', 'Design → Variants, or recolour shapes directly. The whole deck uses one palette.'],
    ['Edit charts', 'Click a chart → Chart Design → Edit Data. Numbers and series update live.'],
    ['Edit diagrams', 'Every diagram is made of real shapes — move, resize, duplicate or delete freely.'],
    ['Fonts', 'Montserrat (headings) + Inter (body). Install both free from Google Fonts.'],
  ]
  const gap = 0.4
  const w = (CW - gap) / 2
  tips.forEach((t, i) => {
    const col = i % 2
    const row = Math.floor(i / 2)
    const x = ML + col * (w + gap)
    const y = 2.5 + row * 1.3
    s.rect({ shape: 'roundRect', x, y, w: 0.5, h: 0.5, radius: 0.08, fill: L.accent2 })
    s.text(String(i + 1), { x, y, w: 0.5, h: 0.5, size: 16, bold: true, color: 'FFFFFF', align: 'center', valign: 'middle', font: FONT.num })
    s.text(t[0], { x: x + 0.7, y: y - 0.02, w: w - 0.7, h: 0.4, size: 15, bold: true, color: L.ink, font: FONT.body })
    s.text(t[1], { x: x + 0.7, y: y + 0.38, w: w - 0.7, h: 0.8, size: 11.5, color: L.muted, font: FONT.body, lineSpacing: 15 })
  })
})()

// 38 — COLOUR & TYPE SYSTEM ---------------------------------------------------
;(() => {
  const s = deck.slide('LIGHT')
  header(s, 'DESIGN SYSTEM', 'Colour palette & type scale', L)
  const sw = [['0B1520', 'Navy'], ['D97B2E', 'Burnt'], ['FFB454', 'Amber'], ['9FB0C2', 'Slate'], ['F4F7FA', 'Mist'], ['FFFFFF', 'White']]
  const w = (CW - 0.3 * 5) / 6
  sw.forEach((c, i) => {
    const x = ML + i * (w + 0.3)
    s.rect({ shape: 'roundRect', x, y: 2.5, w, h: 1.1, radius: 0.08, fill: c[0], line: c[0] === 'FFFFFF' ? L.line : undefined })
    s.text(c[1], { x, y: 3.68, w, h: 0.3, size: 12, bold: true, color: L.ink, align: 'center', font: FONT.body })
    s.text('#' + c[0], { x, y: 3.96, w, h: 0.3, size: 9.5, color: L.muted, align: 'center', font: FONT.num })
  })
  const scale = [['Display', 52, FONT.display, true, 0.72], ['Title', 30, FONT.display, true, 0.44], ['Section', 20, FONT.display, true, 0.4], ['Body', 14, FONT.body, false, 0.38], ['Caption', 11, FONT.body, false, 0.36]]
  let y = 4.28
  scale.forEach((t) => {
    const rowH = t[4]
    s.text(t[0], { x: ML, y, w: 2.3, h: rowH, size: 11, bold: true, color: L.accent, valign: 'middle', font: FONT.body, spacing: 1.5 })
    s.text('The quick brown fox', { x: ML + 2.5, y, w: 9, h: rowH, size: t[1], bold: t[3], color: L.ink, font: t[2], valign: 'middle' })
    y += rowH + 0.04
  })
})()

// ------------------------------------------------------------------- write out
mkdirSync('tmp-template', { recursive: true })
const bytes = await deck.write('tmp-template/Professional_Presentation_Template.pptx')
console.log(`wrote Professional_Presentation_Template.pptx — ${bytes} bytes, ${deck.n} slides`)
if (deck.warnings.length) {
  console.log(`\n⚠ ${deck.warnings.length} bounds warning(s):`)
  for (const w of deck.warnings) console.log('  ' + w)
} else {
  console.log('✓ bounds check clean — every element inside the slide')
}

// ---------------------------------------------------- SVG contact sheet (QC only)
// Not part of the deliverable — a faithful geometric preview rendered from the
// exact coordinates sent to pptxgenjs (native charts/tables shown as labelled
// zones), so overlaps/alignment can be eyeballed without PowerPoint. PREVIEW=1.
if (process.env.PREVIEW) {
  const S = 96 // px per inch
  const esc = (v) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const col = (h) => (h && h !== 'none' ? '#' + h : 'none')
  const poly = (shape, x, y, w, h) => {
    let p = []
    if (shape === 'triangle') p = [[x + w / 2, y], [x + w, y + h], [x, y + h]]
    else if (shape === 'diamond') p = [[x + w / 2, y], [x + w, y + h / 2], [x + w / 2, y + h], [x, y + h / 2]]
    else if (shape === 'trapezoid') p = [[x + w * 0.22, y], [x + w * 0.78, y], [x + w, y + h], [x, y + h]]
    else if (shape === 'chevron') { const n = Math.min(h / 2, w * 0.3); p = [[x, y], [x + w - n, y], [x + w, y + h / 2], [x + w - n, y + h], [x, y + h], [x + n, y + h / 2]] }
    else if (shape === 'rightArrow') { const hw = h * 0.5, bt = y + h * 0.25, bb = y + h * 0.75, ax = x + w - hw; p = [[x, bt], [ax, bt], [ax, y], [x + w, y + h / 2], [ax, y + h], [ax, bb], [x, bb]] }
    return p.map((q) => q.map((v) => (v * S).toFixed(1)).join(',')).join(' ')
  }
  const wrap = (text, charW, maxW) => {
    const max = Math.max(1, Math.floor(maxW / charW))
    const out = []
    let cur = ''
    for (const wd of String(text).split(/\s+/)) {
      if (!cur) cur = wd
      else if ((`${cur} ${wd}`).length <= max) cur += ` ${wd}`
      else { out.push(cur); cur = wd }
    }
    if (cur) out.push(cur)
    return out
  }
  const renderSlide = (cap) => {
    const o = []
    for (const el of cap.els) {
      const g = el.o
      if (el.k === 'line') {
        const dash = g.dash === 'dash' ? ' stroke-dasharray="6 5"' : (g.dash ? ' stroke-dasharray="2 4"' : '')
        o.push(`<line x1="${(g.x * S).toFixed(1)}" y1="${(g.y * S).toFixed(1)}" x2="${((g.x + g.w) * S).toFixed(1)}" y2="${((g.y + g.h) * S).toFixed(1)}" stroke="${col(g.color)}" stroke-width="${(g.width || 1) * 1.3}"${dash} stroke-opacity="${1 - (g.transparency || 0) / 100}"/>`)
        continue
      }
      if (el.k === 'chart' || el.k === 'table') {
        const x = g.x * S, y = g.y * S, w = g.w * S, h = g.h * S
        o.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#${D.accent}" fill-opacity="0.05" stroke="#${D.accent}" stroke-opacity="0.55" stroke-dasharray="7 5"/>`)
        o.push(`<text x="${x + w / 2}" y="${y + h / 2}" fill="#${D.accent}" font-family="Inter,sans-serif" font-size="13" text-anchor="middle" dominant-baseline="middle">${el.k === 'chart' ? `${el.type} chart` : 'table'} · native/editable</text>`)
        continue
      }
      const x = g.x * S, y = g.y * S, w = Math.abs(g.w) * S, h = Math.abs(g.h) * S
      const fill = g.fill && g.fill !== 'none' ? col(g.fill) : 'none'
      const fo = g.fill && g.fill !== 'none' ? 1 - (g.transparency || 0) / 100 : 0
      const stroke = g.line ? col(g.line) : 'none'
      const so = g.line ? 1 - (g.lineTrans || 0) / 100 : 0
      const sw = (g.lineW || 1) * 1.3
      const cx = (x + w / 2).toFixed(1), cy = (y + h / 2).toFixed(1)
      const rot = g.rotate ? ` transform="rotate(${g.rotate} ${cx} ${cy})"` : ''
      const paint = `fill="${fill}" fill-opacity="${fo}" stroke="${stroke}" stroke-opacity="${so}" stroke-width="${sw}"`
      const shp = g.shape || 'rect'
      if (shp === 'ellipse') o.push(`<ellipse cx="${cx}" cy="${cy}" rx="${(w / 2).toFixed(1)}" ry="${(h / 2).toFixed(1)}" ${paint}${rot}/>`)
      else if (['triangle', 'diamond', 'trapezoid', 'chevron', 'rightArrow'].includes(shp)) o.push(`<polygon points="${poly(shp, g.x, g.y, Math.abs(g.w), Math.abs(g.h))}" ${paint}${rot}/>`)
      else o.push(`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="${g.radius ? (g.radius * S).toFixed(1) : 0}" ${paint}${rot}/>`)
    }
    for (const el of cap.els) {
      if (el.k !== 'text') continue
      const g = el.o
      const px = (g.size || 14) * 96 / 72
      const lines = wrap(el.t, px * 0.52, g.w * S)
      const lh = g.lineSpacing ? g.lineSpacing * 96 / 72 : px * 1.18
      const blockH = lines.length * lh
      let ty = g.y * S + px * 0.9
      if (g.valign === 'middle') ty = g.y * S + (g.h * S - blockH) / 2 + px * 0.82
      else if (g.valign === 'bottom') ty = g.y * S + g.h * S - blockH + px * 0.82
      const anchor = g.align === 'center' ? 'middle' : g.align === 'right' ? 'end' : 'start'
      const tx = (g.align === 'center' ? (g.x + g.w / 2) * S : g.align === 'right' ? (g.x + g.w) * S : g.x * S).toFixed(1)
      const ls = g.spacing ? ` letter-spacing="${(g.spacing * 0.6).toFixed(2)}"` : ''
      const op = g.transparency ? ` fill-opacity="${1 - g.transparency / 100}"` : ''
      lines.forEach((ln, i) => o.push(`<text x="${tx}" y="${(ty + i * lh).toFixed(1)}" fill="${col(g.color || D.ink)}" font-family="${g.font || 'Inter'},Segoe UI,sans-serif" font-size="${px.toFixed(1)}" font-weight="${g.bold ? '700' : '400'}" text-anchor="${anchor}"${ls}${op}>${esc(ln)}</text>`))
    }
    return o.join('')
  }
  const cw = PAGE.W * S, ch = PAGE.H * S
  const COLS = 3, GAP = 30, SC = 0.46
  const cellW = cw * SC, cellH = ch * SC
  const rows = Math.ceil(deck.captured.length / COLS)
  const sheetW = COLS * cellW + (COLS + 1) * GAP
  const sheetH = rows * (cellH + 24) + GAP
  let body = `<rect width="${sheetW}" height="${sheetH}" fill="#05090f"/>`
  let defs = ''
  deck.captured.forEach((cap, i) => {
    const c = i % COLS, r = Math.floor(i / COLS)
    const x = GAP + c * (cellW + GAP), y = GAP + 16 + r * (cellH + 24)
    defs += `<clipPath id="c${i}"><rect x="0" y="0" width="${cw}" height="${ch}"/></clipPath>`
    body += `<text x="${x.toFixed(1)}" y="${(y - 6).toFixed(1)}" fill="#${D.accent}" font-family="Inter,sans-serif" font-size="13" font-weight="700">${String(i + 1).padStart(2, '0')}</text>`
    body += `<g transform="translate(${x.toFixed(1)},${y.toFixed(1)}) scale(${SC})" clip-path="url(#c${i})"><rect width="${cw}" height="${ch}" fill="${col(cap.bg)}"/>${renderSlide(cap)}</g>`
    body += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${cellW.toFixed(1)}" height="${cellH.toFixed(1)}" fill="none" stroke="#1a2738"/>`
  })
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${sheetW.toFixed(0)}" height="${sheetH.toFixed(0)}" viewBox="0 0 ${sheetW.toFixed(0)} ${sheetH.toFixed(0)}"><defs>${defs}</defs>${body}</svg>`
  writeFileSync('tmp-template/contact-sheet.svg', svg)
  console.log(`✓ preview → tmp-template/contact-sheet.svg (${deck.captured.length} slides)`)
}
