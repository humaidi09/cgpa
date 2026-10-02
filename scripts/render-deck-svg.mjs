// Render every deck layout to a standalone SVG so the design can actually be
// looked at without a browser. Consumes the SAME element list the preview and
// the .pptx exporter use, so what these SVGs show is the real slide.
//
//   node --import ./scripts/register-hook.mjs scripts/render-deck-svg.mjs [themeId]
import { writeFileSync, mkdirSync } from 'node:fs'
import { CANVAS, renderSlide, blankSlide, LAYOUT_MENU } from '../src/tools/deck/layouts.js'
import { themeById } from '../src/tools/deck/themes.js'

const OUT = new URL('../tmp-deck-svg/', import.meta.url)
mkdirSync(OUT, { recursive: true })

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const fmt = (n) => Number(n).toFixed(3)

// One element list → the <g> contents of an SVG at a given pixel width.
function body(elements, theme, S) {
  const px = (v) => fmt(v * S)
  const parts = []

  for (const el of elements) {
    const op = el.transparency != null ? (1 - el.transparency / 100).toFixed(3) : '1'
    if (el.t === 'shape') {
      const fill = el.fill ? `#${el.fill}` : 'none'
      // Unfilled shapes still carry a stroke — the rings ornament is nothing
      // but stroked circles, and without this they render as invisible.
      const stroke =
        el.line && el.line.color
          ? ` stroke="#${el.line.color}" stroke-width="${fmt((el.line.width || 1) * 0.95)}"`
          : ''
      const cx = (el.x + el.w / 2) * S
      const cy = (el.y + el.h / 2) * S
      const rot = el.rotate ? ` transform="rotate(${el.rotate} ${fmt(cx)} ${fmt(cy)})"` : ''
      if (el.shape === 'ellipse') {
        parts.push(`<ellipse cx="${fmt(cx)}" cy="${fmt(cy)}" rx="${px(el.w / 2)}" ry="${px(el.h / 2)}" fill="${fill}"${stroke} opacity="${op}"${rot}/>`)
      } else if (el.shape === 'trapezoid' || el.shape === 'triangle' || el.shape === 'chevron') {
        const X = el.x * S, Y = el.y * S, W = el.w * S, H = el.h * S
        const pts =
          el.shape === 'trapezoid'
            ? `${fmt(X)},${fmt(Y + H)} ${fmt(X + W * 0.18)},${fmt(Y)} ${fmt(X + W * 0.82)},${fmt(Y)} ${fmt(X + W)},${fmt(Y + H)}`
            : el.shape === 'triangle'
            ? `${fmt(X + W / 2)},${fmt(Y)} ${fmt(X + W)},${fmt(Y + H)} ${fmt(X)},${fmt(Y + H)}`
            : `${fmt(X)},${fmt(Y)} ${fmt(X + W * 0.78)},${fmt(Y)} ${fmt(X + W)},${fmt(Y + H / 2)} ${fmt(X + W * 0.78)},${fmt(Y + H)} ${fmt(X)},${fmt(Y + H)} ${fmt(X + W * 0.22)},${fmt(Y + H / 2)}`
        parts.push(`<polygon points="${pts}" fill="${fill}"${stroke} opacity="${op}"/>`)
      } else {
        const rx = el.radius ? el.radius * Math.min(el.w, el.h) * S : 0
        parts.push(`<rect x="${px(el.x)}" y="${px(el.y)}" width="${px(el.w)}" height="${px(el.h)}" rx="${fmt(rx)}" fill="${fill}"${stroke} opacity="${op}"${rot}/>`)
      }
    } else if (el.t === 'line') {
      parts.push(`<line x1="${px(el.x1)}" y1="${px(el.y1)}" x2="${px(el.x2)}" y2="${px(el.y2)}" stroke="#${el.color || theme.line}" stroke-width="${fmt((el.width || 1) * 1.4)}" opacity="${op}"/>`)
    } else {
      // Two unit boundaries meet here and must not be crossed twice:
      //   font size / line spacing are in POINTS → user units = ×(96/72) = ×1.3333
      //   element x/y/w/h are in INCHES → user units = ×S (the same factor px() uses)
      const size = (el.size || 14) * 0.98 * 1.3333
      const anchor = el.align === 'center' ? 'middle' : el.align === 'right' ? 'end' : 'start'
      const ax = (el.align === 'center' ? el.x + el.w / 2 : el.align === 'right' ? el.x + el.w : el.x) * S
      const lines = String(el.text ?? '').split('\n')
      const lh = el.lineSpacing ? el.lineSpacing * 0.92 * 1.3333 : size * 1.24
      // Vertical placement mirrors TextEl: the first line's *box* starts at the
      // element's y (inches → units via ×S), and the glyph baseline sits ~0.80 em
      // below that, which is close enough to how CSS lays a line box out. The old
      // ×S on top double-scaled the y and the ×S on size inflated every glyph 96×.
      const blockH = lines.length * lh
      let top = el.y * S
      if (el.valign === 'middle') top = (el.y + el.h / 2) * S - blockH / 2
      else if (el.valign === 'bottom') top = (el.y + el.h) * S - blockH
      const baseline = top + size * 0.8
      const spacing = el.spacing ? ` letter-spacing="${fmt(el.spacing * 0.62)}"` : ''
      const weight = el.bold ? ' font-weight="700"' : ''
      const style = el.italic ? ' font-style="italic"' : ''
      const spans = lines
        .map((ln, i) => `<tspan x="${fmt(ax)}" y="${fmt(baseline + i * lh)}">${esc(ln) || ' '}</tspan>`)
        .join('')
      parts.push(
        `<text x="${fmt(ax)}" y="${fmt(baseline)}" fill="#${el.color || theme.ink}" opacity="${op}" font-family="${esc(el.font || theme.bodyFont)}" font-size="${fmt(size)}" text-anchor="${anchor}"${weight}${style}${spacing}>${spans}</text>`,
      )
    }
  }
  return parts.join('\n')
}

const themeId = process.argv[2] || 'fjord'
const theme = themeById(themeId)
const meta = { author: 'Humaidi', org: 'Department of Computer Science', course: 'CSE 2101 · Algorithms' }
const W = 1280
const S1 = W / CANVAS.W
const VW = CANVAS.W * 96
const VH = CANVAS.H * 96

const rendered = LAYOUT_MENU.map((m, i) => {
  const scene = blankSlide(m.type, i + 1)
  const els = renderSlide(scene, theme, meta, i + 1, i + 1)
  return { name: `deck-${String(i + 1).padStart(2, '0')}-${m.type}.svg`, body: body(els, theme, S1) }
})

for (const r of rendered) {
  writeFileSync(
    new URL(r.name, OUT),
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${(CANVAS.H / CANVAS.W) * W}" viewBox="0 0 ${VW} ${VH}">
<rect width="${VW}" height="${VH}" fill="#${theme.bg}"/>
${r.body}
</svg>`,
  )
}

// Contact sheet — all sixteen judged as one deck.
const cols = 4
const cols2 = Math.ceil(rendered.length / cols)
const tw = 440
const th2 = tw * (CANVAS.H / CANVAS.W)
const pad = 14
const tiles = rendered
  .map((r, i) => {
    const c = i % cols
    const row = Math.floor(i / cols)
    const x = pad + c * (tw + pad)
    const y = pad + row * (th2 + pad)
    return `<svg x="${x}" y="${y}" width="${tw}" height="${th2}" viewBox="0 0 ${VW} ${VH}">
<rect width="${VW}" height="${VH}" fill="#${theme.bg}"/>
${r.body}
</svg>
<text x="${x + 4}" y="${y - 3}" font-family="Segoe UI" font-size="11" fill="#7f8a99">${esc(r.name.replace('deck-', '').replace('.svg', ''))}</text>`
  })
  .join('\n')
const sheetW = cols * (tw + pad) + pad
const sheetH = cols2 * (th2 + pad) + pad
writeFileSync(
  new URL('contact-sheet.svg', OUT),
  `<svg xmlns="http://www.w3.org/2000/svg" width="${sheetW}" height="${sheetH}" viewBox="0 0 ${sheetW} ${sheetH}"><rect width="${sheetW}" height="${sheetH}" fill="#05070a"/>${tiles}</svg>`,
)

console.log(`theme: ${themeId} — wrote ${rendered.length} SVGs + contact-sheet.svg (${Math.round(sheetW)}×${Math.round(sheetH)}) to tmp-deck-svg/`)
