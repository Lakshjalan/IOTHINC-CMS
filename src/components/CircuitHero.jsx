import React, { useEffect, useState } from 'react'
import { motion } from 'motion/react'

export const CircuitHero = () => {
  const [shouldAnimate, setShouldAnimate] = useState(true)
  const [hoveredNode, setHoveredNode] = useState(null)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setShouldAnimate(!mediaQuery.matches)

    const handleChange = (e) => {
      setShouldAnimate(!e.matches)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  // Node definitions
  const nodes = [
    { id: 'center', cx: 400, cy: 250, label: 'IOTHINC HUB', placement: 'center' },
    { id: 'embedded', cx: 150, cy: 120, label: 'EMBEDDED BUILD', placement: 'left' },
    { id: 'web', cx: 650, cy: 120, label: 'WEB SYSTEMS', placement: 'right' },
    { id: 'iot', cx: 150, cy: 380, label: 'IOT & CHIPS', placement: 'left' },
    { id: 'compete', cx: 650, cy: 380, label: 'COMPETITIVE ENG', placement: 'right' },
    { id: 'learn', cx: 400, cy: 80, label: 'KNOWLEDGE BASE', placement: 'top' },
  ]

  // Traces going out from center
  const traces = [
    {
      id: 'embedded',
      d: 'M 400 250 L 300 250 L 170 120 L 150 120',
      delay: 0.2,
      pulse: true,
      pulseDur: '4s'
    },
    {
      id: 'web',
      d: 'M 400 250 L 500 250 L 630 120 L 650 120',
      delay: 0.5,
      pulse: false
    },
    {
      id: 'iot',
      d: 'M 400 250 L 300 250 L 170 380 L 150 380',
      delay: 0.8,
      pulse: true,
      pulseDur: '5s'
    },
    {
      id: 'compete',
      d: 'M 400 250 L 500 250 L 630 380 L 650 380',
      delay: 1.1,
      pulse: false
    },
    {
      id: 'learn',
      d: 'M 400 250 L 400 120 L 400 80',
      delay: 1.4,
      pulse: true,
      pulseDur: '6s'
    }
  ]

  return (
    <div className="w-full h-full relative flex items-center justify-center overflow-hidden">
      <svg
        viewBox="0 0 800 500"
        className="w-full h-full max-h-[500px] text-accent select-none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Background circuit grid lines (static, subtle) */}
        <g className="opacity-10 dark:opacity-[0.05] stroke-on-surface" strokeWidth="0.5" fill="none">
          <path d="M 0 100 L 800 100 M 0 200 L 800 200 M 0 300 L 800 300 M 0 400 L 800 400" />
          <path d="M 100 0 L 100 500 M 200 0 L 200 500 M 300 0 L 300 500 M 400 0 L 400 500 M 500 0 L 500 500 M 600 0 L 600 500 M 700 0 L 700 500" />
        </g>

        {/* PCB Traces */}
        <g fill="none">
          {traces.map((trace) => {
            const isHovered = hoveredNode === trace.id
            const strokeWidth = isHovered ? 3.5 : 2
            const strokeOpacity = hoveredNode ? (isHovered ? 1 : 0.25) : 0.8
            const strokeColor = isHovered ? 'currentColor' : 'currentColor' // can customize to brighter color if needed

            if (!shouldAnimate) {
              return (
                <path 
                  key={trace.id} 
                  d={trace.d} 
                  stroke="currentColor" 
                  strokeWidth={strokeWidth} 
                  strokeOpacity={strokeOpacity}
                  className="transition-all duration-300"
                />
              )
            }

            return (
              <motion.path
                key={trace.id}
                d={trace.d}
                stroke="currentColor"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{
                  duration: 1.5,
                  delay: trace.delay,
                  ease: 'easeInOut'
                }}
                style={{
                  strokeWidth,
                  strokeOpacity,
                  transition: 'stroke-width 0.3s ease, stroke-opacity 0.3s ease'
                }}
              />
            )
          })}
        </g>

        {/* Signal Pulses (moving dots along traces) */}
        {shouldAnimate && (
          <g fill="currentColor" className="text-accent">
            {traces
              .filter((t) => t.pulse)
              .map((trace) => {
                const isAnotherHovered = hoveredNode && hoveredNode !== trace.id
                return (
                  <circle 
                    key={`pulse-${trace.id}`} 
                    r="4" 
                    className="shadow-lg shadow-accent/50 transition-opacity duration-300"
                    opacity={isAnotherHovered ? 0.2 : 1}
                  >
                    <animateMotion
                      path={trace.d}
                      dur={trace.pulseDur}
                      repeatCount="indefinite"
                      rotate="auto"
                    />
                  </circle>
                )
              })}
          </g>
        )}

        {/* Nodes and Labels */}
        <g>
          {nodes.map((node) => {
            const isCenter = node.id === 'center'
            const r = isCenter ? 14 : 7
            const isHovered = hoveredNode === node.id
            
            const textClass = isCenter
              ? 'font-mono text-sm tracking-wider font-bold fill-on-surface'
              : `font-mono text-[10px] tracking-widest font-semibold fill-on-surface-variant transition-all duration-300 ${
                  isHovered ? 'fill-accent scale-[1.05]' : 'opacity-80'
                }`

            let textAnchor = 'middle'
            let dx = 0
            let dy = 0

            if (node.placement === 'left') {
              textAnchor = 'end'
              dx = -15
              dy = 4
            } else if (node.placement === 'right') {
              textAnchor = 'start'
              dx = 15
              dy = 4
            } else if (node.placement === 'top') {
              textAnchor = 'middle'
              dx = 0
              dy = -18
            } else if (node.placement === 'center') {
              textAnchor = 'middle'
              dx = 0
              dy = -22
            }

            return (
              <g 
                key={node.id} 
                className="cursor-pointer group"
                onMouseEnter={() => !isCenter && setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
              >
                {/* Invisible larger hover trigger area */}
                <circle
                  cx={node.cx}
                  cy={node.cy}
                  r={r + 15}
                  fill="transparent"
                />

                {/* Outer ring */}
                {shouldAnimate ? (
                  <motion.circle
                    cx={node.cx}
                    cy={node.cy}
                    r={r + (isCenter ? 8 : 4)}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1"
                    className="text-accent/30"
                    animate={{
                      scale: isHovered ? 1.25 : 1,
                      strokeWidth: isHovered ? 1.5 : 1,
                    }}
                    transition={{ duration: 0.2 }}
                  />
                ) : (
                  <circle
                    cx={node.cx}
                    cy={node.cy}
                    r={r + (isCenter ? 8 : 4)}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={isHovered ? '1.5' : '1'}
                    className="text-accent/30 transition-all duration-300"
                  />
                )}

                {/* Inner node dot */}
                {shouldAnimate ? (
                  <motion.circle
                    cx={node.cx}
                    cy={node.cy}
                    r={r}
                    fill={isCenter ? 'currentColor' : 'none'}
                    stroke="currentColor"
                    strokeWidth="2.5"
                    className="text-accent"
                    animate={{
                      fill: isHovered ? 'currentColor' : (isCenter ? 'currentColor' : 'none'),
                      r: isHovered ? r + 1.5 : r
                    }}
                    transition={{ duration: 0.2 }}
                  />
                ) : (
                  <circle
                    cx={node.cx}
                    cy={node.cy}
                    r={isHovered ? r + 1.5 : r}
                    fill={isCenter || isHovered ? 'currentColor' : 'none'}
                    stroke="currentColor"
                    strokeWidth="2.5"
                    className="text-accent transition-all duration-300"
                  />
                )}

                {/* Pulsing signal on center node */}
                {isCenter && shouldAnimate && (
                  <circle
                    cx={node.cx}
                    cy={node.cy}
                    r={r + 12}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1"
                    className="text-accent/20 animate-ping"
                  />
                )}

                {/* Node label */}
                <text
                  x={node.cx}
                  y={node.cy}
                  dx={dx}
                  dy={dy}
                  textAnchor={textAnchor}
                  className={textClass}
                  style={{ transformOrigin: `${node.cx}px ${node.cy}px` }}
                >
                  {node.label}
                </text>
              </g>
            )
          })}
        </g>
      </svg>
    </div>
  )
}
