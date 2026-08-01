import React from 'react'

/**
 * Skeleton Loader Components
 * Consistent skeleton placeholders for all data fetching states
 * Follows Material Design skeleton guidelines with pulse/shimmer animations
 */

// Base skeleton element with shimmer animation
export const SkeletonBase = ({ className = '', style = {}, ...props }) => (
  <div
    className={`skeleton-base bg-surface-container-highest animate-pulse rounded ${className}`}
    style={{
      background: 'linear-gradient(90deg, var(--surface-container-highest) 25%, var(--surface-container-high) 50%, var(--surface-container-highest) 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.5s infinite',
      ...style
    }}
    {...props}
  />
)

// CSS-in-JS for shimmer animation (also add to index.css)
export const skeletonStyles = `
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
.skeleton-base { position: relative; overflow: hidden; }
`

/* ============================================
   CARD SKELETONS
   ============================================ */

export const CardSkeleton = ({
  variant = 'default',  // 'default', 'event', 'project', 'member', 'meeting'
  lines = 3,
  showImage = true,
  showAvatar = false,
  className = ''
}) => {
  const imageHeight = variant === 'event' ? 'h-40' : variant === 'project' ? 'h-32' : 'h-48'

  return (
    <div className={`bg-surface-container border border-outline-variant rounded-2xl p-5 flex flex-col shadow-sm ${className}`}>
      {showImage && (
        <SkeletonBase className={`w-full ${imageHeight} rounded-xl mb-4`} />
      )}
      {showAvatar && (
        <div className="flex items-center gap-3 mb-4">
          <SkeletonBase className="w-10 h-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <SkeletonBase className="h-4 w-3/4 rounded" />
            <SkeletonBase className="h-3 w-1/2 rounded" />
          </div>
        </div>
      )}
      <div className="space-y-3 flex-1">
        <SkeletonBase className="h-5 w-1/4 rounded" /> {/* Title */}
        {Array.from({ length: lines }, (_, i) => (
          <SkeletonBase key={i} className={`h-4 w-full rounded ${i === lines - 1 ? 'w-3/4' : ''}`} />
        ))}
      </div>
      <div className="pt-4 border-t border-outline-variant/30 flex justify-between items-center mt-auto">
        <SkeletonBase className="w-20 h-8 rounded-full" />
        <SkeletonBase className="w-24 h-8 rounded-lg" />
      </div>
    </div>
  )
}

/* ============================================
   TABLE SKELETONS
   ============================================ */

export const TableSkeleton = ({
  columns = 5,
  rows = 5,
  showHeader = true,
  className = ''
}) => (
  <div className={`bg-surface-container rounded-xl border border-outline-variant overflow-hidden shadow-sm ${className}`}>
    {showHeader && (
      <div className="border-b border-outline-variant bg-surface-container-low text-[10px] font-label-caps uppercase text-on-surface-variant overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr>
              {Array.from({ length: columns }, (_, i) => (
                <th key={i} className="p-4">
                  <SkeletonBase className="h-4 w-full max-w-[120px] rounded" />
                </th>
              ))}
            </tr>
          </thead>
        </table>
      </div>
    )}
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <tbody className="divide-y divide-outline-variant">
          {Array.from({ length: rows }, (_, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-surface-container-high transition-colors">
              {Array.from({ length: columns }, (_, colIndex) => (
                <td key={colIndex} className="p-4">
                  <SkeletonBase className={`h-4 rounded ${colIndex === 0 ? 'w-[180px]' : 'w-[120px]'}`} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
)

/* ============================================
   LIST SKELETONS
   ============================================ */

export const ListSkeleton = ({
  items = 5,
  variant = 'default',  // 'default', 'member', 'task', 'meeting'
  showAvatar = true,
  showMeta = true,
  className = ''
}) => (
  <div className={`bg-surface-container rounded-xl border border-outline-variant overflow-hidden shadow-sm ${className}`}>
    <div className="divide-y divide-outline-variant">
      {Array.from({ length: items }, (_, i) => (
        <div key={i} className="p-4 hover:bg-surface-container-high transition-colors">
          <div className="flex items-start gap-4">
            {showAvatar && (
              <SkeletonBase className="w-10 h-10 rounded-full shrink-0" />
            )}
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <SkeletonBase className="h-5 w-48 rounded" />
                  {showMeta && <SkeletonBase className="h-3 w-32 rounded" />}
                </div>
                <SkeletonBase className="w-20 h-6 rounded-full shrink-0" />
              </div>
              {variant === 'task' && (
                <div className="flex items-center gap-2">
                  <SkeletonBase className="w-24 h-4 rounded-full" />
                  <SkeletonBase className="w-32 h-2 rounded-full" />
                </div>
              )}
              {variant === 'meeting' && (
                <div className="flex items-center gap-3 text-xs">
                  <SkeletonBase className="w-24 h-3 rounded" />
                  <SkeletonBase className="w-20 h-3 rounded" />
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
)

/* ============================================
   KANBAN BOARD SKELETON
   ============================================ */

export const KanbanSkeleton = ({
  columns = 4,
  cardsPerColumn = 3,
  className = ''
}) => (
  <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${columns > 4 ? 4 : columns} gap-6 ${className}`}>
    {Array.from({ length: columns }, (_, colIndex) => (
      <div key={colIndex} className="bg-surface-container rounded-xl border border-outline-variant flex flex-col p-4 min-h-[400px]">
        <div className="flex justify-between items-center mb-4">
          <SkeletonBase className="h-5 w-24 rounded" />
          <SkeletonBase className="w-10 h-6 rounded-full" />
        </div>
        <div className="flex-1 space-y-4">
          {Array.from({ length: cardsPerColumn }, (_, cardIndex) => (
            <div key={cardIndex} className="bg-surface-container-low border border-outline-variant p-4 rounded-xl shadow-sm">
              <SkeletonBase className="h-4 w-3/4 rounded mb-2" />
              <SkeletonBase className="h-3 w-full rounded mb-3" />
              <SkeletonBase className="h-3 w-2/3 rounded mb-3" />
              <div className="mb-3">
                <div className="flex justify-between text-[10px] mb-1">
                  <SkeletonBase className="w-16 h-3 rounded" />
                  <SkeletonBase className="w-10 h-3 rounded" />
                </div>
                <SkeletonBase className="w-full h-1.5 rounded-full" />
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-outline-variant/30">
                <SkeletonBase className="w-16 h-4 rounded" />
                <div className="flex gap-2">
                  <SkeletonBase className="w-8 h-8 rounded" />
                  <SkeletonBase className="w-20 h-6 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    ))}
  </div>
)

/* ============================================
   GRID SKELETON (for events, projects cards)
   ============================================ */

export const GridSkeleton = ({
  items = 6,
  cols = { base: 1, md: 2, lg: 3 },
  variant = 'event',
  className = ''
}) => (
  <div className={`grid gap-6 ${className}`} style={{
    gridTemplateColumns: `repeat(${cols.base}, 1fr)`
  }}>
    {Array.from({ length: items }, (_, i) => (
      <CardSkeleton key={i} variant={variant} />
    ))}
  </div>
)

/* ============================================
   DETAIL PAGE SKELETONS
   ============================================ */

export const DetailPageSkeleton = ({
  variant = 'event',  // 'event', 'project', 'member', 'meeting'
  className = ''
}) => {
  const renderHeader = () => (
    <div className="mb-8">
      <SkeletonBase className="h-6 w-32 rounded mb-2" />
      <SkeletonBase className="h-10 w-3/4 rounded mb-4 max-w-2xl" />
      <div className="flex flex-wrap gap-3">
        <SkeletonBase className="h-8 w-24 rounded-full" />
        <SkeletonBase className="h-8 w-28 rounded-full" />
        <SkeletonBase className="h-8 w-32 rounded-full" />
      </div>
    </div>
  )

  const renderMeta = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="bg-surface-container rounded-xl border border-outline-variant p-5">
          <SkeletonBase className="h-4 w-20 rounded mb-2" />
          <SkeletonBase className="h-8 w-24 rounded" />
        </div>
      ))}
    </div>
  )

  const renderTabs = () => (
    <div className="flex gap-2 border-b border-outline-variant mb-6 pb-px overflow-x-auto">
      {['Overview', 'Details', 'Activity', 'Settings'].map((tab, i) => (
        <SkeletonBase key={i} className="px-4 py-2.5 h-6 rounded-t-lg whitespace-nowrap" />
      ))}
    </div>
  )

  const renderContent = () => (
    <div className="space-y-6">
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="bg-surface-container rounded-xl border border-outline-variant p-5">
          <div className="flex justify-between items-start mb-4">
            <SkeletonBase className="h-5 w-40 rounded" />
            <SkeletonBase className="w-10 h-10 rounded" />
          </div>
          <SkeletonBase className="h-4 w-full rounded mb-2" />
          <SkeletonBase className="h-4 w-3/4 rounded mb-2" />
          <SkeletonBase className="h-4 w-1/2 rounded" />
        </div>
      ))}
    </div>
  )

  return (
    <main className={`flex-1 px-4 md:px-stack-lg pt-24 pb-section-gap max-w-7xl mx-auto w-full ${className}`}>
      {renderHeader()}
      {renderMeta()}
      {variant !== 'member' && renderTabs()}
      {renderContent()}
    </main>
  )
}

/* ============================================
   FORM SKELETON (for create/edit modals)
   ============================================ */

export const FormSkeleton = ({ fields = 6, className = '' }) => (
  <div className={`space-y-4 ${className}`}>
    {Array.from({ length: fields }, (_, i) => (
      <div key={i} className="space-y-1">
        <SkeletonBase className="h-3 w-24 rounded" /> {/* Label */}
        <SkeletonBase className={`h-10 w-full rounded-xl ${i % 3 === 0 ? 'h-24' : ''}`} /> {/* Input/textarea */}
      </div>
    ))}
    <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant/30">
      <SkeletonBase className="w-20 h-10 rounded-xl" />
      <SkeletonBase className="w-28 h-10 rounded-xl" />
    </div>
  </div>
)

/* ============================================
   AVATAR SKELETON
   ============================================ */

export const AvatarSkeleton = ({ size = 'md', className = '' }) => {
  const sizes = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
    xl: 'w-20 h-20',
    '2xl': 'w-32 h-32'
  }
  return (
    <SkeletonBase className={`${sizes[size]} rounded-full ${className}`} />
  )
}

/* ============================================
   STAT CARD SKELETON (dashboard stats)
   ============================================ */

export const StatCardSkeleton = ({ className = '' }) => (
  <div className={`bg-surface-container rounded-xl border border-outline-variant p-5 ${className}`}>
    <div className="flex items-center justify-between">
      <div>
        <SkeletonBase className="h-3 w-24 rounded mb-2" />
        <SkeletonBase className="h-10 w-20 rounded font-mono-data" />
      </div>
      <SkeletonBase className="w-12 h-12 rounded-xl" />
    </div>
    <div className="mt-4 flex items-center gap-2">
      <SkeletonBase className="w-16 h-4 rounded-full" />
      <SkeletonBase className="w-20 h-4 rounded-full" />
    </div>
  </div>
)

/* ============================================
   DASHBOARD SKELETON (full page, mirrors the bento grid)
   ============================================ */

export const DashboardSkeleton = ({ className = '' }) => (
  <main className={`flex-1 px-4 md:px-stack-lg pt-24 pb-section-gap max-w-7xl mx-auto w-full ${className}`}>
    {/* Welcome header */}
    <div className="mb-8">
      <SkeletonBase className="h-8 w-80 rounded mb-3" />
      <SkeletonBase className="h-4 w-64 rounded" />
    </div>

    {/* Stat cards */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {Array.from({ length: 4 }, (_, i) => <StatCardSkeleton key={i} />)}
    </div>

    {/* Bento grid */}
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Active Projects (8 cols) */}
      <div className="lg:col-span-8 bg-surface-container rounded-xl border border-outline-variant shadow-sm flex flex-col">
        <div className="p-5 border-b border-surface-variant bg-surface-container-low rounded-t-xl flex justify-between items-center">
          <SkeletonBase className="h-5 w-36 rounded" />
          <SkeletonBase className="h-7 w-20 rounded-full" />
        </div>
        <div className="p-5 flex-1 flex flex-col gap-5">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i}>
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-3">
                  <SkeletonBase className="w-8 h-8 rounded" />
                  <SkeletonBase className="h-4 w-36 rounded" />
                </div>
                <SkeletonBase className="h-3 w-8 rounded" />
              </div>
              <SkeletonBase className="w-full h-2 rounded-full" />
            </div>
          ))}
        </div>
      </div>

      {/* Upcoming Events (4 cols) */}
      <div className="lg:col-span-4 bg-surface-container rounded-xl border border-outline-variant shadow-sm flex flex-col">
        <div className="p-5 border-b border-surface-variant bg-surface-container-low rounded-t-xl">
          <SkeletonBase className="h-5 w-32 rounded" />
        </div>
        <div className="p-4 flex-1 space-y-4">
          {Array.from({ length: 2 }, (_, i) => (
            <div key={i} className="flex gap-4 items-center">
              <SkeletonBase className="w-12 h-12 rounded-lg shrink-0" />
              <div className="flex-1 space-y-2">
                <SkeletonBase className="h-4 w-3/4 rounded" />
                <SkeletonBase className="h-3 w-1/2 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Announcements (6 cols) */}
      <div className="lg:col-span-6 bg-surface-container rounded-xl border border-outline-variant shadow-sm flex flex-col">
        <div className="p-5 border-b border-surface-variant bg-surface-container-low rounded-t-xl">
          <SkeletonBase className="h-5 w-32 rounded" />
        </div>
        <div className="p-5 space-y-4">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="flex gap-4">
              <SkeletonBase className="w-2 h-2 mt-2 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <SkeletonBase className="h-4 w-2/3 rounded" />
                <SkeletonBase className="h-3 w-full rounded" />
                <SkeletonBase className="h-3 w-1/3 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Calendar (6 cols) */}
      <CalendarSkeleton className="lg:col-span-6" />
    </div>
  </main>
)

/* ============================================
   CHART SKELETON
   ============================================ */

export const ChartSkeleton = ({ height = 300, className = '' }) => (
  <div className={`bg-surface-container rounded-xl border border-outline-variant p-5 ${className}`} style={{ height }}>
    <div className="flex items-center justify-between mb-6">
      <SkeletonBase className="h-5 w-32 rounded" />
      <SkeletonBase className="w-24 h-8 rounded" />
    </div>
    <div className="h-[calc(100%-60px)] flex items-end justify-center gap-4 p-2">
      {Array.from({ length: 12 }, (_, i) => (
        <div key={i} className="flex-1 max-w-12" style={{ height: `${20 + Math.random() * 60}%` }}>
          <SkeletonBase className="w-full h-full rounded-t" />
        </div>
      ))}
    </div>
  </div>
)

/* ============================================
   CALENDAR SKELETON
   ============================================ */

export const CalendarSkeleton = ({ className = '' }) => (
  <div className={`bg-surface-container rounded-xl border border-outline-variant overflow-hidden ${className}`}>
    <div className="p-4 border-b border-outline-variant">
      <div className="flex justify-between items-center">
        <SkeletonBase className="h-6 w-32 rounded" />
        <div className="flex gap-2">
          <SkeletonBase className="w-10 h-10 rounded-lg" />
          <SkeletonBase className="w-10 h-10 rounded-lg" />
        </div>
      </div>
    </div>
    <div className="grid grid-cols-7 gap-px bg-outline-variant p-px">
      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => (
        <div key={i} className="bg-surface-container-low p-3 text-center text-[10px] font-label-caps uppercase">
          <SkeletonBase className="h-4 w-8 rounded mx-auto" />
        </div>
      ))}
      {Array.from({ length: 42 }, (_, i) => (
        <div key={i} className="bg-surface-container min-h-[80px] p-2">
          <div className="text-xs text-on-surface-variant mb-1">
            <SkeletonBase className="w-6 h-4 rounded" />
          </div>
          {i % 3 === 0 && <SkeletonBase className="h-3 w-16 rounded-full bg-primary/20" />}
        </div>
      ))}
    </div>
  </div>
)

/* ============================================
   CHAT/MESSAGES SKELETON
   ============================================ */

export const ChatSkeleton = ({ messages = 8, className = '' }) => (
  <div className={`space-y-4 ${className}`}>
    {Array.from({ length: messages }, (_, i) => (
      <div key={i} className={`flex gap-3 ${i % 2 === 0 ? 'flex-row-reverse' : ''}`}>
        <SkeletonBase className="w-8 h-8 rounded-full shrink-0" />
        <div className="flex-1 max-w-[70%]">
          <div className="bg-surface-container-high rounded-2xl p-3 rounded-br-none">
            <SkeletonBase className="h-4 w-full rounded mb-1" />
            <SkeletonBase className="h-4 w-3/4 rounded" />
          </div>
          <div className="flex items-center gap-2 mt-1 text-xs text-on-surface-variant">
            <SkeletonBase className="w-16 h-3 rounded" />
            <SkeletonBase className="w-10 h-3 rounded" />
          </div>
        </div>
      </div>
    ))}
  </div>
)

/* ============================================
   NOTIFICATION SKELETON
   ============================================ */

export const NotificationSkeleton = ({ items = 5, className = '' }) => (
  <div className={`space-y-2 ${className}`}>
    {Array.from({ length: items }, (_, i) => (
      <div key={i} className="bg-surface-container border border-outline-variant rounded-xl p-4 flex items-start gap-3">
        <SkeletonBase className="w-10 h-10 rounded-lg shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <SkeletonBase className="h-4 w-40 rounded" />
            <SkeletonBase className="w-20 h-3 rounded" />
          </div>
          <SkeletonBase className="h-3 w-3/4 rounded" />
          <SkeletonBase className="h-3 w-1/2 rounded" />
        </div>
      </div>
    ))}
  </div>
)

/* ============================================
   EXPORT ALL
   ============================================ */

export default {
  CardSkeleton,
  TableSkeleton,
  ListSkeleton,
  KanbanSkeleton,
  GridSkeleton,
  DetailPageSkeleton,
  DashboardSkeleton,
  FormSkeleton,
  AvatarSkeleton,
  StatCardSkeleton,
  ChartSkeleton,
  CalendarSkeleton,
  ChatSkeleton,
  NotificationSkeleton,
  SkeletonBase
}