'use client'

import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

export type ConfirmState = {
  title: string
  message: string
  confirmLabel?: string
  tone?: 'default' | 'danger'
  onConfirm: () => void
} | null

export function ConfirmDialog({ state, onClose }: { state: ConfirmState; onClose: () => void }) {
  const confirmRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (state) confirmRef.current?.focus()
  }, [state])

  useEffect(() => {
    if (!state) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [state, onClose])

  if (!state) return null

  return (
    <div
      className="dialog-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="dialog dialog-small" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
        <div className="dialog-header">
          <h2 id="confirm-title">{state.title}</h2>
          <button type="button" className="dialog-close" onClick={onClose} aria-label="Fermer">
            <X />
          </button>
        </div>
        <p className="dialog-message">{state.message}</p>
        <div className="dialog-actions">
          <button type="button" className="ghost-button" onClick={onClose}>Annuler</button>
          <button
            ref={confirmRef}
            type="button"
            className={`next-button ${state.tone === 'danger' ? 'danger' : ''}`}
            onClick={() => {
              const confirm = state.onConfirm
              onClose()
              confirm()
            }}
          >
            {state.confirmLabel ?? 'Confirmer'}
          </button>
        </div>
      </div>
    </div>
  )
}
