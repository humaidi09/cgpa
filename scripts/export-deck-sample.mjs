// Build one real .pptx from every deck layout (fjord theme) via the SAME
// export path the page uses, and write it to tmp-deck-svg/ for download.
import { writeFileSync } from 'node:fs'
import { buildDeckFile } from '../src/tools/deck/exportPptx.js'
import { themeById } from '../src/tools/deck/themes.js'
import { blankSlide, LAYOUT_MENU } from '../src/tools/deck/layouts.js'

const theme = themeById(process.argv[2] || 'fjord')
const meta = { author: 'Humaidi', org: 'Department of Computer Science', course: 'CSE 2101 · Algorithms' }
const slides = LAYOUT_MENU.map((m, i) => blankSlide(m.type, i + 1))

const bytes = await buildDeckFile({
  slides, theme, meta, transition: 'fade',
  title: 'Deck Preview', outputType: 'nodebuffer',
})
if (!bytes || bytes.length < 5000) throw new Error('export did not run')

const out = new URL('../tmp-deck-svg/deck-preview.pptx', import.meta.url)
writeFileSync(out, bytes)
console.log(`wrote ${out.pathname} — ${bytes.length} bytes, ${slides.length} slides, theme ${theme.id}`)
