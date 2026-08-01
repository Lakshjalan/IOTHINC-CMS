import React from 'react'

export const ResourceListSkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {[...Array(6)].map((_, i) => (
      <div key={i} className="bg-surface-container rounded-xl border border-outline-variant p-5 shadow-sm animate-pulse">
        <div className="flex items-center justify-between mb-3">
          <div className="h-5 w-24 bg-surface-container rounded"></div>
          <div className="h-4 w-12 bg-surface-container rounded"></div>
        </div>
        <div className="h-5 w-3/4 bg-surface-container rounded mb-3"></div>
        <div className="h-3 w-full bg-surface-container rounded mb-6"></div>
        <div className="bg-surface-container-low rounded-lg p-3 mb-4">
          <div className="h-10 w-10 bg-surface-container rounded-lg inline-block mr-3"></div>
          <div className="h-4 w-1/3 bg-surface-container rounded inline-block align-middle"></div>
        </div>
        <div className="flex items-center justify-between pt-3 border-t border-outline-variant/30">
          <div className="h-4 w-24 bg-surface-container rounded"></div>
          <div className="flex items-center gap-3">
            <div className="h-8 w-20 bg-surface-container rounded"></div>
            <div className="h-8 w-20 bg-surface-container rounded"></div>
          </div>
        </div>
      </div>
    ))}
  </div>
)
