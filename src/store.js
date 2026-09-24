import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  BUILTIN_PROFILES,
  DEFAULT_PROFILE_ID,
  DEFAULT_RETAKE_POLICY,
  DEFAULT_STATUS,
  newCustomProfile,
  normalizeStatus,
} from '@/engine/cgpa'

// All entry data lives here and is persisted to localStorage, so a half-entered
// calculation survives a reload. The store holds only raw data — courses,
// semesters, the chosen grading profile, and UI preferences. Every GPA/CGPA
// figure is derived on read by the engine (src/engine/cgpa.js), never stored, so
// the numbers can't drift out of sync with the courses.

const uid = () =>
  globalThis.crypto?.randomUUID?.() ??
  `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

export const newCourse = (patch = {}) => ({
  id: uid(),
  code: '',
  name: '',
  credits: '',
  grade: '',
  status: DEFAULT_STATUS,
  ...patch,
})

const newSemester = (n, courses) => ({
  id: uid(),
  name: `Semester ${n}`,
  year: '',
  term: '',
  archived: false,
  courses: courses ?? [newCourse()],
})

// A realistic transcript (4.00 scale) for visitors who'd rather explore than
// type. Grades all exist on the built-in 4.00 scale.
const example = () => [
  {
    id: uid(),
    name: 'Year 1 · Semester 1',
    year: '1',
    term: '1',
    archived: false,
    courses: [
      { id: uid(), code: 'CSE101', name: 'Introduction to Programming', grade: 'A+', credits: 3, status: 'completed' },
      { id: uid(), code: 'MAT101', name: 'Calculus I', grade: 'A', credits: 3, status: 'completed' },
      { id: uid(), code: 'ENG101', name: 'English Composition', grade: 'B+', credits: 3, status: 'completed' },
      { id: uid(), code: 'PHY101', name: 'Physics I', grade: 'A-', credits: 4, status: 'completed' },
    ],
  },
  {
    id: uid(),
    name: 'Year 1 · Semester 2',
    year: '1',
    term: '2',
    archived: false,
    courses: [
      { id: uid(), code: 'CSE102', name: 'Data Structures', grade: 'A', credits: 3, status: 'completed' },
      { id: uid(), code: 'MAT102', name: 'Linear Algebra', grade: 'B+', credits: 3, status: 'completed' },
      { id: uid(), code: 'CSE103', name: 'Digital Logic Design', grade: 'A-', credits: 4, status: 'completed' },
      { id: uid(), code: 'STA101', name: 'Statistics', grade: 'B', credits: 3, status: 'completed' },
    ],
  },
]

// Clone a course list with fresh ids (for duplicating a semester / saving quick).
const cloneCourses = (courses) =>
  (courses || []).map((c) => ({ ...c, id: uid() }))

// Bring any course/semester up to the current shape (fills fields added in later
// versions), so imported or older-persisted data never renders as undefined.
// Unknown fields are preserved on purpose: a course carries an optional Phase-6
// workspace (meta / components / assignments / exams / resources / topics /
// notes), and that data must survive persist, import, and migration untouched.
const normalizeCourse = (c) => ({
  ...(c && typeof c === 'object' ? c : {}),
  id: c?.id || uid(),
  code: c?.code ?? '',
  name: c?.name ?? '',
  credits: c?.credits ?? '',
  grade: c?.grade ?? '',
  status: normalizeStatus(c?.status),
})

const normalizeSemester = (s, i = 0) => ({
  id: s?.id || uid(),
  name: s?.name ?? `Semester ${i + 1}`,
  year: s?.year ?? '',
  term: s?.term ?? '',
  archived: Boolean(s?.archived),
  courses: Array.isArray(s?.courses) && s.courses.length ? s.courses.map(normalizeCourse) : [newCourse()],
})

// Course actions target either a semester (by id) or the Quick scratch list
// (sid === 'quick'). This helper keeps that branch in one place.
const patchCourses = (state, sid, fn) => {
  if (sid === 'quick') {
    return { quick: { ...state.quick, courses: fn(state.quick.courses) } }
  }
  return {
    semesters: state.semesters.map((s) =>
      s.id === sid ? { ...s, courses: fn(s.courses) } : s,
    ),
  }
}

const swap = (arr, i, j) => {
  if (i < 0 || j < 0 || i >= arr.length || j >= arr.length) return arr
  const next = arr.slice()
  ;[next[i], next[j]] = [next[j], next[i]]
  return next
}

// Phase 6 course-workspace edits target a single course anywhere in the saved
// transcript (the workspace belongs to real transcript courses, not the Quick
// scratch list), so they locate it by id rather than needing a semester id.
const patchCourseById = (state, cid, fn) => ({
  semesters: state.semesters.map((s) => ({
    ...s,
    courses: (s.courses || []).map((c) => (c.id === cid ? fn(c) : c)),
  })),
})

// Bumped when the exported-file shape changes, independent of the localStorage
// persist version. Old backups still import via normalizeSemester.
const EXPORT_VERSION = 1

export const useStore = create(
  persist(
    (set, get) => ({
      /* -------- calculator surface -------- */
      mode: 'quick', // 'quick' | 'semester' | 'full'
      setMode: (mode) => set({ mode }),

      // Quick scratch calculator — an ephemeral single list, not part of the
      // saved transcript until the student saves it as a semester.
      quick: { courses: [newCourse()] },

      // The saved multi-semester transcript.
      semesters: [],
      activeSemesterId: null, // focus for 'semester' mode
      setActiveSemester: (id) => set({ activeSemesterId: id }),

      /* -------- grading profiles -------- */
      customProfiles: [],
      activeProfileId: DEFAULT_PROFILE_ID,
      setActiveProfile: (id) => set({ activeProfileId: id }),

      addCustomProfile: () =>
        set((s) => {
          const p = newCustomProfile(uid)
          return { customProfiles: [...s.customProfiles, p], activeProfileId: p.id }
        }),

      updateProfile: (id, patch) =>
        set((s) => ({
          customProfiles: s.customProfiles.map((p) =>
            p.id === id ? { ...p, ...patch } : p,
          ),
        })),

      removeProfile: (id) =>
        set((s) => ({
          customProfiles: s.customProfiles.filter((p) => p.id !== id),
          activeProfileId: s.activeProfileId === id ? DEFAULT_PROFILE_ID : s.activeProfileId,
        })),

      addGrade: (pid) =>
        set((s) => ({
          customProfiles: s.customProfiles.map((p) =>
            p.id === pid ? { ...p, grades: [...p.grades, { grade: '', point: '' }] } : p,
          ),
        })),

      updateGrade: (pid, index, patch) =>
        set((s) => ({
          customProfiles: s.customProfiles.map((p) =>
            p.id === pid
              ? { ...p, grades: p.grades.map((g, i) => (i === index ? { ...g, ...patch } : g)) }
              : p,
          ),
        })),

      removeGrade: (pid, index) =>
        set((s) => ({
          customProfiles: s.customProfiles.map((p) =>
            p.id === pid ? { ...p, grades: p.grades.filter((_, i) => i !== index) } : p,
          ),
        })),

      /* -------- semester actions -------- */
      addSemester: () =>
        set((s) => {
          const sem = newSemester(s.semesters.length + 1)
          return { semesters: [...s.semesters, sem], activeSemesterId: sem.id }
        }),

      removeSemester: (id) =>
        set((s) => {
          const semesters = s.semesters.filter((x) => x.id !== id)
          const activeSemesterId =
            s.activeSemesterId === id ? (semesters[0]?.id ?? null) : s.activeSemesterId
          return { semesters, activeSemesterId }
        }),

      renameSemester: (id, name) =>
        set((s) => ({
          semesters: s.semesters.map((x) => (x.id === id ? { ...x, name } : x)),
        })),

      // Set any semester metadata (name / academic year / term number).
      updateSemester: (id, patch) =>
        set((s) => ({
          semesters: s.semesters.map((x) => (x.id === id ? { ...x, ...patch } : x)),
        })),

      // Archive keeps a semester in the record but drops it from the cumulative
      // CGPA — for exchange terms, audited courses, or anything a student wants
      // set aside without deleting.
      toggleArchiveSemester: (id) =>
        set((s) => ({
          semesters: s.semesters.map((x) => (x.id === id ? { ...x, archived: !x.archived } : x)),
        })),

      duplicateSemester: (id) =>
        set((s) => {
          const idx = s.semesters.findIndex((x) => x.id === id)
          if (idx < 0) return {}
          const src = s.semesters[idx]
          const copy = {
            id: uid(),
            name: `${src.name} (copy)`,
            year: src.year ?? '',
            term: src.term ?? '',
            archived: false,
            courses: cloneCourses(src.courses),
          }
          const semesters = s.semesters.slice()
          semesters.splice(idx + 1, 0, copy)
          return { semesters, activeSemesterId: copy.id }
        }),

      moveSemester: (id, dir) =>
        set((s) => {
          const i = s.semesters.findIndex((x) => x.id === id)
          return { semesters: swap(s.semesters, i, i + (dir === 'up' ? -1 : 1)) }
        }),

      /* -------- course actions (semester or 'quick') -------- */
      addCourse: (sid, patch) =>
        set((s) => patchCourses(s, sid, (courses) => [...courses, newCourse(patch)])),

      removeCourse: (sid, cid) =>
        set((s) => patchCourses(s, sid, (courses) => courses.filter((c) => c.id !== cid))),

      updateCourse: (sid, cid, patch) =>
        set((s) =>
          patchCourses(s, sid, (courses) =>
            courses.map((c) => (c.id === cid ? { ...c, ...patch } : c)),
          ),
        ),

      duplicateCourse: (sid, cid) =>
        set((s) =>
          patchCourses(s, sid, (courses) => {
            const i = courses.findIndex((c) => c.id === cid)
            if (i < 0) return courses
            const next = courses.slice()
            next.splice(i + 1, 0, { ...courses[i], id: uid() })
            return next
          }),
        ),

      moveCourse: (sid, cid, dir) =>
        set((s) =>
          patchCourses(s, sid, (courses) => {
            const i = courses.findIndex((c) => c.id === cid)
            return swap(courses, i, i + (dir === 'up' ? -1 : 1))
          }),
        ),

      clearCourses: (sid) =>
        set((s) => patchCourses(s, sid, () => [newCourse()])),

      // Promote the Quick list into a saved semester, then reset Quick and jump
      // to the full transcript so the student sees it land.
      saveQuickAsSemester: () =>
        set((s) => {
          const sem = newSemester(s.semesters.length + 1, cloneCourses(s.quick.courses))
          return {
            semesters: [...s.semesters, sem],
            quick: { courses: [newCourse()] },
            mode: 'full',
            activeSemesterId: sem.id,
          }
        }),

      /* -------- course workspace (Phase 6) --------
         A saved course can grow an optional workspace: free-form meta
         (instructor, section, classroom, schedule, syllabus, studyPlan,
         progress) plus keyed collections (components, assignments, exams,
         resources, topics). All edits locate the course by id and never touch
         its academic fields (credits/grade/status), so workspace data can't
         alter a calculation. AI-extracted data is written through these same
         actions only after the user confirms it — nothing writes silently. */
      updateCourseWorkspace: (cid, patch) =>
        set((s) => patchCourseById(s, cid, (c) => ({ ...c, ...patch }))),

      addCourseItem: (cid, key, item = {}) =>
        set((s) =>
          patchCourseById(s, cid, (c) => ({
            ...c,
            [key]: [...(Array.isArray(c[key]) ? c[key] : []), { id: uid(), ...item }],
          })),
        ),

      updateCourseItem: (cid, key, itemId, patch) =>
        set((s) =>
          patchCourseById(s, cid, (c) => ({
            ...c,
            [key]: (Array.isArray(c[key]) ? c[key] : []).map((it) =>
              it.id === itemId ? { ...it, ...patch } : it,
            ),
          })),
        ),

      removeCourseItem: (cid, key, itemId) =>
        set((s) =>
          patchCourseById(s, cid, (c) => ({
            ...c,
            [key]: (Array.isArray(c[key]) ? c[key] : []).filter((it) => it.id !== itemId),
          })),
        ),

      /* -------- preferences + data -------- */
      settings: { precision: 2, showBreakdown: false, retakePolicy: DEFAULT_RETAKE_POLICY },
      setPrecision: (precision) =>
        set((s) => ({ settings: { ...s.settings, precision } })),
      setShowBreakdown: (showBreakdown) =>
        set((s) => ({ settings: { ...s.settings, showBreakdown } })),
      setRetakePolicy: (retakePolicy) =>
        set((s) => ({ settings: { ...s.settings, retakePolicy } })),

      clearAll: () =>
        set({ semesters: [], quick: { courses: [newCourse()] }, activeSemesterId: null }),
      loadExample: () =>
        set(() => {
          const semesters = example()
          return { semesters, mode: 'full', activeSemesterId: semesters[0]?.id ?? null }
        }),

      // -------- backup / restore --------
      // A portable snapshot of everything worth keeping: the transcript, custom
      // grade scales, the active scale, and preferences. Written to a file the
      // student owns, so their academic record outlives this browser.
      exportData: () => {
        const s = get()
        return {
          format: 'cgpa-calculator',
          version: EXPORT_VERSION,
          exportedAt: new Date().toISOString(),
          data: {
            semesters: s.semesters,
            customProfiles: s.customProfiles,
            activeProfileId: s.activeProfileId,
            settings: s.settings,
          },
        }
      },

      // Restore a previously exported snapshot. Validates the envelope, then
      // normalizes every semester/course so an older or hand-edited file can
      // never introduce a missing field. Returns { ok, error, semesters } so the
      // UI can report exactly what happened. Never throws.
      importData: (payload) => {
        const d = payload?.data ?? payload
        if (!d || typeof d !== 'object' || !Array.isArray(d.semesters)) {
          return { ok: false, error: 'That file isn’t a CGPA Calculator backup.' }
        }
        const semesters = d.semesters.map((s, i) => normalizeSemester(s, i))
        const customProfiles = Array.isArray(d.customProfiles)
          ? d.customProfiles.filter((p) => p && typeof p === 'object' && Array.isArray(p.grades))
          : []
        const profileIds = new Set(customProfiles.map((p) => p.id))
        const activeProfileId =
          d.activeProfileId && (profileIds.has(d.activeProfileId) || d.activeProfileId === 'std-4' || d.activeProfileId === 'std-5')
            ? d.activeProfileId
            : DEFAULT_PROFILE_ID
        const src = d.settings || {}
        const settings = {
          precision: [2, 3, 4].includes(src.precision) ? src.precision : 2,
          showBreakdown: Boolean(src.showBreakdown),
          retakePolicy: src.retakePolicy === 'all' ? 'all' : DEFAULT_RETAKE_POLICY,
        }
        set({
          semesters,
          customProfiles,
          activeProfileId,
          settings,
          mode: 'full',
          activeSemesterId: semesters[0]?.id ?? null,
        })
        return { ok: true, semesters: semesters.length }
      },
    }),
    {
      name: 'cgpa:v2',
      version: 3,
      migrate: (state, version) => {
        if (!state) return state
        // v2 (and earlier) predate course status, semester year/term/archived,
        // and the retake policy. Backfill them so old saves load cleanly.
        if (version < 3) {
          return {
            ...state,
            semesters: Array.isArray(state.semesters)
              ? state.semesters.map((s, i) => normalizeSemester(s, i))
              : [],
            quick: {
              courses:
                Array.isArray(state.quick?.courses) && state.quick.courses.length
                  ? state.quick.courses.map(normalizeCourse)
                  : [newCourse()],
            },
            settings: {
              precision: state.settings?.precision ?? 2,
              showBreakdown: Boolean(state.settings?.showBreakdown),
              retakePolicy: state.settings?.retakePolicy ?? DEFAULT_RETAKE_POLICY,
            },
          }
        }
        return state
      },
      partialize: (s) => ({
        mode: s.mode,
        quick: s.quick,
        semesters: s.semesters,
        activeSemesterId: s.activeSemesterId,
        customProfiles: s.customProfiles,
        activeProfileId: s.activeProfileId,
        settings: s.settings,
      }),
    },
  ),
)

/* ------------------------------------------------------------ profile access */

// The full profile list (built-ins first, then the user's custom scales) and the
// currently active profile. Selectors so components resolve them the same way.
export const selectProfiles = (s) => [...BUILTIN_PROFILES, ...s.customProfiles]

export const selectActiveProfile = (s) =>
  selectProfiles(s).find((p) => p.id === s.activeProfileId) || BUILTIN_PROFILES[0]
