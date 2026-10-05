// Slide editors shared by the wizard's steps.
//
// These were lifted out of the PresentationSlides page unchanged, so the deck
// engine keeps seeing exactly the same structures it always has. Only the labels
// a student reads were rewritten — "Point" became "Key point", and so on — so
// the code stays honest about its field names while the UI speaks plainly.

import { Plus, Trash2 } from 'lucide-react'
import { Button, Field, Input, Select, Textarea } from '@/components/ui'
import { LAYOUT_MENU } from './layouts'

export const labelFor = (type) => LAYOUT_MENU.find((m) => m.type === type)?.label || type

// A friendly name for each slide type, used in the "add a slide" picker where
// the engine's label ("Numbered index", "Radial hub") is too technical.
const FRIENDLY = {
  agenda: 'Agenda / contents',
  divider: 'Section divider',
  indexBig: 'Numbered points',
  bullets: 'Bullet points',
  cards: 'Three feature cards',
  stats: 'Big numbers',
  twoCol: 'Two columns',
  threeCol: 'Three columns',
  compare: 'Side-by-side comparison',
  quadrant: 'Four-box grid',
  process: 'Steps in order',
  verticalSteps: 'Steps down the page',
  timeline: 'Timeline',
  quote: 'Pull quote',
  radial: 'Items around a centre',
  pyramid: 'Layered pyramid',
  funnel: 'Funnel',
  bigStat: 'One big figure',
  table: 'Data table',
  keyFacts: 'Key facts list',
  progressBars: 'Progress bars',
  iconGrid: 'Icon grid',
}
export const friendlyFor = (type) => FRIENDLY[type] || labelFor(type)

// A compact description of the editable fields for each slide type, so an added
// slide gets a friendly form instead of raw structure. Field labels are what the
// student sees.
export const EDIT = {
  title: { fields: [['eyebrow', 'Course / topic tag'], ['title', 'Title'], ['subtitle', 'Subtitle']] },
  divider: { fields: [['number', 'Section number', 'num'], ['title', 'Heading'], ['body', 'Opening line', 'area']] },
  indexBig: {
    fields: [['eyebrow', 'Small label above'], ['title', 'Heading']],
    list: { k: 'items', label: 'Key points', item: [['title', 'Point'], ['body', 'Detail', 'area']] },
  },
  bullets: {
    fields: [['eyebrow', 'Small label above'], ['title', 'Heading']],
    list: { k: 'items', label: 'Key points', item: [['title', 'Point'], ['body', 'Detail', 'area']] },
  },
  cards: {
    fields: [['eyebrow', 'Small label above'], ['title', 'Heading']],
    list: { k: 'items', label: 'Cards', item: [['title', 'Title'], ['body', 'Body', 'area']], max: 3 },
  },
  process: {
    fields: [['eyebrow', 'Small label above'], ['title', 'Heading']],
    list: { k: 'items', label: 'Steps', item: [['title', 'Step'], ['body', 'Detail', 'area']] },
  },
  funnel: {
    fields: [['eyebrow', 'Small label above'], ['title', 'Heading']],
    list: { k: 'items', label: 'Stages', item: [['title', 'Stage'], ['body', 'Note']] },
  },
  pyramid: {
    fields: [['eyebrow', 'Small label above'], ['title', 'Heading']],
    list: { k: 'items', label: 'Levels (bottom first)', item: [['title', 'Level']] },
  },
  radial: {
    fields: [['eyebrow', 'Small label above'], ['title', 'Heading'], ['center', 'Centre label']],
    list: { k: 'items', label: 'Items around the centre', item: [['title', 'Item']] },
  },
  stats: {
    fields: [['eyebrow', 'Small label above'], ['title', 'Heading']],
    list: { k: 'items', label: 'Figures', item: [['value', 'Value'], ['label', 'Label'], ['body', 'Note', 'area']] },
  },
  timeline: {
    fields: [['eyebrow', 'Small label above'], ['title', 'Heading']],
    list: { k: 'items', label: 'Milestones', item: [['label', 'Label'], ['title', 'Title']] },
  },
  quote: { fields: [['text', 'Quote', 'area'], ['by', 'Attribution']] },
  agenda: { fields: [['title', 'Heading']], lines: { k: 'items', label: 'Items (one per line)' } },
  closing: { fields: [['eyebrow', 'Small label above'], ['title', 'Title'], ['body', 'Body', 'area']] },
  threeCol: {
    fields: [['eyebrow', 'Small label above'], ['title', 'Heading']],
    list: { k: 'items', label: 'Columns', item: [['title', 'Heading'], ['body', 'Body', 'area']], max: 3 },
  },
  quadrant: {
    fields: [['eyebrow', 'Small label above'], ['title', 'Heading']],
    list: { k: 'items', label: 'Boxes', item: [['title', 'Heading'], ['body', 'Body', 'area']], max: 4 },
  },
  verticalSteps: {
    fields: [['eyebrow', 'Small label above'], ['title', 'Heading']],
    list: { k: 'items', label: 'Steps', item: [['title', 'Step'], ['body', 'Detail', 'area']] },
  },
  iconGrid: {
    fields: [['eyebrow', 'Small label above'], ['title', 'Heading']],
    list: { k: 'items', label: 'Items', item: [['title', 'Label']], max: 8 },
  },
  bigStat: {
    fields: [['eyebrow', 'Small label above'], ['title', 'Heading'], ['value', 'The figure'], ['label', 'What it measures'], ['body', 'Explanation', 'area']],
  },
  keyFacts: {
    fields: [['eyebrow', 'Small label above'], ['title', 'Heading']],
    list: { k: 'items', label: 'Facts', item: [['label', 'Label'], ['value', 'Value']] },
  },
  progressBars: {
    fields: [['eyebrow', 'Small label above'], ['title', 'Heading']],
    list: { k: 'items', label: 'Bars (value 0–100)', item: [['label', 'Label'], ['value', 'Percent']] },
  },
}

/* ------------------------------------------------------------ list editor -- */

export function ListEditor({ spec, value, onChange, addLabel = 'Add' }) {
  const items = value || []
  const setItem = (i, k, v) => onChange(items.map((x, j) => (j === i ? { ...x, [k]: v } : x)))
  const add = () => onChange([...items, Object.fromEntries(spec.item.map(([k]) => [k, '']))])
  const remove = (i) => onChange(items.filter((_, j) => j !== i))
  const atMax = spec.max && items.length >= spec.max
  return (
    <div className="space-y-3">
      {items.map((it, i) => (
        <div key={i} className="rounded-xl border border-hair bg-fill/40 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-mono text-[11px] text-muted">#{i + 1}</span>
            <button
              type="button"
              onClick={() => remove(i)}
              aria-label="Remove"
              className="grid h-7 w-7 place-items-center rounded-lg text-muted transition-colors hover:bg-red-500/10 hover:text-red-400"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="space-y-2">
            {spec.item.map(([k, l, t]) => (
              <Input
                key={k}
                value={it[k] ?? ''}
                onChange={(e) => setItem(i, k, e.target.value)}
                placeholder={l}
              />
            ))}
          </div>
        </div>
      ))}
      {!atMax && (
        <Button type="button" variant="outline" size="sm" onClick={add}>
          <Plus className="h-4 w-4" />
          {addLabel}
        </Button>
      )}
    </div>
  )
}

/* ----------------------------------------------------------- extra editor -- */

export function ExtraEditor({ slide, onChange }) {
  const spec = EDIT[slide.type] || { fields: [['title', 'Title']] }
  const set = (k, v) => onChange({ ...slide, [k]: v })

  if (slide.type === 'table') {
    const head = slide.head || []
    const rows = slide.rows || []
    return (
      <div className="space-y-3">
        <Field label="Heading"><Input value={slide.title ?? ''} onChange={(e) => set('title', e.target.value)} placeholder="Heading" /></Field>
        <Field label="Columns" hint="One column name per line.">
          <Textarea
            value={head.join('\n')}
            onChange={(e) => set('head', e.target.value.split('\n'))}
            rows={3}
            placeholder={'Item\nBefore\nAfter'}
          />
        </Field>
        <Field label="Rows" hint="One row per line. Separate cells with a | bar.">
          <Textarea
            value={rows.map((r) => (Array.isArray(r) ? r.join(' | ') : r)).join('\n')}
            onChange={(e) => set('rows', e.target.value.split('\n').filter(Boolean).map((line) => line.split('|').map((c) => c.trim())))}
            rows={5}
            placeholder={'Speed | 3.1s | 0.9s\nCost | $1,200 | $740'}
          />
        </Field>
      </div>
    )
  }

  if (slide.type === 'twoCol' || slide.type === 'compare') {
    const isCmp = slide.type === 'compare'
    const side = (key) => {
      const col = slide[key] || {}
      return (
        <div className="space-y-2">
          <Input value={col.heading ?? ''} onChange={(e) => set(key, { ...col, heading: e.target.value })} placeholder="Heading" />
          {isCmp ? (
            <Textarea
              value={(col.items || []).join('\n')}
              onChange={(e) => set(key, { ...col, items: e.target.value.split('\n').filter(Boolean) })}
              placeholder="One item per line"
              rows={3}
            />
          ) : (
            <Textarea value={col.body ?? ''} onChange={(e) => set(key, { ...col, body: e.target.value })} placeholder="Body text" rows={4} />
          )}
        </div>
      )
    }
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div><p className="mb-1.5 font-mono text-xs text-muted">Left</p>{side('left')}</div>
        <div><p className="mb-1.5 font-mono text-xs text-muted">Right</p>{side('right')}</div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {(spec.fields || []).map(([k, l, t]) => (
        <Field key={k} label={l}>
          {t === 'area' ? (
            <Textarea value={slide[k] ?? ''} onChange={(e) => set(k, e.target.value)} rows={2} />
          ) : (
            <Input type={t === 'num' ? 'number' : 'text'} value={slide[k] ?? ''} onChange={(e) => set(k, t === 'num' ? Number(e.target.value) : e.target.value)} />
          )}
        </Field>
      ))}
      {spec.lines && (
        <Field label={spec.lines.label}>
          <Textarea
            value={(slide[spec.lines.k] || []).join('\n')}
            onChange={(e) => set(spec.lines.k, e.target.value.split('\n'))}
            rows={4}
          />
        </Field>
      )}
      {spec.list && (
        <div>
          <p className="mb-2 font-mono text-xs text-muted">{spec.list.label}</p>
          <ListEditor spec={spec.list} value={slide[spec.list.k]} onChange={(v) => set(spec.list.k, v)} addLabel={spec.list.addLabel} />
        </div>
      )}
    </div>
  )
}

// Re-exported so steps can build the "add a slide" picker from one source.
export { LAYOUT_MENU, Select }
