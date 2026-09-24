import { withExt } from './filename'

// Export helpers for the cover document.
//
// jsPDF and html-to-image are heavy and only needed the instant a student
// exports, so they are dynamically imported here — they never enter the main
// bundle and never slow the calculator or any other page.

const A4 = { w: 794, h: 1123 } // px @96dpi === 210 x 297 mm

// Rasterise the natural-size document node to a PNG data URL at 3x for a crisp,
// print-ready image. `node` must be the .cd-page element (fixed A4 size).
async function renderPng(node) {
  const { toPng } = await import('html-to-image')
  return toPng(node, {
    pixelRatio: 3,
    backgroundColor: '#ffffff',
    width: A4.w,
    height: A4.h,
    // The document is typeset only in web-safe system fonts (Times/Georgia/
    // Cambria/Arial), so there are no web fonts to embed. Skipping font
    // inlining avoids a pointless CORS read of the app's remote Google Fonts
    // stylesheet (which only errors) and makes the capture faster.
    skipFonts: true,
    // neutralise any inherited transform/margin from ancestors (e.g. the
    // off-screen host) so the capture is exactly the page, edge to edge.
    style: { transform: 'none', margin: '0' },
    cacheBust: true,
  })
}

function triggerDownload(dataUrl, filename) {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
}

export async function downloadPNG(node, filename) {
  if (!node) throw new Error('The cover page is not ready yet.')
  const dataUrl = await renderPng(node)
  triggerDownload(dataUrl, withExt(filename || 'cover-page', 'png'))
}

export async function downloadPDF(node, filename) {
  if (!node) throw new Error('The cover page is not ready yet.')
  const dataUrl = await renderPng(node)
  const { default: jsPDF } = await import('jspdf')
  // A4 in millimetres. The PNG fills the page edge to edge — the document already
  // carries its own margins — so the PDF has no unwanted borders or clipping.
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  pdf.addImage(dataUrl, 'PNG', 0, 0, 210, 297, undefined, 'FAST')
  pdf.save(withExt(filename || 'cover-page', 'pdf'))
}

// Print relies on the @media print rules (in index.css): the on-screen capture
// host (#cover-print) is repositioned to the page and everything else is hidden,
// so the browser's own print-to-PDF produces the same A4 document.
export function printCover() {
  window.print()
}
