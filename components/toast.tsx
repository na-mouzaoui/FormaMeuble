'use client'

import { useEffect } from 'react'
import { Check, X } from 'lucide-react'

export type ToastState = {
  id: number
  message: string
  tone?: 'success' | 'error'
} | null

export function Toast({ toast, onClose }: { toast: ToastState; onClose: () => void }) {
  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(onClose, 3400)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast?.id])

  if (!toast) return null
  return (
    <div className={`toast ${toast.tone === 'error' ? 'is-error' : ''}`} role="status" aria-live="polite">
      <span className="toast-icon">{toast.tone === 'error' ? <X /> : <Check />}</span>
      <span>{toast.message}</span>
      <button type="button" className="toast-close" onClick={onClose} aria-label="Fermer la notification">
        <X />
      </button>
    </div>
  )
}
