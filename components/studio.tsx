'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Archive,
  ArrowLeft,
  ArrowRight,
  Box,
  Boxes,
  Check,
  ChevronDown,
  Copy,
  Crosshair,
  DoorClosed,
  DoorOpen,
  Download,
  Grid2X2,
  Laptop,
  Library,
  LoaderCircle,
  Minus,
  Plus,
  Redo2,
  RefreshCw,
  Rows3,
  Save,
  Search,
  Send,
  Share2,
  Shirt,
  Sparkles,
  Table2,
  Trash2,
  TriangleAlert,
  Tv,
  Undo2,
  Upload,
} from 'lucide-react'
import { Scene3D, type Scene3DHandle } from '@/components/scene-3d'
import { Toast, type ToastState } from '@/components/toast'
import { ConfirmDialog, type ConfirmState } from '@/components/confirm-dialog'
import { QuoteDialog, type QuoteSummary } from '@/components/quote-dialog'
import {
  CATEGORY_LABELS,
  COMPONENTS,
  HANDLE_FINISHES,
  MATERIALS,
  MATERIAL_LIST,
  PLINTH_STYLES,
  TEMPLATES,
  autoFitParts,
  boundsOf,
  buildCabinetParts,
  colorNameFor,
  defaultColorFor,
  detectOverlaps,
  findComponent,
  isOpening,
  makePart,
  normalizeCabinetParams,
  summarizeParts,
  withThickness,
  type CabinetParams,
  type Category,
  type FurniturePart,
  type HandleFinish,
  type HandleKind,
  type MaterialId,
  type Motion,
  type PartShape,
  type PlinthStyle,
  type Template,
} from '@/lib/catalog'
import {
  STORAGE_KEY,
  decodeShareConfig,
  encodeShareConfig,
  parseConfig,
  serializeConfig,
  type SavedConfig,
} from '@/lib/config'

const STEPS = ['Modèle', 'Dimensions', 'Composition', 'Finitions', 'Ajustement', 'Validation']
const CATEGORY_ORDER: Category[] = ['structure', 'mobile', 'separation', 'plateaux']

const HANDLES: { value: HandleKind; label: string }[] = [
  { value: 'bar', label: 'Barre' },
  { value: 'knob', label: 'Bouton' },
  { value: 'recess', label: 'Cuvette' },
  { value: 'none', label: 'Sans poignée' },
]

const MODEL_ICONS: Record<string, typeof Box> = {
  blank: Box,
  commode: Archive,
  'meuble-tv': Tv,
  bibliotheque: Library,
  'table-basse': Table2,
  bureau: Laptop,
  dressing: Shirt,
}

const MOTION_LABELS: Record<Motion, string> = {
  none: 'Aucune',
  'hinge-left': 'Charnière gauche',
  'hinge-right': 'Charnière droite',
  'slide-x': 'Coulissante',
  'tilt-down': 'Abattant vers le bas',
  'tilt-up': 'Abattant vers le haut',
  'slide-z': 'Coulissant',
}

const DEFAULT_PARAMS: CabinetParams = {
  width: 1200,
  height: 2100,
  depth: 450,
  shelves: 3,
  drawers: 2,
  doors: 2,
  material: 'chene',
  color: defaultColorFor('chene'),
  handle: 'bar',
  handleFinish: 'steel',
  plinth: 'recessed',
}

type Axis = 'w' | 'h' | 'd' | 'x' | 'y' | 'z' | 'ry'

function thicknessAxis(part: FurniturePart): Axis | null {
  if (part.type === 'panel' || part.type === 'rail' || part.type === 'plinth' || part.type === 'door') return 'd'
  if (part.type === 'shelf' || part.type === 'top') return 'h'
  return null
}

function shapeOptions(part: FurniturePart): PartShape[] {
  if (part.type === 'top') return ['rect', 'round', 'oval', 'rounded', 'l']
  if (part.type === 'leg') return ['rect', 'round', 'conical']
  return []
}

function motionOptions(part: FurniturePart): Motion[] {
  if (part.type === 'door') return ['none', 'hinge-left', 'hinge-right', 'slide-x', 'tilt-down', 'tilt-up']
  if (part.type === 'drawer') return ['slide-z']
  if (part.type === 'shelf') return ['none', 'slide-z']
  return ['none']
}

function prepareTemplateParts(
  build: () => FurniturePart[],
  material: MaterialId,
  color: string,
  handle: HandleKind,
  handleFinish: HandleFinish,
): FurniturePart[] {
  return build().map((part) => {
    const base = part.material === 'metal' || part.material === 'verre' ? part : { ...part, material, color }
    if (base.type === 'door' || base.type === 'drawer') return { ...base, handle, handleFinish }
    return base
  })
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
    return entities[character]
  })
}

function DimensionField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="dimension-field">
      <span>{label}</span>
      <div className="dimension-input">
        <input type="number" value={value} onChange={(event) => onChange(Number(event.target.value))} aria-label={label} />
        <span>mm</span>
      </div>
    </label>
  )
}

function NumberField({ label, value, onChange, step = 10 }: { label: string; value: number; onChange: (value: number) => void; step?: number }) {
  return (
    <label className="prop-field">
      <span>{label}</span>
      <input type="number" value={Math.round(value)} step={step} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  )
}

export function Studio() {
  const sceneRef = useRef<Scene3DHandle | null>(null)
  const fitTimer = useRef<number | null>(null)
  const importInputRef = useRef<HTMLInputElement | null>(null)
  const railRef = useRef<HTMLElement | null>(null)
  const toastId = useRef(0)
  const savedTimer = useRef<number | null>(null)
  const history = useRef<{ past: string[]; future: string[] }>({ past: [], future: [] })
  const restoring = useRef(false)

  const [step, setStep] = useState(1)
  const [tab, setTab] = useState<'catalogue' | 'proprietes'>('catalogue')
  const [params, setParams] = useState<CabinetParams>(DEFAULT_PARAMS)
  const [templateKey, setTemplateKey] = useState<string | null>(null)
  const [variantKey, setVariantKey] = useState<string | null>(null)
  const [templateParts, setTemplateParts] = useState<FurniturePart[]>([])
  const [extras, setExtras] = useState<FurniturePart[]>([])
  const [overrides, setOverrides] = useState<Record<string, Partial<FurniturePart>>>({})
  const [removed, setRemoved] = useState<string[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [openAll, setOpenAll] = useState(false)
  const [fitToken, setFitToken] = useState(1)
  const [adjusting, setAdjusting] = useState(false)
  const [fitReport, setFitReport] = useState<string[]>([])
  const [projectName, setProjectName] = useState('Projet sans titre')
  const [saved, setSaved] = useState(false)
  const [toast, setToast] = useState<ToastState>(null)
  const [confirm, setConfirm] = useState<ConfirmState>(null)
  const [quoteOpen, setQuoteOpen] = useState(false)
  const [showPriceDetail, setShowPriceDetail] = useState(false)
  const [catalogueQuery, setCatalogueQuery] = useState('')
  const [collapsedCategories, setCollapsedCategories] = useState<Category[]>([])
  const [hasLoaded, setHasLoaded] = useState(false)
  const [historyTick, setHistoryTick] = useState(0)

  const template = useMemo(() => TEMPLATES.find((item) => item.key === templateKey) ?? null, [templateKey])
  const variant = useMemo(() => template?.variants?.find((item) => item.key === variantKey) ?? null, [template, variantKey])
  const templateBuild = variant?.build ?? template?.build ?? null
  const baseParts = useMemo(() => (templateKey ? templateParts : buildCabinetParts(params)), [templateKey, templateParts, params])
  const allParts = useMemo(() => [...baseParts, ...extras], [baseParts, extras])
  const parts = useMemo(
    () => allParts.filter((part) => !removed.includes(part.id)).map((part) => (overrides[part.id] ? { ...part, ...overrides[part.id] } : part)),
    [allParts, removed, overrides],
  )
  const selected = useMemo(() => parts.find((part) => part.id === selectedId) ?? null, [parts, selectedId])
  const templateSummary = useMemo(() => summarizeParts(templateParts), [templateParts])
  const templateBounds = useMemo(() => boundsOf(templateParts), [templateParts])
  const dimensions = templateKey
    ? {
        width: Math.round(templateBounds.width),
        height: Math.round(templateBounds.height),
        depth: Math.round(templateBounds.depth),
      }
    : { width: params.width, height: params.height, depth: params.depth }
  const colorName = colorNameFor(params.material, params.color)
  const handleLabel = HANDLES.find((item) => item.value === params.handle)?.label ?? 'Barre'
  const handleFinishName = HANDLE_FINISHES.find((item) => item.id === params.handleFinish)?.name ?? 'Acier brossé'
  const plinthName = PLINTH_STYLES.find((item) => item.id === params.plinth)?.name ?? 'En retrait'
  const handlePremium = params.handleFinish === 'brass' ? 60 : params.handleFinish === 'wood' ? 35 : 0

  const priceBreakdown = useMemo(() => {
    const material = MATERIALS[params.material]
    const base = template ? template.basePrice : Math.round(340 + params.width * 0.11 + params.height * 0.06)
    const storage = template ? 0 : params.shelves * 42 + params.drawers * 90 + params.doors * 115
    const finish = Math.round(base * ((material.priceFactor ?? 1) - 1))
    const handles = handlePremium + (params.handle === 'none' ? -25 : 0)
    const socle = templateKey ? 0 : params.plinth === 'flush' ? 25 : params.plinth === 'none' ? -15 : 0
    const added = extras.length * 60
    const items = [
      { label: template ? 'Modèle' : 'Base caisson', amount: base },
      ...(storage ? [{ label: 'Rangements', amount: storage }] : []),
      ...(finish ? [{ label: 'Finition matière', amount: finish }] : []),
      ...(handles ? [{ label: 'Poignées', amount: handles }] : []),
      ...(socle ? [{ label: 'Socle', amount: socle }] : []),
      ...(added ? [{ label: 'Composants ajoutés', amount: added }] : []),
    ]
    return { items, total: Math.max(0, items.reduce((sum, item) => sum + item.amount, 0)) }
  }, [template, templateKey, params, handlePremium, extras.length])

  const compositionText = useMemo(() => {
    if (templateKey) {
      const rows = [
        templateSummary.panels ? `${templateSummary.panels} panneaux` : '',
        templateSummary.shelves ? `${templateSummary.shelves} étagères` : '',
        templateSummary.drawers ? `${templateSummary.drawers} tiroirs` : '',
        templateSummary.doors ? `${templateSummary.doors} portes` : '',
        templateSummary.legs ? `${templateSummary.legs} pieds` : '',
        templateSummary.others ? `${templateSummary.others} élément${templateSummary.others > 1 ? 's' : ''} divers` : '',
      ].filter(Boolean)
      return rows.join(' · ') || 'Modèle prédéfini'
    }
    return `${params.shelves} étagères · ${params.drawers} tiroirs · ${params.doors} portes`
  }, [templateKey, templateSummary, params])

  const templateComposition = [
    { label: 'Panneaux', description: 'Structure et façades', count: templateSummary.panels, Icon: Boxes },
    { label: 'Étagères', description: 'Tablettes intérieures', count: templateSummary.shelves, Icon: Rows3 },
    { label: 'Tiroirs', description: 'Rangement coulissant', count: templateSummary.drawers, Icon: Archive },
    { label: 'Portes', description: 'Ouvrants de façade', count: templateSummary.doors, Icon: DoorClosed },
    { label: 'Pieds', description: 'Suspension au sol', count: templateSummary.legs, Icon: Box },
    { label: 'Autres', description: 'Tringles, niches, plateaux', count: templateSummary.others, Icon: Sparkles },
  ].filter((row) => row.count > 0)

  const quoteSummary: QuoteSummary = {
    model: template?.label ?? 'Caisson sur mesure',
    dimensions: `${dimensions.width} × ${dimensions.height} × ${dimensions.depth} mm`,
    composition: compositionText,
    finish: `${MATERIALS[params.material].name} · ${colorName}`,
    handles: `${handleLabel} · ${handleFinishName}`,
    socle: templateKey ? 'Défini par le modèle' : plinthName,
    price: `${priceBreakdown.total.toLocaleString('fr-FR')} € HT`,
  }

  const configSnapshot = useMemo(
    () => JSON.stringify({ version: 1, projectName, params, templateKey, variantKey, templateParts, extras, overrides, removed }),
    [projectName, params, templateKey, variantKey, templateParts, extras, overrides, removed],
  )
  const isDirty = extras.length > 0 || Object.keys(overrides).length > 0 || removed.length > 0
  const liveOverlaps = useMemo(() => {
    if (!extras.length) return []
    const others = allParts.filter((part) => !extras.some((extra) => extra.id === part.id))
    return detectOverlaps(extras, others)
  }, [extras, allParts])
  const fitHasWarnings = fitReport.some((line) => line.includes('chevauchement'))
  const canUndo = historyTick >= 0 && history.current.past.length > 1
  const canRedo = historyTick >= 0 && history.current.future.length > 0
  const normalizedQuery = catalogueQuery.trim().toLowerCase()
  const filteredComponents = useMemo(
    () =>
      COMPONENTS.filter(
        (component) =>
          !normalizedQuery ||
          component.label.toLowerCase().includes(normalizedQuery) ||
          CATEGORY_LABELS[component.category].toLowerCase().includes(normalizedQuery),
      ),
    [normalizedQuery],
  )

  useEffect(() => {
    if (fitToken > 0) sceneRef.current?.fit()
  }, [fitToken])

  useEffect(() => {
    if (step !== 5) return
    runAutoFit(700)
    return () => {
      if (fitTimer.current) window.clearTimeout(fitTimer.current)
      setAdjusting(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  useEffect(() => {
    const shared = new URLSearchParams(window.location.search).get('config')
    const sharedConfig = shared ? decodeShareConfig(shared) : null
    let localConfig: SavedConfig | null = null
    if (!sharedConfig) {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY)
        localConfig = raw ? parseConfig(raw) : null
      } catch {
        localConfig = null
      }
    }
    const config = sharedConfig ?? localConfig
    if (config) applyConfig(config)
    if (sharedConfig) window.history.replaceState({}, '', window.location.pathname)
    setHasLoaded(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const buildSavedConfig = useCallback(
    (): SavedConfig => ({
      version: 1,
      projectName,
      savedAt: new Date().toISOString(),
      params,
      templateKey,
      variantKey,
      templateParts,
      extras,
      overrides,
      removed,
    }),
    [projectName, params, templateKey, variantKey, templateParts, extras, overrides, removed],
  )

  useEffect(() => {
    if (!hasLoaded) return
    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(STORAGE_KEY, serializeConfig(buildSavedConfig()))
      } catch {
        /* stockage indisponible */
      }
    }, 500)
    return () => window.clearTimeout(timer)
  }, [hasLoaded, buildSavedConfig])

  useEffect(() => {
    if (restoring.current) {
      restoring.current = false
      return
    }
    const stack = history.current
    if (stack.past[stack.past.length - 1] === configSnapshot) return
    stack.past.push(configSnapshot)
    if (stack.past.length > 60) stack.past.shift()
    stack.future = []
    setHistoryTick((value) => value + 1)
  }, [configSnapshot])

  const showToast = (message: string, tone: 'success' | 'error' = 'success') => {
    toastId.current += 1
    setToast({ id: toastId.current, message, tone })
  }

  const requestFit = () => setFitToken((value) => value + 1)
  const setParam = <K extends keyof CabinetParams>(key: K, value: CabinetParams[K]) => setParams((current) => ({ ...current, [key]: value }))

  const applyConfig = (config: SavedConfig) => {
    setProjectName(config.projectName)
    setParams(config.params)
    setTemplateKey(config.templateKey)
    setVariantKey(config.variantKey)
    setTemplateParts(config.templateParts)
    setExtras(config.extras)
    setOverrides(config.overrides)
    setRemoved(config.removed)
    setSelectedId(null)
    setOpenAll(false)
    setTab('catalogue')
    setFitReport([])
    setStep(1)
    requestFit()
  }

  const restoreSnapshot = (snapshot: string) => {
    const config = parseConfig(snapshot)
    if (!config) return
    restoring.current = true
    setProjectName(config.projectName)
    setParams(config.params)
    setTemplateKey(config.templateKey)
    setVariantKey(config.variantKey)
    setTemplateParts(config.templateParts)
    setExtras(config.extras)
    setOverrides(config.overrides)
    setRemoved(config.removed)
    setSelectedId(null)
    setFitReport([])
    requestFit()
  }

  const undo = () => {
    const stack = history.current
    if (stack.past.length <= 1) return
    const current = stack.past.pop()
    if (!current) return
    stack.future.push(current)
    restoreSnapshot(stack.past[stack.past.length - 1])
    setHistoryTick((value) => value + 1)
  }

  const redo = () => {
    const stack = history.current
    const next = stack.future.pop()
    if (!next) return
    stack.past.push(next)
    restoreSnapshot(next)
    setHistoryTick((value) => value + 1)
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable)) return
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        if (event.shiftKey) redo()
        else undo()
        return
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') {
        event.preventDefault()
        redo()
        return
      }
      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedId) {
        event.preventDefault()
        removePart(selectedId)
        return
      }
      if (event.key === 'Escape') {
        setSelectedId(null)
        setQuoteOpen(false)
        setConfirm(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, canUndo, canRedo])

  const saveNow = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, serializeConfig(buildSavedConfig()))
    } catch {
      /* stockage indisponible */
    }
    setSaved(true)
    showToast('Configuration enregistrée sur cet appareil')
    if (savedTimer.current) window.clearTimeout(savedTimer.current)
    savedTimer.current = window.setTimeout(() => setSaved(false), 2200)
  }

  const importFile = async (file: File) => {
    const raw = await file.text()
    const config = parseConfig(raw)
    if (!config) {
      showToast('Fichier de configuration invalide', 'error')
      return
    }
    const apply = () => {
      applyConfig(config)
      showToast('Configuration importée')
    }
    if (isDirty) {
      setConfirm({
        title: 'Importer cette configuration ?',
        message: 'La configuration actuelle sera remplacée par le fichier importé.',
        confirmLabel: 'Importer',
        tone: 'danger',
        onConfirm: apply,
      })
    } else {
      apply()
    }
  }

  const exportConfig = () => {
    const blob = new Blob([serializeConfig(buildSavedConfig())], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'forma-meuble-configuration.json'
    link.click()
    URL.revokeObjectURL(url)
    showToast('Configuration exportée')
  }

  const shareConfig = async () => {
    const url = new URL(window.location.href)
    url.searchParams.set('config', encodeShareConfig(buildSavedConfig()))
    try {
      await navigator.clipboard.writeText(url.toString())
      showToast('Lien de partage copié dans le presse-papiers')
    } catch {
      window.prompt('Copiez ce lien de partage :', url.toString())
    }
  }

  const downloadQuoteSummary = () => {
    const rows = [
      ['Modèle', quoteSummary.model],
      ['Dimensions', quoteSummary.dimensions],
      ['Composition', quoteSummary.composition],
      ['Finition', quoteSummary.finish],
      ['Poignées', quoteSummary.handles],
      ['Socle', quoteSummary.socle],
      ['Estimation', quoteSummary.price],
    ]
    const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Devis FormaMeuble</title><style>body{font-family:Arial,Helvetica,sans-serif;padding:40px;color:#242c2a}h1{font-family:Georgia,serif;font-weight:400}h2{font-family:Georgia,serif;font-weight:400;font-size:18px;margin-top:28px}table{border-collapse:collapse;width:100%;margin-top:20px}td{padding:10px;border-bottom:1px solid #e9ece7;font-size:13px}td:first-child{color:#6b7671;width:38%}p{color:#6b7671;font-size:12px;line-height:1.6}</style></head><body><h1>FormaMeuble.</h1><h2>${escapeHtml(projectName)}</h2><table>${rows.map(([label, value]) => `<tr><td>${escapeHtml(label)}</td><td>${escapeHtml(value)}</td></tr>`).join('')}</table><p>Estimation indicative hors livraison et pose. Ce récapitulatif ne constitue pas un devis contractuel.</p></body></html>`
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'forma-meuble-recapitulatif.html'
    link.click()
    URL.revokeObjectURL(url)
    showToast('Récapitulatif téléchargé')
  }

    const runAutoFit = (delay = 600) => {
    if (fitTimer.current) window.clearTimeout(fitTimer.current)
    setAdjusting(true)
    setFitReport([])
    fitTimer.current = window.setTimeout(() => {
      const report: string[] = []
      if (templateKey) {
        const result = autoFitParts(templateParts)
        setTemplateParts(result.parts)
        report.push(...result.report)
      } else {
        const normalized = normalizeCabinetParams(params)
        setParams(normalized.params)
        report.push(...normalized.report)
        const built = buildCabinetParts(normalized.params)
        if (built.some((part) => part.type === 'door')) report.push('Jeux de façade vérifiés sur les portes')
        if (built.some((part) => part.type === 'drawer')) report.push('Tiroirs alignés et coulissants')
        if (built.some((part) => part.id.startsWith('base-shelf-'))) report.push('Étagères réparties dans le caisson')
        report.push('Épaisseurs et jeux de fabrication conformes')
      }
      if (extras.length > 0) {
        const others = allParts.filter((part) => !extras.some((extra) => extra.id === part.id))
        const overlaps = detectOverlaps(extras, others)
        report.push(overlaps.length ? `${overlaps.length} chevauchement(s) détecté(s) sur les composants ajoutés` : 'Composants ajoutés sans chevauchement')
      }
      if (report.length === 0) report.push('Aucun ajustement nécessaire : le meuble est déjà cohérent')
      setFitReport(Array.from(new Set(report)))
      setAdjusting(false)
      setFitToken((value) => value + 1)
    }, delay)
  }

const chooseTemplate = (key: string | null) => {
    if (fitTimer.current) window.clearTimeout(fitTimer.current)
    setExtras([])
    setOverrides({})
    setRemoved([])
    setSelectedId(null)
    setOpenAll(false)
    setTab('catalogue')
    setFitReport([])
    setAdjusting(false)
    if (!key) {
      setTemplateKey(null)
      setVariantKey(null)
      setTemplateParts([])
      setParams(DEFAULT_PARAMS)
    } else {
      const nextTemplate = TEMPLATES.find((item) => item.key === key)
      if (!nextTemplate) return
      const material = nextTemplate.material
      const color = defaultColorFor(material)
      const defaultVariant = nextTemplate.variants?.find((item) => item.key === nextTemplate.defaultVariant) ?? nextTemplate.variants?.[0]
      const build = defaultVariant?.build ?? nextTemplate.build
      setTemplateKey(key)
      setVariantKey(defaultVariant?.key ?? null)
      setTemplateParts(prepareTemplateParts(build, material, color, 'bar', 'steel'))
      setParams((current) => ({ ...current, material, color, handle: 'bar', handleFinish: 'steel', plinth: 'recessed' }))
    }
    requestFit()
  }

  const requestChooseTemplate = (key: string | null) => {
    if (isDirty) {
      setConfirm({
        title: 'Changer de modèle ?',
        message: 'Les composants ajoutés et les réglages manuels seront perdus.',
        confirmLabel: 'Changer de modèle',
        tone: 'danger',
        onConfirm: () => chooseTemplate(key),
      })
    } else {
      chooseTemplate(key)
    }
  }

  const chooseVariant = (key: string) => {
    if (!template) return
    const nextVariant = template.variants?.find((item) => item.key === key)
    if (!nextVariant) return
    const material = params.material
    const color = params.color ?? defaultColorFor(material)
    setVariantKey(key)
    setTemplateParts(prepareTemplateParts(nextVariant.build, material, color, params.handle ?? 'bar', params.handleFinish ?? 'steel'))
    setExtras([])
    setOverrides({})
    setRemoved([])
    setSelectedId(null)
    setFitReport([])
    setTab('catalogue')
    requestFit()
  }

  const requestChooseVariant = (key: string) => {
    if (isDirty) {
      setConfirm({
        title: 'Changer de variante ?',
        message: 'Les composants ajoutés et les réglages manuels seront perdus.',
        confirmLabel: 'Changer de variante',
        tone: 'danger',
        onConfirm: () => chooseVariant(key),
      })
    } else {
      chooseVariant(key)
    }
  }

  const switchToCustom = () => {
    const summary = templateSummary
    setTemplateKey(null)
    setVariantKey(null)
    setTemplateParts([])
    setExtras([])
    setOverrides({})
    setRemoved([])
    setSelectedId(null)
    setParams((current) => ({
      ...current,
      width: Math.max(300, Math.round(templateBounds.width)),
      height: Math.max(300, Math.round(templateBounds.height)),
      depth: Math.max(150, Math.round(templateBounds.depth)),
      shelves: Math.min(8, summary.shelves),
      drawers: Math.min(6, summary.drawers),
      doors: Math.min(6, summary.doors),
    }))
    setFitReport([])
    requestFit()
  }

  const selectPart = (id: string | null) => {
    setSelectedId(id)
    if (id) setTab('proprietes')
  }

  const updatePart = (id: string, patch: Partial<FurniturePart>) => {
    if (extras.some((part) => part.id === id)) {
      setExtras((current) => current.map((part) => (part.id === id ? { ...part, ...patch } : part)))
    } else {
      setOverrides((current) => ({ ...current, [id]: { ...(current[id] ?? {}), ...patch } }))
    }
  }

  const setDim = (axis: Axis, value: number) => {
    if (!selected) return
    const next = Math.max(2, Math.round(value || 0))
    const patch: Partial<FurniturePart> =
      axis === 'w' ? { w: next }
        : axis === 'h' ? { h: next }
          : axis === 'd' ? { d: next }
            : axis === 'x' ? { x: next }
              : axis === 'y' ? { y: next }
                : axis === 'z' ? { z: next }
                  : { ry: next }
    if (thicknessAxis(selected) === axis) patch.thickness = next
    updatePart(selected.id, patch)
  }

  const changePartMaterial = (material: MaterialId) => {
    if (!selected) return
    const color = defaultColorFor(material)
    const base = { ...selected, material, color }
    const next = selected.thickness >= 10 ? withThickness(base, MATERIALS[material].thickness) : base
    updatePart(selected.id, { material, color, thickness: next.thickness, d: next.d, h: next.h })
  }

  const applyMainMaterial = (material: MaterialId) => {
    const color = defaultColorFor(material)
    const nextThickness = MATERIALS[material].thickness
    const applyTo = (part: FurniturePart): FurniturePart => {
      if (part.material === 'metal' || part.material === 'verre') return part
      const base = { ...part, material, color }
      return part.thickness >= 10 ? withThickness(base, nextThickness) : base
    }
    setParams((current) => ({ ...current, material, color }))
    if (templateKey) setTemplateParts((current) => current.map(applyTo))
    setExtras((current) => current.map(applyTo))
    setOverrides((current) => {
      const next = { ...current }
      for (const part of baseParts) {
        if (part.material === 'metal' || part.material === 'verre') continue
        next[part.id] = { ...(next[part.id] ?? {}), material, color }
      }
      return next
    })
  }

  const applyColor = (color: string) => {
    setParams((current) => ({ ...current, color }))
    const material = params.material
    if (templateKey) setTemplateParts((current) => current.map((part) => (part.material === material ? { ...part, color } : part)))
    setExtras((current) => current.map((part) => (part.material === material ? { ...part, color } : part)))
    setOverrides((current) => {
      const next = { ...current }
      for (const part of baseParts) {
        if (part.material === material) next[part.id] = { ...(next[part.id] ?? {}), color }
      }
      return next
    })
  }

  const applyHandle = (handle: HandleKind, handleFinish: HandleFinish) => {
    setParams((current) => ({ ...current, handle, handleFinish }))
    const patch = (part: FurniturePart): FurniturePart =>
      part.type === 'door' || part.type === 'drawer' ? { ...part, handle, handleFinish } : part
    if (templateKey) setTemplateParts((current) => current.map(patch))
    setExtras((current) => current.map(patch))
    setOverrides((current) => {
      const next = { ...current }
      for (const part of baseParts) {
        if (part.type === 'door' || part.type === 'drawer') next[part.id] = { ...(next[part.id] ?? {}), handle, handleFinish }
      }
      return next
    })
  }

  const applyPlinth = (plinth: PlinthStyle) => setParam('plinth', plinth)

  const addComponent = (key: string) => {
    const def = findComponent(key)
    if (!def) return
    let part = makePart(def)
    if (part.material !== 'metal' && part.material !== 'verre') {
      const color = params.color ?? defaultColorFor(params.material)
      const base = { ...part, material: params.material, color }
      part = part.thickness >= 10 ? withThickness(base, MATERIALS[params.material].thickness) : base
    }
    part.handle = params.handle ?? 'bar'
    part.handleFinish = params.handleFinish ?? 'steel'
    setExtras((current) => [...current, part])
    setSelectedId(part.id)
    setTab('proprietes')
  }

  const duplicatePart = () => {
    if (!selected) return
    const clone: FurniturePart = { ...selected, id: `extra-${Date.now().toString(36)}`, x: selected.x + 80 }
    setExtras((current) => [...current, clone])
    setSelectedId(clone.id)
  }

  const removePart = (id: string) => {
    if (extras.some((part) => part.id === id)) setExtras((current) => current.filter((part) => part.id !== id))
    else setRemoved((current) => (current.includes(id) ? current : [...current, id]))
    setSelectedId((current) => (current === id ? null : current))
  }

  const resetExtras = () => {
    setExtras([])
    setOverrides({})
    setRemoved([])
    setSelectedId(null)
    setOpenAll(false)
    setFitReport([])
    if (templateBuild) {
      setTemplateParts(
        prepareTemplateParts(
          templateBuild,
          params.material,
          params.color ?? defaultColorFor(params.material),
          params.handle ?? 'bar',
          params.handleFinish ?? 'steel',
        ),
      )
    }
    requestFit()
  }

  const requestReset = () => {
    if (isDirty) {
      setConfirm({
        title: 'Réinitialiser les ajouts ?',
        message: 'Les composants ajoutés et les réglages manuels seront supprimés.',
        confirmLabel: 'Réinitialiser',
        tone: 'danger',
        onConfirm: resetExtras,
      })
    } else {
      resetExtras()
    }
  }

  const toggleAll = () => {
    const next = !openAll
    setOpenAll(next)
    sceneRef.current?.setAll(next)
  }

  const movePart = (id: string, x: number, z: number) => updatePart(id, { x, z })

  const toggleCategory = (category: Category) => {
    setCollapsedCategories((current) =>
      current.includes(category) ? current.filter((item) => item !== category) : [...current, category],
    )
  }

  const openRail = (nextTab: 'catalogue' | 'proprietes') => {
    setTab(nextTab)
    window.setTimeout(() => railRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60)
  }

  const goNext = () => {
    if (step === STEPS.length) setQuoteOpen(true)
    else setStep((value) => Math.min(STEPS.length, value + 1))
  }

  const stepTitle = [
    'Choisissez votre point de départ.',
    templateKey ? 'Vérifiez son encombrement.' : 'Donnez-lui ses dimensions.',
    templateKey ? 'Composez votre modèle.' : 'Construisez votre meuble.',
    'Choisissez vos finitions.',
    'Ajustement automatique.',
    'Votre configuration est prête.',
  ][step - 1]
  const stepIntro = [
    "Partez d'un modèle prédéfini ou d'un caisson sur mesure, puis personnalisez chaque détail.",
    templateKey
      ? "Le modèle est prêt : contrôlez son encombrement ou repartez d'un caisson sur mesure."
      : "Réglez l'encombrement hors-tout : le 3D se met à jour en direct.",
    templateKey
      ? 'Le modèle est chargé. Ajoutez des composants ou ajustez chaque pièce dans les propriétés.'
      : 'Ajoutez étagères, tiroirs et portes, ou composez librement depuis le catalogue.',
    'Matériau, teinte, poignées et finitions : tout se règle ici.',
    'Nous alignons automatiquement les panneaux, les ouvrants et les jeux de fabrication.',
    'Vérifiez les détails, ajustez librement puis demandez votre devis.',
  ][step - 1]

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark"><Boxes /></div>
          <div><strong>FormaMeuble<span>.</span></strong><small>CONCEPTEUR DE MOBILIER</small></div>
        </div>
        <div className="topbar-center">
          <span className="project-dot" />
          <input
            className="project-name"
            value={projectName}
            onChange={(event) => setProjectName(event.target.value)}
            aria-label="Nom du projet"
            maxLength={80}
          />
        </div>
        <div className="top-actions">
          <button type="button" className="icon-button" aria-label="Importer une configuration" onClick={() => importInputRef.current?.click()}>
            <Upload />
          </button>
          <button type="button" className="icon-button" aria-label="Partager la configuration" onClick={shareConfig}>
            <Share2 />
          </button>
          <button type="button" className={saved ? 'save-button saved' : 'save-button'} onClick={saveNow}>
            {saved ? <Check /> : <Save />} {saved ? 'Enregistré' : 'Sauvegarder'}
          </button>
          <button type="button" className="avatar" aria-label="Profil utilisateur">MC</button>
        </div>
        <input
          ref={importInputRef}
          type="file"
          accept="application/json,.json"
          className="visually-hidden"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) importFile(file)
            event.target.value = ''
          }}
        />
      </header>

      <div className="studio">
        <div className="progressbar">
          <div className="progress-inner" aria-label="Étapes de configuration">
            <div className="progress-track"><div className="progress-fill" style={{ width: `${((step - 1) / (STEPS.length - 1)) * 100}%` }} /></div>
            {STEPS.map((label, index) => (
              <button
                type="button"
                className={`progress-step ${step === index + 1 ? 'active' : ''} ${step > index + 1 ? 'done' : ''}`}
                onClick={() => setStep(index + 1)}
                aria-current={step === index + 1 ? 'step' : undefined}
                key={label}
              >
                <span>{step > index + 1 ? <Check /> : index + 1}</span>
                <small>{label}</small>
              </button>
            ))}
          </div>
        </div>

        <div className="studio-body">
          <section className="studio-steps">
            <div className="eyebrow">ÉTAPE {String(step).padStart(2, '0')} / {String(STEPS.length).padStart(2, '0')}</div>
            <h1>{stepTitle}</h1>
            <p className="intro">{stepIntro}</p>

            {step === 1 && (
              <div className="form-section">
                <div className="section-heading"><span>Point de départ</span><span className="unit-pill">{TEMPLATES.length + 1} options</span></div>
                {template?.variants && (
                  <div className="variant-section">
                    <div className="subsection-label">Variante · {template.label}</div>
                    <div className="variant-options">
                      {template.variants.map((item) => (
                        <button
                          key={item.key}
                          type="button"
                          className={`variant-option ${variantKey === item.key ? 'selected' : ''}`}
                          onClick={() => requestChooseVariant(item.key)}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="model-list">
                  <button type="button" className={`model-card ${!templateKey ? 'selected' : ''}`} onClick={() => requestChooseTemplate(null)}>
                    <span className="model-icon"><Box /></span>
                    <span className="model-info"><strong>Partir de zéro</strong><small>Caisson sur mesure, entièrement paramétrable</small></span>
                    {!templateKey && <Check />}
                  </button>
                  {TEMPLATES.map((item) => {
                    const Icon = MODEL_ICONS[item.key] ?? Box
                    return (
                      <button type="button" key={item.key} className={`model-card ${templateKey === item.key ? 'selected' : ''}`} onClick={() => requestChooseTemplate(item.key)}>
                        <span className="model-icon"><Icon /></span>
                        <span className="model-info"><strong>{item.label}</strong><small>{item.description}</small></span>
                        {templateKey === item.key && <Check />}
                      </button>
                    )
                  })}
                </div>
                <div className="helper"><Sparkles /> Tous les modèles restent personnalisables</div>
              </div>
            )}

            {step === 2 && (
              <div className="form-section">
                {templateKey && template ? (
                  <>
                    <div className="section-heading"><span>Dimensions hors-tout</span><span className="unit-pill">Modèle prédéfini</span></div>
                    <div className="template-card">
                      <div className="template-card-icon"><Box /></div>
                      <div><strong>{template.label}{variant ? ` · ${variant.label}` : ''}</strong><span>{template.description}</span></div>
                    </div>
                    <div className="review-card">
                      <div className="review-row"><span>Largeur</span><strong>{dimensions.width} mm</strong></div>
                      <div className="review-row"><span>Hauteur</span><strong>{dimensions.height} mm</strong></div>
                      <div className="review-row"><span>Profondeur</span><strong>{dimensions.depth} mm</strong></div>
                    </div>
                    <button type="button" className="ghost-add" onClick={switchToCustom}><Box /> Repartir d&apos;un caisson sur mesure</button>
                  </>
                ) : (
                  <>
                    <div className="section-heading"><span>Dimensions hors-tout</span><span className="unit-pill">mm</span></div>
                    <div className="dimension-grid">
                      <DimensionField label="Largeur" value={params.width} onChange={(value) => setParam('width', value)} />
                      <DimensionField label="Hauteur" value={params.height} onChange={(value) => setParam('height', value)} />
                      <DimensionField label="Profondeur" value={params.depth} onChange={(value) => setParam('depth', value)} />
                    </div>
                    <div className="helper"><Check /> Dimensions compatibles avec nos standards de fabrication</div>
                  </>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="form-section">
                {templateKey ? (
                  <>
                    <div className="section-heading"><span>Composition du modèle</span><span className="unit-pill">{templateParts.length} pièces</span></div>
                    <div className="component-list">
                      {templateComposition.map(({ label, description, count, Icon }) => (
                        <div className="component-row static" key={label}>
                          <div className="component-icon"><Icon /></div>
                          <div className="component-info"><strong>{label}</strong><span>{description}</span></div>
                          <b className="static-count">{count}</b>
                        </div>
                      ))}
                    </div>
                    <button type="button" className="ghost-add" onClick={() => openRail('catalogue')}><Plus /> Ajouter un composant depuis le catalogue</button>
                  </>
                ) : (
                  <>
                    <div className="section-heading"><span>Éléments du meuble</span><span className="unit-pill">{params.shelves + params.drawers + params.doors} éléments</span></div>
                    <div className="component-list">
                      {([
                        ['shelves', 'Étagère', 'Ranger et exposer', params.shelves, Rows3],
                        ['drawers', 'Tiroir', 'Rangement discret', params.drawers, Archive],
                        ['doors', 'Porte', 'Structurer et protéger', params.doors, DoorClosed],
                      ] as const).map(([key, label, description, count, Icon]) => (
                        <div className="component-row" key={key}>
                          <div className="component-icon"><Icon /></div>
                          <div className="component-info"><strong>{label}</strong><span>{description}</span></div>
                          <div className="stepper">
                            <button onClick={() => setParam(key, Math.max(0, count - 1))} aria-label={`Retirer ${label}`}><Minus /></button>
                            <b>{count}</b>
                            <button onClick={() => setParam(key, count + 1)} aria-label={`Ajouter ${label}`}><Plus /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <button className="ghost-add" onClick={() => openRail('catalogue')}><Plus /> Ouvrir le catalogue de composants</button>
                  </>
                )}
              </div>
            )}

            {step === 4 && (
              <div className="form-section">
                <div className="section-heading"><span>Matériau principal</span><span className="unit-pill">Panneaux</span></div>
                <div className="finish-card">
                  <div className="finish-preview" style={{ backgroundColor: params.color ?? MATERIALS[params.material].color }} />
                  <div><strong>{MATERIALS[params.material].name} · {colorName}</strong><span>Épaisseur {MATERIALS[params.material].thickness} mm</span></div>
                  <Sparkles />
                </div>
                <div className="material-grid">
                  {MATERIAL_LIST.map((material) => (
                    <button
                      key={material.id}
                      className={`material-chip ${params.material === material.id ? 'selected' : ''}`}
                      onClick={() => applyMainMaterial(material.id)}
                      disabled={!material.structural}
                      title={!material.structural ? 'Disponible pour les pièces décoratives, pas pour la structure' : undefined}
                    >
                      <span className="material-dot" style={{ backgroundColor: material.color }} />
                      {material.name}
                    </button>
                  ))}
                </div>
                <p className="material-note">Les matériaux techniques (acier, verre) se choisissent pièce par pièce dans les propriétés.</p>

                <div className="section-heading"><span>Couleur</span><span className="unit-pill">{MATERIALS[params.material].colors.length} teintes</span></div>
                <div className="color-options">
                  {MATERIALS[params.material].colors.map((color) => (
                    <button
                      key={color.hex}
                      type="button"
                      className={`color-option ${(params.color ?? defaultColorFor(params.material)) === color.hex ? 'selected' : ''}`}
                      onClick={() => applyColor(color.hex)}
                      title={color.name}
                    >
                      <span className="color-dot" style={{ backgroundColor: color.hex }} />
                      <small>{color.name}</small>
                    </button>
                  ))}
                </div>

                <div className="section-heading"><span>Poignées</span><span className="unit-pill">Toutes les ouvertures</span></div>
                <div className="handle-grid">
                  {HANDLES.map((handle) => (
                    <button
                      key={handle.value}
                      type="button"
                      className={`handle-option ${(params.handle ?? 'bar') === handle.value ? 'selected' : ''}`}
                      onClick={() => applyHandle(handle.value, params.handleFinish ?? 'steel')}
                    >
                      {handle.label}
                    </button>
                  ))}
                </div>
                <div className="subsection-label">Finition des poignées</div>
                <div className="finish-options">
                  {HANDLE_FINISHES.map((finish) => (
                    <button
                      key={finish.id}
                      type="button"
                      className={`finish-option ${(params.handleFinish ?? 'steel') === finish.id ? 'selected' : ''}`}
                      onClick={() => applyHandle(params.handle ?? 'bar', finish.id)}
                    >
                      <span className="finish-dot" style={{ backgroundColor: finish.color }} />
                      {finish.name}
                    </button>
                  ))}
                </div>

                {!templateKey && (
                  <>
                    <div className="section-heading"><span>Socle</span><span className="unit-pill">Caisson</span></div>
                    <div className="segmented">
                      {PLINTH_STYLES.map((plinth) => (
                        <button
                          key={plinth.id}
                          type="button"
                          className={(params.plinth ?? 'recessed') === plinth.id ? 'active' : ''}
                          onClick={() => applyPlinth(plinth.id)}
                        >
                          {plinth.name}
                        </button>
                      ))}
                    </div>
                  </>
                )}

                <div className="helper"><Sparkles /> D&apos;autres finitions seront disponibles prochainement</div>
              </div>
            )}

            {step === 5 && (
              <div className="form-section">
                <div className="section-heading"><span>Ajustement automatique</span><span className="unit-pill">{adjusting ? 'En cours' : 'Terminé'}</span></div>
                <div className={`fit-status ${adjusting ? 'is-running' : fitHasWarnings ? 'is-warning' : 'is-done'}`} role="status" aria-live="polite">
                  <span className="fit-status-icon">{adjusting ? <LoaderCircle className="spin" /> : fitHasWarnings ? <TriangleAlert /> : <Check />}</span>
                  <div>
                    <strong>{adjusting ? 'Emboîtement en cours…' : fitHasWarnings ? 'Ajustement terminé avec avertissements' : 'Composants ajustés'}</strong>
                    <span>{adjusting ? 'Recalcul des jeux, des épaisseurs et des façades.' : fitHasWarnings ? 'Des composants ajoutés se chevauchent : ajustez leur position.' : 'Le meuble est cohérent et prêt à être fabriqué.'}</span>
                  </div>
                </div>
                <ul className="fit-list">
                  {fitReport.map((line) => (
                    <li key={line} className={line.includes('chevauchement') ? 'is-warning' : undefined}>{line.includes('chevauchement') ? <TriangleAlert /> : <Check />} {line}</li>
                  ))}
                </ul>
                {!adjusting && (
                  <button type="button" className="ghost-add" onClick={() => runAutoFit(350)}><RefreshCw /> Relancer l&apos;ajustement</button>
                )}
              </div>
            )}

            {step === 6 && (
              <>
                <div className="review-card">
                  <div className="review-row"><span>Modèle</span><strong>{template?.label ?? 'Caisson sur mesure'}{variant ? ` · ${variant.label}` : ''}</strong></div>
                  <div className="review-row"><span>Dimensions</span><strong>{dimensions.width} × {dimensions.height} × {dimensions.depth} mm</strong></div>
                  <div className="review-row"><span>Composition</span><strong>{compositionText}</strong></div>
                  <div className="review-row"><span>Finition</span><strong>{MATERIALS[params.material].name} · {colorName}</strong></div>
                  <div className="review-row"><span>Poignées</span><strong>{handleLabel} · {handleFinishName}</strong></div>
                  {!templateKey && <div className="review-row"><span>Socle</span><strong>{plinthName}</strong></div>}
                  <div className="review-row"><span>Composants ajoutés</span><strong>{extras.length}</strong></div>
                  {liveOverlaps.length > 0 ? (
                    <div className="validation-warning"><TriangleAlert /> {liveOverlaps.length} composant(s) ajouté(s) se chevauchent — ajustez leur position.</div>
                  ) : (
                    <div className="validation-ok"><Check /> Configuration cohérente et fabricable</div>
                  )}
                </div>
                <div className="validation-actions">
                  <button type="button" className="ghost-add" onClick={exportConfig}><Download /> Exporter la configuration</button>
                  <button type="button" className="ghost-add" onClick={() => setQuoteOpen(true)}><Send /> Demander un devis</button>
                </div>
              </>
            )}

            <div className="builder-footer">
              <button className="back-button" disabled={step === 1} onClick={() => setStep((value) => Math.max(1, value - 1))}><ArrowLeft /> Retour</button>
              <button className="next-button" disabled={step === 5 && adjusting} onClick={goNext}>
                {step === STEPS.length ? <><Send /> Demander un devis</> : <>Continuer <ArrowRight /></>}
              </button>
            </div>

            <div className="price-card studio-price">
              <div className="price-main">
                <span>Estimation actuelle</span>
                <strong>{priceBreakdown.total.toLocaleString('fr-FR')} € <small>HT</small></strong>
                <p className="price-note">Hors livraison et pose</p>
              </div>
              <button type="button" className="price-detail-toggle" onClick={() => setShowPriceDetail((value) => !value)} aria-expanded={showPriceDetail}>
                {showPriceDetail ? 'Masquer le détail' : 'Détail du prix'}
              </button>
              {showPriceDetail && (
                <ul className="price-detail">
                  {priceBreakdown.items.map((item) => (
                    <li key={item.label}>
                      <span>{item.label}</span>
                      <strong>{item.amount >= 0 ? '+' : '−'}{Math.abs(item.amount).toLocaleString('fr-FR')} €</strong>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section className="studio-center">
            <div className="atelier-bar">
              <div className="atelier-tools">
                <button type="button" className="chip" onClick={toggleAll} aria-pressed={openAll}><DoorOpen /> {openAll ? 'Tout fermer' : 'Tout ouvrir'}</button>
                <button type="button" className="chip" onClick={requestFit}><Crosshair /> Recadrer</button>
                <button type="button" className="chip danger" onClick={requestReset}><Trash2 /> Réinitialiser</button>
                <button type="button" className="chip icon-chip" onClick={undo} disabled={!canUndo} aria-label="Annuler" title="Annuler (Ctrl+Z)"><Undo2 /></button>
                <button type="button" className="chip icon-chip" onClick={redo} disabled={!canRedo} aria-label="Rétablir" title="Rétablir (Ctrl+Shift+Z)"><Redo2 /></button>
              </div>
              <div className="atelier-tools view-tools">
                <button type="button" className="chip" onClick={() => sceneRef.current?.setView('front')}>Face</button>
                <button type="button" className="chip" onClick={() => sceneRef.current?.setView('side')}>Côté</button>
                <button type="button" className="chip" onClick={() => sceneRef.current?.setView('top')}>Dessus</button>
              </div>
            </div>
            <div className={`studio-stage ${adjusting ? 'is-adjusting' : ''}`}>
              <Scene3D
                ref={sceneRef}
                className="atelier-canvas"
                parts={parts}
                selectedId={selectedId}
                onSelect={selectPart}
                onMove={movePart}
                onToggle={() => setOpenAll(false)}
                interactive
              />
              <span className="scene-hint">Glisser pour orbiter · Double-clic : ouvrir/fermer · Pas de 10 mm</span>
            </div>
          </section>

          <aside className="studio-rail" ref={railRef}>
            <div className="rail-tabs" role="tablist" aria-label="Catalogue et propriétés">
              <button
                type="button"
                role="tab"
                id="tab-catalogue"
                aria-selected={tab === 'catalogue'}
                aria-controls="rail-panel"
                className={`rail-tab ${tab === 'catalogue' ? 'active' : ''}`}
                onClick={() => setTab('catalogue')}
              >
                <Plus /> Catalogue
              </button>
              <button
                type="button"
                role="tab"
                id="tab-proprietes"
                aria-selected={tab === 'proprietes'}
                aria-controls="rail-panel"
                className={`rail-tab ${tab === 'proprietes' ? 'active' : ''}`}
                onClick={() => setTab('proprietes')}
              >
                <Grid2X2 /> Propriétés
              </button>
            </div>
            <div className="rail-body" id="rail-panel" role="tabpanel" aria-labelledby={tab === 'catalogue' ? 'tab-catalogue' : 'tab-proprietes'}>
              {tab === 'catalogue' && (
                <div className="palette">
                  <label className="catalogue-search">
                    <Search />
                    <input
                      value={catalogueQuery}
                      onChange={(event) => setCatalogueQuery(event.target.value)}
                      placeholder="Rechercher un composant…"
                      aria-label="Rechercher un composant"
                    />
                  </label>
                  {CATEGORY_ORDER.map((category) => {
                    const items = filteredComponents.filter((component) => component.category === category)
                    if (!items.length) return null
                    const collapsed = !normalizedQuery && collapsedCategories.includes(category)
                    return (
                      <div className="palette-group" key={category}>
                        <button type="button" className={`palette-heading ${collapsed ? 'collapsed' : ''}`} onClick={() => toggleCategory(category)} aria-expanded={!collapsed}>
                          <span>{CATEGORY_LABELS[category]}</span>
                          <span className="palette-count">{items.length}</span>
                          <ChevronDown />
                        </button>
                        {!collapsed && (
                          <div className="palette-list">
                            {items.map((component) => (
                              <button key={component.key} type="button" className="palette-btn" onClick={() => addComponent(component.key)}>
                                <Plus /> {component.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                  {!filteredComponents.length && <p className="props-empty">Aucun composant ne correspond à cette recherche.</p>}
                </div>
              )}

              {tab === 'proprietes' && (
                <>
                  {!selected && (
                    <>
                      <p className="props-empty">Sélectionnez un composant dans la scène (ou ajoutez-en un) pour régler ses dimensions, son matériau et ses options.</p>
                      <div className="parts-list" aria-label="Pièces du modèle">
                        {parts.map((part) => (
                          <button key={part.id} type="button" className={`parts-item ${selectedId === part.id ? 'selected' : ''}`} onClick={() => selectPart(part.id)}>
                            <span>{part.label}</span>
                            <small>{part.type}</small>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                  {selected && (
                    <div className="props">
                      <div className="props-title">{selected.label}</div>

                      <div className="props-group">
                        <h4>Dimensions (mm)</h4>
                        <div className="props-grid">
                          <NumberField label="Largeur" value={selected.w} onChange={(value) => setDim('w', value)} />
                          <NumberField label="Hauteur" value={selected.h} onChange={(value) => setDim('h', value)} />
                          <NumberField label="Profondeur" value={selected.d} onChange={(value) => setDim('d', value)} />
                        </div>
                      </div>

                      <div className="props-group">
                        <h4>Matériau</h4>
                        <select value={selected.material} onChange={(event) => changePartMaterial(event.target.value as MaterialId)}>
                          {MATERIAL_LIST.map((material) => (
                            <option key={material.id} value={material.id}>{material.name}</option>
                          ))}
                        </select>
                        <div className="props-grid">
                          <label className="prop-field wide">
                            <span>Teinte</span>
                            <select value={selected.color ?? defaultColorFor(selected.material)} onChange={(event) => updatePart(selected.id, { color: event.target.value })}>
                              {MATERIALS[selected.material].colors.map((color) => (
                                <option key={color.hex} value={color.hex}>{color.name}</option>
                              ))}
                            </select>
                          </label>
                          {thicknessAxis(selected) && (
                            <NumberField label="Épaisseur" value={selected.thickness} step={1} onChange={(value) => updatePart(selected.id, withThickness(selected, value))} />
                          )}
                        </div>
                      </div>

                      {shapeOptions(selected).length > 0 && (
                        <div className="props-group">
                          <h4>Forme</h4>
                          <select value={selected.shape ?? 'rect'} onChange={(event) => updatePart(selected.id, { shape: event.target.value as PartShape })}>
                            {shapeOptions(selected).map((shape) => (
                              <option key={shape} value={shape}>{shape === 'rect' ? 'Rectangulaire' : shape === 'round' ? 'Rond' : shape === 'oval' ? 'Ovale' : shape === 'rounded' ? 'Angles arrondis' : shape === 'l' ? 'En L' : 'Conique'}</option>
                            ))}
                          </select>
                          {selected.shape === 'rounded' && (
                            <div className="props-grid">
                              <NumberField label="Rayon" value={selected.cornerRadius ?? 50} step={5} onChange={(value) => updatePart(selected.id, { cornerRadius: Math.max(5, Math.round(value)) })} />
                            </div>
                          )}
                        </div>
                      )}

                      {(selected.type === 'door' || selected.type === 'drawer' || selected.type === 'shelf') && (
                        <div className="props-group">
                          <h4>Options</h4>
                          {selected.type === 'door' && (
                            <label className="prop-field">
                              <span>Battants</span>
                              <select
                                value={selected.leaves ?? 1}
                                onChange={(event) => {
                                  const leaves = Number(event.target.value) as 1 | 2
                                  updatePart(selected.id, { leaves, motion: leaves === 2 ? 'hinge-left' : selected.motion })
                                }}
                              >
                                <option value={1}>Simple</option>
                                <option value={2}>Double</option>
                              </select>
                            </label>
                          )}
                          {selected.type === 'door' && (selected.leaves ?? 1) === 1 && (
                            <label className="prop-field">
                              <span>Côté de charnière</span>
                              <select
                                value={selected.hinge ?? 'left'}
                                onChange={(event) => {
                                  const hinge = event.target.value as 'left' | 'right'
                                  const isHinge = selected.motion === 'hinge-left' || selected.motion === 'hinge-right' || selected.motion == null
                                  updatePart(selected.id, { hinge, motion: isHinge ? (hinge === 'left' ? 'hinge-left' : 'hinge-right') : selected.motion })
                                }}
                              >
                                <option value="left">Gauche</option>
                                <option value="right">Droite</option>
                              </select>
                            </label>
                          )}
                          <label className="prop-field">
                            <span>Mouvement</span>
                            <select
                              value={selected.motion ?? 'none'}
                              onChange={(event) => {
                                const motion = event.target.value as Motion
                                const hinge = motion === 'hinge-left' ? 'left' : motion === 'hinge-right' ? 'right' : selected.hinge
                                updatePart(selected.id, { motion, hinge })
                              }}
                            >
                              {motionOptions(selected).map((motion) => (
                                <option key={motion} value={motion}>{MOTION_LABELS[motion]}</option>
                              ))}
                            </select>
                          </label>
                          <label className="prop-field">
                            <span>Poignée</span>
                            <select value={selected.handle ?? 'bar'} onChange={(event) => updatePart(selected.id, { handle: event.target.value as HandleKind })}>
                              {HANDLES.map((handle) => (
                                <option key={handle.value} value={handle.value}>{handle.label}</option>
                              ))}
                            </select>
                          </label>
                          <label className="prop-field">
                            <span>Finition poignée</span>
                            <select value={selected.handleFinish ?? 'steel'} onChange={(event) => updatePart(selected.id, { handleFinish: event.target.value as HandleFinish })}>
                              {HANDLE_FINISHES.map((finish) => (
                                <option key={finish.id} value={finish.id}>{finish.name}</option>
                              ))}
                            </select>
                          </label>
                        </div>
                      )}

                      <div className="props-group">
                        <h4>Position (mm)</h4>
                        <div className="props-grid">
                          <NumberField label="X" value={selected.x} onChange={(value) => setDim('x', value)} />
                          <NumberField label="Y" value={selected.y} onChange={(value) => setDim('y', value)} />
                          <NumberField label="Z" value={selected.z} onChange={(value) => setDim('z', value)} />
                        </div>
                        <div className="props-grid">
                          <NumberField label="Rotation Y (°)" value={selected.ry} step={15} onChange={(value) => updatePart(selected.id, { ry: value })} />
                        </div>
                      </div>

                      <div className="props-actions">
                        {isOpening(selected) && (
                          <button type="button" onClick={() => sceneRef.current?.toggle(selected.id)}><DoorOpen /> Ouvrir / Fermer</button>
                        )}
                        <button type="button" onClick={duplicatePart}><Copy /> Dupliquer</button>
                        <button type="button" onClick={() => updatePart(selected.id, { y: selected.h / 2 })}>Poser au sol</button>
                        <button type="button" className="danger" onClick={() => removePart(selected.id)}><Trash2 /> Supprimer</button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </aside>
        </div>

        <div className="studio-mobile-bar">
          <div className="studio-mobile-price">
            <span>Estimation</span>
            <strong>{priceBreakdown.total.toLocaleString('fr-FR')} € <small>HT</small></strong>
          </div>
          <div className="studio-mobile-actions">
            <button type="button" className="ghost-button" onClick={() => openRail('catalogue')}><Plus /> Catalogue</button>
            <button type="button" className="next-button" disabled={step === 5 && adjusting} onClick={goNext}>
              {step === STEPS.length ? 'Devis' : 'Continuer'}
            </button>
          </div>
        </div>
      </div>

      <footer className="site-footer">
        <span><span className="status-dot" /> Modifications enregistrées automatiquement sur cet appareil</span>
        <span>Besoin d&apos;aide ? <button type="button" className="footer-link" onClick={() => setQuoteOpen(true)}>Parler à un conseiller</button></span>
      </footer>

      <Toast toast={toast} onClose={() => setToast(null)} />
      <ConfirmDialog state={confirm} onClose={() => setConfirm(null)} />
      <QuoteDialog open={quoteOpen} onClose={() => setQuoteOpen(false)} summary={quoteSummary} onDownload={downloadQuoteSummary} />
    </main>
  )
}

export default Studio
