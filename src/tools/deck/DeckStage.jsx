import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CANVAS, renderSlide } from './layouts'

// DeckStage — the live 16:9 preview. It renders the very same element list the
// .pptx exporter writes, so the preview is a faithful picture of the download.
// The one thing it adds is motion: framer-motion staggers each element in as a
// slide appears, which is what makes the preview feel like a running deck.

// Scale an inches canvas to fit the container width.
function useFit(widthPx) {
  return useMemo(() => widthPx / CANVAS.W, [widthPx])
}

const EASE = [0.22, 0.61, 0.36, 1]

function ShapeEl({ el, th }) {
  const style = {
    left: `${el.x}in`,
    top: `${el.y}in`,
    width: `${el.w}in`,
    height: `${el.h}in`,
    transform: el.rotate ? `rotate(${el.rotate}deg)` : undefined,
    background: el.fill ? `#${el.fill}` : 'transparent',
    opacity: el.transparency != null ? 1 - el.transparency / 100 : 1,
    borderRadius: el.shape === 'ellipse' ? '50%' : el.radius ? `${el.radius * 100}%` : 0,
    border: el.line && el.line.color ? `${(el.line.width || 1) * 0.9}px solid #${el.line.color}` : undefined,
    clipPath:
      el.shape === 'trapezoid'
        ? 'polygon(18% 0%, 82% 0%, 100% 100%, 0% 100%)'
        : el.shape === 'triangle'
        ? 'polygon(50% 0%, 100% 100%, 0% 100%)'
        : el.shape === 'chevron'
        ? 'polygon(0 0, 78% 0, 100% 50%, 78% 100%, 0 100%, 22% 50%)'
        : undefined,
  }
  return <div className="absolute" style={style} />
}

function TextEl({ el, th }) {
  return (
    <div
      className="absolute flex"
      style={{
        left: `${el.x}in`,
        top: `${el.y}in`,
        width: `${el.w}in`,
        height: `${el.h}in`,
        color: `#${el.color || th.ink}`,
        fontFamily: `'${el.font || th.bodyFont}', system-ui, sans-serif`,
        fontSize: `${(el.size || 14) * 0.98}pt`,
        fontWeight: el.bold ? 700 : 400,
        fontStyle: el.italic ? 'italic' : 'normal',
        letterSpacing: el.spacing ? `${el.spacing * 0.6}px` : undefined,
        lineHeight: el.lineSpacing ? `${el.lineSpacing * 0.9}px` : 1.2,
        textAlign: el.align || 'left',
        justifyContent: el.align === 'center' ? 'center' : el.align === 'right' ? 'flex-end' : 'flex-start',
        alignItems: el.valign === 'middle' ? 'center' : el.valign === 'bottom' ? 'flex-end' : 'flex-start',
        whiteSpace: 'pre-wrap',
        overflow: 'hidden',
      }}
    >
      <span style={{ width: '100%' }}>{el.text}</span>
    </div>
  )
}

export default function DeckStage({ scene, theme, meta, page = 1, animate = true, className }) {
  const wrapRef = useRef(null)
  const [w, setW] = useState(0)

  useEffect(() => {
    const measure = () => setW(wrapRef.current?.clientWidth || 0)
    measure()
    const ro = new ResizeObserver(measure)
    if (wrapRef.current) ro.observe(wrapRef.current)
    return () => ro.disconnect()
  }, [])

  const scale = useFit(w)
  const elements = useMemo(() => (scene ? renderSlide(scene, theme, meta, page) : []), [scene, theme, meta, page])
  const key = scene?.__key ?? page

  return (
    <div ref={wrapRef} className={className} style={{ width: '100%' }}>
      <div
        className="relative w-full overflow-hidden rounded-xl border border-hair shadow-2xl"
        style={{ aspectRatio: `${CANVAS.W} / ${CANVAS.H}`, background: `#${theme.bg}` }}
      >
        <AnimatePresence mode="wait">
          <motion.div key={key} className="absolute inset-0">
            {elements.map((el, i) => (
              <motion.div
                key={i}
                className="absolute inset-0"
                initial={animate ? { opacity: 0, y: 14 } : false}
                animate={{ opacity: 1, y: 0 }}
                transition={animate ? { duration: 0.45, ease: EASE, delay: 0.06 + Math.min(i, 22) * 0.045 } : { duration: 0 }}
              >
                {el.t === 'text' ? <TextEl el={el} th={theme} /> : <ShapeEl el={el} th={theme} />}
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
