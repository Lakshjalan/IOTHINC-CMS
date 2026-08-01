/**
 * Simple prefetch utility for lazy-loaded route bundles.
 * Initiates import on hover to ensure instant page navigation on click.
 */

const importers = {
  '/dashboard': () => import('../pages/Dashboard'),
  '/members': () => import('../pages/Members'),
  '/projects': () => import('../pages/Projects'),
  '/teams': () => import('../pages/Teams'),
  '/competitions': () => import('../pages/Competitions'),
  '/events': () => import('../pages/Events'),
  '/tasks': () => import('../pages/Tasks'),
  '/chat': () => import('../pages/Chat'),
  '/meetings': () => import('../pages/Meetings'),
  '/scheduler': () => import('../pages/Scheduler'),
  '/learn': () => import('../pages/Learn'),
  '/progress': () => import('../pages/ProgressTrackerMember'),
  '/progress/admin': () => import('../pages/ProgressTrackerAdmin'),
  '/storage': () => import('../pages/StorageDashboard'),
  '/admin': () => import('../pages/AdminPanel'),
  '/leadership': () => import('../pages/Leadership'),
}

const prefetched = new Set();

export const prefetchRoute = (path) => {
  if (!path) return;
  const cleanPath = path.split('?')[0].replace(/\/$/, '');
  
  if (prefetched.has(cleanPath)) return;
  
  const importer = importers[cleanPath];
  if (importer) {
    prefetched.add(cleanPath);
    importer().catch((err) => {
      console.warn(`Prefetch failed for route ${cleanPath}:`, err.message);
      prefetched.delete(cleanPath); // allow retry
    });
  }
};

export default prefetchRoute;
