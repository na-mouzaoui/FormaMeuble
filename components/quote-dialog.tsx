'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Check, Download, Mail, Send, X } from 'lucide-react'
import { QUOTES_KEY, type QuoteRequest } from '@/lib/config'

export type QuoteSummary = {
  model: string
  dimensions: string
  composition: string
  finish: string
  handles: string
  socle: string
  price: string
}

type Props = {
  open: boolean
  onClose: () => void
  summary: QuoteSummary
  onDownload: () => void
}

export function QuoteDialog({ open, onClose, summary, onDownload }: Props) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setSubmitted(false)
    setError('')
    const timer = window.setTimeout(() => nameRef.current?.focus(), 80)
    return () => window.clearTimeout(timer)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const body = [
    `Modèle : ${summary.model}`,
    `Dimensions : ${summary.dimensions}`,
    `Composition : ${summary.composition}`,
    `Finition : ${summary.finish}`,
    `Poignées : ${summary.handles}`,
    `Socle : ${summary.socle}`,
    `Estimation : ${summary.price}`,
    '',
    `Nom : ${name}`,
    `Email : ${email}`,
    `Téléphone : ${phone}`,
    '',
    message,
  ].join('\n')

  const mailto = `mailto:?subject=${encodeURIComponent('Demande de devis FormaMeuble')}&body=${encodeURIComponent(body)}`

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim()) {
      setError('Indiquez votre nom.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Indiquez une adresse e-mail valide.')
      return
    }
    const quote: QuoteRequest = {
      id: `quote-${Date.now().toString(36)}`,
      createdAt: new Date().toISOString(),
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      message: message.trim(),
      summary,
    }
    try {
      const previous = JSON.parse(window.localStorage.getItem(QUOTES_KEY) ?? '[]')
      const list = Array.isArray(previous) ? previous.slice(0, 30) : []
      window.localStorage.setItem(QUOTES_KEY, JSON.stringify([quote, ...list]))
    } catch {
      /* stockage indisponible */
    }
    setError('')
    setSubmitted(true)
  }

  return (
    <div
      className="dialog-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="quote-title">
        <div className="dialog-header">
          <div>
            <div className="eyebrow">Demande de devis</div>
            <h2 id="quote-title">Parlons de votre projet.</h2>
          </div>
          <button type="button" className="dialog-close" onClick={onClose} aria-label="Fermer">
            <X />
          </button>
        </div>

        <div className="dialog-summary">
          <div><span>Modèle</span><strong>{summary.model}</strong></div>
          <div><span>Dimensions</span><strong>{summary.dimensions}</strong></div>
          <div><span>Finition</span><strong>{summary.finish}</strong></div>
          <div><span>Poignées</span><strong>{summary.handles}</strong></div>
          <div><span>Composition</span><strong>{summary.composition}</strong></div>
          <div><span>Estimation</span><strong>{summary.price}</strong></div>
        </div>

        {submitted ? (
          <div className="dialog-success" role="status" aria-live="polite">
            <span className="dialog-success-icon"><Check /></span>
            <h3>Demande enregistrée.</h3>
            <p>
              Votre demande a bien été enregistrée sur cet appareil. Pour l&apos;envoyer à notre équipe, ouvrez-la
              dans votre messagerie ou téléchargez la configuration.
            </p>
            <div className="dialog-actions">
              <button type="button" className="ghost-button" onClick={onDownload}><Download /> Télécharger la configuration</button>
              <a className="next-button" href={mailto}><Mail /> Ouvrir dans ma messagerie</a>
              <button type="button" className="ghost-button" onClick={onClose}>Fermer</button>
            </div>
          </div>
        ) : (
          <form className="dialog-form" onSubmit={submit}>
            <div className="dialog-form-grid">
              <label className="prop-field">
                <span>Nom *</span>
                <input ref={nameRef} value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" required />
              </label>
              <label className="prop-field">
                <span>E-mail *</span>
                <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required />
              </label>
              <label className="prop-field">
                <span>Téléphone</span>
                <input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} autoComplete="tel" />
              </label>
              <label className="prop-field wide">
                <span>Votre projet</span>
                <textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={3} placeholder="Contraintes, délais, questions…" />
              </label>
            </div>
            {error && <p className="dialog-error" role="alert">{error}</p>}
            <div className="dialog-actions">
              <button type="button" className="ghost-button" onClick={onClose}>Annuler</button>
              <button type="submit" className="next-button"><Send /> Envoyer la demande</button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
