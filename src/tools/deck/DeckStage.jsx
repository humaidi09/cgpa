import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CANVAS, renderSlide } from './layouts'

// DeckStage — the live 16:9 preview. It renders the very same element list the
// .pptx exporter writes, so the preview is a faithful picture of the download.
// The one thing it adds is motion: framer-motion staggers each element in as a
// slide appears, which is what makes the preview feel like a running deck.
//
// The stagger is per slide family rather than one uniform fade: a cover lifts
// its title, a card row sweeps left to right, the timeline travels along its
// axis. Same elements either way — only the order and direction change.

// Scale an inches canvas to fit the container width.
function useFit(widthPx) {
  return useMemo(() => widthPx / CANVAS.W, [widthPx])
}

const EASE = [0.22, 0.61, 0.36, 1]

// Elements come out of the layouts in draw order, so a plain index-based delay
// already reads well. These tweaks only adjust direction and spacing.
function motionFor(type, i, total) {
  const base = { duration: 0.5, ease: EASE }
  switch (type) {
    case 'title':
    case 'closing':
    case 'divider':
      // the ambient rings and the plate settle first, then text rises
      return { ...base, delay: 0.05 + Math.min(i, 18) * 0.05, y: 18 }
    case 'cards':
    case 'stats':
    case 'process':
      // sweep across the row
      return { ...base, duration: 0.45, delay: 0.04 + Math.min(i, 20) * 0.05, y: 12 }
    case 'timeline':
    case 'funnel':
    case 'pyramid':
      // travel along the axis
      return { ...base, duration: 0.42, delay: 0.04 + Math.min(i, 24) * 0.045, y: 0 }
    default:
      return { ...base, duration: 0.45, delay: 0.05 + Math.min(i, 22) * 0.045, y: 14 }
  }
}

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
    border: el.line && el.line.color ? `${(el.line.width || 1) * 0.95}px solid #${el.line.color}` : undefined,
    borderColor: el.line && el.line.color ? `#${el.line.color}` : undefined,
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

// A "line" element is a hairline. Drawn as a zero-height box so both the
// preview and PowerPoint agree on where it sits.
function LineEl({ el, th }) {
  const x = Math.min(el.x1, el.x2)
  const y = Math.min(el.y1, el.y2)
  return (
    <div
      className="absolute"
      style={{
        left: `${x}in`,
        top: `${y}in`,
        width: `${Math.abs(el.x2 - el.x1) || 0.011}in`,
        height: `${Math.abs(el.y2 - el.y1) || 0.011}in`,
        background: `#${el.color || th.line}`,
        opacity: el.transparency != null ? 1 - el.transparency / 100 : 1,
      }}
    />
  )
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
        fontFamily: `'${el.font || th.bodyFont}', 'Segoe UI', system-ui, sans-serif`,
        fontSize: `${(el.size || 14) * 0.98}pt`,
        fontWeight: el.bold ? 700 : 400,
        fontStyle: el.italic ? 'italic' : 'normal',
        letterSpacing: el.spacing ? `${el.spacing * 0.62}px` : undefined,
        lineHeight: el.lineSpacing ? `${el.lineSpacing * 0.92}px` : 1.22,
        textAlign: el.align || 'left',
        justifyContent: el.align === 'center' ? 'center' : el.align === 'right' ? 'flex-end' : 'flex-start',
        alignItems: el.valign === 'middle' ? 'center' : el.valign === 'bottom' ? 'flex-end' : 'flex-start',
        opacity: el.transparency != null ? 1 - el.transparency / 100 : 1,
        whiteSpace: 'pre-wrap',
        overflow: 'hidden',
      }}
    >
      <span style={{ width: '100%' }}>{el.text}</span>
    </div>
  )
}

export default function DeckStage({ scene, theme, meta, page = 1, index, animate = true, className }) {
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
  const elements = useMemo(
    () => (scene ? renderSlide(scene, theme, meta, page, index) : []),
    [scene, theme, meta, page, index],
  )
  const key = scene?.__key ?? page
  const type = scene?.type

  return (
    <div ref={wrapRef} className={className} style={{ width: '100%' }}>
      <div
        className="relative w-full overflow-hidden rounded-xl border border-hair shadow-2xl"
        style={{ aspectRatio: `${CANVAS.W} / ${CANVAS.H}`, background: `#${theme.bg}` }}
      >
        <AnimatePresence mode="wait">
          <motion.div key={key} className="absolute inset-0">
            {elements.map((el, i) => {
              const m = motionFor(type, i, elements.length)
              return (
                <motion.div
                  key={i}
                  className="absolute inset-0"
                  initial={animate ? { opacity: 0, y: m.y } : false}
                  animate={{ opacity: 1, y: 0 }}
                  exit={animate ? { opacity: 0, transition: { duration: 0.15 } } : undefined}
                  transition={animate ? { duration: m.duration, ease: m.ease, delay: m.delay } : { duration: 0 }}
                >
                  {el.t === 'text' ? <TextEl el={el} th={theme} /> : el.t === 'line' ? <LineEl el={el} th={theme} /> : <ShapeEl el={el} th={theme} />}
                </motion.div>
              )
            })}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
