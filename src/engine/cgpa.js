// -----------------------------------------------------------------------------
// The academic calculation engine — the single source of truth for every GPA and
// CGPA figure in the app. Nothing here touches the DOM or React: it takes plain
// data (a grading profile + courses) and returns numbers. The UI only ever reads
// from these functions, so a displayed figure can never drift from the courses it
// was computed from.
//
// Precision rule (non-negotiable): all arithmetic runs at full float precision.
// Rounding happens once, at display time, through round()/fmt(). We never round
// an intermediate value and feed it back into another calculation.
//
// Safety rule: no function here can return NaN, Infinity, or undefined for a
// figure. When there is nothing valid to divide, a GPA/CGPA comes back as `null`
// and the UI renders it as an em dash — never a broken number.
// -----------------------------------------------------------------------------

/* ----------------------------------------------------------- grading profiles */

// Built-in grade systems. Each maps a letter grade to its grade point. These are
// real, published scales — not invented. `editable: false` marks a built-in so
// the UI won't rename or delete it (a user clones it into a custom scale
// instead). Grades are ordered high → low so selects read naturally.
const DEFAULT_BUILTIN_PROFILES = [
  {
    id: 'std-4',
    name: '4.00 Scale',
    scaleMax: 4,
    editable: false,
    grades: [
      { grade: 'A+', point: 4.0 },
      { grade: 'A', point: 3.75 },
      { grade: 'A-', point: 3.5 },
      { grade: 'B+', point: 3.25 },
      { grade: 'B', point: 3.0 },
      { grade: 'B-', point: 2.75 },
      { grade: 'C+', point: 2.5 },
      { grade: 'C', point: 2.25 },
      { grade: 'D', point: 2.0 },
      { grade: 'F', point: 0.0 },
    ],
  },
  {
    id: 'std-5',
    name: '5.00 Scale',
    scaleMax: 5,
    editable: false,
    grades: [
      { grade: 'A', point: 5.0 },
      { grade: 'B', point: 4.0 },
      { grade: 'C', point: 3.0 },
      { grade: 'D', point: 2.0 },
      { grade: 'E', point: 1.0 },
      { grade: 'F', point: 0.0 },
    ],
  },
]

// Live binding. applyRemoteData() may replace this with owner-edited scales
// (DB rows merged by id onto the defaults, so std-4/std-5 always survive). It's
// imported directly by the store selectors — an ESM live binding — so a
// reassignment here reaches them without any re-wiring.
export let BUILTIN_PROFILES = DEFAULT_BUILTIN_PROFILES

// The default scale's id is a contract: the store seeds and falls back to it,
// and its backup importer whitelists 'std-4'/'std-5'. Never make it editable.
export const DEFAULT_PROFILE_ID = 'std-4'

// A blank editable scale to seed a new custom profile from.
export function newCustomProfile(uid) {
  return {
    id: uid(),
    name: 'Custom scale',
    scaleMax: 4,
    editable: true,
    grades: [
      { grade: 'A', point: 4.0 },
      { grade: 'B', point: 3.0 },
      { grade: 'C', point: 2.0 },
      { grade: 'F', point: 0.0 },
    ],
  }
}

/* ----------------------------------------------------------------- lookups --- */

// The grade point for a letter within a profile, or null when the grade is empty
// or not part of the profile (e.g. a scale was switched under an entered grade).
export function pointOf(profile, grade) {
  if (!profile || grade == null || grade === '') return null
  const row = profile.grades.find((g) => g.grade === grade)
  return row ? Number(row.point) : null
}

/* ------------------------------------------------------------ course status - */

// A course's status decides how it enters the calculation. These are real
// registrar concepts, not invented — each changes the arithmetic in a specific,
// defensible way (see courseDetail). `gpa` = contributes grade points to the
// GPA/CGPA; `earns` = counts as earned credit toward completion.
export const COURSE_STATUSES = [
  { value: 'completed', label: 'Completed', short: 'Done', tone: 'ok', gpa: true, earns: true },
  { value: 'ongoing', label: 'In progress', short: 'Active', tone: 'accent', gpa: false, earns: false },
  { value: 'planned', label: 'Planned', short: 'Plan', tone: 'neutral', gpa: false, earns: false },
  { value: 'withdrawn', label: 'Withdrawn', short: 'W', tone: 'warn', gpa: false, earns: false },
  { value: 'pass-fail', label: 'Pass / Fail', short: 'P/F', tone: 'neutral', gpa: false, earns: true },
  { value: 'retaken', label: 'Retaken', short: 'Retake', tone: 'warn', gpa: null, earns: null },
]
export const DEFAULT_STATUS = 'completed'

const STATUS_BY_VALUE = new Map(COURSE_STATUSES.map((s) => [s.value, s]))
export function statusMeta(value) {
  return STATUS_BY_VALUE.get(value) || STATUS_BY_VALUE.get(DEFAULT_STATUS)
}
export function normalizeStatus(value) {
  return STATUS_BY_VALUE.has(value) ? value : DEFAULT_STATUS
}

// Retake policy — deliberately configurable, never assumed (institutions differ).
// A course marked "Retaken" is an earlier attempt the student later repeated;
// this setting decides whether that earlier attempt still counts.
export const RETAKE_POLICIES = [
  {
    value: 'replace',
    label: 'Grade replacement',
    hint: 'A retaken attempt is dropped — only the newer attempt counts toward your CGPA.',
  },
  {
    value: 'all',
    label: 'All attempts count',
    hint: 'Every attempt counts toward your CGPA, including ones you have retaken.',
  },
]
export const DEFAULT_RETAKE_POLICY = 'replace'

/* ---------------------------------------------------------- core formulas ---- */

// Quality points for one course = credit × grade point. The atom every higher
// figure is built from. Invalid input contributes nothing (returns 0), never NaN.
export function calculateQualityPoints(credit, point) {
  const cr = Number(credit)
  const pt = Number(point)
  if (!Number.isFinite(cr) || !Number.isFinite(pt) || cr <= 0) return 0
  return cr * pt
}

// Everything the UI needs to know about a single course row, resolved against
// the active profile and the retake policy. `valid`/`includedInGpa` means it
// contributes grade points to the GPA; `earnedCredits` counts toward completion
// (e.g. a passed Pass/Fail course earns credit but no grade points). `reason`
// explains, in the student's terms, why a row isn't counted — so an excluded
// course is never a silent mystery.
export function courseDetail(course, profile, policy = DEFAULT_RETAKE_POLICY) {
  const status = normalizeStatus(course?.status)
  const point = pointOf(profile, course?.grade)
  const cr = Number(course?.credits)
  const creditValid = Number.isFinite(cr) && cr > 0
  const hasGrade = point !== null
  const credits = creditValid ? cr : 0

  // Does this status feed the GPA at all? 'retaken' defers to the policy.
  let gpaEligible
  if (status === 'retaken') gpaEligible = policy === 'all'
  else gpaEligible = statusMeta(status).gpa === true

  const includedInGpa = gpaEligible && hasGrade && creditValid

  // Earned credit toward completion (not the GPA denominator).
  let earnedCredits = 0
  if (status === 'completed' || (status === 'retaken' && policy === 'all')) {
    if (creditValid && hasGrade && point > 0) earnedCredits = credits
  } else if (status === 'pass-fail') {
    // Passed unless an explicit failing grade was recorded.
    if (creditValid && !(hasGrade && point <= 0)) earnedCredits = credits
  }

  // Why a row isn't counted toward the GPA (null when it is).
  let reason = null
  if (!includedInGpa) {
    if (status === 'ongoing') reason = 'In progress — not counted yet'
    else if (status === 'planned') reason = 'Planned — not counted yet'
    else if (status === 'withdrawn') reason = 'Withdrawn — excluded'
    else if (status === 'pass-fail') reason = 'Pass / Fail — earns credit, no grade points'
    else if (status === 'retaken') reason = 'Retaken — excluded (grade replacement)'
    else if (!creditValid) reason = 'Add credit hours to count this'
    else if (!hasGrade) reason = 'Add a grade to count this'
  }

  return {
    status,
    point, // null when no/unknown grade
    credits,
    qualityPoints: includedInGpa ? point * cr : 0,
    includedInGpa,
    valid: includedInGpa, // kept for existing callers
    earnedCredits,
    hasGrade,
    creditValid,
    reason,
  }
}

// Pool a list of courses into one credit-weighted summary. This is the shared
// core: a semester GPA and a cumulative CGPA are the *same* calculation over a
// different pool of courses (never an average of averages).
//
//   GPA = Σ(credit × point) / Σ(credit)   — over GPA-eligible courses only
//
// `gpa` is null (not NaN) when no valid credits have been entered yet.
// `earnedCredits` counts credit toward completion (includes passed Pass/Fail);
// `distribution` tallies the grades that shaped the GPA; `excluded` is how many
// entered courses did not count.
export function summarizeCourses(courses, profile, policy = DEFAULT_RETAKE_POLICY) {
  const list = courses || []
  let credits = 0
  let qualityPoints = 0
  let counted = 0
  let earnedCredits = 0
  const dist = new Map()
  for (const c of list) {
    const d = courseDetail(c, profile, policy)
    earnedCredits += d.earnedCredits
    if (!d.includedInGpa) continue
    credits += d.credits
    qualityPoints += d.qualityPoints
    counted += 1
    dist.set(c.grade, (dist.get(c.grade) || 0) + 1)
  }
  const gpa = credits > 0 ? qualityPoints / credits : null
  const distribution = [...dist.entries()]
    .map(([grade, count]) => ({ grade, count, point: pointOf(profile, grade) }))
    .sort((a, b) => (b.point ?? -1) - (a.point ?? -1))
  return {
    credits,
    qualityPoints,
    gpa,
    counted,
    total: list.length,
    earnedCredits,
    distribution,
    excluded: list.length - counted,
  }
}

// Named entry points the product spec calls for. Both defer to summarizeCourses
// so there is exactly one formula in the codebase.
export function calculateSemesterGPA(courses, profile, policy = DEFAULT_RETAKE_POLICY) {
  return summarizeCourses(courses, profile, policy).gpa
}

export function calculateCGPA(semesters, profile, policy = DEFAULT_RETAKE_POLICY) {
  const all = (semesters || []).flatMap((s) => s.courses || [])
  return summarizeCourses(all, profile, policy).gpa
}

// Per-semester summaries plus the cumulative figure, in one pass for the UI.
// Callers pass the pool they want cumulative to cover (e.g. only non-archived
// semesters) — the engine treats every semester it's given as in scope.
export function summarizeSemesters(semesters, profile, policy = DEFAULT_RETAKE_POLICY) {
  const list = semesters || []
  const perSemester = list.map((s) => ({
    id: s.id,
    name: s.name,
    summary: summarizeCourses(s.courses, profile, policy),
  }))
  const cumulative = summarizeCourses(
    list.flatMap((s) => s.courses || []),
    profile,
    policy,
  )
  return { perSemester, cumulative }
}

/* ------------------------------------------------------------ presentation --- */

// Round for display only. Returns null (→ em dash) for anything non-finite, so a
// broken figure can never reach the screen.
export function round(n, precision = 2) {
  if (n === null || n === undefined || !Number.isFinite(Number(n))) return null
  const f = 10 ** precision
  return Math.round((Number(n) + Number.EPSILON) * f) / f
}

export function fmt(n, precision = 2) {
  if (n === null || n === undefined || !Number.isFinite(Number(n))) return '—'
  return Number(n).toFixed(precision)
}

// Credit hours are usually whole but may be fractional (1.5). Show up to two
// decimals with trailing zeros trimmed: "3" not "3.00", "1.5" not "1.50".
export function fmtCredits(n) {
  const v = Number(n)
  if (!Number.isFinite(v)) return '—'
  return String(Math.round(v * 100) / 100)
}

/* --------------------------------------------------------------- validation - */

// Credit-hour validation for a row. An empty field is not an error — the row is
// simply not counted yet. Returns a message string, or null when fine.
export function creditsError(credits) {
  if (credits === '' || credits == null) return null
  const n = Number(credits)
  if (!Number.isFinite(n)) return 'Enter a number'
  if (n < 0) return 'Must be 0 or more'
  if (n > 30) return 'That seems too high'
  return null
}

// Course codes that appear more than once in a scope (case-insensitive, trimmed).
export function duplicateCodes(courses) {
  const seen = new Map()
  for (const c of courses || []) {
    const code = (c.code || '').trim().toUpperCase()
    if (!code) continue
    seen.set(code, (seen.get(code) || 0) + 1)
  }
  return [...seen.entries()].filter(([, n]) => n > 1).map(([code]) => code)
}

// Non-blocking warnings for a scope of courses — surfaced near the result so the
// figure is always trustworthy even when some rows can't be counted. Status-aware:
// a Planned or Withdrawn course without a grade isn't a problem, and the duplicate
// code a retake intentionally creates isn't flagged.
export function scopeWarnings(courses, profile, policy = DEFAULT_RETAKE_POLICY) {
  const list = courses || []
  const warnings = []

  const badCredits = list.filter((c) => creditsError(c.credits)).length
  if (badCredits > 0) {
    warnings.push(
      `${badCredits} ${badCredits > 1 ? 'courses have' : 'course has'} invalid credit hours — fix to count ${badCredits > 1 ? 'them' : 'it'}.`,
    )
  }

  // A missing grade is only a problem on a course that is *meant* to count.
  const needGrade = list.filter((c) => courseDetail(c, profile, policy).reason === 'Add a grade to count this').length
  if (needGrade > 0) {
    warnings.push(
      `${needGrade} ${needGrade > 1 ? 'courses need a grade' : 'course needs a grade'} before ${needGrade > 1 ? 'they count' : 'it counts'}.`,
    )
  }

  // Duplicate codes among counted courses only (a retaken prior attempt shares a
  // code by design, so it shouldn't read as a mistake).
  const counted = list.filter((c) => courseDetail(c, profile, policy).includedInGpa)
  const dupes = duplicateCodes(counted)
  if (dupes.length > 0) {
    warnings.push(`Duplicate course code${dupes.length > 1 ? 's' : ''}: ${dupes.join(', ')}.`)
  }

  return warnings
}

/* ------------------------------------------------------------ classification */

// Honours bands for a CGPA on the standard 4.00 scale — the single ladder every
// classification reads (classify() here, and lib/classification's badge/blurb),
// so a threshold and the number quoted in its blurb can never drift apart. Bands
// run high → low; `min` is the inclusive cutoff and the first match wins.
// `tone`/`icon`/`blurb` are display hints the UI layer maps to a Badge tone and a
// lucide icon by name; `below` is the catch-all under every band. Kept in one
// place, as a live binding, so the whole ladder is owner-editable via
// applyRemoteData. The bands are the widely used UGC ranges — not invented — and
// are only meaningful on the 4.00 scale, so callers gate on the active profile.
const DEFAULT_CLASSIFICATION = {
  bands: [
    { min: 3.75, label: 'First Class', tone: 'ok', icon: 'trophy', blurb: 'The top band — a 3.75 CGPA or above.' },
    { min: 3.25, label: 'Very Good', tone: 'accent', icon: 'trophy', blurb: 'A strong standing, from 3.25 up to 3.75.' },
    { min: 2.75, label: 'Good', tone: 'accent', icon: 'award', blurb: 'A solid result, from 2.75 up to 3.25.' },
    { min: 2.25, label: 'Satisfactory', tone: 'warn', icon: 'star', blurb: 'Passing comfortably, from 2.25 up to 2.75.' },
    { min: 2.0, label: 'Pass', tone: 'warn', icon: 'check', blurb: 'A clear pass, from 2.00 up to 2.25.' },
  ],
  below: { label: 'Below pass', tone: 'bad', icon: 'warn', blurb: 'Below the 2.00 pass line.' },
}

export let CLASSIFICATION = DEFAULT_CLASSIFICATION

// The full honours band a CGPA falls into (label + display hints), or null for a
// non-finite figure. classify() and lib/classification both read this, so the
// label, tone, icon and blurb always agree.
export function classificationBand(cgpa) {
  if (!Number.isFinite(cgpa)) return null
  for (const b of CLASSIFICATION.bands) {
    if (cgpa >= b.min) return b
  }
  return CLASSIFICATION.below
}

export function classify(cgpa) {
  const band = classificationBand(cgpa)
  return band ? band.label : null
}

// =============================================================================
// PHASES 3–7 — analysis, planning, simulation, and academic intelligence.
//
// Everything below is derived: it reads the same raw courses and reuses the core
// (summarizeCourses / courseDetail / pointOf) so no GPA formula is ever written
// twice. Same rules as above — full precision, round only on display, and never
// return NaN/Infinity/undefined for a figure (use null → em dash instead). Every
// "score" has a transparent, documented formula. No invented data.
// =============================================================================

/* --------------------------------------------------------- shared atoms ----- */

const EPS = 1e-9
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)

// Grade-point bounds of a profile — the true ceiling/floor a real grade can hit.
export function maxPoint(profile) {
  const pts = (profile?.grades || []).map((g) => Number(g.point)).filter(Number.isFinite)
  return pts.length ? Math.max(...pts) : null
}
export function minPoint(profile) {
  const pts = (profile?.grades || []).map((g) => Number(g.point)).filter(Number.isFinite)
  return pts.length ? Math.min(...pts) : null
}

// The lowest letter grade whose point meets or clears `avg` — the grade you'd
// need in every remaining course to land an average. null when nothing clears it.
export function gradeForAverage(profile, avg) {
  const asc = (profile?.grades || [])
    .filter((g) => Number.isFinite(Number(g.point)))
    .sort((a, b) => a.point - b.point)
  for (const g of asc) if (Number(g.point) + EPS >= avg) return g
  return null
}

// The one blending atom for every "what would my CGPA become" question: pool the
// current standing with some added quality points over added credits. null-safe.
export function finalCGPAWith({ baseQualityPoints, baseCredits, addCredits = 0, addQualityPoints = 0 }) {
  const qp = Number(baseQualityPoints) || 0
  const cr = Number(baseCredits) || 0
  const ac = Number(addCredits) || 0
  const aqp = Number(addQualityPoints) || 0
  const total = cr + ac
  return total > 0 ? (qp + aqp) / total : null
}

/* ============================ PHASE 3 — ANALYTICS ========================== */

// Momentum from real semester GPAs (chronological). The slope is a least-squares
// fit of GPA against semester index — a genuine trend, not a guess. `delta` is
// simply last − first. Classified with a small dead-band so tiny wobble reads as
// "stable", not a false trend.
export function academicMomentum(points) {
  const ys = (points || []).map(Number).filter(Number.isFinite)
  const n = ys.length
  if (n < 2) return { trend: 'insufficient', slope: null, delta: null, n }
  const xbar = (n - 1) / 2
  const ybar = mean(ys)
  let num = 0
  let den = 0
  ys.forEach((y, i) => {
    num += (i - xbar) * (y - ybar)
    den += (i - xbar) ** 2
  })
  const slope = den > 0 ? num / den : 0
  const delta = ys[n - 1] - ys[0]
  const trend = slope > 0.05 ? 'improving' : slope < -0.05 ? 'declining' : 'stable'
  return { trend, slope, delta, n, first: ys[0], last: ys[n - 1] }
}

// The Phase 3 "Academic Overview" in one pass — every figure the page shows,
// straight from the core. Semesters that hold no counted course are ignored for
// trend/high/low so an empty term never distorts the story.
export function academicOverview(semesters, profile, policy = DEFAULT_RETAKE_POLICY) {
  // Archived semesters are excluded from the cumulative CGPA everywhere else
  // (the calculator, course impact, simulation), so the overview must exclude
  // them too — otherwise "current CGPA" would disagree between screens.
  const list = (semesters || []).filter((s) => !s.archived)
  const { perSemester, cumulative } = summarizeSemesters(list, profile, policy)
  const counted = perSemester.filter((p) => p.summary.gpa !== null)
  const points = counted.map((p) => ({ id: p.id, name: p.name, gpa: p.summary.gpa, credits: p.summary.credits }))
  const gpaSeq = points.map((p) => p.gpa)

  let highest = null
  let lowest = null
  for (const p of points) {
    if (!highest || p.gpa > highest.gpa) highest = p
    if (!lowest || p.gpa < lowest.gpa) lowest = p
  }

  return {
    cgpa: cumulative.gpa,
    totalCredits: cumulative.credits, // credits that carry grade points
    earnedCredits: cumulative.earnedCredits, // credits toward completion
    qualityPoints: cumulative.qualityPoints,
    countedCourses: cumulative.counted,
    semesterCount: list.length,
    countedSemesters: counted.length,
    points, // [{ id, name, gpa, credits }] chronological, counted only
    recent: points.length ? points[points.length - 1] : null,
    highest,
    lowest,
    momentum: academicMomentum(gpaSeq),
    distribution: cumulative.distribution, // [{ grade, count, point }]
    classification: classify(cumulative.gpa),
  }
}

/* ============================ PHASE 4 — PLANNING =========================== */

// What average must the remaining credits hit to reach a target CGPA?
//   needed = (target·(done+remaining) − pointsDone) / remaining
// Given the CGPA + completed credits, pointsDone is recovered exactly. Optional
// maxPoint/minPoint let the caller learn feasibility in the same call.
export function calculateRequiredGPA({ currentCGPA, completedCredits, remainingCredits, targetCGPA, maxPt = null, minPt = 0 }) {
  const cc = Math.max(0, Number(completedCredits) || 0)
  const rem = Number(remainingCredits)
  const cur = Number(currentCGPA)
  const target = Number(targetCGPA)
  if (!Number.isFinite(cur) || !Number.isFinite(target)) return { valid: false }
  const pointsDone = cur * cc
  if (!Number.isFinite(rem) || rem <= 0) {
    return { valid: true, needsRemaining: false, pointsDone, currentCGPA: cur, alreadyMet: cc > 0 && cur + EPS >= target }
  }
  const totalCredits = cc + rem
  const requiredRemainingQP = target * totalCredits - pointsDone
  const needed = requiredRemainingQP / rem
  const alreadyMet = cc > 0 && cur + EPS >= target
  const feasible = maxPt == null ? null : needed <= maxPt + EPS
  const guaranteed = minPt == null ? null : needed <= minPt + EPS
  return {
    valid: true,
    needsRemaining: true,
    pointsDone,
    currentCGPA: cur,
    totalCredits,
    requiredRemainingQP,
    needed,
    alreadyMet,
    feasible,
    guaranteed,
  }
}

// Best possible final CGPA — every remaining credit an A+ (maxPoint).
export function calculateCGPACeiling({ currentQualityPoints, completedCredits, remainingCredits, maxPt }) {
  return finalCGPAWith({
    baseQualityPoints: currentQualityPoints,
    baseCredits: completedCredits,
    addCredits: remainingCredits,
    addQualityPoints: (Number(remainingCredits) || 0) * (Number(maxPt) || 0),
  })
}

// Worst possible final CGPA — every remaining credit at minPoint (an F on a 4.0).
export function calculateCGPAFloor({ currentQualityPoints, completedCredits, remainingCredits, minPt = 0 }) {
  return finalCGPAWith({
    baseQualityPoints: currentQualityPoints,
    baseCredits: completedCredits,
    addCredits: remainingCredits,
    addQualityPoints: (Number(remainingCredits) || 0) * (Number(minPt) || 0),
  })
}

// How much room the target leaves for lower grades. `slack` is the quality points
// you can shed across the remaining credits and still land the target — expressed
// as: max remaining points, required remaining points, and their gap.
export function gradeBudget({ currentQualityPoints, completedCredits, remainingCredits, targetCGPA, maxPt }) {
  const cc = Math.max(0, Number(completedCredits) || 0)
  const rem = Number(remainingCredits)
  const qp = Number(currentQualityPoints) || 0
  const target = Number(targetCGPA)
  const mp = Number(maxPt)
  if (!Number.isFinite(rem) || rem <= 0 || !Number.isFinite(target) || !Number.isFinite(mp)) return { valid: false }
  const maxRemainingQP = rem * mp
  const requiredRemainingQP = target * (cc + rem) - qp
  const slack = maxRemainingQP - requiredRemainingQP // quality points you can afford to lose
  return {
    valid: true,
    maxRemainingQP,
    requiredRemainingQP,
    slack,
    // Slack re-expressed as credits of a straight-A+ you could "trade away" to an
    // F and still exactly hit target (a tangible budget).
    forgivableCredits: mp > 0 ? Math.max(0, slack) / mp : 0,
  }
}

// Mathematically valid grade combinations that reach `requiredAvg` across
// `courseCount` equally-weighted courses. Enumerates multisets of the profile's
// grades (pruned by an upper-bound test), returns the most efficient few — the
// ones that clear the bar with the least overkill. Not "you need 3.85": actual
// achievable grade sets.
export function goalToGrades({ requiredAvg, courseCount, profile, limit = 6 }) {
  const grades = (profile?.grades || [])
    .filter((g) => Number.isFinite(Number(g.point)))
    .map((g) => ({ grade: g.grade, point: Number(g.point) }))
    .sort((a, b) => b.point - a.point)
  const k = Math.max(0, Math.min(8, Math.round(Number(courseCount) || 0)))
  const need = Number(requiredAvg)
  if (k === 0 || !grades.length || !Number.isFinite(need)) return []

  const combos = []
  const target = need * k
  const rec = (start, chosen, sum) => {
    if (combos.length > 5000) return
    if (chosen.length === k) {
      if (sum + EPS >= target) combos.push({ picks: chosen.slice(), avg: sum / k })
      return
    }
    const remaining = k - chosen.length
    for (let i = start; i < grades.length; i++) {
      // grades desc ⇒ grades[i] is the best still selectable; if filling the rest
      // with it can't reach target, no later (lower) grade can either → skip.
      if (sum + remaining * grades[i].point + EPS < target) continue
      chosen.push(grades[i])
      rec(i, chosen, sum + grades[i].point)
      chosen.pop()
    }
  }
  rec(0, [], 0)

  // Most efficient first (closest to the bar), then fewest distinct grades.
  combos.sort((a, b) => a.avg - b.avg)
  return combos.slice(0, limit).map((c) => {
    const counts = new Map()
    for (const g of c.picks) counts.set(g.grade, (counts.get(g.grade) || 0) + 1)
    return {
      avg: c.avg,
      breakdown: [...counts.entries()].map(([grade, count]) => ({ grade, count })),
    }
  })
}

/* =========================== PHASE 5 — SIMULATION ========================== */

function applyOverrides(semesters, overrides) {
  if (!overrides) return semesters
  return (semesters || []).map((s) => ({
    ...s,
    courses: (s.courses || []).map((c) => (overrides[c.id] ? { ...c, ...overrides[c.id] } : c)),
  }))
}

// The heart of what-if: current CGPA vs a simulated one, and the exact difference.
// `overrides` is { [courseId]: patch } (change grades/credits/status); `extraCourses`
// bolts on a hypothetical future term. Both figures come from the same core, so a
// simulation can never disagree with the calculator.
export function simulateCGPA(semesters, { overrides, extraCourses, includeArchived = false } = {}, profile, policy = DEFAULT_RETAKE_POLICY) {
  const base = includeArchived ? semesters || [] : (semesters || []).filter((s) => !s.archived)
  const current = summarizeCourses(base.flatMap((s) => s.courses || []), profile, policy)
  let simCourses = applyOverrides(base, overrides).flatMap((s) => s.courses || [])
  if (Array.isArray(extraCourses) && extraCourses.length) simCourses = [...simCourses, ...extraCourses]
  const simulated = summarizeCourses(simCourses, profile, policy)
  const delta = simulated.gpa != null && current.gpa != null ? simulated.gpa - current.gpa : null
  return { current, simulated, delta }
}

// For every GPA-counted course: how much leverage it has on the CGPA. All exact.
//   perPointDelta = credit / totalCredits   (CGPA move per +1.0 grade point)
//   removeDelta   = how much the course currently lifts (or drags) the CGPA
//   gainToMax     = CGPA gain if this course were raised to the top grade
export function calculateCourseImpact(semesters, profile, policy = DEFAULT_RETAKE_POLICY) {
  const active = (semesters || []).filter((s) => !s.archived)
  const base = summarizeCourses(active.flatMap((s) => s.courses || []), profile, policy)
  const totalCredits = base.credits
  const cgpa = base.gpa
  const mp = maxPoint(profile)
  const items = []
  if (totalCredits > 0) {
    for (const s of active) {
      for (const c of s.courses || []) {
        const d = courseDetail(c, profile, policy)
        if (!d.includedInGpa) continue
        const withoutCr = totalCredits - d.credits
        const withoutGpa = withoutCr > 0 ? (base.qualityPoints - d.qualityPoints) / withoutCr : null
        items.push({
          id: c.id,
          code: c.code,
          name: c.name,
          semesterId: s.id,
          semesterName: s.name,
          credits: d.credits,
          grade: c.grade,
          point: d.point,
          qualityPoints: d.qualityPoints,
          perPointDelta: d.credits / totalCredits,
          removeDelta: withoutGpa != null ? cgpa - withoutGpa : null,
          gainToMax: mp != null && d.point != null ? ((mp - d.point) * d.credits) / totalCredits : null,
          atMax: d.point != null && mp != null && d.point >= mp - EPS,
        })
      }
    }
  }
  return { cgpa, totalCredits, maxPoint: mp, items }
}

// Retake / improvement analyzer. Respects the configured policy: under
// "replace", the earlier attempt is swapped out of the current standing; under
// "all", the new attempt is added on top (both count). Returns before/after CGPA
// and the net improvement, all from the same pooled arithmetic.
export function calculateRetakeImpact({ oldGrade, newGrade, credit, currentQualityPoints, completedCredits, profile, policy = DEFAULT_RETAKE_POLICY }) {
  const oldPt = pointOf(profile, oldGrade)
  const newPt = pointOf(profile, newGrade)
  const cr = Number(credit)
  const qp = Number(currentQualityPoints)
  const cc = Number(completedCredits)
  if (!Number.isFinite(cr) || cr <= 0 || !Number.isFinite(qp) || !Number.isFinite(cc) || cc <= 0 || oldPt == null || newPt == null) {
    return { valid: false }
  }
  const before = qp / cc
  let afterQP
  let afterCr
  if (policy === 'all') {
    afterQP = qp + newPt * cr
    afterCr = cc + cr
  } else {
    afterQP = qp - oldPt * cr + newPt * cr
    afterCr = cc
  }
  const after = afterCr > 0 ? afterQP / afterCr : null
  return {
    valid: true,
    oldPoint: oldPt,
    newPoint: newPt,
    credit: cr,
    qpDiff: (newPt - oldPt) * cr,
    before,
    after,
    improvement: after != null ? after - before : null,
    policy,
  }
}

/* ================= PHASE 6 — COURSE GRADE (weighted components) ============= */

// A course's internal grade from weighted components (Midterm 25%, Final 40%, …).
// Weights are % of the final grade; a component's score is the % achieved on it.
// Contribution = weight × score/100, in final-grade percentage points. Nothing is
// assumed about missing scores — they're simply "not yet done".
export function calculateComponentGrade(components) {
  const list = components || []
  let totalWeight = 0
  let completedWeight = 0
  let earned = 0 // final-grade points banked so far
  for (const c of list) {
    const w = Number(c.weight)
    if (!Number.isFinite(w) || w < 0) continue
    totalWeight += w
    const sc = Number(c.score)
    const has = c.score !== '' && c.score != null && Number.isFinite(sc)
    if (has) {
      completedWeight += w
      earned += (w * sc) / 100
    }
  }
  return {
    totalWeight,
    completedWeight,
    remainingWeight: totalWeight - completedWeight,
    earned,
    // Grade on the work done so far (earned as a share of graded weight).
    current: completedWeight > 0 ? (earned / completedWeight) * 100 : null,
    // Final grade if every remaining point were lost / earned.
    floor: earned,
    ceiling: earned + (totalWeight - completedWeight),
  }
}

// "What do I need on the remaining work to finish at `targetOverall`%?"
//   needed = (target − earned) / remainingWeight × 100
// Exact. Flags when the target is already locked in (needed ≤ 0) or out of reach
// (needed > 100).
export function calculateRequiredFinalScore({ components, targetOverall }) {
  const g = calculateComponentGrade(components)
  const target = Number(targetOverall)
  if (!Number.isFinite(target)) return { valid: false }
  if (g.remainingWeight <= EPS) {
    return { valid: true, noRemaining: true, projected: g.earned, met: g.earned + EPS >= target, ...g }
  }
  const needed = ((target - g.earned) / g.remainingWeight) * 100
  return {
    valid: true,
    noRemaining: false,
    needed,
    guaranteed: needed <= EPS,
    impossible: needed > 100 + EPS,
    ...g,
  }
}

/* ================= PHASE 7 — ADVANCED ACADEMIC INTELLIGENCE ================= */

// Consistency = how tightly semester GPAs cluster. Transparent: population
// standard deviation of the counted semester GPAs, plus a 0–100 score that maps
// SD linearly against a documented reference spread (REF grade points). The raw
// mean and SD are always shown alongside the score, so nothing is a black box.
const CONSISTENCY_REF = 0.5 // GPA-point SD treated as "high variability" → score 0
export function consistencyIndex(points) {
  const xs = (points || []).map(Number).filter(Number.isFinite)
  const n = xs.length
  if (n < 2) return { defined: false, n }
  const m = mean(xs)
  const variance = xs.reduce((a, b) => a + (b - m) ** 2, 0) / n
  const sd = Math.sqrt(variance)
  const score = Math.max(0, Math.min(100, 100 * (1 - sd / CONSISTENCY_REF)))
  return { defined: true, n, mean: m, variance, sd, score, ref: CONSISTENCY_REF }
}

// Recovery = how strongly performance rebounds after a dip. For each semester
// lower than the one before it, the rebound is the next semester's rise. Score =
// mean rebound ÷ mean drop, as a 0–100 figure (capped). Undefined when there are
// no dips to recover from — we don't invent a number.
export function recoveryIndex(points) {
  const xs = (points || []).map(Number).filter(Number.isFinite)
  const n = xs.length
  if (n < 3) return { defined: false, n }
  const drops = []
  const rebounds = []
  for (let i = 1; i < n - 1; i++) {
    const drop = xs[i - 1] - xs[i]
    if (drop > EPS) {
      drops.push(drop)
      rebounds.push(Math.max(0, xs[i + 1] - xs[i]))
    }
  }
  if (!drops.length) return { defined: false, n, noDips: true }
  const meanDrop = mean(drops)
  const meanRebound = mean(rebounds)
  const score = meanDrop > 0 ? Math.max(0, Math.min(100, (100 * meanRebound) / meanDrop)) : null
  return { defined: true, n, events: drops.length, meanDrop, meanRebound, score }
}

// CGPA inertia — why the CGPA gets harder to move as credits accrue. Uses the
// student's own numbers: the CGPA shift from one more credit at the top grade
// (perCreditUp) and at the bottom (perCreditDown), and the swing a full term of
// `termCredits` could still produce. All exact from finalCGPAWith.
export function cgpaInertia({ completedCredits, currentCGPA, maxPt, minPt = 0, termCredits = 15 }) {
  const cc = Math.max(0, Number(completedCredits) || 0)
  const cur = Number(currentCGPA)
  const mp = Number(maxPt)
  const lp = Number(minPt)
  if (!Number.isFinite(cur) || !Number.isFinite(mp) || cc <= 0) return { defined: false }
  const qp = cur * cc
  const moveUp = (dc, p) => finalCGPAWith({ baseQualityPoints: qp, baseCredits: cc, addCredits: dc, addQualityPoints: dc * p }) - cur
  return {
    defined: true,
    completedCredits: cc,
    currentCGPA: cur,
    perCreditUp: moveUp(1, mp),
    perCreditDown: moveUp(1, lp),
    termCredits,
    termMaxSwingUp: moveUp(termCredits, mp),
    termMaxSwingDown: moveUp(termCredits, lp),
  }
}

// Academic leverage — the changes with the biggest measurable payoff. Ranks the
// counted courses that aren't already maxed by the exact CGPA gain from lifting
// each to the top grade (gainToMax). No opinions, just arithmetic.
export function academicLeverage(semesters, profile, policy = DEFAULT_RETAKE_POLICY) {
  const impact = calculateCourseImpact(semesters, profile, policy)
  const opportunities = impact.items
    .filter((i) => !i.atMax && i.gainToMax != null && i.gainToMax > EPS)
    .sort((a, b) => b.gainToMax - a.gainToMax)
    .slice(0, 6)
  return { cgpa: impact.cgpa, totalCredits: impact.totalCredits, maxPoint: impact.maxPoint, opportunities }
}

// Academic fingerprint — a compact, fully-derived profile of how this student
// performs: trend (momentum), consistency, recovery, the credit-load they do best
// in (credit-weighted strength), and their most common grade. Every part traces
// to a function above; nothing here is decorative.
export function academicFingerprint(semesters, profile, policy = DEFAULT_RETAKE_POLICY) {
  const overview = academicOverview(semesters, profile, policy)
  const gpaSeq = overview.points.map((p) => p.gpa)

  // Credit-weighted strength: average grade point grouped by course credit size.
  const byCredit = new Map()
  for (const s of (semesters || []).filter((x) => !x.archived)) {
    for (const c of s.courses || []) {
      const d = courseDetail(c, profile, policy)
      if (!d.includedInGpa) continue
      const key = d.credits
      const g = byCredit.get(key) || { credits: key, points: 0, weight: 0, courses: 0 }
      g.points += d.point * d.credits
      g.weight += d.credits
      g.courses += 1
      byCredit.set(key, g)
    }
  }
  const creditStrength = [...byCredit.values()]
    .map((g) => ({ credits: g.credits, avgPoint: g.weight > 0 ? g.points / g.weight : null, courses: g.courses }))
    .sort((a, b) => b.credits - a.credits)

  const topGrade = overview.distribution.length
    ? overview.distribution.reduce((best, d) => (d.count > (best?.count ?? -1) ? d : best), null)
    : null

  return {
    cgpa: overview.cgpa,
    classification: overview.classification,
    momentum: overview.momentum,
    consistency: consistencyIndex(gpaSeq),
    recovery: recoveryIndex(gpaSeq),
    creditStrength,
    topGrade,
    strongest: overview.highest,
    weakest: overview.lowest,
  }
}

// -----------------------------------------------------------------------------
// Remote (owner-editable) content. The portfolio admin can edit two things for
// this app: the grading scales (`profiles`) and the honours ladder
// (`classification`). Everything is merged onto the bundled defaults with hard
// guards, so a missing, partial, or malformed payload always degrades to the
// built-in values — the calculator can never be blanked or made to divide by a
// bad scale. Course math (statuses, retake policy, every phase formula) is an
// engine invariant and is deliberately NOT remote.
// -----------------------------------------------------------------------------

const num = (v, fallback) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}
const str = (v, fallback) => (typeof v === 'string' && v.trim() ? v.trim() : fallback)

// Coerce a grades payload into clean [{ grade, point }] rows. Anything without a
// non-empty grade label and a finite point is dropped, so a scale can never
// carry a NaN point into a GPA.
function normalizeGrades(v) {
  const out = []
  for (const g of Array.isArray(v) ? v : []) {
    if (!g || typeof g !== 'object') continue
    const grade = str(g.grade, '')
    const point = Number(g.point)
    if (!grade || !Number.isFinite(point)) continue
    out.push({ grade, point })
  }
  return out
}

export function applyRemoteData(datasets) {
  if (!datasets || typeof datasets !== 'object') return

  // Grading scales — merge by id onto the bundled defaults. The two contract
  // scales (std-4/std-5) always survive (their name/points can be edited, they
  // can't be removed); genuinely new ids are appended as extra built-in scales.
  if (Array.isArray(datasets.profiles) && datasets.profiles.length) {
    const byId = new Map()
    for (const r of datasets.profiles) {
      if (r && typeof r === 'object') {
        const id = str(r.id, '')
        if (id) byId.set(id, r)
      }
    }
    const merged = DEFAULT_BUILTIN_PROFILES.map((p) => {
      const r = byId.get(p.id)
      if (!r) return p
      byId.delete(p.id)
      const grades = normalizeGrades(r.grades)
      return {
        id: p.id,
        name: str(r.name, p.name),
        scaleMax: num(r.scaleMax, p.scaleMax),
        editable: false,
        grades: grades.length ? grades : p.grades,
      }
    })
    for (const [id, r] of byId) {
      const grades = normalizeGrades(r.grades)
      if (!grades.length) continue // a new scale with no valid grades is useless
      merged.push({ id, name: str(r.name, id), scaleMax: num(r.scaleMax, 4), editable: false, grades })
    }
    BUILTIN_PROFILES = merged
  }

  // Honours ladder. Rows with a finite `min` are bands; a row with a blank/absent
  // `min` is the catch-all "below" band. Only replace the ladder when at least
  // one real band came through, so a bad payload keeps the bundled ranges.
  if (Array.isArray(datasets.classification) && datasets.classification.length) {
    const bands = []
    let below = DEFAULT_CLASSIFICATION.below
    for (const r of datasets.classification) {
      if (!r || typeof r !== 'object') continue
      const band = {
        label: str(r.label, ''),
        tone: str(r.tone, 'neutral'),
        icon: str(r.icon, 'award'),
        blurb: str(r.blurb, ''),
      }
      const min = Number(r.min)
      if (Number.isFinite(min)) bands.push({ ...band, min })
      else below = band
    }
    if (bands.length) {
      bands.sort((a, b) => b.min - a.min) // high → low so the first match wins
      CLASSIFICATION = { bands, below }
    }
  }
}
