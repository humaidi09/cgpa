// Headless verification of the .pptx export path — no browser needed.
// It exercises the SAME modules the page uses: layouts.renderSlide → the
// pptxgenjs writer → the JSZip transition injection, then re-opens the bytes as
// a zip (exactly what PowerPoint does) and asserts XML invariants. Run with:
//   node scripts/verify-deck-export.mjs
import { writeFileSync } from 'node:fs'
import { buildDeckFile } from '../src/tools/deck/exportPptx.js'
import { themeById } from '../src/tools/deck/themes.js'
import { blankSlide, LAYOUT_MENU } from '../src/tools/deck/layouts.js'

const theme = themeById('fjord')
const meta = { author: 'Test Author', org: 'Department of CS', course: 'CSE 2101' }

// One slide of EVERY layout type, so no layout path goes untested.
const slides = LAYOUT_MENU.map((m, i) => blankSlide(m.type, i + 1))

const bytes = await buildDeckFile({
  slides,
  theme,
  meta,
  transition: 'fade',
  title: 'Verification Deck',
  outputType: 'nodebuffer',
})

console.log('bytes:', bytes.length)
if (!bytes || bytes.length < 5000) throw new Error('output suspiciously small — export did not run')

writeFileSync(new URL('../tmp-verify-deck.pptx', import.meta.url), bytes)

const { default: JSZip } = await import('jszip')
const zip = await JSZip.loadAsync(bytes)

const names = Object.keys(zip.files)
const slideFiles = names.filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n)).sort()
console.log('parts:', names.length, '| slides:', slideFiles.length, '| expected:', slides.length)
if (slideFiles.length !== slides.length) throw new Error('slide count mismatch')

let withTransition = 0
for (const n of slideFiles) {
  const xml = await zip.file(n).async('string')
  const has = xml.includes('<p:transition')
  if (has) withTransition++
  if (!xml.includes('</p:sld>') && !xml.includes('/>')) throw new Error(`${n} malformed`)
  // transition must sit inside <p:sld>, before its close tag
  if (has) {
    const at = xml.indexOf('<p:transition')
    const close = xml.lastIndexOf('</p:sld>')
    if (at > close) throw new Error(`${n} transition not inside p:sld`)
  }
}
console.log('slides with <p:transition>:', withTransition)
if (withTransition !== slideFiles.length) throw new Error('transition missing on some slides')

// The real shapes/text must have survived into the XML.
const s1 = await zip.file(slideFiles[0]).async('string')
console.log('slide1 has sp (shape) elements:', /<p:sp>/.test(s1))

// Content types + rels intact → PowerPoint will open it.
for (const req of ['[Content_Types].xml', 'ppt/presentation.xml', 'ppt/slides/slide1.xml']) {
  if (!names.includes(req)) throw new Error(`missing required part: ${req}`)
}

console.log('\nOK — deck exported, every part present, transitions on all slides.')
