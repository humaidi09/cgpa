import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'

// Animate a number toward its target with an ease-out ramp, for the little
// "count up" reveal on the big GPA/CGPA figures. Honours prefers-reduced-motion:
// those users get the final value immediately, no ticking.
export function useCountUp(value, { duration = 0.55 } = {}) {
  const reduce = useReducedMotion()
  const [display, setDisplay] = useState(value)
  const fromRef = useRef(value)
  const rafRef = useRef(0)

  useEffect(() => {
    if (reduce || duration <= 0) {
      setDisplay(value)
      fromRef.current = value
      return
    }
    const from = fromRef.current
    const to = value
    if (from === to) return
    const start = performance.now()
    const tick = (now) => {
      const t = Math.min(1, (now - start) / (duration * 1000))
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplay(from + (to - from) * eased)
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
      else fromRef.current = to
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [value, duration, reduce])

  return display
}
