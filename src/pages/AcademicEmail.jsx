import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Check, Copy, Mail } from 'lucide-react'
import { Button, Card, Field, Input, Select, Textarea } from '@/components/ui'

// Academic Email — turns a scenario and a few details into a clear, polite email
// to an instructor or office. Self-contained: it only assembles text, nothing is
// sent and nothing is stored. The wording stays formal and concise on purpose.

const up = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)
const lc = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s)
const sentence = (s) => {
  const t = (s || '').trim()
  if (!t) return ''
  const capped = up(t)
  return /[.!?]$/.test(capped) ? capped : `${capped}.`
}

// Each scenario: its picker label, a one-line description, the extra fields it
// asks for, and how it turns them into a subject + body paragraphs. Shared
// fields (your name, instructor, course) are passed in as `c`.
const SCENARIOS = [
  {
    id: 'extension',
    label: 'Request an extension',
    desc: 'Ask for more time on an assignment.',
    fields: [
      { k: 'item', label: 'Assignment / task', placeholder: 'e.g. Assignment 2' },
      { k: 'due', label: 'Current deadline', placeholder: 'e.g. this Friday' },
      { k: 'until', label: 'New date you’re asking for', placeholder: 'e.g. next Monday' },
      { k: 'reason', label: 'Brief reason', placeholder: 'e.g. I’ve been unwell this week', area: true },
    ],
    build: (c, f) => ({
      subject: `Extension request: ${f.item || 'assignment'}${c.suffix}`,
      paras: [
        `I hope you’re doing well. I’m writing to ask whether it would be possible to have a short extension on ${f.item || 'the upcoming assignment'}${f.due ? `, currently due ${f.due}` : ''}.`,
        `${f.reason ? `${sentence(f.reason)} ` : ''}If possible, I would be grateful for an extension until ${f.until || '[new date]'}. I will make sure to submit by then and am happy to provide any documentation you need.`,
        `Thank you for considering my request.`,
      ],
    }),
  },
  {
    id: 'absence',
    label: 'Explain an absence',
    desc: 'Let an instructor know you missed a class.',
    fields: [
      { k: 'date', label: 'Date(s) missed', placeholder: 'e.g. Tuesday, 3 March' },
      { k: 'reason', label: 'Brief reason', placeholder: 'e.g. I had a medical appointment', area: true },
    ],
    build: (c, f) => ({
      subject: `Absence on ${f.date || '[date]'}${c.suffix}`,
      paras: [
        `I’m writing to let you know that I was unable to attend ${c.course ? c.course : 'class'} on ${f.date || '[date]'}.`,
        sentence(f.reason),
        `Could you let me know what was covered and whether there’s anything I should catch up on? I’d appreciate any notes or instructions. Thank you for your understanding.`,
      ],
    }),
  },
  {
    id: 'question',
    label: 'Ask a question',
    desc: 'Ask about course material or an instruction.',
    fields: [
      { k: 'topic', label: 'Topic', placeholder: 'e.g. the week 4 problem set' },
      { k: 'question', label: 'Your question', placeholder: 'e.g. Should question 3 use recursion or a loop?', area: true },
    ],
    build: (c, f) => ({
      subject: `Question about ${f.topic || 'the course'}${c.suffix}`,
      paras: [
        `I hope you’re well. I had a question about ${f.topic || 'the course material'}.`,
        sentence(f.question),
        `I’d really appreciate any guidance when you have a moment. Thank you for your time.`,
      ],
    }),
  },
  {
    id: 'meeting',
    label: 'Request a meeting',
    desc: 'Ask to meet in office hours or another time.',
    fields: [
      { k: 'purpose', label: 'What you’d like to discuss', placeholder: 'e.g. my project proposal' },
      { k: 'availability', label: 'Your availability', placeholder: 'e.g. Wednesday or Thursday afternoon' },
    ],
    build: (c, f) => ({
      subject: `Request to meet${c.suffix}`,
      paras: [
        `I hope this message finds you well. I was wondering whether I could meet with you${f.purpose ? ` to discuss ${lc(f.purpose)}` : ''}.`,
        `${f.availability ? `I’m generally available ${f.availability}, but I’m happy to work around your schedule. ` : 'I’m happy to come to your office hours or meet at any time that suits you. '}Please let me know what works best for you.`,
        `Thank you very much.`,
      ],
    }),
  },
  {
    id: 'grade',
    label: 'Ask about a grade',
    desc: 'Politely ask how a grade was reached.',
    fields: [
      { k: 'item', label: 'Assessment', placeholder: 'e.g. the midterm exam' },
      { k: 'concern', label: 'What you’d like to understand', placeholder: 'e.g. where I lost marks on question 2', area: true },
    ],
    build: (c, f) => ({
      subject: `Question about my ${f.item || 'grade'}${c.suffix}`,
      paras: [
        `I hope you’re doing well. I wanted to ask about my grade on ${f.item || 'a recent assessment'}.`,
        sentence(f.concern),
        `I’m keen to understand where I can improve rather than to contest the mark. Could we go over it when you have time? Thank you for your help.`,
      ],
    }),
  },
  {
    id: 'recommendation',
    label: 'Request a recommendation',
    desc: 'Ask an instructor for a reference letter.',
    fields: [
      { k: 'purpose', label: 'For (program / scholarship / job)', placeholder: 'e.g. a master’s program in CS' },
      { k: 'deadline', label: 'Deadline', placeholder: 'e.g. 15 April' },
      { k: 'highlight', label: 'Anything to highlight (optional)', placeholder: 'e.g. my final project under your supervision', area: true },
    ],
    build: (c, f) => ({
      subject: `Recommendation letter request${c.suffix}`,
      paras: [
        `I hope you’re well. I’m applying for ${f.purpose || '[program / scholarship]'}, and I was wondering whether you would be willing to write a letter of recommendation on my behalf.`,
        `I really valued ${c.course ? `your ${c.course} course` : 'learning from you'}, and I believe you could speak well to my work.${f.highlight ? ` ${sentence(f.highlight)}` : ''}${f.deadline ? ` The deadline is ${f.deadline}.` : ''}`,
        `I’d be glad to share my CV, transcript, or anything else that would be helpful. Thank you so much for considering it.`,
      ],
    }),
  },
  {
    id: 'late',
    label: 'Apologise for a late submission',
    desc: 'Own a missed deadline and submit your work.',
    fields: [
      { k: 'item', label: 'Assignment', placeholder: 'e.g. the lab report' },
      { k: 'reason', label: 'Brief reason', placeholder: 'e.g. a family emergency came up', area: true },
    ],
    build: (c, f) => ({
      subject: `Late submission: ${f.item || 'assignment'}${c.suffix}`,
      paras: [
        `I’m writing to apologise for submitting ${f.item || 'the assignment'} after the deadline.`,
        sentence(f.reason),
        `I take full responsibility and have attached my completed work. I’d be grateful for any consideration you can give, and I’ll make sure it doesn’t happen again. Thank you for your understanding.`,
      ],
    }),
  },
]

const SCENARIO_BY_ID = Object.fromEntries(SCENARIOS.map((s) => [s.id, s]))

const BLANK = {
  yourName: '', studentId: '', course: '', instructor: '',
  item: '', due: '', until: '', reason: '', date: '', topic: '', question: '',
  purpose: '', availability: '', concern: '', deadline: '', highlight: '',
}

/* ------------------------------------------------------------------ page ----- */

export default function AcademicEmail() {
  const [scenarioId, setScenarioId] = useState('extension')
  const [f, setF] = useState(BLANK)
  const [copied, setCopied] = useState('')

  const scenario = SCENARIO_BY_ID[scenarioId] || SCENARIOS[0]
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }))

  const email = useMemo(() => {
    const course = (f.course || '').trim()
    const c = { course, suffix: course ? ` — ${course}` : '' }
    const { subject, paras } = scenario.build(c, f)
    const body = paras.filter(Boolean).join('\n\n')
    const greeting = `Dear ${(f.instructor || '').trim() || 'Professor [name]'},`
    const sigLines = [
      (f.yourName || '').trim() || '[Your name]',
      [f.studentId.trim(), course].filter(Boolean).join(' · '),
    ].filter(Boolean)
    const full = `${greeting}\n\n${body}\n\nSincerely,\n${sigLines.join('\n')}`
    return { subject, full }
  }, [scenario, f])

  const copy = async (text, id) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(id)
      setTimeout(() => setCopied(''), 1800)
    } catch {
      /* clipboard blocked — the text is still visible to select and copy */
    }
  }

  return (
    <div className="pb-10">
      {/* header */}
      <div className="mb-6">
        <Link to="/tools" className="mb-2 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-ink">
          <ArrowLeft className="h-4 w-4" />
          Student Tools
        </Link>
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">Academic Email</h1>
        <p className="mt-1 max-w-xl text-sm text-muted">
          Pick a situation, add a few details, and get a clear, polite email you can copy and send.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,480px)]">
        {/* ---------------------------------------------------------- form ---- */}
        <div className="space-y-5">
          <Card className="p-5 sm:p-6">
            <Field label="What do you need to write?">
              <Select value={scenarioId} onChange={(e) => setScenarioId(e.target.value)}>
                {SCENARIOS.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </Select>
            </Field>
            <p className="mt-2 text-sm text-muted">{scenario.desc}</p>
          </Card>

          <Card className="p-5 sm:p-6">
            <h2 className="mb-4 font-display text-lg font-semibold text-ink">Your details</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Your name">
                <Input value={f.yourName} onChange={(e) => set('yourName', e.target.value)} placeholder="e.g. Hussain Ahmed" />
              </Field>
              <Field label="Student ID (optional)">
                <Input value={f.studentId} onChange={(e) => set('studentId', e.target.value)} placeholder="e.g. 2011020001" />
              </Field>
              <Field label="Instructor">
                <Input value={f.instructor} onChange={(e) => set('instructor', e.target.value)} placeholder="e.g. Prof. Rahman" />
              </Field>
              <Field label="Course (optional)">
                <Input value={f.course} onChange={(e) => set('course', e.target.value)} placeholder="e.g. CSE 2101" />
              </Field>
            </div>
          </Card>

          <Card className="p-5 sm:p-6">
            <h2 className="mb-4 font-display text-lg font-semibold text-ink">{scenario.label}</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {scenario.fields.map((fld) => (
                <Field key={fld.k} label={fld.label} className={fld.area ? 'sm:col-span-2' : undefined}>
                  {fld.area ? (
                    <Textarea value={f[fld.k]} onChange={(e) => set(fld.k, e.target.value)} placeholder={fld.placeholder} rows={3} />
                  ) : (
                    <Input value={f[fld.k]} onChange={(e) => set(fld.k, e.target.value)} placeholder={fld.placeholder} />
                  )}
                </Field>
              ))}
            </div>
          </Card>
        </div>

        {/* ------------------------------------------------------- preview ---- */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <Card className="overflow-hidden">
            <div className="flex items-center gap-2 border-b border-hair px-5 py-3">
              <Mail className="h-4 w-4 text-neonCyan" />
              <span className="font-mono text-xs text-muted">Preview</span>
            </div>

            <div className="space-y-1 border-b border-hair bg-fill/40 px-5 py-3">
              <p className="font-mono text-[11px] uppercase tracking-wide text-muted">Subject</p>
              <p className="text-sm font-medium text-ink">{email.subject}</p>
            </div>

            <div className="px-5 py-4">
              <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-ink">{email.full}</pre>
            </div>

            <div className="flex flex-wrap gap-2 border-t border-hair px-5 py-4">
              <Button onClick={() => copy(`Subject: ${email.subject}\n\n${email.full}`, 'email')} className="flex-1">
                {copied === 'email' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied === 'email' ? 'Copied' : 'Copy email'}
              </Button>
              <Button variant="outline" onClick={() => copy(email.subject, 'subject')}>
                {copied === 'subject' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                Subject
              </Button>
            </div>
          </Card>

          <p className="mt-3 px-1 text-xs leading-relaxed text-muted">
            A draft to start from — read it through and adjust the wording so it sounds like you before sending.
          </p>
        </div>
      </div>
    </div>
  )
}
