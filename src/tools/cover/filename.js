// Smart filename — turns the cover into a tidy, submission-ready file stem like
//   CSE2101_Assignment_Analysis_of_Sorting_Algorithms_Hussain_Ahmed
// It's only ever a suggestion: the creator regenerates it as fields change
// until the student edits it by hand, after which their name is left alone.

// Keep letters, numbers, and single underscores; collapse everything else.
const clean = (s, max = 40) =>
  String(s ?? '')
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')      // drop punctuation
    .trim()
    .replace(/[\s-]+/g, '_')       // spaces/dashes → underscore
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, max)

export function buildFilename(cover) {
  if (!cover) return 'cover-page'
  const parts = []

  const code = clean(cover.assignment?.courseCode, 12)
  if (code) parts.push(code)

  const type = clean(cover.assignment?.type, 20)
  if (type) parts.push(type)

  const title = clean(cover.assignment?.title, 40)
  if (title) parts.push(title)

  const student = clean(cover.students?.[0]?.name, 30)
  if (student) parts.push(student)

  const stem = parts.join('_')
  return stem || 'cover-page'
}

// Ensure a stem carries the right extension exactly once.
export function withExt(name, ext) {
  const stem = String(name || 'cover-page').replace(/\.(pdf|png|jpg|jpeg)$/i, '').trim() || 'cover-page'
  return `${stem}.${ext}`
}
