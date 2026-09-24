// Cover Page Creator — data model, option catalogues, and the demo cover.
//
// This module is deliberately self-contained: it knows nothing about the CGPA
// engine or its store. A "cover" is plain data describing an academic cover
// page; the templates and the document renderer turn it into a white A4 page.
// Nothing here is hardcoded to one university — Leading University is only the
// bundled demo (its crest ships in ../assets), and every field is editable.

import leadingLogoUrl from '../assets/leading-university.png'

export const uid = () =>
  globalThis.crypto?.randomUUID?.() ??
  `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

/* ----------------------------------------------------------- option catalogues */

// Accent is used sparingly — on rules and bands only, never as a wash. Every
// value is a real, sober academic colour a department would actually print.
export const ACCENTS = [
  { id: 'navy', label: 'Navy', hex: '#1e3a5f' },
  { id: 'maroon', label: 'Maroon', hex: '#7b1e2b' },
  { id: 'forest', label: 'Forest', hex: '#1f4d36' },
  { id: 'charcoal', label: 'Charcoal', hex: '#2b2b2b' },
  { id: 'royal', label: 'Royal', hex: '#23408e' },
  { id: 'teal', label: 'Teal', hex: '#13585e' },
]

// Web-safe document fonts only — no web-font loading, so the page rasterises
// identically to what's on screen and prints with the right metrics.
export const FONTS = [
  { id: 'times', label: 'Times New Roman', stack: "'Times New Roman', Times, serif" },
  { id: 'georgia', label: 'Georgia', stack: "Georgia, 'Times New Roman', serif" },
  { id: 'cambria', label: 'Cambria', stack: "Cambria, Georgia, 'Times New Roman', serif" },
  { id: 'arial', label: 'Arial', stack: "Arial, Helvetica, sans-serif" },
]

export const ASSIGNMENT_TYPES = [
  'Assignment',
  'Lab Report',
  'Project Report',
  'Case Study',
  'Term Paper',
  'Presentation',
  'Research Report',
  'Other',
]

export const LOGO_SIZES = [
  { id: 'sm', label: 'Small', px: 64 },
  { id: 'md', label: 'Medium', px: 92 },
  { id: 'lg', label: 'Large', px: 124 },
]

export const LOGO_POSITIONS = [
  { id: 'center', label: 'Center' },
  { id: 'left', label: 'Left' },
  { id: 'right', label: 'Right' },
]

export const ALIGNS = [
  { id: 'center', label: 'Center' },
  { id: 'left', label: 'Left' },
]

export const BORDERS = [
  { id: 'none', label: 'None' },
  { id: 'line', label: 'Thin line' },
  { id: 'double', label: 'Double' },
  { id: 'rounded', label: 'Rounded' },
  { id: 'corners', label: 'Corner marks' },
]

export const SPACINGS = [
  { id: 'compact', label: 'Compact', k: 0.82 },
  { id: 'normal', label: 'Normal', k: 1 },
  { id: 'relaxed', label: 'Relaxed', k: 1.24 },
]

export const HEADER_SPACINGS = [
  { id: 'tight', label: 'Tight', px: 20 },
  { id: 'normal', label: 'Normal', px: 40 },
  { id: 'wide', label: 'Wide', px: 68 },
]

export const FONT_SCALES = [
  { id: 'sm', label: 'S', k: 0.92 },
  { id: 'md', label: 'M', k: 1 },
  { id: 'lg', label: 'L', k: 1.1 },
]

export const DEFAULT_OPTIONS = {
  logoSize: 'md',
  logoPosition: 'center',
  font: 'times',
  fontScale: 'md',
  align: 'center',
  border: 'none',
  spacing: 'normal',
  headerSpacing: 'normal',
  accent: 'navy',
}

// Look up helpers so templates/renderer never index the arrays by hand.
export const accentHex = (id) => (ACCENTS.find((a) => a.id === id) || ACCENTS[0]).hex
export const fontStack = (id) => (FONTS.find((f) => f.id === id) || FONTS[0]).stack
export const opt = (list, id) => list.find((x) => x.id === id) || list[0]

/* --------------------------------------------------------------- factories --- */

export const blankStudent = (patch = {}) => ({
  id: uid(),
  name: '',
  studentId: '',
  department: '',
  batch: '',
  section: '',
  program: '',
  group: '',
  ...patch,
})

export const blankCover = () => {
  const now = new Date().toISOString()
  return {
    id: uid(),
    createdAt: now,
    updatedAt: now,
    university: { name: '', department: '', faculty: '', address: '', logo: '', logoEnabled: true },
    assignment: {
      title: '',
      type: 'Assignment',
      courseName: '',
      courseCode: '',
      courseCredit: '',
      semester: '',
      section: '',
      submissionDate: '',
    },
    submittedTo: { name: '', designation: '', department: '' },
    students: [blankStudent()],
    template: 'classic',
    options: { ...DEFAULT_OPTIONS },
    filename: '',
    filenameEdited: false,
  }
}

/* ------------------------------------------------------------- demo (Leading) */

// The bundled crest is an asset URL; convert it to a data URL on demand so the
// demo cover carries its own logo (persists in localStorage, rasterises without
// a cross-origin fetch at export time).
export async function loadLeadingLogo() {
  try {
    const res = await fetch(leadingLogoUrl)
    const blob = await res.blob()
    return await new Promise((resolve, reject) => {
      const fr = new FileReader()
      fr.onload = () => resolve(fr.result)
      fr.onerror = reject
      fr.readAsDataURL(blob)
    })
  } catch {
    return ''
  }
}

// A fully-filled, realistic demo so a first-time visitor sees a finished cover
// instead of an empty page. Uses today as the submission date.
export async function demoCover() {
  const c = blankCover()
  const logo = await loadLeadingLogo()
  c.university = {
    name: 'Leading University',
    department: 'Department of Computer Science & Engineering',
    faculty: 'Faculty of Science & Engineering',
    address: 'Ragibnagar, Sylhet-3112, Bangladesh',
    logo,
    logoEnabled: true,
  }
  c.assignment = {
    title: 'Analysis of Sorting Algorithms',
    type: 'Assignment',
    courseName: 'Data Structures',
    courseCode: 'CSE 2101',
    courseCredit: '3.0',
    semester: 'Spring 2026',
    section: 'A',
    submissionDate: new Date().toISOString().slice(0, 10),
  }
  c.submittedTo = {
    name: 'Muin Mustahasin Pritom',
    designation: 'Associate Professor',
    department: 'Department of Computer Science & Engineering',
  }
  c.students = [
    blankStudent({
      name: 'Hussain Ahmed',
      studentId: '2011020001',
      department: 'Computer Science & Engineering',
      batch: '60th',
      section: 'A',
      program: 'B.Sc. in CSE',
      group: '',
    }),
  ]
  c.options = { ...DEFAULT_OPTIONS }
  return c
}
