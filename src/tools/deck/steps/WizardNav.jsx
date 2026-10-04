// The Back / Next bar at the bottom of each step.
//
// When Next is disabled it says why, in the same line — so the student learns
// what is missing here rather than being handed an error at download time.

import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui'

export default function WizardNav({ step, lastStep, canNext, blockedReason, onBack, onNext }) {
  const isLast = step === lastStep
  return (
    <div className="mt-6 flex items-center justify-between gap-3 border-t border-hair pt-4">
      <Button type="button" variant="ghost" onClick={onBack} disabled={step === 0}>
        <ArrowLeft className="h-4 w-4" />
        Back
      </Button>

      <div className="flex items-center gap-3">
        {!canNext && blockedReason && <span className="text-xs text-muted">{blockedReason}</span>}
        {!isLast && (
          <Button type="button" onClick={onNext} disabled={!canNext}>
            Next
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
