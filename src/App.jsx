import { Routes, Route, Navigate } from 'react-router-dom'
import { GraduationCap } from 'lucide-react'
import { ThemeProvider } from '@/theme/ThemeContext'
import { AppShell } from '@/components/AppShell'
import Calculator from '@/pages/Calculator'
import Planner from '@/pages/Planner'
import Courses from '@/pages/Courses'
import StudentTools from '@/pages/StudentTools'
import CoverPageCreator from '@/pages/CoverPageCreator'
import CitationGenerator from '@/pages/CitationGenerator'
import AcademicEmail from '@/pages/AcademicEmail'
import Settings from '@/pages/Settings'

// Calculator-first: the calculator IS the home and the foundation every other
// screen reads from. The rest are lenses on the same transcript —
//   Planner    (Phase 4) target CGPA + grade planning
//   Courses    (Phase 6) the per-course workspace
// A separate, isolated module lives alongside the calculator:
//   Tools      Student Tools — practical utilities (cover pages, citations, email)
// AppShell is a layout route — its <Outlet/> renders whichever page matched.
const NAV = [
  { to: '/', label: 'Calculator', end: true },
  { to: '/planner', label: 'Planner' },
  { to: '/courses', label: 'Courses' },
  { to: '/tools', label: 'Tools' },
  { to: '/settings', label: 'Settings' },
]

export default function App() {
  return (
    <ThemeProvider>
      <Routes>
        <Route element={<AppShell title="CGPA Calculator" nav={NAV} mark={GraduationCap} />}>
          <Route index element={<Calculator />} />
          <Route path="planner" element={<Planner />} />
          <Route path="courses" element={<Courses />} />
          <Route path="courses/:courseId" element={<Courses />} />
          <Route path="tools" element={<StudentTools />} />
          <Route path="tools/cover-page" element={<CoverPageCreator />} />
          <Route path="tools/presentation" element={<CoverPageCreator kind="presentation" />} />
          <Route path="tools/lab-report" element={<CoverPageCreator kind="lab-report" />} />
          <Route path="tools/citation" element={<CitationGenerator />} />
          <Route path="tools/email" element={<AcademicEmail />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </ThemeProvider>
  )
}
