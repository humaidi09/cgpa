import { Award, CheckCircle2, Star, Trophy, TriangleAlert } from 'lucide-react'
import { classify } from '@/engine/cgpa'

// Display metadata for the honours band a CGPA falls into. The label always
// comes from the engine's classify() — this only chooses how to *show* it: an
// icon and a Badge tone (so the standing never rides on colour alone), plus a
// one-line explanation of where the band sits. Thresholds mirror classify().
export function classificationInfo(cgpa) {
  const label = classify(cgpa)
  if (cgpa >= 3.75)
    return { label, tone: 'ok', Icon: Trophy, blurb: 'The top band — a 3.75 CGPA or above.' }
  if (cgpa >= 3.25)
    return { label, tone: 'accent', Icon: Trophy, blurb: 'A strong standing, from 3.25 up to 3.75.' }
  if (cgpa >= 2.75)
    return { label, tone: 'accent', Icon: Award, blurb: 'A solid result, from 2.75 up to 3.25.' }
  if (cgpa >= 2.25)
    return { label, tone: 'warn', Icon: Star, blurb: 'Passing comfortably, from 2.25 up to 2.75.' }
  if (cgpa >= 2.0)
    return { label, tone: 'warn', Icon: CheckCircle2, blurb: 'A clear pass, from 2.00 up to 2.25.' }
  return { label, tone: 'bad', Icon: TriangleAlert, blurb: 'Below the 2.00 pass line.' }
}
