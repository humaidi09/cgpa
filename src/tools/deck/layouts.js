// Deck layouts — every slide type lives here, and each one is just a function
// that turns data + a theme into a flat list of elements (shapes, text, lines).
// Both the React preview and the .pptx exporter read this same list, which is
// what keeps the downloaded deck identical to what the student designed.
//
// Elements are plain objects:
//   { t:'shape', shape, x, y, w, h, fill, fill2, transparency, rotate,
//     radius, line:{color,width,transparency} }
//   { t:'text',  x, y, w, h, text, size, color, font, bold, italic,
//     align, valign, spacing, lineSpacing, transparency }
//   { t:'line',  x1, y1, x2, y2, color, width, transparency }
// Coordinates are inches on a 16:9 canvas (13.333 x 7.5).

export const CANVAS = { W: 13.333, H: 7.5 }

const shape = (o) => ({ t: 'shape', shape: 'rect', ...o })
const text = (o) => ({ t: 'text', ...o })

/* ------------------------------------------------------------ deco shapes --- */

// A soft ring built from concentric translucent circles — the "glow" stand-in.
function glow(cx, cy, r, color, rings = 4, base = 10) {
  const out = []
  for (let i = rings; i >= 1; i--) {
    const rr = (r * i) / rings
    out.push(
      shape({
        shape: 'ellipse',
        x: cx - rr,
        y: cy - rr,
        w: rr * 2,
        h: rr * 2,
        fill: color,
        transparency: base + (rings - i) * 12,
      }),
    )
  }
  return out
}

// The signature "faceted plate": a rotated rounded square with a lighter inner
// plate, echoing the folded-geometry look of the reference decks.
function plate(x, y, w, h, theme, rotate = 18) {
  return [
    shape({ shape: 'roundRect', x, y, w, h, fill: theme.accent, transparency: 8, rotate, radius: 0.02 }),
    shape({ shape: 'roundRect', x: x + w * 0.16, y: y + h * 0.16, w: w * 0.68, h: h * 0.68, fill: theme.bg, transparency: 22, rotate, radius: 0.02 }),
    shape({ shape: 'roundRect', x: x + w * 0.3, y: y + h * 0.3, w: w * 0.4, h: h * 0.4, fill: theme.accent2, transparency: 20, rotate: rotate + 24, radius: 0.02 }),
  ]
}

/* --------------------------------------------------------- shared blocks ---- */

// The quiet footer that recurs on content slides: a hairline + meta + counter.
function footer(theme, meta, page) {
  return [
    shape({ x: 0.9, y: 6.72, w: 11.53, h: 0.014, fill: theme.line }),
    text({ x: 0.9, y: 6.82, w: 8, h: 0.4, text: (meta.course || meta.org || '').toUpperCase(), size: 9, color: theme.muted, font: theme.bodyFont, spacing: 1.5 }),
    text({ x: 10.4, y: 6.82, w: 2.03, h: 0.4, text: `${String(page).padStart(2, '0')}`, size: 10, bold: true, color: theme.accent, font: theme.bodyFont, align: 'right' }),
  ]
}

// Eyebrow + heading used at the top of most content slides.
function head(theme, eyebrow, title, y = 0.72) {
  const out = []
  if (eyebrow) {
    out.push(text({ x: 0.9, y: y - 0.08, w: 9, h: 0.32, text: eyebrow.toUpperCase(), size: 11, bold: true, color: theme.accent, font: theme.bodyFont, spacing: 2 }))
  }
  out.push(text({ x: 0.86, y: eyebrow ? y + 0.28 : y, w: 11.6, h: 0.9, text: title, size: 30, bold: true, color: theme.ink, font: theme.headFont }))
  return out
}

/* ------------------------------------------------------------- the slides --- */

const LAYOUTS = {
  /* 1 — hero title slide ---------------------------------------------------- */
  title(d, th, meta, page) {
    return [
      ...glow(11.6, 1.4, 2.5, th.accent, 4, 82),
      shape({ x: 0, y: 0, w: 0.28, h: CANVAS.H, fill: th.accent }),
      ...plate(9.5, 3.7, 3.4, 3.4, th, 16),
      text({ x: 1.1, y: 2.05, w: 9.6, h: 0.5, text: (d.eyebrow || meta.course || '').toUpperCase(), size: 12, bold: true, color: th.accent, font: th.bodyFont, spacing: 3 }),
      text({ x: 1.06, y: 2.6, w: 9.8, h: 1.9, text: d.title || 'Presentation Title', size: 52, bold: true, color: th.ink, font: th.headFont, lineSpacing: 40 }),
      text({ x: 1.1, y: 4.62, w: 8.4, h: 0.7, text: d.subtitle || '', size: 17, color: th.muted, font: th.bodyFont }),
      shape({ x: 1.1, y: 5.5, w: 1.4, h: 0.05, fill: th.accent }),
      text({ x: 1.1, y: 5.74, w: 8.6, h: 1.0, text: [d.author, d.org, d.date].filter(Boolean).join('   ·   '), size: 12.5, color: th.muted, font: th.bodyFont }),
    ]
  },

  /* 2 — agenda / contents --------------------------------------------------- */
  agenda(d, th, meta, page) {
    const items = d.items || []
    const cols = items.length > 5 ? 2 : 1
    const out = [...glow(12.4, 6.6, 2.2, th.accent, 3, 86), ...head(th, 'Contents', d.title || 'Agenda')]
    const perCol = Math.ceil(items.length / cols)
    items.forEach((it, i) => {
      const c = Math.floor(i / perCol)
      const r = i % perCol
      const x = 0.9 + c * 6.0
      const y = 1.95 + r * (cols === 2 ? 0.92 : 1.05)
      out.push(text({ x, y, w: 0.9, h: 0.6, text: String(i + 1).padStart(2, '0'), size: 22, bold: true, color: th.accent, font: th.numFont }))
      out.push(text({ x: x + 0.86, y: y + 0.02, w: 4.6, h: 0.6, text: it, size: 15, color: th.ink, font: th.headFont, valign: 'middle' }))
      if (cols === 2 || r < perCol - 1) {
        out.push(shape({ x: x + 0.86, y: y + 0.68, w: 4.7, h: 0.012, fill: th.line }))
      }
    })
    return [...out, ...footer(th, meta, page)]
  },

  /* 3 — the reference index slide (big ghost numerals + deco plate) ---------- */
  indexBig(d, th, meta, page) {
    const items = (d.items || []).slice(0, 4)
    const out = [...glow(10.9, 3.75, 2.9, th.accent, 4, 84), ...plate(9.35, 2.2, 3.7, 3.7, th, 20), ...head(th, d.eyebrow, d.title)]
    const iy = 2.0
    const step = 1.18
    items.forEach((it, i) => {
      const y = iy + i * step
      out.push(text({ x: 0.86, y: y - 0.18, w: 1.0, h: 1.0, text: String(i + 1), size: 46, bold: true, color: th.accent, font: th.numFont }))
      out.push(text({ x: 2.0, y, w: 6.4, h: 0.4, text: (it.title || '').toUpperCase(), size: 14.5, bold: true, color: th.ink, font: th.bodyFont, spacing: 1 }))
      out.push(text({ x: 2.0, y: y + 0.38, w: 6.6, h: 0.7, text: it.body || '', size: 11, color: th.muted, font: th.bodyFont, lineSpacing: 15 }))
    })
    return [...out, ...footer(th, meta, page)]
  },

  /* 4 — section divider ----------------------------------------------------- */
  divider(d, th, meta, page) {
    return [
      ...glow(1.6, 5.9, 2.6, th.accent, 4, 84),
      shape({ x: 0, y: 0, w: 0.28, h: CANVAS.H, fill: th.accent }),
      text({ x: 1.1, y: 2.35, w: 3, h: 1.7, text: String(d.number || 1).padStart(2, '0'), size: 92, bold: true, color: th.accent, font: th.numFont }),
      text({ x: 1.15, y: 3.95, w: 10.4, h: 1.4, text: d.title || 'Section', size: 40, bold: true, color: th.ink, font: th.headFont }),
      ...(d.body ? [text({ x: 1.18, y: 5.3, w: 9.4, h: 0.9, text: d.body, size: 15, color: th.muted, font: th.bodyFont, lineSpacing: 22 })] : []),
      ...footer(th, meta, page),
    ]
  },

  /* 5 — heading + bullets, with a deco column ------------------------------- */
  bullets(d, th, meta, page) {
    const out = [...glow(12.2, 6.4, 2.0, th.accent, 3, 88), ...head(th, d.eyebrow, d.title)]
    const items = d.items || []
    items.forEach((it, i) => {
      const y = 1.95 + i * 0.92
      out.push(shape({ shape: 'roundRect', x: 0.9, y: y + 0.06, w: 0.34, h: 0.34, fill: th.accent, radius: 0.08 }))
      out.push(text({ x: 1.4, y: y - 0.02, w: 11.0, h: 0.5, text: it.title || it, size: 16, bold: true, color: th.ink, font: th.headFont }))
      if (it.body) out.push(text({ x: 1.4, y: y + 0.4, w: 11.0, h: 0.45, text: it.body, size: 11.5, color: th.muted, font: th.bodyFont }))
    })
    return [...out, ...footer(th, meta, page)]
  },

  /* 6 — two columns --------------------------------------------------------- */
  twoCol(d, th, meta, page) {
    const col = (c, x) => {
      const out = []
      out.push(shape({ x, y: 1.95, w: 5.6, h: 0.02, fill: th.accent }))
      out.push(text({ x, y: 2.15, w: 5.6, h: 0.5, text: (c.heading || '').toUpperCase(), size: 15, bold: true, color: th.accent, font: th.bodyFont, spacing: 0.8 }))
      out.push(text({ x, y: 2.75, w: 5.6, h: 3.4, text: c.body || '', size: 13, color: th.ink, font: th.bodyFont, lineSpacing: 20 }))
      return out
    }
    return [...glow(12.3, 6.5, 2.0, th.accent, 3, 88), ...head(th, d.eyebrow, d.title), ...col(d.left || {}, 0.9), ...col(d.right || {}, 6.9), ...footer(th, meta, page)]
  },

  /* 7 — feature cards ------------------------------------------------------- */
  cards(d, th, meta, page) {
    const items = (d.items || []).slice(0, 3)
    const gap = 0.4
    const cw = (11.53 - gap * (items.length - 1)) / items.length
    const out = [...glow(12.4, 6.6, 2.0, th.accent, 3, 88), ...head(th, d.eyebrow, d.title)]
    items.forEach((it, i) => {
      const x = 0.9 + i * (cw + gap)
      out.push(shape({ shape: 'roundRect', x, y: 2.0, w: cw, h: 3.9, fill: th.bg2, radius: 0.04, line: { color: th.line, width: 1 } }))
      out.push(text({ x: x + 0.35, y: 2.35, w: cw - 0.7, h: 0.7, text: String(i + 1).padStart(2, '0'), size: 30, bold: true, color: th.accent, font: th.numFont }))
      out.push(text({ x: x + 0.35, y: 3.25, w: cw - 0.7, h: 0.8, text: it.title || '', size: 16, bold: true, color: th.ink, font: th.headFont, lineSpacing: 18 }))
      out.push(text({ x: x + 0.35, y: 4.15, w: cw - 0.7, h: 1.5, text: it.body || '', size: 11.5, color: th.muted, font: th.bodyFont, lineSpacing: 16 }))
    })
    return [...out, ...footer(th, meta, page)]
  },

  /* 8 — a row of big statistics --------------------------------------------- */
  stats(d, th, meta, page) {
    const items = (d.items || []).slice(0, 4)
    const gap = 0.4
    const cw = (11.53 - gap * (items.length - 1)) / items.length
    const out = [...head(th, d.eyebrow, d.title)]
    items.forEach((it, i) => {
      const x = 0.9 + i * (cw + gap)
      out.push(shape({ x, y: 2.5, w: cw, h: 0.05, fill: th.accent }))
      out.push(text({ x, y: 2.75, w: cw, h: 1.4, text: it.value || '', size: 54, bold: true, color: th.ink, font: th.numFont }))
      out.push(text({ x, y: 4.25, w: cw, h: 0.6, text: (it.label || '').toUpperCase(), size: 12, bold: true, color: th.accent, font: th.bodyFont, spacing: 1.2 }))
      if (it.body) out.push(text({ x, y: 4.85, w: cw, h: 1.0, text: it.body, size: 11.5, color: th.muted, font: th.bodyFont, lineSpacing: 16 }))
    })
    return [...out, ...footer(th, meta, page)]
  },

  /* 9 — horizontal timeline ------------------------------------------------- */
  timeline(d, th, meta, page) {
    const items = (d.items || []).slice(0, 5)
    const out = [...head(th, d.eyebrow, d.title)]
    const y = 4.0
    out.push(shape({ x: 1.0, y: y - 0.01, w: 11.3, h: 0.03, fill: th.line }))
    const step = 11.3 / Math.max(items.length - 1, 1)
    items.forEach((it, i) => {
      const x = 1.0 + i * step
      out.push(shape({ shape: 'ellipse', x: x - 0.13, y: y - 0.13, w: 0.26, h: 0.26, fill: th.accent }))
      const up = i % 2 === 0
      out.push(text({ x: x - 1.1, y: up ? y - 0.95 : y + 0.28, w: 2.2, h: 0.4, text: (it.label || '').toUpperCase(), size: 12, bold: true, color: th.accent, font: th.bodyFont, align: 'center', spacing: 0.8 }))
      out.push(text({ x: x - 1.25, y: up ? y - 1.6 : y + 0.68, w: 2.5, h: 0.7, text: it.title || '', size: 12.5, bold: true, color: th.ink, font: th.headFont, align: 'center', lineSpacing: 15 }))
    })
    return [...out, ...footer(th, meta, page)]
  },

  /* 10 — before / after comparison ------------------------------------------ */
  compare(d, th, meta, page) {
    const panel = (p, x, on) => {
      const out = []
      out.push(shape({ shape: 'roundRect', x, y: 1.95, w: 5.6, h: 4.1, fill: on ? th.bg2 : th.bg, radius: 0.04, line: { color: on ? th.accent : th.line, width: on ? 1.5 : 1 } }))
      out.push(text({ x: x + 0.4, y: 2.2, w: 4.8, h: 0.5, text: (p.heading || '').toUpperCase(), size: 15, bold: true, color: on ? th.accent : th.muted, font: th.bodyFont, spacing: 1 }))
      const lines = (p.items || []).map((t) => `•  ${t}`).join('\n')
      out.push(text({ x: x + 0.4, y: 2.85, w: 4.85, h: 3.0, text: lines, size: 13, color: on ? th.ink : th.muted, font: th.bodyFont, lineSpacing: 24 }))
      return out
    }
    return [...head(th, d.eyebrow, d.title), ...panel(d.left || {}, 0.9, false), ...panel(d.right || {}, 6.9, true), ...footer(th, meta, page)]
  },

  /* 11 — pull quote --------------------------------------------------------- */
  quote(d, th, meta, page) {
    return [
      ...glow(2.0, 1.6, 2.4, th.accent, 4, 86),
      text({ x: 1.0, y: 1.2, w: 3, h: 1.6, text: '“', size: 120, bold: true, color: th.accent, font: th.headFont }),
      text({ x: 1.3, y: 2.6, w: 10.7, h: 2.6, text: d.text || '', size: 26, italic: true, color: th.ink, font: th.headFont, lineSpacing: 38 }),
      shape({ x: 1.35, y: 5.35, w: 1.3, h: 0.05, fill: th.accent }),
      text({ x: 1.35, y: 5.55, w: 10, h: 0.6, text: d.by || '', size: 14, bold: true, color: th.accent, font: th.bodyFont }),
      ...footer(th, meta, page),
    ]
  },

  /* 12 — numbered process steps --------------------------------------------- */
  process(d, th, meta, page) {
    const items = (d.items || []).slice(0, 5)
    const out = [...head(th, d.eyebrow, d.title)]
    const gap = 0.35
    const cw = (11.53 - gap * (items.length - 1)) / items.length
    const y = 2.7
    out.push(shape({ x: 0.9 + cw / 2, y: y + 0.42, w: 11.53 - cw, h: 0.02, fill: th.line }))
    items.forEach((it, i) => {
      const x = 0.9 + i * (cw + gap)
      out.push(shape({ shape: 'ellipse', x: x + cw / 2 - 0.34, y: y + 0.12, w: 0.68, h: 0.68, fill: th.accent }))
      out.push(text({ x: x + cw / 2 - 0.34, y: y + 0.16, w: 0.68, h: 0.6, text: String(i + 1), size: 20, bold: true, color: th.accentInk, font: th.numFont, align: 'center', valign: 'middle' }))
      out.push(text({ x, y: y + 1.05, w: cw, h: 0.6, text: it.title || '', size: 13.5, bold: true, color: th.ink, font: th.headFont, align: 'center', lineSpacing: 16 }))
      if (it.body) out.push(text({ x, y: y + 1.7, w: cw, h: 1.1, text: it.body, size: 11, color: th.muted, font: th.bodyFont, align: 'center', lineSpacing: 15 }))
    })
    return [...out, ...footer(th, meta, page)]
  },

  /* 13 — radial hub (centre + orbiting nodes) ------------------------------ */
  radial(d, th, meta, page) {
    const items = (d.items || []).slice(0, 6)
    const out = [...head(th, d.eyebrow, d.title)]
    const cx = 6.67
    const cy = 4.35
    const radius = 1.9
    out.push(...glow(cx, cy, 1.75, th.accent, 4, 86))
    out.push(shape({ shape: 'ellipse', x: cx - 1.05, y: cy - 1.05, w: 2.1, h: 2.1, fill: th.bg2, line: { color: th.accent, width: 1.5 } }))
    out.push(text({ x: cx - 1.05, y: cy - 0.5, w: 2.1, h: 1.0, text: (d.center || 'Core').toUpperCase(), size: 15, bold: true, color: th.accent, font: th.bodyFont, align: 'center', valign: 'middle', spacing: 1 }))
    items.forEach((it, i) => {
      const a = (Math.PI * 2 * i) / items.length - Math.PI / 2
      const nx = cx + Math.cos(a) * radius
      const ny = cy + Math.sin(a) * radius * 0.72
      out.push(shape({ shape: 'ellipse', x: nx - 0.5, y: ny - 0.5, w: 1.0, h: 1.0, fill: th.accent, transparency: 12 }))
      out.push(text({ x: nx - 0.5, y: ny - 0.5, w: 1.0, h: 1.0, text: String(i + 1), size: 18, bold: true, color: th.accentInk, font: th.numFont, align: 'center', valign: 'middle' }))
      const align = nx > cx + 0.2 ? 'left' : nx < cx - 0.2 ? 'right' : 'center'
      const tx = align === 'left' ? nx + 0.62 : align === 'right' ? nx - 3.12 : nx - 1.25
      out.push(text({ x: tx, y: ny - 0.2, w: 2.5, h: 0.5, text: (it.title || ''), size: 12, bold: true, color: th.ink, font: th.bodyFont, align }))
    })
    return [...out, ...footer(th, meta, page)]
  },

  /* 14 — stepped pyramid ---------------------------------------------------- */
  pyramid(d, th, meta, page) {
    const items = (d.items || []).slice(0, 4)
    const out = [...head(th, d.eyebrow, d.title)]
    const baseY = 6.35
    const rowH = 0.95
    const maxW = 9.6
    const n = items.length
    items.forEach((it, i) => {
      // widest at the bottom row
      const row = n - 1 - i
      const w = maxW * ((row + 1) / n)
      const x = (CANVAS.W - w) / 2
      const y = baseY - (i + 1) * rowH
      out.push(shape({ shape: 'trapezoid', x, y, w, h: rowH - 0.08, fill: i === n - 1 ? th.accent : th.accent2, transparency: i === n - 1 ? 0 : 18 + i * 14, line: { color: th.bg, width: 1 } }))
      out.push(text({ x, y: y + 0.18, w, h: rowH - 0.5, text: it.title || '', size: 13, bold: true, color: i === n - 1 ? th.accentInk : th.ink, font: th.headFont, align: 'center' }))
    })
    return [...out, ...footer(th, meta, page)]
  },

  /* 15 — funnel (bars narrowing downward) ----------------------------------- */
  funnel(d, th, meta, page) {
    const items = (d.items || []).slice(0, 5)
    const out = [...head(th, d.eyebrow, d.title)]
    const top = 2.0
    const rowH = 0.92
    const maxW = 11.0
    const n = items.length
    items.forEach((it, i) => {
      const w = maxW * (1 - i / (n + 0.6))
      const x = (CANVAS.W - w) / 2
      const y = top + i * rowH
      out.push(shape({ shape: 'roundRect', x, y, w, h: rowH - 0.14, fill: th.accent, transparency: 6 + i * 15, radius: 0.05 }))
      out.push(text({ x: x + 0.4, y, w: w - 0.8, h: rowH - 0.14, text: `${i + 1}.  ${it.title || ''}`, size: 13, bold: true, color: th.ink, font: th.bodyFont, valign: 'middle' }))
      if (it.body) out.push(text({ x: x + w + 0.15, y, w: 2.0, h: rowH - 0.14, text: it.body, size: 10, color: th.muted, font: th.bodyFont, valign: 'middle' }))
    })
    return [...out, ...footer(th, meta, page)]
  },

  /* 16 — closing / thank you ------------------------------------------------ */
  closing(d, th, meta, page) {
    return [
      ...glow(11.4, 5.6, 2.6, th.accent, 4, 84),
      shape({ x: 0, y: 0, w: 0.28, h: CANVAS.H, fill: th.accent }),
      text({ x: 1.1, y: 2.5, w: 3, h: 0.5, text: (d.eyebrow || 'Thank you').toUpperCase(), size: 12, bold: true, color: th.accent, font: th.bodyFont, spacing: 3 }),
      text({ x: 1.06, y: 3.05, w: 10.4, h: 1.5, text: d.title || 'Questions?', size: 46, bold: true, color: th.ink, font: th.headFont }),
      ...(d.body ? [text({ x: 1.1, y: 4.45, w: 9.6, h: 0.9, text: d.body, size: 16, color: th.muted, font: th.bodyFont })] : []),
      ...footer(th, meta, page),
    ]
  },
}

export const LAYOUT_IDS = Object.keys(LAYOUTS)

// Render one slide descriptor into its element list.
export function renderSlide(slide, theme, meta, page) {
  const fn = LAYOUTS[slide.type] || LAYOUTS.bullets
  return fn(slide, theme, meta, page).filter(Boolean)
}

/* ---------------------------------------------------- deck composition ------ */

// Turn the student's content into an ordered list of slide descriptors. This is
// the default running order of a presentation: cover → agenda → (per section:
// divider → content) → closing.
export function buildDeck(content) {
  const slides = []
  slides.push({ type: 'title', ...content.cover })
  const sections = content.sections || []
  if (sections.length) {
    slides.push({ type: 'agenda', title: 'Agenda', items: sections.map((s) => s.heading || 'Section') })
  }
  sections.forEach((s, i) => {
    slides.push({ type: 'divider', number: i + 1, title: s.heading, body: s.body })
    if (s.points?.length) slides.push({ type: 'indexBig', eyebrow: `Section ${String(i + 1).padStart(2, '0')}`, title: s.heading, items: s.points })
  })
  slides.push({ type: 'closing', ...(content.closing || {}) })
  return slides
}

// The catalogue of layouts the "add slide" menu offers, with a friendly label
// and a tiny sample payload so a blank slide still renders.
export const LAYOUT_MENU = [
  { type: 'title', label: 'Title slide' },
  { type: 'agenda', label: 'Agenda' },
  { type: 'divider', label: 'Section divider' },
  { type: 'indexBig', label: 'Numbered index' },
  { type: 'bullets', label: 'Bullet points' },
  { type: 'cards', label: 'Feature cards' },
  { type: 'stats', label: 'Big statistics' },
  { type: 'twoCol', label: 'Two columns' },
  { type: 'compare', label: 'Comparison' },
  { type: 'process', label: 'Process steps' },
  { type: 'timeline', label: 'Timeline' },
  { type: 'quote', label: 'Pull quote' },
  { type: 'radial', label: 'Radial hub' },
  { type: 'pyramid', label: 'Stepped pyramid' },
  { type: 'funnel', label: 'Funnel' },
  { type: 'closing', label: 'Closing' },
]

export function blankSlide(type, idx = 1) {
  const base = { type }
  switch (type) {
    case 'title': return { ...base, title: 'Presentation Title', subtitle: 'A short, clear subtitle', eyebrow: 'Course · Code' }
    case 'divider': return { ...base, number: idx, title: 'Section heading', body: 'One line on what this section covers.' }
    case 'indexBig': return { ...base, eyebrow: 'Section 01', title: 'Section heading', items: [{ title: 'First point', body: 'A sentence of detail.' }, { title: 'Second point', body: 'A sentence of detail.' }] }
    case 'cards': return { ...base, eyebrow: 'Overview', title: 'Three ideas, side by side', items: [{ title: 'First', body: 'Detail for the first card.' }, { title: 'Second', body: 'Detail for the second card.' }, { title: 'Third', body: 'Detail for the third card.' }] }
    case 'stats': return { ...base, eyebrow: 'By the numbers', title: 'The headline figures', items: [{ value: '92%', label: 'Accuracy' }, { value: '3.4×', label: 'Faster' }, { value: '12k', label: 'Users' }] }
    case 'twoCol': return { ...base, eyebrow: 'In detail', title: 'Two sides of the story', left: { heading: 'Left column', body: 'Text for the left column.' }, right: { heading: 'Right column', body: 'Text for the right column.' } }
    case 'compare': return { ...base, eyebrow: 'Comparison', title: 'Before and after', left: { heading: 'Before', items: ['First drawback', 'Second drawback'] }, right: { heading: 'After', items: ['First improvement', 'Second improvement'] } }
    case 'process': return { ...base, eyebrow: 'How it works', title: 'Four steps', items: [{ title: 'Step one', body: 'What happens first.' }, { title: 'Step two', body: 'What happens next.' }, { title: 'Step three', body: 'And then.' }, { title: 'Step four', body: 'Finally.' }] }
    case 'timeline': return { ...base, eyebrow: 'Milestones', title: 'The path so far', items: [{ label: '2023', title: 'Started' }, { label: '2024', title: 'Prototype' }, { label: '2025', title: 'Launch' }] }
    case 'quote': return { ...base, text: 'A sentence worth pausing on.', by: '— Attribution' }
    case 'agenda': return { ...base, title: 'Agenda', items: ['Introduction', 'Background', 'Method', 'Results', 'Conclusion'] }
    case 'closing': return { ...base, eyebrow: 'Thank you', title: 'Questions?', body: 'Happy to take anything from the audience.' }
    default: return { ...base, eyebrow: 'Slide', title: 'Slide heading', items: [{ title: 'First point', body: 'A sentence of detail.' }, { title: 'Second point', body: 'A sentence of detail.' }] }
  }
}
