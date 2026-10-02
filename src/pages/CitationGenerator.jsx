import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Check, Copy, ListPlus, Quote, Trash2 } from 'lucide-react'
import { Button, Card, Field, Input, Segmented } from '@/components/ui'

// Citation Generator — turns a handful of source fields into a correctly
// punctuated reference in APA 7, MLA 9, or IEEE, and lets you stack several into
// a reference list you can copy at once. Self-contained: no network, no engine,
// just formatting. Saved only in this browser.

const STYLES = [
  { value: 'apa', label: 'APA 7' },
  { value: 'mla', label: 'MLA 9' },
  { value: 'ieee', label: 'IEEE' },
]
const TYPES = [
  { value: 'website', label: 'Website' },
  { value: 'journal', label: 'Journal article' },
  { value: 'book', label: 'Book' },
]
const STYLE_LABEL = Object.fromEntries(STYLES.map((x) => [x.value, x.label]))

const STYLE_NOTE = {
  apa: 'APA reference lists are alphabetised by the first author’s surname.',
  mla: 'MLA works-cited lists are alphabetised by the first author’s surname.',
  ieee: 'IEEE references are numbered in the order they’re first cited in your text.',
}

const rid = () => `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
const LS_KEY = 'cgpa:tools:citations:v1'

/* ----------------------------------------------------------- name handling --- */

const trimmed = (v) => (v || '').trim()

// "First M. Last" or "Last, First M." → parts. Robust to extra spaces.
function parseName(raw) {
  const str = trimmed(raw)
  if (!str) return null
  let first = '', middle = '', last = ''
  if (str.includes(',')) {
    const [l, rest = ''] = str.split(',').map((x) => x.trim())
    last = l
    const fp = rest.split(/\s+/).filter(Boolean)
    first = fp[0] || ''
    middle = fp.slice(1).join(' ')
  } else {
    const parts = str.split(/\s+/).filter(Boolean)
    last = parts.pop() || ''
    first = parts.shift() || ''
    middle = parts.join(' ')
  }
  return { first, middle, last }
}

const parseAuthors = (raw) =>
  trimmed(raw)
    .split(';')
    .map((x) => x.trim())
    .filter(Boolean)
    .map(parseName)
    .filter(Boolean)

// "Ada B." — first + middle reduced to initials.
const initialsOf = (n) =>
  [n.first, ...(n.middle ? n.middle.split(/\s+/) : [])]
    .filter(Boolean)
    .map((t) => `${t[0].toUpperCase()}.`)
    .join(' ')

const fullName = (n) => [n.first, n.middle, n.last].filter(Boolean).join(' ')
const inverted = (n) => {
  const fm = [n.first, n.middle].filter(Boolean).join(' ')
  return fm ? `${n.last}, ${fm}` : n.last
}

function apaAuthors(names) {
  const f = names.map((n) => `${n.last}, ${initialsOf(n)}`.replace(/,\s*$/, ''))
  if (f.length === 0) return ''
  if (f.length === 1) return f[0]
  if (f.length === 2) return `${f[0]}, & ${f[1]}`
  return `${f.slice(0, -1).join(', ')}, & ${f[f.length - 1]}`
}
function mlaAuthors(names) {
  if (names.length === 0) return ''
  if (names.length === 1) return inverted(names[0])
  if (names.length === 2) return `${inverted(names[0])}, and ${fullName(names[1])}`
  return `${inverted(names[0])}, et al.`
}
function ieeeAuthors(names) {
  const f = names.map((n) => `${initialsOf(n)} ${n.last}`.trim())
  if (f.length === 0) return ''
  if (f.length === 1) return f[0]
  if (f.length === 2) return `${f[0]} and ${f[1]}`
  return `${f.slice(0, -1).join(', ')}, and ${f[f.length - 1]}`
}

/* --------------------------------------------------------- citation builder -- */

// Italic runs are marked inline so the same string renders on screen (with <em>)
// and copies as clean plain text (markers stripped).
const it = (v) => `\u0001${v}\u0002`
const stripUrl = (u) => trimmed(u).replace(/^https?:\/\//i, '')

// Tidy the stray punctuation that optional, skipped fields leave behind.
const tidy = (s) =>
  s
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,])/g, '$1')
    .replace(/,\s*\./g, '.')
    .replace(/\.{2,}/g, '.')
    .replace(/,\s*,/g, ',')
    .trim()

function buildCitation(style, type, f) {
  const title = trimmed(f.title)
  if (!title) return ''
  const names = parseAuthors(f.authors)
  const year = trimmed(f.year)
  const site = trimmed(f.site)
  const url = trimmed(f.url)
  const publisher = trimmed(f.publisher)
  const city = trimmed(f.city)
  const edition = trimmed(f.edition)
  const journal = trimmed(f.journal)
  const vol = trimmed(f.volume)
  const issue = trimmed(f.issue)
  const pages = trimmed(f.pages)
  const doi = trimmed(f.doi)
  const accessed = trimmed(f.accessed)

  let out = ''

  if (style === 'apa') {
    const a = apaAuthors(names)
    if (type === 'website') {
      out += a ? `${a} ` : ''
      out += `(${year || 'n.d.'}). `
      out += a ? `${it(title)}. ` : `${it(title)}. `
      if (site) out += `${site}. `
      if (url) out += url
    } else if (type === 'book') {
      out += a ? `${a} ` : ''
      out += `(${year || 'n.d.'}). `
      out += it(title)
      if (edition) out += ` (${edition} ed.)`
      out += '. '
      if (publisher) out += `${publisher}.`
    } else {
      out += a ? `${a} ` : ''
      out += `(${year || 'n.d.'}). `
      out += `${title}. `
      if (journal) out += it(journal)
      if (vol) out += `, ${it(vol)}`
      if (issue) out += `(${issue})`
      if (pages) out += `, ${pages}`
      out += '.'
      if (doi) out += ` https://doi.org/${doi}`
    }
  } else if (style === 'mla') {
    const a = mlaAuthors(names)
    if (type === 'website') {
      out += a ? `${a}. ` : ''
      out += `“${title}.” `
      if (site) out += it(site)
      if (year) out += `, ${year}`
      if (url) out += `, ${stripUrl(url)}`
      out += '.'
      if (accessed) out += ` Accessed ${accessed}.`
    } else if (type === 'book') {
      out += a ? `${a}. ` : ''
      out += `${it(title)}. `
      if (publisher) out += `${publisher}, `
      if (year) out += `${year}`
      out += '.'
    } else {
      out += a ? `${a}. ` : ''
      out += `“${title}.” `
      if (journal) out += it(journal)
      if (vol) out += `, vol. ${vol}`
      if (issue) out += `, no. ${issue}`
      if (year) out += `, ${year}`
      if (pages) out += `, pp. ${pages}`
      out += '.'
    }
  } else {
    // ieee
    const a = ieeeAuthors(names)
    if (type === 'website') {
      out += a ? `${a}, ` : ''
      out += `“${title},” `
      if (site) out += it(site)
      if (year) out += `, ${year}`
      out += '. [Online]. Available: '
      out += url
    } else if (type === 'book') {
      out += a ? `${a}, ` : ''
      out += it(title)
      if (edition) out += `, ${edition} ed.`
      out += '. '
      if (city) out += `${city}: `
      if (publisher) out += publisher
      if (year) out += `, ${year}`
      out += '.'
    } else {
      out += a ? `${a}, ` : ''
      out += `“${title},” `
      if (journal) out += it(journal)
      if (vol) out += `, vol. ${vol}`
      if (issue) out += `, no. ${issue}`
      if (pages) out += `, pp. ${pages}`
      if (year) out += `, ${year}`
      out += '.'
    }
  }

  return tidy(out)
}

const toPlain = (marked) => marked.replace(/[\u0001\u0002]/g, '')

// Render a marked string: toggle italic on the sentinels.
function Formatted({ marked }) {
  const nodes = []
  const parts = marked.split(/([\u0001\u0002])/)
  let italic = false
  let key = 0
  for (const p of parts) {
    if (p === '\u0001') { italic = true; continue }
    if (p === '\u0002') { italic = false; continue }
    if (!p) continue
    nodes.push(italic ? <em key={key++}>{p}</em> : <span key={key++}>{p}</span>)
  }
  return <>{nodes}</>
}

/* ------------------------------------------------------------ field schema --- */

// Which fields each source type asks for, in form order. `year` is relabelled
// per type because a website's date reads differently from a book's year.
const FIELDS = {
  website: [
    { k: 'authors', label: 'Author(s)', placeholder: 'e.g. Ada Lovelace; Alan Turing', full: true, hint: 'Separate multiple authors with a semicolon (;). Leave blank if none.' },
    { k: 'title', label: 'Page title', placeholder: 'e.g. A Short History of Computing', full: true },
    { k: 'site', label: 'Website / publisher', placeholder: 'e.g. Encyclopaedia Britannica' },
    { k: 'year', label: 'Publication date', placeholder: 'e.g. 2026 or 5 Mar. 2026' },
    { k: 'url', label: 'URL', placeholder: 'https://…', full: true },
    { k: 'accessed', label: 'Date accessed (MLA, optional)', placeholder: 'e.g. 5 Mar. 2026' },
  ],
  journal: [
    { k: 'authors', label: 'Author(s)', placeholder: 'e.g. Ada Lovelace; Alan Turing', full: true, hint: 'Separate multiple authors with a semicolon (;).' },
    { k: 'title', label: 'Article title', placeholder: 'e.g. On computable numbers', full: true },
    { k: 'journal', label: 'Journal name', placeholder: 'e.g. Journal of Symbolic Logic', full: true },
    { k: 'year', label: 'Year', placeholder: 'e.g. 2026' },
    { k: 'volume', label: 'Volume', placeholder: 'e.g. 42' },
    { k: 'issue', label: 'Issue', placeholder: 'e.g. 3' },
    { k: 'pages', label: 'Pages', placeholder: 'e.g. 230–265' },
    { k: 'doi', label: 'DOI (optional)', placeholder: 'e.g. 10.1000/xyz123' },
  ],
  book: [
    { k: 'authors', label: 'Author(s)', placeholder: 'e.g. Ada Lovelace; Alan Turing', full: true, hint: 'Separate multiple authors with a semicolon (;).' },
    { k: 'title', label: 'Book title', placeholder: 'e.g. Introduction to Algorithms', full: true },
    { k: 'publisher', label: 'Publisher', placeholder: 'e.g. MIT Press' },
    { k: 'year', label: 'Year', placeholder: 'e.g. 2026' },
    { k: 'edition', label: 'Edition (optional)', placeholder: 'e.g. 3rd' },
    { k: 'city', label: 'City (IEEE, optional)', placeholder: 'e.g. Cambridge, MA' },
  ],
}

const BLANK = {
  authors: '', title: '', year: '', site: '', url: '', accessed: '',
  publisher: '', city: '', edition: '', journal: '', volume: '', issue: '', pages: '', doi: '',
}

/* ------------------------------------------------------------------ page ----- */

export default function CitationGenerator() {
  const [style, setStyle] = useState('apa')
  const [type, setType] = useState('website')
  const [f, setF] = useState(BLANK)
  const [copied, setCopied] = useState('')
  const [list, setList] = useState(() => {
    try {
      const raw = localStorage.getItem(LS_KEY)
      const parsed = raw ? JSON.parse(raw) : []
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(list))
    } catch {
      /* storage full or unavailable — the list simply won't persist */
    }
  }, [list])

  const set = (k, v) => setF((p) => ({ ...p, [k]: v }))

  const marked = useMemo(() => buildCitation(style, type, f), [style, type, f])
  const canBuild = trimmed(f.title).length > 0

  const copy = async (text, id) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(id)
      setTimeout(() => setCopied(''), 1800)
    } catch {
      /* clipboard blocked — no-op; the text is still visible to select */
    }
  }

  const add = () => {
    if (!canBuild) return
    setList((l) => [...l, { id: rid(), style, marked }])
  }

  const removeAt = (id) => setList((l) => l.filter((x) => x.id !== id))
  const clearList = () => {
    if (list.length === 0) return
    if (window.confirm('Clear the whole reference list? This can’t be undone.')) setList([])
  }

  const copyAll = () => {
    if (list.length === 0) return
    const text = list
      .map((x, i) => (x.style === 'ieee' ? `[${i + 1}] ${toPlain(x.marked)}` : toPlain(x.marked)))
      .join('\n\n')
    copy(text, 'all')
  }

  return (
    <div className="pb-10">
      {/* header */}
      <div className="mb-6">
        <Link to="/tools" className="mb-2 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-ink">
          <ArrowLeft className="h-4 w-4" />
          Student Tools
        </Link>
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">Citation Generator</h1>
        <p className="mt-1 max-w-xl text-sm text-muted">
          Enter a source once, switch between APA, MLA, and IEEE, and build a reference list you can copy in one go.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)]">
        {/* ---------------------------------------------------------- form ---- */}
        <div className="space-y-5">
          <Card className="p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="mb-1.5 font-mono text-xs text-muted">Style</p>
                <Segmented ariaLabel="Citation style" options={STYLES} value={style} onChange={setStyle} />
              </div>
              <div>
                <p className="mb-1.5 font-mono text-xs text-muted">Source type</p>
                <Segmented ariaLabel="Source type" options={TYPES} value={type} onChange={setType} />
              </div>
            </div>
          </Card>

          <Card className="p-5 sm:p-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {FIELDS[type].map((fld) => (
                <Field
                  key={fld.k}
                  label={fld.label}
                  hint={fld.hint}
                  className={fld.full ? 'sm:col-span-2' : undefined}
                >
                  <Input value={f[fld.k]} onChange={(e) => set(fld.k, e.target.value)} placeholder={fld.placeholder} />
                </Field>
              ))}
            </div>
          </Card>
        </div>

        {/* ------------------------------------------------------- preview ---- */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <div className="space-y-4">
            <Card className="p-5 sm:p-6">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="font-display text-lg font-semibold text-ink">{STYLE_LABEL[style]} reference</h2>
              </div>

              {canBuild ? (
                <p className="rounded-xl border border-hair bg-fill/60 p-4 pl-[calc(1rem+1.6em)] text-sm leading-relaxed text-ink [text-indent:-1.6em]">
                  <Formatted marked={marked} />
                </p>
              ) : (
                <p className="rounded-xl border border-dashed border-hair bg-fill/40 p-4 text-sm text-muted">
                  Add at least a title to see the formatted reference.
                </p>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                <Button onClick={() => copy(toPlain(marked), 'current')} disabled={!canBuild} className="flex-1">
                  {copied === 'current' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied === 'current' ? 'Copied' : 'Copy'}
                </Button>
                <Button variant="outline" onClick={add} disabled={!canBuild}>
                  <ListPlus className="h-4 w-4" />
                  Add to list
                </Button>
              </div>

              <p className="mt-3 text-xs leading-relaxed text-muted">
                {STYLE_NOTE[style]} Copying pastes as plain text — re-italicise titles in your document.
              </p>
            </Card>
          </div>
        </div>
      </div>

      {/* --------------------------------------------------- reference list -- */}
      <section className="mt-10">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl font-semibold text-ink">
            Reference list
            {list.length > 0 && <span className="ml-2 font-mono text-sm font-normal text-muted">({list.length})</span>}
          </h2>
          {list.length > 0 && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={copyAll}>
                {copied === 'all' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied === 'all' ? 'Copied' : 'Copy all'}
              </Button>
              <Button variant="ghost" size="sm" className="text-red-400 hover:bg-red-500/10" onClick={clearList}>
                <Trash2 className="h-4 w-4" />
                Clear
              </Button>
            </div>
          )}
        </div>

        {list.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-hair bg-fill/50 px-6 py-12 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-xl border border-hair bg-fill text-neonCyan">
              <Quote className="h-6 w-6" />
            </span>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted">
              Build a source above and choose <span className="text-ink">Add to list</span> to start a reference list.
              It’s saved in this browser so it’s here when you come back.
            </p>
          </div>
        ) : (
          <Card className="divide-y divide-hair/60">
            {list.map((item, i) => (
              <div key={item.id} className="flex items-start gap-3 p-4">
                <span className="mt-0.5 w-8 shrink-0 font-mono text-xs tabular-nums text-muted">
                  {item.style === 'ieee' ? `[${i + 1}]` : `${i + 1}.`}
                </span>
                <p className="min-w-0 flex-1 text-sm leading-relaxed text-ink">
                  <Formatted marked={item.marked} />
                  <span className="ml-2 align-middle font-mono text-[10px] uppercase tracking-wide text-muted">{STYLE_LABEL[item.style]}</span>
                </p>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => copy(toPlain(item.marked), item.id)}
                    title="Copy"
                    aria-label="Copy reference"
                    className="grid h-9 w-9 place-items-center rounded-lg border border-hair bg-fill text-muted transition-colors hover:border-neonCyan/40 hover:text-neonCyan"
                  >
                    {copied === item.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeAt(item.id)}
                    title="Remove"
                    aria-label="Remove reference"
                    className="grid h-9 w-9 place-items-center rounded-lg border border-hair bg-fill text-muted transition-colors hover:border-red-500/40 hover:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </Card>
        )}
      </section>
    </div>
  )
}
