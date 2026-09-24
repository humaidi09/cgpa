// Validation — the one guardrail against a broken, half-empty cover page.
// Returns a list of concrete, user-facing problems; an empty list means the
// cover carries the minimum a real submission needs. Nothing here is invented —
// each check maps to a field the student actually filled (or didn't).

const has = (v) => typeof v === 'string' && v.trim().length > 0

// Ordered by where the field sits in the form, so the warning list reads
// top-to-bottom the same way the student scrolls.
export function validateCover(cover) {
  const missing = []
  if (!cover) return ['Nothing to generate yet.']

  if (!has(cover.university?.name)) missing.push('University name')
  if (!has(cover.assignment?.title)) missing.push('Assignment title')
  if (!has(cover.assignment?.courseName)) missing.push('Course name')

  const first = cover.students?.[0]
  if (!has(first?.name)) missing.push('Student name')
  if (!has(first?.studentId)) missing.push('Student ID')

  if (!has(cover.submittedTo?.name)) missing.push('Instructor name')

  return missing
}

export const isComplete = (cover) => validateCover(cover).length === 0
