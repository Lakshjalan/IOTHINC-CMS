import React, { Suspense, lazy, useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation, useSearchParams, Outlet } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { CacheProvider } from './context/CacheContext'

/* Layout components — kept eager as they appear on every authenticated page */
import { Sidebar } from './components/Sidebar'
import { Navbar } from './components/Navbar'
import { ProtectedRoute } from './components/ProtectedRoute'
import { setupMessageListener } from './lib/firebase'

/* Error Pages — eager (small, needed immediately on bad routes) */
import NotFound from './pages/NotFound'
import Unauthorized from './pages/Unauthorized'

/* 
  Route-level code splitting via React.lazy().
  Each page is loaded only when the user navigates to its route,
  dramatically reducing the initial JS parse cost.
  Fix for Lighthouse: "Reduce unused JavaScript (est. savings 2,197 KiB)"
*/
const Login          = lazy(() => import('./pages/Login'))
const Home           = lazy(() => import('./pages/Home'))
const Dashboard      = lazy(() => import('./pages/Dashboard'))
const Members        = lazy(() => import('./pages/Members'))
const MemberProfile  = lazy(() => import('./pages/MemberProfile'))
const Projects       = lazy(() => import('./pages/Projects'))
const ProjectDetail  = lazy(() => import('./pages/ProjectDetail'))
const Teams          = lazy(() => import('./pages/Teams'))
const CreateTeam     = lazy(() => import('./pages/CreateTeam'))
const Events         = lazy(() => import('./pages/Events'))
const EventDetail    = lazy(() => import('./pages/EventDetail'))
const EventTeamDetail = lazy(() => import('./pages/EventTeamDetail'))
const Competitions   = lazy(() => import('./pages/Competitions'))
const CompetitionHost = lazy(() => import('./pages/CompetitionHost'))
const Tasks          = lazy(() => import('./pages/Tasks'))
const Learn          = lazy(() => import('./pages/Learn'))
const NewResource    = lazy(() => import('./pages/NewResource'))
const Contributions  = lazy(() => import('./pages/Contributions'))
const NewContribution = lazy(() => import('./pages/NewContribution'))
const ProgressTrackerMember = lazy(() => import('./pages/ProgressTrackerMember'))
const ProgressTrackerAdmin  = lazy(() => import('./pages/ProgressTrackerAdmin'))
const AdminPanel     = lazy(() => import('./pages/AdminPanel'))
const AdminBlogs     = lazy(() => import('./pages/AdminBlogs'))
const Chat           = lazy(() => import('./pages/Chat'))
const Leadership     = lazy(() => import('./pages/Leadership'))
const Meetings       = lazy(() => import('./pages/Meetings'))
const Scheduler      = lazy(() => import('./pages/Scheduler'))
const StorageDashboard = lazy(() => import('./pages/StorageDashboard'))
const BlogRead       = lazy(() => import('./pages/BlogRead'))

import { motion, AnimatePresence } from 'motion/react'

/* Minimal page-transition skeleton shown while lazy chunk loads */
const PageSkeleton = () => (
  <div className="flex-1 flex flex-col min-h-0 p-6 gap-4 animate-pulse">
    <div className="h-8 w-1/3 bg-surface-container rounded-lg"></div>
    <div className="h-4 w-1/2 bg-surface-container rounded"></div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
      {[1,2,3].map(i => (
        <div key={i} className="h-32 bg-surface-container rounded-xl"></div>
      ))}
    </div>
    <div className="h-64 bg-surface-container rounded-xl mt-2"></div>
  </div>
)

/* Auth loading splash */
const AuthSplash = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="flex flex-col items-center gap-3">
      <svg className="animate-spin h-10 w-10 text-primary" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" fill="currentColor"/>
      </svg>
      <span className="text-on-surface-variant font-mono text-xs uppercase tracking-widest">Initialising...</span>
    </div>
  </div>
)

/*
 * AppShell — renders the sidebar + navbar chrome ONCE for all authenticated routes.
 * Sidebar collapsed/mobile state is lifted here so it persists across navigations
 * instead of resetting every time a new page mounts.
 */
const AppShell = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Listen for push notifications while the app is open
  useEffect(() => {
    const unsubscribe = setupMessageListener();
    return () => { if (unsubscribe) unsubscribe(); };
  }, []);

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} />
      <div className={`flex-1 flex flex-col min-w-0 transition-[padding] duration-300 ${sidebarCollapsed ? 'md:pl-[64px]' : 'md:pl-[260px]'}`}>
        <Navbar sidebarCollapsed={sidebarCollapsed} setMobileMenuOpen={setMobileMenuOpen} />
        <Suspense fallback={<PageSkeleton />}>
          <AnimatedOutlet />
        </Suspense>
      </div>
    </div>
  )
}

/*
 * AnimatedOutlet — wraps the current route's child element with a fade+slide
 * transition. Uses AnimatePresence + location key for clean enter/exit.
 * The Suspense boundary is above this so the skeleton doesn't itself animate.
 */
const AnimatedOutlet = () => {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="flex-1 flex flex-col min-h-0"
      >
        <Outlet />
      </motion.div>
    </AnimatePresence>
  )
}

/* Protect a route — wraps children with role checking */
const Page = ({ children, allowedRoles }) => (
  <ProtectedRoute allowedRoles={allowedRoles}>
    {children}
  </ProtectedRoute>
)

const ContributionsRedirect = () => {
  const { role } = useAuth()
  const [searchParams] = useSearchParams()
  const isAdmin = ['chairperson', 'vice_chairperson'].includes(role)
  return (
    <Navigate 
      to={isAdmin 
        ? `/progress/admin?${searchParams.toString()}` 
        : `/progress?${searchParams.toString()}`
      } 
      replace 
    />
  )
}

function AppRoutes() {
  const { user, profile, loading } = useAuth()

  if (loading) return <AuthSplash />

  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={
        <>
          <Navbar />
          <Suspense fallback={<PageSkeleton />}><Home /></Suspense>
        </>
      } />
      <Route path="/blog/:id" element={
        <>
          <Navbar />
          <Suspense fallback={<PageSkeleton />}><BlogRead /></Suspense>
        </>
      } />
      <Route path="/login" element={
        (user && profile && !profile.needs_approval)
          ? <Navigate to="/dashboard" replace/>
          : <Suspense fallback={<AuthSplash />}><Login /></Suspense>
      } />

      {/* Dedicated Error Routes */}
      <Route path="/unauthorized" element={<Unauthorized />} />
      <Route path="/404" element={<NotFound />} />

      {/*
        Authenticated layout — AppShell renders ONCE and persists sidebar state.
        Individual pages render inside <Outlet /> via the nested routes below.
      */}
      <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
        <Route path="/dashboard"          element={<Page><Dashboard /></Page>} />
        <Route path="/members"            element={<Page><Members /></Page>} />
        <Route path="/members/:id"        element={<Page><MemberProfile /></Page>} />
        <Route path="/projects"           element={<Page><Projects /></Page>} />
        <Route path="/projects/:id"       element={<Page><ProjectDetail /></Page>} />
        <Route path="/teams"              element={<Page><Teams /></Page>} />
        <Route path="/teams/new" element={<Page allowedRoles={['chairperson', 'vice_chairperson']}><CreateTeam /></Page>} />
        <Route path="/events"             element={<Page><Events /></Page>} />
        <Route path="/events/:id"         element={<Page><EventDetail /></Page>} />
        <Route path="/events/:eventId/team/:teamId" element={<Page><EventTeamDetail /></Page>} />
        <Route path="/competitions"       element={<Page><Competitions /></Page>} />
        <Route path="/competitions/host" element={<Page allowedRoles={['chairperson', 'vice_chairperson']}><CompetitionHost /></Page>} />
        <Route path="/tasks"              element={<Page><Tasks /></Page>} />
        <Route path="/learn"              element={<Page><Learn /></Page>} />
        <Route path="/learn/new"          element={<Page allowedRoles={['chairperson', 'vice_chairperson']}><NewResource /></Page>} />
        <Route path="/contributions"      element={<ContributionsRedirect />} />
        <Route path="/contributions/new"  element={<Page><NewContribution /></Page>} />
        <Route path="/progress"           element={<Page><ProgressTrackerMember /></Page>} />
        <Route path="/progress/admin" element={<Page allowedRoles={['chairperson', 'vice_chairperson']}><ProgressTrackerAdmin /></Page>} />
        <Route path="/admin" element={<Page allowedRoles={['chairperson', 'vice_chairperson']}><AdminPanel /></Page>} />
        <Route path="/admin/blogs" element={<Page allowedRoles={['chairperson', 'vice_chairperson']}><AdminBlogs /></Page>} />
        <Route path="/storage" element={<Page allowedRoles={['chairperson','vice_chairperson']}><StorageDashboard /></Page>} />
        <Route path="/chat"               element={<Page><Chat /></Page>} />
        <Route path="/leadership"         element={<Page><Leadership /></Page>} />
        <Route path="/meetings"           element={<Page><Meetings /></Page>} />
        <Route path="/scheduler"          element={<Page><Scheduler /></Page>} />
      </Route>

      {/* Catch-all → 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

function App() {
  return (
    <CacheProvider defaultTTL={24 * 60 * 60 * 1000} persistToStorage={true}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </CacheProvider>
  )
}

export default App
