'use client'

import {
  MATERIALS,
  TEMPLATES,
  normalizeCabinetParams,
  type CabinetParams,
  type FurniturePart,
  type HandleFinish,
  type HandleKind,
  type MaterialId,
  type Motion,
  type PartShape,
  type PartType,
  type PlinthStyle,
} from './catalog'

export const STORAGE_KEY = 'forma-meuble:draft'
export const QUOTES_KEY = 'forma-meuble:quotes'

export type SavedConfig = {
  version: 1
  projectName: string
  savedAt: string
  params: CabinetParams
  templateKey: string | null
  variantKey: string | null
  templateParts: FurniturePart[]
  extras: FurniturePart[]
  overrides: Record<string, Partial<FurniturePart>>
  removed: string[]
}

export type QuoteRequest = {
  id: string
  createdAt: string
  name: string
  email: string
  phone: string
  message: string
  summary: {
    model: string
    dimensions: string
    composition: string
    finish: string
    handles: string
    socle: string
    price: string
  }
}

const PART_TYPES: PartType[] = ['panel', 'shelf', 'drawer', 'door', 'top', 'leg', 'rail', 'plinth', 'niche', 'rod']
const HANDLE_KINDS: HandleKind[] = ['bar', 'knob', 'recess', 'none']
const HANDLE_FINISH_VALUES: HandleFinish[] = ['steel', 'black', 'brass', 'wood']
const MOTIONS: Motion[] = ['hinge-left', 'hinge-right', 'slide-x', 'tilt-down', 'tilt-up', 'slide-z', 'none']
const SHAPES: PartShape[] = ['rect', 'round', 'oval', 'rounded', 'l', 'conical']
const PLINTHS: PlinthStyle[] = ['recessed', 'flush', 'none']

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)

const clampNumber = (value: unknown, fallback: number, min: number, max: number) => {
  const number = typeof value === 'number' && Number.isFinite(value) ? value : fallback
  return Math.min(max, Math.max(min, Math.round(number)))
}

const text = (value: unknown, fallback = '', max = 120) => (typeof value === 'string' ? value.slice(0, max) : fallback)

const isMaterial = (value: unknown): value is MaterialId => typeof value === 'string' && value in MATERIALS
const isHex = (value: unknown): value is string => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value)

function parsePart(raw: unknown, index: number): FurniturePart | null {
  if (!isRecord(raw)) return null
  if (!PART_TYPES.includes(raw.type as PartType)) return null
  if (!isMaterial(raw.material)) return null
  const type = raw.type as PartType
  const material = raw.material as MaterialId
  const handle = HANDLE_KINDS.includes(raw.handle as HandleKind) ? (raw.handle as HandleKind) : undefined
  const handleFinish = HANDLE_FINISH_VALUES.includes(raw.handleFinish as HandleFinish) ? (raw.handleFinish as HandleFinish) : undefined
  const motion = MOTIONS.includes(raw.motion as Motion) ? (raw.motion as Motion) : undefined
  const shape = SHAPES.includes(raw.shape as PartShape) ? (raw.shape as PartShape) : undefined
  const hinge = raw.hinge === 'left' || raw.hinge === 'right' ? raw.hinge : undefined
  const leaves = raw.leaves === 2 ? 2 : raw.leaves === 1 ? 1 : undefined
  const id = text(raw.id, `import-${index}`, 80)

  return {
    id,
    type,
    label: text(raw.label, 'Composant', 80),
    material,
    color: isHex(raw.color) ? raw.color : undefined,
    thickness: clampNumber(raw.thickness, MATERIALS[material]?.thickness ?? 18, 2, 100),
    w: clampNumber(raw.w, 100, 2, 5000),
    h: clampNumber(raw.h, 100, 2, 5000),
    d: clampNumber(raw.d, 100, 2, 5000),
    x: clampNumber(raw.x, 0, -10000, 10000),
    y: clampNumber(raw.y, 0, -5000, 10000),
    z: clampNumber(raw.z, 0, -10000, 10000),
    ry: clampNumber(raw.ry, 0, -360, 360),
    shape,
    cornerRadius: typeof raw.cornerRadius === 'number' ? clampNumber(raw.cornerRadius, 50, 0, 500) : undefined,
    leaves,
    hinge,
    motion,
    handle,
    handleFinish,
    open: typeof raw.open === 'number' ? Math.min(1, Math.max(0, raw.open)) : 0,
  }
}

function parsePartialPart(raw: unknown): Partial<FurniturePart> | null {
  if (!isRecord(raw)) return null
  const patch: Partial<FurniturePart> = {}
  if (typeof raw.label === 'string') patch.label = text(raw.label, 'Composant', 80)
  if (isMaterial(raw.material)) patch.material = raw.material
  if (isHex(raw.color)) patch.color = raw.color
  if (typeof raw.thickness === 'number') patch.thickness = clampNumber(raw.thickness, 18, 2, 100)
  if (typeof raw.w === 'number') patch.w = clampNumber(raw.w, 100, 2, 5000)
  if (typeof raw.h === 'number') patch.h = clampNumber(raw.h, 100, 2, 5000)
  if (typeof raw.d === 'number') patch.d = clampNumber(raw.d, 100, 2, 5000)
  if (typeof raw.x === 'number') patch.x = clampNumber(raw.x, 0, -10000, 10000)
  if (typeof raw.y === 'number') patch.y = clampNumber(raw.y, 0, -5000, 10000)
  if (typeof raw.z === 'number') patch.z = clampNumber(raw.z, 0, -10000, 10000)
  if (typeof raw.ry === 'number') patch.ry = clampNumber(raw.ry, 0, -360, 360)
  if (SHAPES.includes(raw.shape as PartShape)) patch.shape = raw.shape as PartShape
  if (typeof raw.cornerRadius === 'number') patch.cornerRadius = clampNumber(raw.cornerRadius, 50, 0, 500)
  if (raw.leaves === 1 || raw.leaves === 2) patch.leaves = raw.leaves
  if (raw.hinge === 'left' || raw.hinge === 'right') patch.hinge = raw.hinge
  if (MOTIONS.includes(raw.motion as Motion)) patch.motion = raw.motion as Motion
  if (HANDLE_KINDS.includes(raw.handle as HandleKind)) patch.handle = raw.handle as HandleKind
  if (HANDLE_FINISH_VALUES.includes(raw.handleFinish as HandleFinish)) patch.handleFinish = raw.handleFinish as HandleFinish
  if (typeof raw.open === 'number') patch.open = Math.min(1, Math.max(0, raw.open))
  return patch
}

function parseParts(raw: unknown): FurniturePart[] {
  if (!Array.isArray(raw)) return []
  const ids = new Set<string>()
  const parts: FurniturePart[] = []
  for (let index = 0; index < raw.length && parts.length < 400; index += 1) {
    const part = parsePart(raw[index], index)
    if (!part) continue
    let id = part.id
    let suffix = 1
    while (ids.has(id)) {
      suffix += 1
      id = `${part.id}-${suffix}`
    }
    ids.add(id)
    parts.push({ ...part, id })
  }
  return parts
}

export function parseConfig(value: string): SavedConfig | null {
  let raw: unknown
  try {
    raw = JSON.parse(value)
  } catch {
    return null
  }
  if (!isRecord(raw)) return null
  if (raw.version != null && raw.version !== 1) return null
  const paramsRaw = raw.params
  if (!isRecord(paramsRaw)) return null
  if (!isMaterial(paramsRaw.material)) return null

  const normalized = normalizeCabinetParams({
    width: Number(paramsRaw.width ?? 1200),
    height: Number(paramsRaw.height ?? 2100),
    depth: Number(paramsRaw.depth ?? 450),
    shelves: Number(paramsRaw.shelves ?? 3),
    drawers: Number(paramsRaw.drawers ?? 2),
    doors: Number(paramsRaw.doors ?? 2),
    material: paramsRaw.material,
    color: isHex(paramsRaw.color) ? paramsRaw.color : undefined,
    handle: HANDLE_KINDS.includes(paramsRaw.handle as HandleKind) ? (paramsRaw.handle as HandleKind) : 'bar',
    handleFinish: HANDLE_FINISH_VALUES.includes(paramsRaw.handleFinish as HandleFinish) ? (paramsRaw.handleFinish as HandleFinish) : 'steel',
    plinth: PLINTHS.includes(paramsRaw.plinth as PlinthStyle) ? (paramsRaw.plinth as PlinthStyle) : 'recessed',
  })

  const templateKey = typeof raw.templateKey === 'string' && TEMPLATES.some((template) => template.key === raw.templateKey) ? raw.templateKey : null
  const template = TEMPLATES.find((item) => item.key === templateKey)
  const variantKey = template?.variants?.some((variant) => variant.key === raw.variantKey)
    ? (raw.variantKey as string)
    : template?.defaultVariant ?? null

  const overrides: Record<string, Partial<FurniturePart>> = {}
  if (isRecord(raw.overrides)) {
    for (const [id, patchRaw] of Object.entries(raw.overrides).slice(0, 400)) {
      const patch = parsePartialPart(patchRaw)
      if (patch) overrides[id.slice(0, 80)] = patch
    }
  }

  return {
    version: 1,
    projectName: text(raw.projectName, 'Projet sans titre', 80).trim() || 'Projet sans titre',
    savedAt: text(raw.savedAt, new Date().toISOString(), 40),
    params: normalized.params,
    templateKey,
    variantKey,
    templateParts: parseParts(raw.templateParts),
    extras: parseParts(raw.extras),
    overrides,
    removed: Array.isArray(raw.removed) ? raw.removed.filter((id): id is string => typeof id === 'string').slice(0, 400) : [],
  }
}

export function serializeConfig(config: SavedConfig): string {
  return JSON.stringify(config, null, 2)
}

export function encodeShareConfig(config: SavedConfig): string {
  const bytes = new TextEncoder().encode(serializeConfig(config))
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

export function decodeShareConfig(value: string): SavedConfig | null {
  try {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4)
    const binary = atob(padded)
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
    return parseConfig(new TextDecoder().decode(bytes))
  } catch {
    return null
  }
}
