import { Routes, Route, Navigate } from 'react-router-dom'
import { GraduationCap } from 'lucide-react'
import { ThemeProvider } from '@/theme/ThemeContext'
import { AppShell } from '@/components/AppShell'
import Calculator from '@/pages/Calculator'
import Overview from '@/pages/Overview'
import Planner from '@/pages/Planner'
import Simulator from '@/pages/Simulator'
import Courses from '@/pages/Courses'
import Insights from '@/pages/Insights'
import StudentTools from '@/pages/StudentTools'
import CoverPageCreator from '@/pages/CoverPageCreator'
import Settings from '@/pages/Settings'

// Calculator-first: the calculator IS the home and the foundation every other
// screen reads from. The rest are lenses on the same transcript —
//   Overview   (Phase 3) analytics on what's already entered
//   Planner    (Phase 4) target CGPA + grade planning
//   Simulator  (Phase 5) what-if changes, before they're real
//   Courses    (Phase 6) the per-course workspace
//   Insights   (Phase 7) advanced academic intelligence
// A separate, isolated module lives alongside the calculator:
//   Tools      Student Tools — practical utilities (Assignment Cover Page)
// AppShell is a layout route — its <Outlet/> renders whichever page matched.
const NAV = [
  { to: '/', label: 'Calculator', end: true },
  { to: '/overview', label: 'Overview' },
  { to: '/planner', label: 'Planner' },
  { to: '/simulator', label: 'Simulator' },
  { to: '/courses', label: 'Courses' },
  { to: '/insights', label: 'Insights' },
  { to: '/tools', label: 'Tools' },
  { to: '/settings', label: 'Settings' },
]

export default function App() {
  return (
    <ThemeProvider>
      <Routes>
        <Route element={<AppShell title="CGPA Calculator" nav={NAV} mark={GraduationCap} />}>
          <Route index element={<Calculator />} />
          <Route path="overview" element={<Overview />} />
          <Route path="planner" element={<Planner />} />
          <Route path="simulator" element={<Simulator />} />
          <Route path="courses" element={<Courses />} />
          <Route path="courses/:courseId" element={<Courses />} />
          <Route path="insights" element={<Insights />} />
          <Route path="tools" element={<StudentTools />} />
          <Route path="tools/cover-page" element={<CoverPageCreator />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </ThemeProvider>
  )
}
