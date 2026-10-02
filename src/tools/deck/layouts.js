// Deck layouts — every slide type lives here, and each one is just a function
// that turns data + a theme into a flat list of elements (shapes, text, lines).
// Both the React preview and the .pptx exporter read this same list, which is
// what keeps the downloaded deck identical to what the student designed.
//
// Elements are plain objects:
//   { t:'shape', shape, x, y, w, h, fill, transparency, rotate,
//     radius, line:{color,width,transparency} }
//   { t:'text',  x, y, w, h, text, size, color, font, bold, italic,
//     align, valign, spacing, lineSpacing, transparency }
//   { t:'line',  x1, y1, x2, y2, color, width, transparency }
// Coordinates are inches on a 16:9 canvas (13.333 x 7.5).
//
// ── The design system ────────────────────────────────────────────────────────
// Sixteen layouts, one visual language. Four devices recur so a finished deck
// reads as a single designed thing rather than sixteen slides that happen to
// share a background:
//
//   • a left accent rail (two stacked bars) on the opening/section slides
//   • a heading block that always sits on the same baseline (SEE HEAD)
//   • one recurring ornament and nothing stacked on it — concentric rings that
//     read like a frontier spreading out from a corner
//   • a quiet footnote rule with the course on the left and the page on the right
//
// Type roles are fixed, not per-slide: DISPLAY for slide titles, HEAD for
// section headings, LEAD for the sentence under a heading, BODY for prose,
// LABEL for uppercase tags, and NUM for every figure. That is the whole reason
// the old deck looked templated — every slide re-invented its own sizes.

export const CANVAS = { W: 13.333, H: 7.5 }

/* ------------------------------------------------------------- primitives --- */

const shape = (o) => ({ t: 'shape', shape: 'rect', ...o })
const text = (o) => ({ t: 'text', ...o })
const rule = (o) => ({ t: 'line', ...o })

// The grid. Every layout is built on these four numbers.
const M = 0.9 // left / right margin
const CW = CANVAS.W - M * 2 // 11.533 content width
const BODY_TOP = 2.16 // where content starts under a heading block
const FOOT_Y = 6.74

// The type scale. Nothing in this file should invent its own size.
const T = {
  display: { size: 40, font: 'headFont', bold: true, lineSpacing: 46 },
  section: { size: 30, font: 'headFont', bold: true, lineSpacing: 36 },
  head: { size: 22, font: 'headFont', bold: true },
  lead: { size: 14, font: 'bodyFont', lineSpacing: 21 },
  body: { size: 12.5, font: 'bodyFont', lineSpacing: 19 },
  small: { size: 11, font: 'bodyFont', lineSpacing: 16 },
  label: { size: 9.5, font: 'bodyFont', bold: true, spacing: 2.2 },
  num: { font: 'numFont', bold: true },
}

const ink = (th) => th.ink
const quiet = (th) => th.muted

/* ------------------------------------------------------------- ornaments --- */

// Concentric rings — the calm corner ornament. Sits behind everything, never
// carries meaning, and gives a dark slide its "lit from a corner" feel without
// a gradient (which pptxgenjs cannot write).
function rings(cx, cy, r, th, rings_n = 4, base = 88) {
  const out = []
  // One soft glow underneath, then the stroked circles on top of it. Filled
  // discs compound badly: four of them over a dark background read as one
  // bright blob, and `base + i * 4` could pass 100% — a negative alpha that
  // browsers silently clamp. A single low-opacity disc plus hairline circles
  // gives the same "lit from a corner" feel and stays predictable.
  out.push(
    shape({
      shape: 'ellipse',
      x: cx - r,
      y: cy - r,
      w: r * 2,
      h: r * 2,
      fill: th.accent,
      transparency: 92,
    }),
  )
  for (let i = rings_n; i >= 2; i--) {
    const rr = (r * i) / rings_n
    out.push(
      shape({
        shape: 'ellipse',
        x: cx - rr,
        y: cy - rr,
        w: rr * 2,
        h: rr * 2,
        fill: null,
        line: { color: th.accent, width: 1, transparency: base + (rings_n - i) * 4 },
      }),
    )
  }
  // one crisp ring line on top — this is what makes it read as designed
  out.push(
    shape({
      shape: 'ellipse',
      x: cx - r * 0.62,
      y: cy - r * 0.62,
      w: r * 1.24,
      h: r * 1.24,
      fill: th.bg,
      transparency: 100,
      line: { color: th.accent, width: 1, transparency: 55 },
    }),
  )
  return out
}

// (The faceted-plate ornament was retired — the deck now carries a single
// recurring mark, the concentric rings, with nothing stacked on top of it.)

// The left accent rail: a tall bar plus a short, brighter cap. The deck's
// handshake between the cover and every section divider.
function rail(th) {
  return [
    shape({ x: 0, y: 0, w: 0.16, h: CANVAS.H, fill: th.accent2, transparency: 62 }),
    shape({ x: 0.16, y: 0, w: 0.09, h: 2.9, fill: th.accent }),
  ]
}

/* -------------------------------------------------------- shared blocks ---- */

// The recurring footnote: hairline, course label, page numeral. Kept identical
// on every slide so the eye learns it once.
function footnote(th, meta, page, th_label) {
  const label = (meta.course || meta.org || '').toUpperCase()
  return [
    rule({ x1: M, y1: FOOT_Y, x2: M + CW, y2: FOOT_Y, color: th.line, width: 1 }),
    text({ x: M, y: FOOT_Y + 0.16, w: CW * 0.7, h: 0.34, text: label, ...T.label, color: quiet(th), font: th.bodyFont }),
    text({ x: M + CW - 1.2, y: FOOT_Y + 0.12, w: 1.2, h: 0.4, text: String(page).padStart(2, '0'), size: 13, ...T.num, color: th.accent, font: th.numFont, align: 'right' }),
  ]
}

// Every content slide's heading block: a small accent square + uppercase label
// on one line, then the title. Same baseline everywhere.
function head(th, eyebrow, title, y = 0.78, tone) {
  const out = []
  if (eyebrow) {
    out.push(shape({ x: M, y: y + 0.07, w: 0.13, h: 0.13, fill: th.accent }))
    out.push(text({ x: M + 0.3, y: y - 0.02, w: 9, h: 0.3, text: eyebrow.toUpperCase(), ...T.label, color: tone || th.accent, font: th.bodyFont }))
  }
  out.push(text({ x: M - 0.04, y: eyebrow ? y + 0.3 : y, w: CW + 0.1, h: 0.62, text: title, ...T.head, color: ink(th), font: th.headFont }))
  return out
}

// A numeric chip — filled accent square with the figure sitting on it. The
// replacement for the old "every numeral is Impact at 46pt" habit.
function chip(x, y, s, n, th, tone) {
  return [
    shape({ shape: 'roundRect', x, y, w: s, h: s, fill: tone === 'quiet' ? th.bg2 : th.accent, radius: 0.16, line: tone === 'quiet' ? { color: th.line, width: 1 } : undefined }),
    text({ x, y: y + s * 0.06, w: s, h: s, text: String(n), size: s > 0.55 ? 19 : 13, ...T.num, color: tone === 'quiet' ? th.accent : th.accentInk, font: th.numFont, align: 'center', valign: 'middle' }),
  ]
}

// A ghost numeral: an oversized figure at very low opacity, bled off an edge.
// Depth without a gradient.
function ghost(n, x, y, size, th, opacity = 90) {
  return text({
    x, y, w: size / 40, h: size / 34, text: String(n).padStart(2, '0'),
    size, ...T.num, color: th.accent, font: th.numFont, transparency: opacity,
  })
}

/* ------------------------------------------------------------- the slides --- */

const LAYOUTS = {
  /* 1 — cover --------------------------------------------------------------- */
  title(d, th, meta) {
    return [
      // One signature only: the rings sweep in from the top-right and bleed off
      // the corner. The text column stops well short of them.
      ...rings(12.9, 0.5, 3.6, th, 5, 84),
      ...rail(th),
      text({ x: 1.15, y: 1.6, w: 8.0, h: 0.3, text: (d.eyebrow || meta.course || '').toUpperCase(), ...T.label, color: th.accent, font: th.bodyFont }),
      text({ x: 1.1, y: 2.04, w: 8.0, h: 1.9, text: d.title || 'Presentation Title', ...T.display, size: 46, lineSpacing: 52, color: ink(th), font: th.headFont }),
      ...(d.subtitle
        ? [text({ x: 1.14, y: 4.06, w: 7.0, h: 0.7, text: d.subtitle, ...T.lead, size: 15, color: quiet(th), font: th.bodyFont })]
        : []),
      shape({ x: 1.14, y: 4.94, w: 1.5, h: 0.045, fill: th.accent }),
      text({
        x: 1.14, y: 5.22, w: 7.8, h: 0.9,
        text: [d.author, d.org, d.date].filter(Boolean).join('     ·     '),
        size: 12, font: th.bodyFont, color: quiet(th),
      }),
    ]
  },

  /* 2 — agenda -------------------------------------------------------------- */
  agenda(d, th, meta, page) {
    const items = (d.items || []).slice(0, 8)
    const cols = items.length > 5 ? 2 : 1
    const per = Math.ceil(items.length / cols)
    const colW = cols === 2 ? 5.5 : CW
    const out = [...rings(12.6, 6.9, 2.2, th), ...head(th, 'Contents', d.title || 'Agenda')]
    items.forEach((it, i) => {
      const c = Math.floor(i / per)
      const r = i % per
      const x = M + c * (CW / 2 + 0.35)
      const y = BODY_TOP + 0.1 + r * (cols === 2 ? 0.82 : 0.84)
      out.push(...chip(x, y - 0.03, 0.42, i + 1, th, 'quiet'))
      out.push(text({ x: x + 0.62, y: y - 0.02, w: colW - 0.7, h: 0.42, text: it, size: 14.5, font: th.headFont, color: ink(th), valign: 'middle' }))
      if (r < per - 1) out.push(rule({ x1: x, y1: y + 0.62, x2: x + colW - 0.3, y2: y + 0.62, color: th.line, width: 1 }))
    })
    return [...out, ...footnote(th, meta, page)]
  },

  /* 3 — numbered index (big ghost numeral + detail rows) -------------------- */
  indexBig(d, th, meta, page) {
    const items = (d.items || []).slice(0, 3)
    const out = [...rings(11.9, 3.5, 3.0, th), ...head(th, d.eyebrow, d.title)]
    const top = BODY_TOP + 0.18
    const step = 1.34
    items.forEach((it, i) => {
      const y = top + i * step
      out.push(ghost(i + 1, M - 0.06, y - 0.44, 54, th, 84))
      out.push(text({ x: M + 1.24, y: y - 0.02, w: 6.6, h: 0.36, text: (it.title || '').toUpperCase(), size: 14, ...T.num, color: ink(th), font: th.bodyFont, spacing: 1.2 }))
      out.push(text({ x: M + 1.24, y: y + 0.36, w: 6.9, h: 0.74, text: it.body || '', ...T.small, color: quiet(th), font: th.bodyFont }))
      if (i < items.length - 1) out.push(rule({ x1: M + 1.24, y1: y + 1.16, x2: M + CW - 3.6, y2: y + 1.16, color: th.line, width: 1 }))
    })
    return [...out, ...footnote(th, meta, page)]
  },

  /* 4 — section divider ----------------------------------------------------- */
  divider(d, th, meta, page, n) {
    const num = String(d.number ?? n ?? 1).padStart(2, '0')
    return [
      ...rings(11.9, 1.3, 3.4, th, 5, 86),
      ...rail(th),
      text({ x: 1.0, y: 1.62, w: 6, h: 2.6, text: num, size: 132, ...T.num, color: th.accent, font: th.numFont, transparency: 78 }),
      text({ x: 1.16, y: 3.5, w: 4, h: 0.3, text: 'SECTION', ...T.label, color: th.accent, font: th.bodyFont }),
      text({ x: 1.12, y: 3.84, w: 10.2, h: 1.5, text: d.title || 'Section', ...T.section, size: 40, lineSpacing: 48, color: ink(th), font: th.headFont }),
      ...(d.body
        ? [
            shape({ x: 1.16, y: 5.34, w: 0.9, h: 0.035, fill: th.accent2 }),
            text({ x: 1.16, y: 5.54, w: 9.2, h: 0.8, text: d.body, size: 13.5, font: th.bodyFont, color: quiet(th), lineSpacing: 20 }),
          ]
        : []),
      ...footnote(th, meta, page),
    ]
  },

  /* 5 — bullets ------------------------------------------------------------- */
  bullets(d, th, meta, page) {
    const items = (d.items || []).slice(0, 5)
    const out = [...rings(12.6, 6.9, 2.0, th), ...head(th, d.eyebrow, d.title)]
    items.forEach((it, i) => {
      const y = BODY_TOP + 0.1 + i * 0.9
      const title = it.title || it
      out.push(shape({ shape: 'roundRect', x: M + 0.02, y: y + 0.14, w: 0.1, h: 0.1, fill: th.accent, radius: 0.02 }))
      out.push(text({ x: M + 0.34, y: y - 0.02, w: CW - 0.4, h: 0.42, text: title, size: 15.5, font: th.headFont, bold: true, color: ink(th) }))
      if (it.body) out.push(text({ x: M + 0.34, y: y + 0.4, w: CW - 1.6, h: 0.42, text: it.body, ...T.small, color: quiet(th), font: th.bodyFont }))
    })
    return [...out, ...footnote(th, meta, page)]
  },

  /* 6 — two columns --------------------------------------------------------- */
  twoCol(d, th, meta, page) {
    const col = (c, x, w, tinted) => {
      const out = []
      if (tinted) out.push(shape({ shape: 'roundRect', x: x - 0.32, y: BODY_TOP, w: w + 0.64, h: 4.1, fill: th.bg2, radius: 0.04 }))
      out.push(shape({ x, y: BODY_TOP + 0.16, w: 0.7, h: 0.035, fill: tinted ? th.accent : th.accent2 }))
      out.push(text({ x, y: BODY_TOP + 0.34, w, h: 0.34, text: (c.heading || '').toUpperCase(), size: 12, ...T.num, color: ink(th), font: th.bodyFont, spacing: 1.4 }))
      out.push(text({ x, y: BODY_TOP + 0.84, w, h: 3.0, text: c.body || '', ...T.body, color: quiet(th), font: th.bodyFont }))
      return out
    }
    const halfW = (CW - 0.9) / 2
    return [
      ...head(th, d.eyebrow, d.title),
      ...col(d.left || {}, M, halfW, false),
      ...col(d.right || {}, M + halfW + 0.9, halfW, true),
      ...footnote(th, meta, page),
    ]
  },

  /* 7 — feature cards ------------------------------------------------------ */
  cards(d, th, meta, page) {
    const items = (d.items || []).slice(0, 3)
    const gap = 0.4
    const cw = (CW - gap * (items.length - 1)) / items.length
    const out = [...rings(12.6, 6.9, 2.2, th), ...head(th, d.eyebrow, d.title)]
    items.forEach((it, i) => {
      const x = M + i * (cw + gap)
      const y = BODY_TOP
      out.push(shape({ shape: 'roundRect', x, y, w: cw, h: 3.95, fill: th.bg2, radius: 0.05, line: { color: th.line, width: 1 } }))
      out.push(shape({ shape: 'roundRect', x, y, w: cw, h: 0.1, fill: th.accent, radius: 0.02, transparency: i === 0 ? 0 : 30 }))
      out.push(...chip(x + 0.36, y + 0.42, 0.6, i + 1, th))
      out.push(text({ x: x + 0.36, y: y + 1.24, w: cw - 0.72, h: 0.8, text: it.title || '', size: 17, font: th.headFont, bold: true, color: ink(th), lineSpacing: 21 }))
      out.push(text({ x: x + 0.36, y: y + 2.16, w: cw - 0.72, h: 1.5, text: it.body || '', ...T.small, color: quiet(th), font: th.bodyFont }))
    })
    return [...out, ...footnote(th, meta, page)]
  },

  /* 8 — headline statistics ------------------------------------------------- */
  stats(d, th, meta, page) {
    const items = (d.items || []).slice(0, 4)
    const gap = 0.32
    const cw = (CW - gap * (items.length - 1)) / items.length
    const out = [...head(th, d.eyebrow, d.title)]
    items.forEach((it, i) => {
      const x = M + i * (cw + gap)
      out.push(shape({ x, y: BODY_TOP + 0.34, w: cw, h: 0.035, fill: i === 0 ? th.accent : th.accent2, transparency: i === 0 ? 0 : 45 }))
      // The numeral's box is only as tall as the numeral: at 52pt a 1.5" box
      // left a visible hole before the label, which read as a misalignment.
      out.push(text({ x, y: BODY_TOP + 0.52, w: cw, h: 0.95, text: it.value || '', size: 52, ...T.num, color: ink(th), font: th.numFont, lineSpacing: 56 }))
      out.push(text({ x, y: BODY_TOP + 1.6, w: cw, h: 0.32, text: (it.label || '').toUpperCase(), ...T.label, color: th.accent, font: th.bodyFont }))
      if (it.body) out.push(text({ x, y: BODY_TOP + 2.02, w: cw, h: 1.0, text: it.body, ...T.small, color: quiet(th), font: th.bodyFont }))
    })
    return [...out, ...footnote(th, meta, page)]
  },

  /* 9 — timeline ------------------------------------------------------------ */
  timeline(d, th, meta, page) {
    const items = (d.items || []).slice(0, 5)
    const out = [...head(th, d.eyebrow, d.title)]
    const y = 4.1
    const x0 = M + 0.6
    const x1 = M + CW - 0.6
    const step = items.length > 1 ? (x1 - x0) / (items.length - 1) : 0
    out.push(rule({ x1: x0, y1: y, x2: x1, y2: y, color: th.line, width: 2 }))
    items.forEach((it, i) => {
      const x = x0 + i * step
      const up = i % 2 === 0
      out.push(rule({ x1: x, y1: y, x2: x, y2: up ? y - 0.34 : y + 0.34, color: th.accent2, width: 1 }))
      out.push(shape({ shape: 'ellipse', x: x - 0.11, y: y - 0.11, w: 0.22, h: 0.22, fill: th.bg, line: { color: th.accent, width: 2 } }))
      out.push(shape({ shape: 'ellipse', x: x - 0.045, y: y - 0.045, w: 0.09, h: 0.09, fill: th.accent }))
      out.push(text({ x: x - 1.2, y: up ? y - 0.72 : y + 0.42, w: 2.4, h: 0.3, text: (it.label || '').toUpperCase(), size: 11, ...T.num, color: th.accent, font: th.bodyFont, align: 'center', spacing: 1.2 }))
      out.push(text({ x: x - 1.3, y: up ? y - 1.5 : y + 0.76, w: 2.6, h: 0.74, text: it.title || '', size: 12.5, bold: true, color: ink(th), font: th.headFont, align: 'center', lineSpacing: 15 }))
    })
    return [...out, ...footnote(th, meta, page)]
  },

  /* 10 — comparison --------------------------------------------------------- */
  compare(d, th, meta, page) {
    const panel = (p, x, on) => {
      const out = []
      out.push(shape({ shape: 'roundRect', x, y: BODY_TOP, w: 5.5, h: 3.9, fill: on ? th.bg2 : th.bg, radius: 0.05, line: { color: on ? th.accent : th.line, width: on ? 1.5 : 1 } }))
      out.push(shape({ x: x + 0.42, y: BODY_TOP + 0.4, w: 0.55, h: 0.035, fill: on ? th.accent : th.accent2, transparency: on ? 0 : 50 }))
      out.push(text({ x: x + 0.42, y: BODY_TOP + 0.58, w: 4.6, h: 0.36, text: (p.heading || '').toUpperCase(), size: 13, ...T.num, color: on ? th.accent : quiet(th), font: th.bodyFont, spacing: 1.4 }))
      const lines = (p.items || []).map((t) => t).join('\n')
      out.push(text({ x: x + 0.42, y: BODY_TOP + 1.14, w: 4.7, h: 2.5, text: lines, size: 12.5, color: on ? ink(th) : quiet(th), font: th.bodyFont, lineSpacing: 27 }))
      return out
    }
    const midX = M + 5.5 + (CW - 11) / 2
    return [
      ...head(th, d.eyebrow, d.title),
      ...panel(d.left || {}, M, false),
      ...panel(d.right || {}, M + CW - 5.5, true),
      shape({ shape: 'ellipse', x: midX - 0.19, y: BODY_TOP + 1.95, w: 0.78, h: 0.78, fill: th.accent }),
      text({ x: midX - 0.19, y: BODY_TOP + 1.95, w: 0.78, h: 0.78, text: 'VS', size: 15, ...T.num, color: th.accentInk, font: th.numFont, align: 'center', valign: 'middle' }),
      ...footnote(th, meta, page),
    ]
  },

  /* 11 — pull quote --------------------------------------------------------- */
  quote(d, th, meta, page) {
    return [
      ...rings(1.9, 1.5, 2.6, th),
      // Georgia's “ has a huge ascent, so the glyph is pushed down inside its
      // box to land the actual mark in the corner. At 132pt with the old box it
      // hung into the quotation below it.
      text({ x: 0.92, y: 1.62, w: 2.4, h: 1.5, text: '“', size: 104, bold: true, color: th.accent, font: th.headFont, transparency: 68, lineSpacing: 104 }),
      text({ x: 1.2, y: 2.5, w: 10.6, h: 2.6, text: d.text || '', size: 25, italic: true, color: ink(th), font: th.headFont, lineSpacing: 37 }),
      shape({ x: 1.24, y: 5.32, w: 1.2, h: 0.045, fill: th.accent }),
      text({ x: 1.24, y: 5.52, w: 10, h: 0.5, text: d.by || '', size: 13, ...T.num, color: th.accent, font: th.bodyFont, spacing: 0.8 }),
      ...footnote(th, meta, page),
    ]
  },

  /* 12 — numbered process --------------------------------------------------- */
  process(d, th, meta, page) {
    const items = (d.items || []).slice(0, 5)
    const gap = 0.28
    const cw = (CW - gap * (items.length - 1)) / items.length
    const out = [...head(th, d.eyebrow, d.title)]
    const y = BODY_TOP + 0.45
    items.forEach((it, i) => {
      const x = M + i * (cw + gap)
      // chevron strip, tapering to the right — the sequence itself is the shape
      out.push(shape({ shape: 'chevron', x, y, w: cw + gap * (i < items.length - 1 ? 0.22 : 0), h: 0.62, fill: th.accent, transparency: 8 + i * 14 }))
      out.push(text({ x: x + 0.28, y, w: cw - 0.4, h: 0.62, text: String(i + 1).padStart(2, '0'), size: 17, ...T.num, color: th.accentInk, font: th.numFont, valign: 'middle' }))
      out.push(text({ x, y: y + 0.86, w: cw, h: 0.62, text: it.title || '', size: 13, bold: true, color: ink(th), font: th.headFont, lineSpacing: 16 }))
      if (it.body) out.push(text({ x, y: y + 1.54, w: cw, h: 1.2, text: it.body, size: 10.5, color: quiet(th), font: th.bodyFont, lineSpacing: 15 }))
    })
    return [...out, ...footnote(th, meta, page)]
  },

  /* 13 — radial hub --------------------------------------------------------- */
  radial(d, th, meta, page) {
    const items = (d.items || []).slice(0, 6)
    const out = [...head(th, d.eyebrow, d.title)]
    const cx = CANVAS.W / 2
    const cy = 4.5
    const rx = 2.7
    const ry = 1.62
    out.push(...rings(cx, cy, 2.1, th, 5, 88))
    out.push(shape({ shape: 'ellipse', x: cx - 1.12, y: cy - 1.12, w: 2.24, h: 2.24, fill: th.bg2, line: { color: th.accent, width: 1.5 } }))
    out.push(text({ x: cx - 1.12, y: cy - 0.4, w: 2.24, h: 0.8, text: (d.center || 'Core').toUpperCase(), size: 14, ...T.num, color: th.accent, font: th.bodyFont, align: 'center', valign: 'middle', spacing: 1.4 }))
    items.forEach((it, i) => {
      const a = (Math.PI * 2 * i) / items.length - Math.PI / 2
      const nx = cx + Math.cos(a) * rx
      const ny = cy + Math.sin(a) * ry
      out.push(rule({ x1: cx + Math.cos(a) * 1.05, y1: cy + Math.sin(a) * 0.8, x2: nx, y2: ny, color: th.accent2, width: 1 }))
      out.push(shape({ shape: 'ellipse', x: nx - 0.44, y: ny - 0.44, w: 0.88, h: 0.88, fill: th.accent, transparency: 10 }))
      out.push(text({ x: nx - 0.44, y: ny - 0.44, w: 0.88, h: 0.88, text: String(i + 1), size: 16, ...T.num, color: th.accentInk, font: th.numFont, align: 'center', valign: 'middle' }))
      const left = nx < cx
      out.push(text({ x: left ? nx - 3.3 : nx + 0.62, y: ny - 0.2, w: 2.6, h: 0.42, text: it.title || '', size: 11.5, bold: true, color: ink(th), font: th.bodyFont, align: left ? 'right' : 'left' }))
    })
    return [...out, ...footnote(th, meta, page)]
  },

  /* 14 — stepped pyramid ---------------------------------------------------- */
  pyramid(d, th, meta, page) {
    const items = (d.items || []).slice(0, 4)
    const out = [...head(th, d.eyebrow, d.title)]
    const n = items.length
    const baseY = 6.2
    const rowH = 0.98
    const maxW = 8.8
    items.forEach((it, i) => {
      const row = n - 1 - i
      const w = maxW * ((row + 1) / n)
      const x = (CANVAS.W - w) / 2
      const y = baseY - (i + 1) * rowH
      out.push(shape({ shape: 'trapezoid', x, y, w, h: rowH - 0.1, fill: i === n - 1 ? th.accent : th.accent2, transparency: i === n - 1 ? 0 : 20 + i * 16, line: { color: th.bg, width: 1 } }))
      out.push(text({ x, y: y + 0.2, w, h: rowH - 0.5, text: it.title || '', size: 13, bold: true, color: i === n - 1 ? th.accentInk : ink(th), font: th.headFont, align: 'center' }))
    })
    return [...out, ...footnote(th, meta, page)]
  },

  /* 15 — funnel ------------------------------------------------------------- */
  funnel(d, th, meta, page) {
    const items = (d.items || []).slice(0, 5)
    const out = [...head(th, d.eyebrow, d.title)]
    const n = items.length
    const top = BODY_TOP + 0.2
    const rowH = 0.86
    const maxW = 6.6
    const left = M
    items.forEach((it, i) => {
      const w = maxW * (1 - (i / (n + 0.4)) * 0.62)
      const y = top + i * rowH
      // Bars are anchored to the left margin and taper to the right, so the
      // detail text always has a fixed 3.4" column that stays inside the page.
      // Centring the bars (as this did) pushed the text off the right edge.
      out.push(shape({ shape: 'roundRect', x: left, y, w, h: rowH - 0.16, fill: th.accent, transparency: 6 + i * 16, radius: 0.04 }))
      out.push(text({ x: left + 0.3, y, w: w - 0.6, h: rowH - 0.16, text: it.title || '', size: 13, bold: true, color: th.accentInk, font: th.bodyFont, valign: 'middle' }))
      if (it.body) out.push(text({ x: left + maxW + 0.35, y, w: CW - maxW - 0.35, h: rowH - 0.16, text: it.body, size: 10.5, color: quiet(th), font: th.bodyFont, valign: 'middle' }))
    })
    return [...out, ...footnote(th, meta, page)]
  },

  /* 16 — closing ------------------------------------------------------------ */
  closing(d, th, meta, page) {
    return [
      ...rings(12.7, 7.0, 3.3, th, 5, 84),
      ...rail(th),
      text({ x: 1.15, y: 2.66, w: 6, h: 0.3, text: (d.eyebrow || 'Thank you').toUpperCase(), ...T.label, color: th.accent, font: th.bodyFont }),
      text({ x: 1.1, y: 3.06, w: 8.6, h: 1.4, text: d.title || 'Questions?', ...T.display, size: 46, lineSpacing: 54, color: ink(th), font: th.headFont }),
      ...(d.body ? [text({ x: 1.14, y: 4.6, w: 7.8, h: 0.9, text: d.body, size: 14, font: th.bodyFont, color: quiet(th), lineSpacing: 21 })] : []),
      ...footnote(th, meta, page),
    ]
  },
}

export const LAYOUT_IDS = Object.keys(LAYOUTS)

// Render one slide descriptor into its element list. `index` is the 1-based
// position in the deck, handed to layouts that number themselves.
export function renderSlide(slide, theme, meta, page, index) {
  const fn = LAYOUTS[slide.type] || LAYOUTS.bullets
  return fn(slide, theme, meta, page, index).filter(Boolean)
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
    case 'bullets': return { ...base, eyebrow: 'Key points', title: 'What matters here', items: [{ title: 'First idea', body: 'A sentence of supporting detail.' }, { title: 'Second idea', body: 'A sentence of supporting detail.' }, { title: 'Third idea', body: 'A sentence of supporting detail.' }] }
    case 'radial': return { ...base, eyebrow: 'Overview', title: 'How the parts connect', center: 'Core', items: [{ title: 'First' }, { title: 'Second' }, { title: 'Third' }, { title: 'Fourth' }, { title: 'Fifth' }] }
    case 'pyramid': return { ...base, eyebrow: 'Hierarchy', title: 'What builds on what', items: [{ title: 'Foundation' }, { title: 'Core skills' }, { title: 'Advanced' }, { title: 'Mastery' }] }
    case 'funnel': return { ...base, eyebrow: 'Funnel', title: 'From reach to result', items: [{ title: 'Reach', body: 'Everyone who saw it.' }, { title: 'Interest', body: 'Those who engaged.' }, { title: 'Intent', body: 'Those who tried it.' }, { title: 'Action', body: 'Those who converted.' }] }
    default: return { ...base, eyebrow: 'Slide', title: 'Slide heading', items: [{ title: 'First point', body: 'A sentence of detail.' }, { title: 'Second point', body: 'A sentence of detail.' }] }
  }
}
