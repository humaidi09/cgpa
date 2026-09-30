import { Award, CheckCircle2, Star, Trophy, TriangleAlert } from 'lucide-react'
import { classificationBand } from '@/engine/cgpa'

// Map a band's icon *name* (a plain string, so the whole band can live in the
// DB) to a lucide component. Unknown or missing names fall back to a neutral
// medal, so an edited/new band never renders a broken icon.
const ICONS = { trophy: Trophy, award: Award, star: Star, check: CheckCircle2, warn: TriangleAlert }

// Display metadata for the honours band a CGPA falls into. Label, tone, icon and
// blurb all come from the engine's single CLASSIFICATION ladder (classificationBand),
// so the number quoted in a blurb can never drift from the threshold that
// classifies — and the owner can edit both from one place. This only resolves the
// icon name to a component and supplies neutral fallbacks.
export function classificationInfo(cgpa) {
  const band = classificationBand(cgpa)
  if (!band) return { label: null, tone: 'neutral', Icon: Award, blurb: '' }
  return {
    label: band.label,
    tone: band.tone || 'neutral',
    Icon: ICONS[band.icon] || Award,
    blurb: band.blurb || '',
  }
}
