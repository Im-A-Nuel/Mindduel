'use client'

import React from 'react'

/**
 * Lightweight skeleton block for loading states. Matches the white-card
 * Apple-flat aesthetic (gray base + slow shimmer). Use instead of spinners
 * for content-shaped loading (rows, cards, text).
 */
export function SkeletonBlock({
  width = '100%',
  height = 14,
  radius = 6,
  style,
}: {
  width?: number | string
  height?: number | string
  radius?: number
  style?: React.CSSProperties
}) {
  return (
    <div
      aria-hidden="true"
      style={{
        width, height, borderRadius: radius,
        background: 'linear-gradient(90deg, #ECECEE 0%, #F6F6F8 50%, #ECECEE 100%)',
        backgroundSize: '300% 100%',
        animation: 'mddSkeleton 1.4s ease-in-out infinite',
        ...style,
      }}
    />
  )
}

/** Multiple skeleton rows mimicking a table — used while history/leaderboard load. */
export function SkeletonRows({ rows = 5, gap = 12 }: { rows?: number; gap?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px' }}>
          <SkeletonBlock width={32} height={32} radius={8} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <SkeletonBlock width="60%" height={12} />
            <SkeletonBlock width="35%" height={10} />
          </div>
          <SkeletonBlock width={70} height={14} />
        </div>
      ))}
    </div>
  )
}

/** Skeleton grid for badge/card layouts (4-col on desktop, auto-stack mobile). */
export function SkeletonBadgeGrid({ count = 4 }: { count?: number }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 18 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <SkeletonBlock width={72} height={72} radius={18} />
          <SkeletonBlock width="65%" height={11} />
          <SkeletonBlock width="40%" height={9} />
        </div>
      ))}
    </div>
  )
}
