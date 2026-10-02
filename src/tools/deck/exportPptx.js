// Deck → .pptx exporter.
//
// The whole deck is drawn from real PowerPoint shapes and text boxes (never a
// flattened image), so once a student opens the file every colour, word and
// position is editable in PowerPoint. pptxgenjs is heavy and only needed at the
// moment of export, so it is dynamically imported here and stays out of the
// main bundle — the same pattern the cover tool uses for jsPDF.
//
// pptxgenjs has no gradient-fill API, so "depth" is built the same way the
// preview builds it: stacked translucent solid shapes. It also has no transition
// API at all, so after pptxgenjs writes the file we re-open the .pptx (it is just
// a zip of XML) and inject a standard OOXML <p:transition> into each slide. That
// element has been stable since Office 2007, and the whole step is wrapped so a
// transition tweak can never stop the download — on any hiccup we hand back the
// plain (un-transitioned) deck, which is still a complete, editable file.

import { CANVAS, renderSlide } from './layouts'

const IN = { w: CANVAS.W, h: CANVAS.H } // 13.333 x 7.5 in = 16:9
const hex = (c) => String(c).replace('#', '').toUpperCase()

// pptxgenjs shape enum names for the primitives the layouts emit.
const SHAPE = {
  rect: 'rect',
  roundRect: 'roundRect',
  ellipse: 'ellipse',
  trapezoid: 'trapezoid',
  triangle: 'triangle',
  chevron: 'chevron',
}

export const TRANSITIONS = [
  { value: 'fade', label: 'Fade' },
  { value: 'push', label: 'Push' },
  { value: 'wipe', label: 'Wipe' },
  { value: 'split', label: 'Split' },
  { value: 'cover', label: 'Cover' },
  { value: 'pull', label: 'Pull' },
  { value: 'none', label: 'None' },
]

const PPTX_MIME = 'application/vnd.openxmlformats-officedocument.presentationml.presentation'

// Our transition name → the inner OOXML element that names the effect. Each one
// carries the default direction PowerPoint itself uses for that effect.
const TRANSITION_XML = {
  fade: '<p:fade/>',
  push: '<p:push dir="l"/>',
  wipe: '<p:wipe dir="l"/>',
  split: '<p:split orient="horz" dir="out"/>',
  cover: '<p:cover dir="d"/>',
  pull: '<p:pull dir="r"/>',
}

// Re-open the written .pptx and add a transition to every slide. CT_Slide orders
// its children cSld → clrMapOvr → transition → timing, so the node is inserted
// right after clrMapOvr (falling back to just before </p:sld>), keeping the file
// schema-valid so PowerPoint opens it without a repair prompt.
async function applyTransitions(blob, transition, outputType = 'blob') {
  const inner = TRANSITION_XML[transition]
  if (!inner) return blob
  const node = `<p:transition spd="med">${inner}</p:transition>`
  try {
    const { default: JSZip } = await import('jszip')
    const zip = await JSZip.loadAsync(blob)
    const slides = Object.keys(zip.files).filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
    await Promise.all(
      slides.map(async (name) => {
        let xml = await zip.file(name).async('string')
        if (xml.includes('<p:transition')) return
        if (xml.includes('</p:clrMapOvr>')) xml = xml.replace('</p:clrMapOvr>', `</p:clrMapOvr>${node}`)
        else if (/<p:clrMapOvr\s*\/>/.test(xml)) xml = xml.replace(/<p:clrMapOvr\s*\/>/, (m) => m + node)
        else xml = xml.replace('</p:sld>', `${node}</p:sld>`)
        zip.file(name, xml)
      }),
    )
    return await zip.generateAsync({ type: outputType, mimeType: PPTX_MIME })
  } catch {
    // A transition is a nicety; never let it cost the student their download.
    return blob
  }
}

function addElement(slide, el, theme) {
  if (el.t === 'shape') {
    const opts = {
      x: el.x,
      y: el.y,
      w: el.w,
      h: el.h,
      fill: el.fill
        ? { color: hex(el.fill), transparency: el.transparency ?? 0 }
        : { color: hex(theme.bg), transparency: 100 },
    }
    if (el.line && el.line.color && el.line.width) {
      opts.line = { color: hex(el.line.color), width: el.line.width, transparency: el.line.transparency ?? 0 }
    }
    if (el.radius != null && (el.shape === 'roundRect' || !el.shape)) opts.rectRadius = el.radius
    if (el.rotate) opts.rotate = el.rotate
    if (el.shape === 'ellipse') slide.addShape('ellipse', opts)
    else if (el.shape === 'trapezoid') slide.addShape('trapezoid', opts)
    else if (el.shape === 'triangle') slide.addShape('triangle', opts)
    else if (el.shape === 'chevron') slide.addShape('chevron', opts)
    else slide.addShape(el.shape === 'roundRect' ? 'roundRect' : 'rect', opts)
    return
  }

  if (el.t === 'line') {
    slide.addShape('line', {
      x: el.x1,
      y: el.y1,
      w: el.x2 - el.x1,
      h: el.y2 - el.y1,
      line: { color: hex(el.color || theme.line), width: el.width || 1, transparency: el.transparency ?? 0 },
    })
    return
  }

  // text
  const opts = {
    x: el.x,
    y: el.y,
    w: el.w,
    h: el.h,
    fontSize: el.size || 14,
    color: hex(el.color || theme.ink),
    fontFace: el.font || theme.bodyFont,
    bold: !!el.bold,
    italic: !!el.italic,
    align: el.align || 'left',
    valign: el.valign || 'top',
    margin: 0,
    wrap: true,
    isTextBox: true,
  }
  if (el.spacing) opts.charSpacing = el.spacing
  if (el.lineSpacing) opts.lineSpacing = el.lineSpacing
  slide.addText(el.text ?? '', opts)
}

// One deck descriptor → a .pptx Blob. `slides` are scene descriptors; `theme`
// and `meta` shape every slide; `opts.transition` picks the slide transition.
// `outputType` is the pptxgenjs/JSZip output kind — 'blob' in the browser (the
// default), overridable for non-browser callers.
export async function buildDeckFile({ slides, theme, meta, transition = 'fade', title, outputType = 'blob' }) {
  const { default: PptxGenJS } = await import('pptxgenjs')
  const pptx = new PptxGenJS()
  pptx.defineLayout({ name: 'DECK169', width: IN.w, height: IN.h })
  pptx.layout = 'DECK169'
  pptx.title = title || 'Presentation'
  pptx.author = meta.author || ''
  pptx.company = meta.org || ''

  slides.forEach((scene, i) => {
    const slide = pptx.addSlide()
    slide.background = { color: hex(theme.bg) }
    for (const el of renderSlide(scene, theme, meta, i + 1)) addElement(slide, el, theme)
  })

  const blob = await pptx.write({ outputType })
  return applyTransitions(blob, transition, outputType)
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

export async function exportDeck(args) {
  const blob = await buildDeckFile(args)
  const safe = (args.title || 'presentation').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-').toLowerCase()
  downloadBlob(blob, `${safe || 'presentation'}.pptx`)
}
