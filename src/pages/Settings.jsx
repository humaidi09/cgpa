import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Check, Download, Lock, Plus, RotateCcw, Trash2, Upload } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { useStore, selectProfiles } from '@/store'
import { RETAKE_POLICIES, fmtCredits } from '@/engine/cgpa'
import { Badge, Button, Callout, Input, SectionHeading, Segmented, Toggle, cx } from '@/components/ui'

// Settings — where the calculator's assumptions live so nothing is hardcoded:
// the grading scale (built-in or custom), display precision, and the breakdown
// default. Plus the data controls. Every field writes straight to the store.

/* ------------------------------------------------------------- grade scale -- */

function ProfileCard({ profile, active, onUse }) {
  const updateProfile = useStore((s) => s.updateProfile)
  const removeProfile = useStore((s) => s.removeProfile)
  const addGrade = useStore((s) => s.addGrade)
  const updateGrade = useStore((s) => s.updateGrade)
  const removeGrade = useStore((s) => s.removeGrade)

  const editable = profile.editable

  return (
    <div className={cx('rounded-2xl border p-5 transition-colors', active ? 'border-neonCyan/40 bg-neonCyan/[0.04]' : 'border-hair bg-fill/40')}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {editable ? (
            <Input
              aria-label="Scale name"
              value={profile.name}
              onChange={(e) => updateProfile(profile.id, { name: e.target.value })}
              className="max-w-xs font-display text-base font-semibold"
            />
          ) : (
            <h3 className="inline-flex items-center gap-2 font-display text-lg font-semibold text-ink">
              {profile.name}
              <span className="text-muted" title="Built-in scale — clone it to a custom scale to edit">
                <Lock className="h-3.5 w-3.5" />
              </span>
            </h3>
          )}
          <p className="mt-0.5 font-mono text-[11px] text-muted">
            {profile.grades.length} grades · max {fmtCredits(profile.scaleMax)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {active ? (
            <Badge tone="accent">
              <Check className="h-3 w-3" />
              Active
            </Badge>
          ) : (
            <Button variant="outline" size="sm" onClick={() => onUse(profile.id)}>
              Use scale
            </Button>
          )}
        </div>
      </div>

      {/* Grades */}
      {editable ? (
        <div className="mt-4 space-y-2">
          <div className="hidden items-center gap-2 px-0.5 sm:flex">
            <span className="w-24 font-mono text-[11px] text-muted">Grade</span>
            <span className="w-24 font-mono text-[11px] text-muted">Point</span>
          </div>
          {profile.grades.map((g, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                aria-label={`Grade ${i + 1} label`}
                value={g.grade}
                placeholder="A"
                className="w-24 font-mono uppercase"
                onChange={(e) => updateGrade(profile.id, i, { grade: e.target.value })}
              />
              <Input
                aria-label={`Grade ${i + 1} point`}
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                value={g.point}
                placeholder="0"
                className="w-24 tabular-nums"
                onChange={(e) => updateGrade(profile.id, i, { point: e.target.value })}
              />
              <button
                type="button"
                aria-label={`Remove grade ${g.grade || i + 1}`}
                onClick={() => removeGrade(profile.id, i)}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-hair bg-fill text-muted transition-colors hover:border-red-500/40 hover:text-red-400 disabled:opacity-30"
                disabled={profile.grades.length <= 1}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          <div className="flex flex-wrap gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={() => addGrade(profile.id)}>
              <Plus className="h-4 w-4" />
              Add grade
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-red-400 hover:bg-red-500/10"
              onClick={() => {
                if (window.confirm(`Delete "${profile.name}"? This can't be undone.`)) removeProfile(profile.id)
              }}
            >
              <Trash2 className="h-4 w-4" />
              Delete scale
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {profile.grades.map((g) => (
            <span key={g.grade} className="inline-flex items-center gap-1 rounded-lg border border-hair bg-fill px-2 py-1 font-mono text-xs">
              <span className="text-ink">{g.grade}</span>
              <span className="text-muted">{fmtCredits(g.point)}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

/* --------------------------------------------------------------- page ------- */

const PRECISION_OPTS = [
  { value: 2, label: '2' },
  { value: 3, label: '3' },
  { value: 4, label: '4' },
]

export default function Settings() {
  const profiles = useStore(useShallow(selectProfiles))
  const activeProfileId = useStore((s) => s.activeProfileId)
  const setActiveProfile = useStore((s) => s.setActiveProfile)
  const addCustomProfile = useStore((s) => s.addCustomProfile)

  const precision = useStore((s) => s.settings.precision)
  const setPrecision = useStore((s) => s.setPrecision)
  const showBreakdown = useStore((s) => s.settings.showBreakdown)
  const setShowBreakdown = useStore((s) => s.setShowBreakdown)
  const retakePolicy = useStore((s) => s.settings.retakePolicy)
  const setRetakePolicy = useStore((s) => s.setRetakePolicy)

  const semesters = useStore((s) => s.semesters)
  const clearAll = useStore((s) => s.clearAll)
  const loadExample = useStore((s) => s.loadExample)
  const exportData = useStore((s) => s.exportData)
  const importData = useStore((s) => s.importData)

  const fileRef = useRef(null)
  const [dataMsg, setDataMsg] = useState(null)

  const activeRetake = RETAKE_POLICIES.find((p) => p.value === retakePolicy) || RETAKE_POLICIES[0]

  const handleExport = () => {
    try {
      const payload = exportData()
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `cgpa-backup-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      setDataMsg({ ok: true, text: 'Backup downloaded — keep it somewhere safe.' })
    } catch {
      setDataMsg({ ok: false, text: 'Could not create the backup file.' })
    }
  }

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = '' // let the same file be chosen again later
    if (!file) return
    if (semesters.length > 0 && !window.confirm('Restore this backup? It replaces your current semesters and settings.')) return
    let parsed
    try {
      parsed = JSON.parse(await file.text())
    } catch {
      setDataMsg({ ok: false, text: 'That file isn’t valid JSON.' })
      return
    }
    const res = importData(parsed)
    setDataMsg(
      res.ok
        ? { ok: true, text: `Restored ${res.semesters} ${res.semesters === 1 ? 'semester' : 'semesters'} from backup.` }
        : { ok: false, text: res.error },
    )
  }

  return (
    <div className="space-y-10">
      <div>
        <Button as={Link} to="/" variant="ghost" size="sm" className="-ml-2 mb-2">
          <ArrowLeft className="h-4 w-4" />
          Calculator
        </Button>
        <SectionHeading
          eyebrow="// settings"
          title="Grade systems & preferences"
          sub="Set the scale your GPA is calculated on, how precisely results are shown, and manage your data. Nothing here is hardcoded — the calculator uses exactly what you set."
        />
      </div>

      {/* Grading scales */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-semibold text-ink">Grading scale</h2>
            <p className="mt-1 text-sm text-muted">The active scale maps each grade to its grade point across the whole calculator.</p>
          </div>
          <Button variant="outline" size="sm" onClick={addCustomProfile}>
            <Plus className="h-4 w-4" />
            New custom scale
          </Button>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {profiles.map((p) => (
            <ProfileCard key={p.id} profile={p} active={p.id === activeProfileId} onUse={setActiveProfile} />
          ))}
        </div>

        <Callout tone="info">
          Built-in scales are locked so their published values stay intact. To use different grade points, create a
          custom scale — it becomes selectable in the calculator&apos;s grade-system menu.
        </Callout>
      </section>

      {/* Display */}
      <section className="space-y-4">
        <h2 className="font-display text-xl font-semibold text-ink">Display</h2>
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-hair bg-fill/40 p-4">
            <div>
              <p className="text-sm font-medium text-ink">Decimal places</p>
              <p className="mt-0.5 text-sm text-muted">How many decimals to show. Results are always computed at full precision and rounded only here.</p>
            </div>
            <Segmented
              options={PRECISION_OPTS}
              value={precision}
              onChange={(v) => setPrecision(Number(v))}
              ariaLabel="Decimal places"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-hair bg-fill/40 p-4">
            <div>
              <p className="text-sm font-medium text-ink">Show calculation breakdown by default</p>
              <p className="mt-0.5 text-sm text-muted">Open the worked step-by-step breakdown automatically on the calculator.</p>
            </div>
            <Toggle checked={showBreakdown} onChange={setShowBreakdown} id="default-breakdown" />
          </div>
        </div>
      </section>

      {/* Calculation */}
      <section className="space-y-4">
        <h2 className="font-display text-xl font-semibold text-ink">Calculation</h2>
        <div className="space-y-3 rounded-2xl border border-hair bg-fill/40 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink">Retake policy</p>
              <p className="mt-0.5 text-sm text-muted">
                How a course you&apos;ve marked <span className="font-mono text-xs">Retaken</span> counts. Institutions differ — set yours; nothing is assumed.
              </p>
            </div>
            <Segmented
              options={RETAKE_POLICIES.map((p) => ({ value: p.value, label: p.label }))}
              value={retakePolicy}
              onChange={setRetakePolicy}
              ariaLabel="Retake policy"
            />
          </div>
          <Callout tone="info">{activeRetake.hint}</Callout>
        </div>
      </section>

      {/* Data */}
      <section className="space-y-4">
        <h2 className="font-display text-xl font-semibold text-ink">Data</h2>
        <p className="text-sm text-muted">
          Everything you enter is stored only in this browser — nothing is uploaded.
          {semesters.length > 0 && ` You currently have ${semesters.length} saved ${semesters.length === 1 ? 'semester' : 'semesters'}.`}
        </p>

        <div className="rounded-2xl border border-hair bg-fill/40 p-4">
          <p className="text-sm font-medium text-ink">Backup &amp; restore</p>
          <p className="mt-0.5 text-sm text-muted">
            Save a JSON backup of your transcript, grade scales, and preferences — then restore it here, on any device or browser.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleExport} disabled={semesters.length === 0}>
              <Download className="h-4 w-4" />
              Export backup (JSON)
            </Button>
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
              <Upload className="h-4 w-4" />
              Import backup
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="sr-only"
              aria-hidden="true"
              tabIndex={-1}
              onChange={handleImportFile}
            />
          </div>
          {dataMsg && (
            <div className="mt-3">
              <Callout tone={dataMsg.ok ? 'ok' : 'bad'}>{dataMsg.text}</Callout>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => {
              if (semesters.length === 0 || window.confirm('Load the example transcript? This replaces your current semesters.')) {
                loadExample()
                setDataMsg(null)
              }
            }}
          >
            <RotateCcw className="h-4 w-4" />
            Load example transcript
          </Button>
          <Button
            variant="ghost"
            className="text-red-400 hover:bg-red-500/10"
            onClick={() => {
              if (window.confirm('Clear all semesters and courses? This can’t be undone.')) {
                clearAll()
                setDataMsg(null)
              }
            }}
          >
            <Trash2 className="h-4 w-4" />
            Clear all data
          </Button>
        </div>
      </section>
    </div>
  )
}
