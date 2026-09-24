import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { uid } from './cover/defaults'

// Student Tools store — completely separate from the CGPA calculator's store
// (its own localStorage key, its own shape). Nothing here touches the transcript
// or the grading engine, so the two systems can evolve and migrate independently.
//
// It holds three things:
//   academicProfile — the student's saved university + personal details, used to
//                     auto-fill a new cover ("Save my academic information").
//   covers          — recently created cover pages (most recent first, capped),
//                     each a full self-contained snapshot for re-download/edit.
//   draft           — the in-progress cover, so a reload never loses work.

const CAP = 30

// Pull the reusable, person-and-institution fields out of a finished cover.
// Assignment-specific fields (title, course, dates) are intentionally excluded —
// those change every time; the profile is the stuff that doesn't.
const profileFromCover = (cover) => {
  const s = cover.students?.[0] || {}
  return {
    university: {
      name: cover.university?.name || '',
      department: cover.university?.department || '',
      faculty: cover.university?.faculty || '',
      address: cover.university?.address || '',
      logo: cover.university?.logo || '',
    },
    student: {
      name: s.name || '',
      studentId: s.studentId || '',
      department: s.department || '',
      batch: s.batch || '',
      section: s.section || '',
      program: s.program || '',
    },
    savedAt: new Date().toISOString(),
  }
}

export const useTools = create(
  persist(
    (set, get) => ({
      academicProfile: null,
      covers: [],
      draft: null,

      /* -------- academic profile -------- */
      saveProfile: (cover) => set({ academicProfile: profileFromCover(cover) }),
      clearProfile: () => set({ academicProfile: null }),

      /* -------- draft (in-progress cover) -------- */
      setDraft: (draft) => set({ draft }),
      clearDraft: () => set({ draft: null }),

      /* -------- saved covers -------- */
      // Insert or update. A cover already in the list is replaced in place
      // (keeping its position) with a fresh updatedAt; a new one goes to the top.
      upsertCover: (cover) =>
        set((state) => {
          const stamped = { ...cover, updatedAt: new Date().toISOString() }
          const i = state.covers.findIndex((c) => c.id === cover.id)
          if (i >= 0) {
            const covers = state.covers.slice()
            covers[i] = stamped
            return { covers }
          }
          return { covers: [stamped, ...state.covers].slice(0, CAP) }
        }),

      deleteCover: (id) => set((state) => ({ covers: state.covers.filter((c) => c.id !== id) })),

      // Clone a saved cover with fresh identity and return the copy so the caller
      // can open it for editing.
      duplicateCover: (id) => {
        const src = get().covers.find((c) => c.id === id)
        if (!src) return null
        const now = new Date().toISOString()
        const copy = {
          ...structuredClone(src),
          id: uid(),
          createdAt: now,
          updatedAt: now,
          filenameEdited: false,
          assignment: { ...src.assignment, title: src.assignment?.title ? `${src.assignment.title} (copy)` : '' },
        }
        set((state) => ({ covers: [copy, ...state.covers].slice(0, CAP) }))
        return copy
      },

      getCover: (id) => get().covers.find((c) => c.id === id) || null,
    }),
    {
      name: 'cgpa:tools:v1',
      version: 1,
      partialize: (s) => ({ academicProfile: s.academicProfile, covers: s.covers, draft: s.draft }),
    },
  ),
)

// Build a new cover seeded from the saved academic profile (if any). Kept here
// so the creator page and the hub agree on how a profile expands into a cover.
export function applyProfile(cover, profile) {
  if (!profile) return cover
  const p = profile
  return {
    ...cover,
    university: {
      ...cover.university,
      name: p.university?.name || cover.university.name,
      department: p.university?.department || cover.university.department,
      faculty: p.university?.faculty || cover.university.faculty,
      address: p.university?.address || cover.university.address,
      logo: p.university?.logo || cover.university.logo,
      logoEnabled: cover.university.logoEnabled,
    },
    students: [
      {
        ...cover.students[0],
        name: p.student?.name || cover.students[0].name,
        studentId: p.student?.studentId || cover.students[0].studentId,
        department: p.student?.department || cover.students[0].department,
        batch: p.student?.batch || cover.students[0].batch,
        section: p.student?.section || cover.students[0].section,
        program: p.student?.program || cover.students[0].program,
      },
      ...cover.students.slice(1),
    ],
  }
}
