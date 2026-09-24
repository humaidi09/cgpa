import { forwardRef } from 'react'
import { cx } from '@/lib/cx'
import './cover.css'
import { PreviewCtx } from './templates/bits'
import { templateById } from './templates'
import { accentHex, fontStack, opt, SPACINGS, FONT_SCALES, HEADER_SPACINGS } from './defaults'

// The decorative page frame chosen by the "border" option. It sits behind the
// content column (z-index 0). "corners" draws four L-marks instead of a full
// border; everything else is a single ruled box.
function Frame({ border }) {
  const b = border || 'none'
  if (b === 'corners') {
    return (
      <div className="cd-frame cd-frame--corners" aria-hidden="true">
        <span className="cd-corner cd-corner--tl" />
        <span className="cd-corner cd-corner--tr" />
        <span className="cd-corner cd-corner--bl" />
        <span className="cd-corner cd-corner--br" />
      </div>
    )
  }
  return <div className={`cd-frame cd-frame--${b}`} aria-hidden="true" />
}

// The A4 cover document: one fixed-size white page (794x1123px = 210x297mm @96dpi)
// that maps the cover's options onto CSS variables and delegates the body to the
// chosen template. The SAME component serves two roles:
//   • scaled live preview  → preview=true  (muted placeholders for empty fields)
//   • off-screen capture    → preview=false (the real document we export / print)
// The forwarded ref points at the .cd-page node so the exporter can rasterise it.
const CoverDocument = forwardRef(function CoverDocument({ cover, preview = false, className, style }, ref) {
  const o = cover.options
  const tpl = templateById(cover.template)
  const Body = tpl.Component
  const vars = {
    '--cd-accent': accentHex(o.accent),
    '--cd-font': fontStack(o.font),
    '--cd-scale': opt(FONT_SCALES, o.fontScale).k,
    '--cd-k': opt(SPACINGS, o.spacing).k,
    '--cd-header-gap': `${opt(HEADER_SPACINGS, o.headerSpacing).px}px`,
    ...style,
  }
  return (
    <PreviewCtx.Provider value={preview}>
      <div
        ref={ref}
        className={cx('cd-page', `cd-align-${o.align}`, `cd-t-${tpl.id}`, className)}
        style={vars}
      >
        <Frame border={o.border} />
        <Body cover={cover} />
      </div>
    </PreviewCtx.Provider>
  )
})

export default CoverDocument
