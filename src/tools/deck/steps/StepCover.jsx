// Step 2 — Cover.
//
// The title slide, in plain language. Each field carries a short hint so a
// student knows what belongs where without having to preview to find out.

import { Card, Field, Input } from '@/components/ui'

export default function StepCover({ cover, onChange }) {
  const set = (k) => (e) => onChange(k, e.target.value)
  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-xl font-semibold text-ink">Your title slide</h2>
        <p className="mt-1 text-sm text-muted">
          This is the first slide everyone sees. Keep the title short enough to read at a glance.
        </p>
      </div>

      <Card className="p-5 sm:p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label="Course / topic tag"
            hint="Shown small, above the title — e.g. CSE 2101 · Algorithms"
            className="sm:col-span-2"
          >
            <Input value={cover.eyebrow} onChange={set('eyebrow')} placeholder="e.g. CSE 2101 · Algorithms" />
          </Field>

          <Field label="Title" hint="The one line that says what this is about." className="sm:col-span-2">
            <Input value={cover.title} onChange={set('title')} placeholder="e.g. Breadth-First Search, Explained" />
          </Field>

          <Field label="Subtitle" hint="Optional — a single line under the title." className="sm:col-span-2">
            <Input value={cover.subtitle} onChange={set('subtitle')} placeholder="e.g. Traversal, shortest paths, and where it breaks down" />
          </Field>

          <Field label="Your name">
            <Input value={cover.author} onChange={set('author')} placeholder="Your name" />
          </Field>

          <Field label="Department or course">
            <Input value={cover.org} onChange={set('org')} placeholder="e.g. Department of Computer Science" />
          </Field>

          <Field label="Date" hint="Free text — type it however you like." className="sm:col-span-2">
            <Input value={cover.date} onChange={set('date')} placeholder="e.g. October 2026" />
          </Field>
        </div>
      </Card>
    </div>
  )
}
