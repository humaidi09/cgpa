import { useLayoutEffect, useState } from 'react'

// Scale the fixed-width A4 document (794px) down to fit its container, never up.
// Returns a factor in (0, 1] to feed `transform: scale()`. A ResizeObserver keeps
// the live preview fitted as the column or window resizes. The capture node is
// read at natural size elsewhere, so scaling here never affects export quality.
export function useFitScale(ref, natural = 794) {
  const [scale, setScale] = useState(1)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => {
      const w = el.clientWidth
      if (w > 0) setScale(Math.min(1, w / natural))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref, natural])
  return scale
}
