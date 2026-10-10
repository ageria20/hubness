import { useEffect, useState } from 'react'
import { Loader2, Mail, X } from 'lucide-react'

export function cx(...parts) {
  return parts.filter(Boolean).join(' ')
}

export function Button({ variant = 'primary', size = 'md', className, ...props }) {
  const base = 'btn inline-flex items-center justify-center gap-1.5 font-medium rounded-btn transition disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60'
  const sizes = { sm: 'px-3 py-1 text-sm', md: 'px-4 py-2 text-sm', lg: 'px-6 py-2.5' }
  const variants = {
    primary: 'btn-primary bg-accent text-on-accent hover:brightness-110',
    secondary: 'bg-surface-2 text-ink border border-line hover:border-accent/50',
    ghost: 'text-muted hover:text-ink hover:bg-surface-2',
    danger: 'bg-danger-soft text-danger hover:brightness-95',
  }
  return <button type="button" className={cx(base, sizes[size], variants[variant], className)} {...props} />
}

export function Card({ className, children, ...props }) {
  return (
    <div className={cx('bg-surface border border-line rounded-card', className)} {...props}>
      {children}
    </div>
  )
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        {subtitle && <p className="text-muted text-sm mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

export function Field({ label, hint, children, className }) {
  return (
    <label className={cx('block', className)}>
      <span className="block text-sm font-medium mb-1">{label}</span>
      {children}
      {hint && <span className="block text-xs text-muted mt-1">{hint}</span>}
    </label>
  )
}

const inputCls = 'w-full rounded-card bg-surface border border-line px-3 py-2 text-sm placeholder:text-muted/70 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:opacity-60'

export function Input(props) {
  return <input {...props} className={cx(inputCls, props.className)} />
}

export function Select({ children, ...props }) {
  return (
    <select {...props} className={cx(/\bw-/.test(props.className || '') ? inputCls.replace('w-full ', '') : inputCls, props.className)}>
      {children}
    </select>
  )
}

export function Textarea(props) {
  return <textarea rows={3} {...props} className={cx(inputCls, props.className)} />
}

export function Checkbox({ label, ...props }) {
  return (
    <label className="inline-flex items-center gap-2 text-sm cursor-pointer select-none">
      <input type="checkbox" className="size-4 accent-[var(--accent)]" {...props} />
      {label}
    </label>
  )
}

export function Badge({ tone = 'neutral', children }) {
  const tones = {
    neutral: 'bg-surface-2 text-muted',
    accent: 'bg-accent-soft text-accent',
    ok: 'bg-ok-soft text-ok',
    warn: 'bg-warn-soft text-warn',
    danger: 'bg-danger-soft text-danger',
  }
  return <span className={cx('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap', tones[tone])}>{children}</span>
}

export function Spinner({ className }) {
  return <Loader2 className={cx('animate-spin text-muted', className || 'size-5')} />
}

export function Loading() {
  return (
    <div className="flex justify-center py-16">
      <Spinner className="size-6" />
    </div>
  )
}

export function ErrorBanner({ error, onClose }) {
  if (!error) return null
  return (
    <div className="mb-4 flex items-start justify-between gap-3 rounded-card bg-danger-soft text-danger px-3 py-2 text-sm">
      <span>{error.message || String(error)}</span>
      {onClose && (
        <button onClick={onClose} aria-label="Chiudi">
          <X className="size-4" />
        </button>
      )}
    </div>
  )
}

export function Empty({ icon: Icon, title, children }) {
  return (
    <div className="text-center py-12 px-4">
      {Icon && <Icon className="size-8 mx-auto text-muted mb-3" />}
      <p className="font-medium">{title}</p>
      {children && <div className="text-sm text-muted mt-1">{children}</div>}
    </div>
  )
}

export function Modal({ open, title, onClose, children, footer, wide }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/50 p-0 sm:p-4" onMouseDown={onClose}>
      <div
        className={cx('bg-surface border border-line w-full sm:rounded-card shadow-2xl max-h-screen sm:max-h-[90vh] flex flex-col', wide ? 'sm:max-w-3xl' : 'sm:max-w-lg')}
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="text-muted hover:text-ink" aria-label="Chiudi">
            <X className="size-5" />
          </button>
        </div>
        <div className="px-5 py-4 overflow-y-auto">{children}</div>
        {footer && <div className="px-5 py-3 border-t border-line flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  )
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="flex gap-1 border-b border-line mb-5 overflow-x-auto">
      {tabs.map((t) => (
        <button
          key={t.value}
          onClick={() => onChange(t.value)}
          className={cx(
            'px-3 py-2 text-sm font-medium border-b-2 -mb-px whitespace-nowrap',
            value === t.value ? 'border-accent text-accent' : 'border-transparent text-muted hover:text-ink',
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

/** Carica dati da una funzione asincrona, con stato di caricamento/errore e ricarica. */
export function useLoad(fn, deps = []) {
  const [state, setState] = useState({ data: null, error: null, loading: true })
  const [tick, setTick] = useState(0)
  useEffect(() => {
    let alive = true
    setState((s) => ({ ...s, loading: true }))
    fn()
      .then((data) => alive && setState({ data, error: null, loading: false }))
      .catch((error) => alive && setState({ data: null, error, loading: false }))
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick])
  return { ...state, reload: () => setTick((t) => t + 1) }
}

export function ExpiryBadge({ date, days }) {
  if (!date) return <span className="text-muted">—</span>
  const label = new Date(date + 'T00:00').toLocaleDateString('it-IT')
  if (days < 0) return <Badge tone="danger">Scaduto {label}</Badge>
  if (days <= 7) return <Badge tone="danger">{label}</Badge>
  if (days <= 30) return <Badge tone="warn">{label}</Badge>
  return <Badge tone="ok">{label}</Badge>
}

export function MailButton({ email, subject, size = 'sm' }) {
  if (!email) return null
  const href = `mailto:${email}${subject ? `?subject=${encodeURIComponent(subject)}` : ''}`
  return (
    <a href={href} className={cx('inline-flex items-center gap-1 rounded-card font-medium text-accent hover:underline', size === 'sm' ? 'text-sm' : '')}>
      <Mail className="size-4" /> Mail
    </a>
  )
}

export function CopyField({ value }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="flex gap-2">
      <Input readOnly value={value} onFocus={(e) => e.target.select()} />
      <Button
        variant="secondary"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value)
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
          } catch {
            // appunti non disponibili: il campo resta selezionabile
          }
        }}
      >
        {copied ? 'Copiato' : 'Copia'}
      </Button>
    </div>
  )
}
