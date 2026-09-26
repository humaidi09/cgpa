import Classic from './Classic'
import Minimal from './Minimal'
import Modern from './Modern'
import Formal from './Formal'
import CleanBorder from './CleanBorder'
import PlainText from './PlainText'

// The template registry. Order here is the order shown in the picker. Each entry
// is a distinct, submission-grade layout — no decorative variants padding the
// list. Adding a template later means adding one component + one row here.
export const TEMPLATES = [
  { id: 'classic', label: 'Classic University', desc: 'Centred crest and serif — the traditional title page.', Component: Classic },
  { id: 'minimal', label: 'Minimal Academic', desc: 'Left-aligned, airy, hairline rules — understated.', Component: Minimal },
  { id: 'modern', label: 'Modern Academic', desc: 'Slim accent band, coloured title — contemporary but sober.', Component: Modern },
  { id: 'formal', label: 'Formal Report', desc: 'Framed title and a bordered metadata table — official.', Component: Formal },
  { id: 'clean', label: 'Clean Border', desc: 'Content in a ruled keyline panel — a composed frame.', Component: CleanBorder },
  { id: 'plaintext', label: 'Plain Text', desc: 'Monospace typewriter skeleton with bracketed fields — only Submitted By boxed.', Component: PlainText },
]

export const templateById = (id) => TEMPLATES.find((t) => t.id === id) || TEMPLATES[0]
