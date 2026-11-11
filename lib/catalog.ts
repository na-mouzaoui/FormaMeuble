'use client'

/**
 * Catalogue de composants du configurateur.
 *
 * Toutes les longueurs sont exprimées en millimètres.
 * L'origine est au sol, au centre du meuble : y = 0 correspond au sol,
 * la position d'un composant correspond au centre de sa boîte englobante.
 *
 * Convention d'épaisseur :
 *  - panneau / traverse / plinthe / porte : l'épaisseur est sur l'axe d (profondeur) ;
 *  - étagère / plateau : l'épaisseur est sur l'axe h (hauteur).
 * Un panneau vertical (côté, cloison) se place en le tournant de 90° (ry).
 */

export type MaterialId = 'chene' | 'noyer' | 'blanc' | 'sauge' | 'melamine' | 'metal' | 'verre'

export type MaterialColor = {
  id: string
  name: string
  hex: string
}

export type Material = {
  id: MaterialId
  name: string
  color: string
  colors: MaterialColor[]
  roughness: number
  metalness: number
  opacity?: number
  /** Épaisseur standard en mm pour ce matériau. */
  thickness: number
  /** Le matériau peut-il servir de panneau structurel principal ? */
  structural: boolean
  /** Coefficient appliqué au prix de base. */
  priceFactor: number
}

const WOOD_COLORS: MaterialColor[] = [
  { id: 'naturel', name: 'Naturel', hex: '#c9a274' },
  { id: 'miel', name: 'Miel', hex: '#b98a55' },
  { id: 'blanchi', name: 'Blanchi', hex: '#d8c3a5' },
  { id: 'fume', name: 'Fumé', hex: '#8a6a4a' },
]

export const MATERIALS: Record<MaterialId, Material> = {
  chene: { id: 'chene', name: 'Chêne', color: '#c9a274', colors: WOOD_COLORS, roughness: 0.72, metalness: 0.02, thickness: 18, structural: true, priceFactor: 1 },
  noyer: {
    id: 'noyer',
    name: 'Noyer fumé',
    color: '#5d4436',
    colors: [
      { id: 'fume', name: 'Fumé', hex: '#5d4436' },
      { id: 'ebene', name: 'Ébène', hex: '#3f2d24' },
      { id: 'rouille', name: 'Rouille', hex: '#7a4a32' },
    ],
    roughness: 0.7,
    metalness: 0.02,
    thickness: 18,
    structural: true,
    priceFactor: 1.15,
  },
  blanc: {
    id: 'blanc',
    name: 'Blanc cassé',
    color: '#e9e3d7',
    colors: [
      { id: 'lin', name: 'Lin', hex: '#e9e3d7' },
      { id: 'craie', name: 'Craie', hex: '#f4f1ea' },
      { id: 'argile', name: 'Argile', hex: '#ddd2c0' },
    ],
    roughness: 0.78,
    metalness: 0.02,
    thickness: 18,
    structural: true,
    priceFactor: 0.95,
  },
  sauge: {
    id: 'sauge',
    name: 'Vert sauge',
    color: '#93a088',
    colors: [
      { id: 'sauge', name: 'Sauge', hex: '#93a088' },
      { id: 'clair', name: 'Sauge clair', hex: '#b3bda8' },
      { id: 'eucalyptus', name: 'Eucalyptus', hex: '#6f8474' },
    ],
    roughness: 0.74,
    metalness: 0.02,
    thickness: 18,
    structural: true,
    priceFactor: 1,
  },
  melamine: {
    id: 'melamine',
    name: 'Mélaminé blanc',
    color: '#f3f0ea',
    colors: [
      { id: 'pur', name: 'Blanc pur', hex: '#f6f4ef' },
      { id: 'perle', name: 'Gris perle', hex: '#d9d9d4' },
      { id: 'sable', name: 'Beige sable', hex: '#e6ddcf' },
    ],
    roughness: 0.82,
    metalness: 0.02,
    thickness: 16,
    structural: true,
    priceFactor: 0.85,
  },
  metal: {
    id: 'metal',
    name: 'Acier laqué',
    color: '#56514b',
    colors: [
      { id: 'anthracite', name: 'Anthracite', hex: '#56514b' },
      { id: 'inox', name: 'Inox', hex: '#9aa0a0' },
      { id: 'noir', name: 'Noir mat', hex: '#2f2f2f' },
    ],
    roughness: 0.4,
    metalness: 0.55,
    thickness: 2,
    structural: false,
    priceFactor: 1.2,
  },
  verre: {
    id: 'verre',
    name: 'Verre trempé',
    color: '#c2d2cc',
    colors: [
      { id: 'clair', name: 'Clair', hex: '#c2d2cc' },
      { id: 'fume', name: 'Fumé', hex: '#8c9a97' },
      { id: 'bronze', name: 'Bronze', hex: '#b9a58a' },
    ],
    roughness: 0.12,
    metalness: 0,
    opacity: 0.32,
    thickness: 6,
    structural: false,
    priceFactor: 1.3,
  },
}

export const MATERIAL_LIST: Material[] = Object.values(MATERIALS)
export const DEFAULT_MATERIAL: MaterialId = 'chene'

export function defaultColorFor(material: MaterialId): string {
  return MATERIALS[material]?.colors?.[0]?.hex ?? MATERIALS[material]?.color ?? '#c9a274'
}

export function colorNameFor(material: MaterialId, hex?: string): string {
  const found = MATERIALS[material]?.colors?.find((color) => color.hex === hex)
  return found?.name ?? MATERIALS[material]?.colors?.[0]?.name ?? 'Naturel'
}

export type PartType =
  | 'panel'
  | 'shelf'
  | 'drawer'
  | 'door'
  | 'top'
  | 'leg'
  | 'rail'
  | 'plinth'
  | 'niche'
  | 'rod'

export type PartShape = 'rect' | 'round' | 'oval' | 'rounded' | 'l' | 'conical'

export type Motion = 'hinge-left' | 'hinge-right' | 'slide-x' | 'tilt-down' | 'tilt-up' | 'slide-z' | 'none'

export type HandleKind = 'bar' | 'knob' | 'recess' | 'none'
export type HandleFinish = 'steel' | 'black' | 'brass' | 'wood'
export type PlinthStyle = 'recessed' | 'flush' | 'none'

export const HANDLE_FINISHES: { id: HandleFinish; name: string; color: string }[] = [
  { id: 'steel', name: 'Acier brossé', color: '#9aa0a0' },
  { id: 'black', name: 'Noir mat', color: '#2f2f2f' },
  { id: 'brass', name: 'Laiton', color: '#b08d57' },
  { id: 'wood', name: 'Bois', color: '#8a6a4a' },
]

export const PLINTH_STYLES: { id: PlinthStyle; name: string }[] = [
  { id: 'recessed', name: 'En retrait' },
  { id: 'flush', name: 'Affleurant' },
  { id: 'none', name: 'Aucun' },
]

export type FurniturePart = {
  id: string
  type: PartType
  label: string
  material: MaterialId
  /** Teinte appliquée au matériau (hex). */
  color?: string
  thickness: number
  w: number
  h: number
  d: number
  x: number
  y: number
  z: number
  ry: number
  shape?: PartShape
  cornerRadius?: number
  leaves?: 1 | 2
  hinge?: 'left' | 'right'
  motion?: Motion
  handle?: HandleKind
  handleFinish?: HandleFinish
  open?: number
}

export type Category = 'structure' | 'mobile' | 'separation' | 'plateaux'

export const CATEGORY_LABELS: Record<Category, string> = {
  structure: 'Structure',
  mobile: 'Rangement mobile',
  separation: 'Séparation',
  plateaux: 'Plateaux & formes',
}

export type ComponentDef = {
  key: string
  type: PartType
  label: string
  category: Category
  w: number
  h: number
  d: number
  material?: MaterialId
  color?: string
  shape?: PartShape
  cornerRadius?: number
  thickness?: number
  leaves?: 1 | 2
  hinge?: 'left' | 'right'
  motion?: Motion
  handle?: HandleKind
  handleFinish?: HandleFinish
}

/** Définition de chaque entrée de la palette. */
export const COMPONENTS: ComponentDef[] = [
  // Structure
  { key: 'panel', type: 'panel', label: 'Panneau / côté', category: 'structure', w: 400, h: 700, d: 18 },
  { key: 'divider', type: 'panel', label: 'Cloison verticale', category: 'structure', w: 300, h: 700, d: 18 },
  { key: 'back', type: 'panel', label: 'Fond', category: 'structure', w: 600, h: 900, d: 6, material: 'melamine', thickness: 6 },
  { key: 'shelf', type: 'shelf', label: 'Étagère', category: 'structure', w: 560, h: 18, d: 300 },
  { key: 'rail', type: 'rail', label: 'Traverse', category: 'structure', w: 560, h: 60, d: 18 },
  { key: 'plinth', type: 'plinth', label: 'Plinthe / socle', category: 'structure', w: 600, h: 80, d: 18 },
  { key: 'leg', type: 'leg', label: 'Pied carré', category: 'structure', w: 50, h: 100, d: 50 },
  { key: 'leg-round', type: 'leg', label: 'Pied rond', category: 'structure', w: 50, h: 100, d: 50, shape: 'round' },
  { key: 'leg-conical', type: 'leg', label: 'Pied conique', category: 'structure', w: 50, h: 100, d: 50, shape: 'conical' },

  // Rangement mobile
  { key: 'drawer', type: 'drawer', label: 'Tiroir', category: 'mobile', w: 500, h: 150, d: 400, handle: 'bar' },
  { key: 'drawer-tall', type: 'drawer', label: 'Casserolier', category: 'mobile', w: 500, h: 300, d: 450, handle: 'bar' },
  { key: 'door', type: 'door', label: 'Porte à charnière', category: 'mobile', w: 450, h: 700, d: 18, leaves: 1, hinge: 'left', motion: 'hinge-left', handle: 'bar' },
  { key: 'door-double', type: 'door', label: 'Porte double', category: 'mobile', w: 900, h: 700, d: 18, leaves: 2, motion: 'hinge-left', handle: 'bar' },
  { key: 'door-sliding', type: 'door', label: 'Porte coulissante', category: 'mobile', w: 500, h: 700, d: 18, leaves: 1, motion: 'slide-x', handle: 'recess' },
  { key: 'trapdoor', type: 'door', label: 'Abattant', category: 'mobile', w: 600, h: 360, d: 18, leaves: 1, motion: 'tilt-down', handle: 'recess' },
  { key: 'tray', type: 'shelf', label: 'Tablette coulissante', category: 'mobile', w: 480, h: 18, d: 350, motion: 'slide-z', handle: 'none' },
  { key: 'basket', type: 'niche', label: 'Bac ouvert', category: 'mobile', w: 450, h: 200, d: 400, material: 'melamine' },

  // Séparation
  { key: 'niche', type: 'niche', label: 'Casier / niche', category: 'separation', w: 400, h: 400, d: 350 },
  { key: 'rod', type: 'rod', label: 'Tringle', category: 'separation', w: 600, h: 25, d: 25, material: 'metal' },

  // Plateaux & formes
  { key: 'top', type: 'top', label: 'Plateau rectangulaire', category: 'plateaux', w: 1000, h: 18, d: 500 },
  { key: 'top-round', type: 'top', label: 'Plateau rond', category: 'plateaux', w: 800, h: 18, d: 800, shape: 'round' },
  { key: 'top-oval', type: 'top', label: 'Plateau ovale', category: 'plateaux', w: 1200, h: 18, d: 800, shape: 'oval' },
  { key: 'top-rounded', type: 'top', label: 'Plateau arrondi', category: 'plateaux', w: 1000, h: 18, d: 600, shape: 'rounded', cornerRadius: 60 },
  { key: 'top-l', type: 'top', label: "Plateau d'angle en L", category: 'plateaux', w: 1200, h: 18, d: 1200, shape: 'l' },
]

export function findComponent(key: string): ComponentDef | undefined {
  return COMPONENTS.find((component) => component.key === key)
}

let idCounter = 0
export function createId(prefix = 'p'): string {
  idCounter += 1
  return `${prefix}-${Date.now().toString(36)}-${idCounter}`
}

/** Applique l'épaisseur sur le bon axe selon le type de composant. */
export function withThickness(part: FurniturePart, thickness: number): FurniturePart {
  const value = Math.max(2, Math.round(thickness))
  const next: FurniturePart = { ...part, thickness: value }
  if (part.type === 'panel' || part.type === 'rail' || part.type === 'plinth' || part.type === 'door') {
    next.d = value
  } else if (part.type === 'shelf' || part.type === 'top') {
    next.h = value
  }
  return next
}

export function makePart(def: ComponentDef, overrides: Partial<FurniturePart> = {}): FurniturePart {
  const material = overrides.material ?? def.material ?? DEFAULT_MATERIAL
  const thickness = overrides.thickness ?? def.thickness ?? MATERIALS[material]?.thickness ?? 18
  return {
    id: createId(def.key),
    type: def.type,
    label: def.label,
    material,
    color: overrides.color ?? def.color ?? defaultColorFor(material),
    thickness,
    w: def.w,
    h: def.h,
    d: def.d,
    x: 0,
    y: def.h / 2,
    z: 0,
    ry: 0,
    shape: def.shape,
    cornerRadius: def.cornerRadius,
    leaves: def.leaves,
    hinge: def.hinge,
    motion: def.motion,
    handle: def.handle,
    handleFinish: def.handleFinish ?? 'steel',
    open: 0,
    ...overrides,
  }
}

/** Le composant possède-t-il une ouverture animée ? */
export function isOpening(part: FurniturePart): boolean {
  return (part.motion != null && part.motion !== 'none') || part.type === 'drawer'
}

// ---------------------------------------------------------------------------
// Caisson paramétrique (piloté par le tunnel Dimensions / Composition / Finitions)
// ---------------------------------------------------------------------------

export type CabinetParams = {
  width: number
  height: number
  depth: number
  shelves: number
  drawers: number
  doors: number
  material: MaterialId
  color?: string
  handle?: HandleKind
  handleFinish?: HandleFinish
  plinth?: PlinthStyle
}

export function buildCabinetParts(params: CabinetParams): FurniturePart[] {
  const material = params.material ?? DEFAULT_MATERIAL
  const color = params.color ?? defaultColorFor(material)
  const handle = params.handle ?? 'bar'
  const handleFinish = params.handleFinish ?? 'steel'
  const plinthStyle = params.plinth ?? 'recessed'
  const t = MATERIALS[material]?.thickness ?? 18
  const W = Math.max(300, params.width || 0)
  const H = Math.max(300, params.height || 0)
  const D = Math.max(150, params.depth || 0)
  const innerW = W - 2 * t
  const innerH = H - 2 * t
  const frontZ = D / 2
  const plinth = plinthStyle === 'none' ? 0 : Math.min(80, Math.max(50, Math.round(H * 0.035)))
  const bodyH = H - plinth
  const bodyY = plinth + bodyH / 2
  const parts: FurniturePart[] = []

  const base = (key: string, id: string, overrides: Partial<FurniturePart>): FurniturePart => {
    const created = part(key, { material, color, handle, handleFinish, ...overrides })
    created.id = id
    return created
  }

  parts.push(base('panel', 'base-side-l', { w: D, h: bodyH, d: t, ry: 90, x: -(W / 2 - t / 2), y: bodyY, z: 0 }))
  parts.push(base('panel', 'base-side-r', { w: D, h: bodyH, d: t, ry: 90, x: W / 2 - t / 2, y: bodyY, z: 0 }))
  parts.push(base('shelf', 'base-bottom', { w: W, h: t, d: D, y: plinth + t / 2, z: 0 }))
  parts.push(base('shelf', 'base-top', { w: W, h: t, d: D, y: H - t / 2, z: 0 }))
  parts.push(base('panel', 'base-back', { w: innerW, h: H - plinth - 2 * t, d: 6, y: (H + plinth) / 2, z: -D / 2 + 3 }))
  if (plinthStyle !== 'none') {
    const plinthWidth = plinthStyle === 'flush' ? innerW : innerW - 70
    const plinthZ = plinthStyle === 'flush' ? frontZ - t / 2 : frontZ - 55
    parts.push(base('panel', 'base-plinth', { w: plinthWidth, h: plinth, d: t, y: plinth / 2, z: plinthZ }))
  }

  const drawerCount = Math.max(0, Math.round(params.drawers || 0))
  let drawerZone = 0
  if (drawerCount > 0) {
    const each = Math.min(220, (innerH * 0.5) / drawerCount)
    drawerZone = each * drawerCount
    for (let i = 0; i < drawerCount; i++) {
      parts.push(base('drawer', `base-drawer-${i}`, { w: innerW - 6, h: each - 8, d: D - 80, y: plinth + t + each * (i + 0.5), z: frontZ - 6 }))
    }
  }

  const doorBottom = plinth + t + drawerZone
  const doorZoneH = H - t - doorBottom
  const doorCount = Math.max(0, Math.round(params.doors || 0))
  if (doorCount > 0 && doorZoneH > 200) {
    const doorH = doorZoneH - 8
    const y = doorBottom + doorZoneH / 2
    const z = frontZ - t / 2 - 1
    if (doorCount === 1) {
      parts.push(base('door', 'base-door-0', { w: innerW - 6, h: doorH, d: t, leaves: 1, hinge: 'left', motion: 'hinge-left', x: 0, y, z }))
    } else if (doorCount === 2) {
      parts.push(base('door-double', 'base-door-double', { w: innerW - 6, h: doorH, d: t, leaves: 2, x: 0, y, z }))
    } else {
      const colW = (innerW - 6) / doorCount
      for (let i = 0; i < doorCount; i++) {
        const left = i % 2 === 0
        parts.push(base('door', `base-door-${i}`, {
          w: colW - 4,
          h: doorH,
          d: t,
          leaves: 1,
          hinge: left ? 'left' : 'right',
          motion: left ? 'hinge-left' : 'hinge-right',
          x: -innerW / 2 + colW * (i + 0.5),
          y,
          z,
        }))
      }
    }
  }

  const shelfCount = Math.max(0, Math.round(params.shelves || 0))
  if (shelfCount > 0 && doorZoneH > 200) {
    for (let i = 0; i < shelfCount; i++) {
      const y = doorBottom + (doorZoneH * (i + 1)) / (shelfCount + 1)
      parts.push(base('shelf', `base-shelf-${i}`, { w: innerW - 6, h: t, d: D - 40, y, z: 0 }))
    }
  }

  return parts
}


// ---------------------------------------------------------------------------
// Gabarits prêts à l'emploi
// ---------------------------------------------------------------------------

export type TemplateVariant = {
  key: string
  label: string
  build: () => FurniturePart[]
}

export type Template = {
  key: string
  label: string
  description: string
  /** Matériau principal proposé au chargement du modèle. */
  material: MaterialId
  /** Prix de base indicatif du modèle, hors composants ajoutés. */
  basePrice: number
  defaultVariant?: string
  variants?: TemplateVariant[]
  build: () => FurniturePart[]
}

function part(key: string, overrides: Partial<FurniturePart>): FurniturePart {
  const def = findComponent(key)
  if (!def) throw new Error(`Composant inconnu : ${key}`)
  return makePart(def, overrides)
}

const T = 18

/** Panneau vertical (côté, cloison) : épaisseur sur d, tourné de 90°. */
function upright(depth: number, height: number, x: number, y: number, z: number, thickness = T): FurniturePart {
  return part('panel', { w: depth, h: height, d: thickness, ry: 90, x, y, z })
}

function commode(drawers = 3): FurniturePart[] {
  const W = 800
  const H = 700
  const D = 450
  const legH = 120
  const bodyY = legH
  const top = bodyY + H
  const sx = W / 2 - T / 2
  const innerW = W - 2 * T
  const parts: FurniturePart[] = [
    upright(D, H, -sx, bodyY + H / 2, 0),
    upright(D, H, sx, bodyY + H / 2, 0),
    part('shelf', { w: W, h: T, d: D, y: bodyY + T / 2, z: 0 }),
    part('shelf', { w: W, h: T, d: D, y: bodyY + H - T / 2, z: 0 }),
    part('panel', { w: innerW, h: H - 2 * T, d: 6, y: bodyY + H / 2, z: -D / 2 + 3 }),
    part('top', { w: W + 60, h: T, d: D + 50, y: top + T / 2, z: 0 }),
  ]
  const count = Math.max(1, Math.min(4, Math.round(drawers)))
  const drawerGap = 8
  const each = (H - 2 * T) / count
  const start = bodyY + T
  for (let i = 0; i < count; i++) {
    parts.push(part('drawer', { w: innerW, h: each - drawerGap, d: D - 30, y: start + each * (i + 0.5), z: D / 2 }))
  }
  const lx = W / 2 - 45
  const lz = D / 2 - 45
  for (const x of [-lx, lx]) {
    for (const z of [-lz, lz]) {
      parts.push(part('leg', { w: 45, h: legH, d: 45, x, y: legH / 2, z }))
    }
  }
  return parts
}

function tableBasse(round = false): FurniturePart[] {
  const W = round ? 900 : 1100
  const D = round ? 900 : 600
  const H = 380
  const parts: FurniturePart[] = [
    round
      ? part('top-round', { w: W, h: T, d: D, y: H - T / 2, z: 0 })
      : part('top', { w: W, h: T, d: D, y: H - T / 2, z: 0 }),
  ]
  const lx = W / 2 - 60
  const lz = D / 2 - 60
  for (const x of [-lx, lx]) {
    for (const z of [-lz, lz]) {
      parts.push(part('leg-round', { w: 55, h: H - T, d: 55, x, y: (H - T) / 2, z }))
    }
  }
  return parts
}

function bibliotheque(shelves = 4): FurniturePart[] {
  const W = 900
  const H = 2000
  const D = 350
  const sx = W / 2 - T / 2
  const parts: FurniturePart[] = [
    upright(D, H, -sx, H / 2, 0),
    upright(D, H, sx, H / 2, 0),
    part('shelf', { w: W, h: T, d: D, y: T / 2, z: 0 }),
    part('shelf', { w: W, h: T, d: D, y: H - T / 2, z: 0 }),
    part('panel', { w: W - 2 * T, h: H - 2 * T, d: 6, y: H / 2, z: -D / 2 + 3 }),
  ]
  const count = Math.max(1, Math.min(7, Math.round(shelves)))
  for (let i = 1; i <= count; i++) {
    parts.push(part('shelf', { w: W - 2 * T, h: T, d: D - 20, y: (H / (count + 1)) * i, z: 0 }))
  }
  return parts
}

function meubleTv(withDoors = true): FurniturePart[] {
  const W = 1600
  const H = 500
  const D = 420
  const legH = 90
  const bodyY = legH
  const sx = W / 2 - T / 2
  const innerW = W - 2 * T
  const parts: FurniturePart[] = [
    upright(D, H, -sx, bodyY + H / 2, 0),
    upright(D, H, sx, bodyY + H / 2, 0),
    part('shelf', { w: W, h: T, d: D, y: bodyY + T / 2, z: 0 }),
    part('shelf', { w: W, h: T, d: D, y: bodyY + H - T / 2, z: 0 }),
    upright(D - 20, H - 2 * T, 0, bodyY + H / 2, 0),
    part('shelf', { w: W - 2 * T, h: T, d: D - 20, y: bodyY + H * 0.5, z: 0 }),
    part('top', { w: W + 40, h: T, d: D + 30, y: bodyY + H + T / 2, z: 0 }),
  ]
  if (withDoors) {
    const doorW = innerW / 2 - 12
    parts.push(part('door', { w: doorW, h: H - 2 * T - 12, x: -doorW / 2 - 3, y: bodyY + H / 2, z: D / 2, hinge: 'left', motion: 'hinge-left' }))
    parts.push(part('door', { w: doorW, h: H - 2 * T - 12, x: doorW / 2 + 3, y: bodyY + H / 2, z: D / 2, hinge: 'right', motion: 'hinge-right' }))
  }
  for (const x of [-sx, sx]) {
    parts.push(upright(D - 60, legH, x, legH / 2, 0, 16))
  }
  return parts
}

function bureau(side: 'right' | 'left' = 'right'): FurniturePart[] {
  const W = 1400
  const D = 650
  const H = 750
  const T2 = 18
  const unitW = 420
  const sign = side === 'right' ? 1 : -1
  const unitX = sign * (W / 2 - T2 - unitW / 2)
  const parts: FurniturePart[] = [
    part('top', { w: W, h: T2, d: D, y: H - T2 / 2, z: 0 }),
    upright(D, H - T2, -(W / 2 - T2 / 2), (H - T2) / 2, 0, T2),
    upright(D, H - T2, W / 2 - T2 / 2, (H - T2) / 2, 0, T2),
    part('panel', { w: W - 2 * T2, h: H - T2, d: 6, y: (H - T2) / 2, z: -D / 2 + 3 }),
    // Montant intérieur et fond du caisson de tiroirs.
    upright(D - 40, H - T2, unitX - sign * unitW / 2, (H - T2) / 2, 0, T2),
    part('shelf', { w: unitW, h: T2, d: D - 40, x: unitX, y: T2 / 2, z: 0 }),
  ]
  const gap = 8
  const drawerH = (H - 2 * T2 - 2 * gap) / 3
  for (let i = 0; i < 3; i++) {
    parts.push(part('drawer', { w: unitW - 12, h: drawerH, d: D - 60, x: unitX, y: T2 + drawerH / 2 + i * (drawerH + gap), z: D / 2 - 20 }))
  }
  return parts
}

function dressing(): FurniturePart[] {
  const W = 1200
  const H = 2200
  const D = 600
  const sx = W / 2 - T / 2
  const innerW = W - 2 * T
  const parts: FurniturePart[] = [
    upright(D, H, -sx, H / 2, 0),
    upright(D, H, sx, H / 2, 0),
    part('shelf', { w: W, h: T, d: D, y: T / 2, z: 0 }),
    part('shelf', { w: W, h: T, d: D, y: H - T / 2, z: 0 }),
    part('panel', { w: innerW, h: H - 2 * T, d: 6, y: H / 2, z: -D / 2 + 3 }),
    upright(D - 40, 900, 0, 450, 0),
  ]
  parts.push(part('rod', { w: innerW - 20, h: 25, d: 25, x: 0, y: 1900, z: 0 }))
  for (let i = 1; i <= 3; i++) {
    parts.push(part('shelf', { w: innerW / 2 - T, h: T, d: D - 40, x: -innerW / 4 - T / 2, y: 1100 + (i - 1) * 220, z: 0 }))
  }
  parts.push(part('niche', { w: innerW / 2 - 20, h: 420, d: D - 40, x: innerW / 4, y: 500, z: 0 }))
  return parts
}

const COMMODE_VARIANTS: TemplateVariant[] = [
  { key: '2', label: '2 tiroirs', build: () => commode(2) },
  { key: '3', label: '3 tiroirs', build: () => commode(3) },
  { key: '4', label: '4 tiroirs', build: () => commode(4) },
]

const BIBLIO_VARIANTS: TemplateVariant[] = [3, 4, 5].map((count) => ({
  key: String(count),
  label: `${count} tablettes`,
  build: () => bibliotheque(count),
}))

const TV_VARIANTS: TemplateVariant[] = [
  { key: 'doors', label: 'Avec portes', build: () => meubleTv(true) },
  { key: 'open', label: 'Niche ouverte', build: () => meubleTv(false) },
]

const BUREAU_VARIANTS: TemplateVariant[] = [
  { key: 'right', label: 'Caisson à droite', build: () => bureau('right') },
  { key: 'left', label: 'Caisson à gauche', build: () => bureau('left') },
]

const TABLE_VARIANTS: TemplateVariant[] = [
  { key: 'rect', label: 'Plateau rectangulaire', build: () => tableBasse(false) },
  { key: 'round', label: 'Plateau rond', build: () => tableBasse(true) },
]

export const TEMPLATES: Template[] = [
  {
    key: 'commode',
    label: 'Commode',
    description: 'Caisson, tiroirs, plateau et 4 pieds',
    material: 'chene',
    basePrice: 890,
    defaultVariant: '3',
    variants: COMMODE_VARIANTS,
    build: () => commode(3),
  },
  {
    key: 'meuble-tv',
    label: 'Meuble TV',
    description: 'Rangement TV modulable',
    material: 'chene',
    basePrice: 640,
    defaultVariant: 'doors',
    variants: TV_VARIANTS,
    build: () => meubleTv(true),
  },
  {
    key: 'bibliotheque',
    label: 'Bibliothèque',
    description: 'Montants, tablettes et fond',
    material: 'chene',
    basePrice: 720,
    defaultVariant: '4',
    variants: BIBLIO_VARIANTS,
    build: () => bibliotheque(4),
  },
  {
    key: 'table-basse',
    label: 'Table basse',
    description: 'Plateau et 4 pieds ronds',
    material: 'chene',
    basePrice: 390,
    defaultVariant: 'rect',
    variants: TABLE_VARIANTS,
    build: () => tableBasse(false),
  },
  {
    key: 'bureau',
    label: 'Bureau',
    description: 'Plan, caisson de tiroirs et fond',
    material: 'chene',
    basePrice: 850,
    defaultVariant: 'right',
    variants: BUREAU_VARIANTS,
    build: () => bureau('right'),
  },
  { key: 'dressing', label: 'Dressing', description: 'Tringle, casier et 3 tablettes', material: 'chene', basePrice: 1150, build: dressing },
]

// ---------------------------------------------------------------------------
// Ajustement automatique et analyse du modèle
// ---------------------------------------------------------------------------

export type PartsBounds = {
  minX: number
  maxX: number
  minY: number
  maxY: number
  minZ: number
  maxZ: number
  width: number
  height: number
  depth: number
  cx: number
  cy: number
  cz: number
}

/** Boîte englobante du modèle, en tenant compte de la rotation et du tiroir. */
export function boundsOf(parts: FurniturePart[]): PartsBounds {
  if (!parts.length) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0, minZ: 0, maxZ: 0, width: 0, height: 0, depth: 0, cx: 0, cy: 0, cz: 0 }
  }

  let minX = Infinity
  let minY = Infinity
  let minZ = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  let maxZ = -Infinity

  for (const part of parts) {
    const theta = ((part.ry || 0) * Math.PI) / 180
    const c = Math.abs(Math.cos(theta))
    const s = Math.abs(Math.sin(theta))
    const hx = (part.w / 2) * c + (part.d / 2) * s
    const hy = part.h / 2
    // Un tiroir est positionné par sa façade : le caisson part vers l'arrière.
    const hz = part.type === 'drawer' ? part.d / 2 : (part.w / 2) * s + (part.d / 2) * c
    const zShift = part.type === 'drawer' ? -part.d / 2 : 0
    minX = Math.min(minX, part.x - hx)
    maxX = Math.max(maxX, part.x + hx)
    minY = Math.min(minY, part.y - hy)
    maxY = Math.max(maxY, part.y + hy)
    minZ = Math.min(minZ, part.z + zShift - hz)
    maxZ = Math.max(maxZ, part.z + zShift + hz)
  }

  return {
    minX,
    maxX,
    minY,
    maxY,
    minZ,
    maxZ,
    width: maxX - minX,
    height: maxY - minY,
    depth: maxZ - minZ,
    cx: (minX + maxX) / 2,
    cy: (minY + maxY) / 2,
    cz: (minZ + maxZ) / 2,
  }
}

export type AutoFitResult = {
  parts: FurniturePart[]
  report: string[]
}

const CARCASS_TYPES: PartType[] = ['panel', 'shelf', 'rail', 'plinth', 'niche']

/**
 * Recale les composants les uns par rapport aux autres :
 * - arrondit dimensions et positions au millimètre ;
 * - aligne les épaisseurs sur les standards matière ;
 * - recadre les étagères intérieures ;
 * - aligne portes et tiroirs sur la façade du caisson ;
 * - repose les pieds au sol et recentre le modèle.
 */
export function autoFitParts(parts: FurniturePart[], reference: FurniturePart[] = []): AutoFitResult {
  if (!parts.length) return { parts, report: [] }

  const report: string[] = []
  const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
  const refById = new Map<string, FurniturePart>(reference.map((part) => [part.id, part] as const))
  let next = parts.map((part) => ({ ...part }))

  let snapped = 0
  next = next.map((part) => {
    const w = Math.max(2, Math.round(part.w))
    const h = Math.max(2, Math.round(part.h))
    const d = Math.max(2, Math.round(part.d))
    const x = Math.round(part.x)
    const y = Math.round(part.y)
    const z = Math.round(part.z)
    const ry = Math.round(part.ry || 0)
    if (w !== part.w || h !== part.h || d !== part.d || x !== part.x || y !== part.y || z !== part.z || ry !== (part.ry || 0)) {
      snapped += 1
      return { ...part, w, h, d, x, y, z, ry }
    }
    return part
  })
  if (snapped > 0) report.push(`${snapped} dimension(s) ou position(s) arrondies au millimètre`)

  let thicknesses = 0
  next = next.map((part) => {
    const standard = MATERIALS[part.material]?.thickness
    if (!standard) return part
    if ((part.type === 'panel' || part.type === 'rail' || part.type === 'plinth' || part.type === 'door') && part.d >= 10 && part.d !== standard) {
      thicknesses += 1
      return { ...part, thickness: standard, d: standard }
    }
    if ((part.type === 'shelf' || part.type === 'top') && part.h >= 10 && part.h !== standard) {
      thicknesses += 1
      return { ...part, thickness: standard, h: standard }
    }
    return part
  })
  if (thicknesses > 0) report.push(`${thicknesses} épaisseur(s) alignée(s) sur les standards matière`)

  let realigned = 0
  next = next.map((part) => {
    const ref = refById.get(part.id)
    if (!ref) return part
    if (part.x !== ref.x || part.y !== ref.y || part.z !== ref.z || (part.ry || 0) !== (ref.ry || 0)) {
      realigned += 1
      return { ...part, x: ref.x, y: ref.y, z: ref.z, ry: ref.ry }
    }
    return part
  })
  if (realigned > 0) report.push(`${realigned} composant(s) recalé(s) sur la structure`)

  const carcassParts = next.filter((part) => CARCASS_TYPES.includes(part.type))
  if (carcassParts.length) {
    const carcass = boundsOf(carcassParts)
    const panelThicknesses = carcassParts.filter((part) => part.type === 'panel' || part.type === 'plinth').map((part) => part.thickness)
    const sideT = panelThicknesses.length ? Math.max(2, ...panelThicknesses) : 18
    const innerMinX = carcass.minX + sideT
    const innerMaxX = carcass.maxX - sideT
    const innerMinY = carcass.minY + sideT
    const innerMaxY = carcass.maxY - sideT
    const innerMinZ = carcass.minZ + sideT
    const innerMaxZ = carcass.maxZ - sideT
    const innerWidth = Math.max(40, innerMaxX - innerMinX)
    const innerHeight = Math.max(40, innerMaxY - innerMinY)
    const innerDepth = Math.max(40, innerMaxZ - innerMinZ)
    const frontZ = carcass.maxZ
    const margin = 3

    // Étagères : on corrige les débordements sans casser les colonnes existantes.
    let shelves = 0
    next = next.map((part) => {
      if (part.type !== 'shelf') return part
      if (refById.has(part.id)) return part
      if (part.w >= carcass.width - 4) return part
      const maxW = Math.max(40, innerWidth - 2 * margin)
      const maxD = Math.max(40, innerDepth - 2 * margin)
      const halfColumn = part.w < innerWidth / 2
      const w = Math.min(part.w, maxW)
      const d = Math.min(part.d, maxD)
      const x = halfColumn ? clamp(part.x, innerMinX + w / 2, innerMaxX - w / 2) : 0
      const z = halfColumn ? clamp(part.z, innerMinZ + d / 2, innerMaxZ - d / 2) : 0
      const y = clamp(part.y, innerMinY + part.h / 2, innerMaxY - part.h / 2)
      if (w !== part.w || d !== part.d || Math.abs(x - part.x) > 0.5 || Math.abs(y - part.y) > 0.5 || Math.abs(z - part.z) > 0.5) {
        shelves += 1
        return { ...part, w, d, x, y, z }
      }
      return part
    })
    if (shelves > 0) report.push(`${shelves} étagère(s) recentrée(s) dans le caisson`)

    // Portes : recadrage, alignement façade et répartition par rangée.
    const doors = next.filter((part) => part.type === 'door' && !refById.has(part.id))
    if (doors.length) {
      const rows = new Map<number, FurniturePart[]>()
      for (const door of doors) {
        const key = Math.round(door.y / 20)
        const row = rows.get(key) ?? []
        row.push(door)
        rows.set(key, row)
      }
      let changed = 0
      const fittedDoors = new Map<string, FurniturePart>()
      for (const row of rows.values()) {
        const sorted = [...row].sort((a, b) => a.x - b.x)
        const maxW = Math.max(40, innerWidth - 2 * margin)
        const maxH = Math.max(40, innerHeight - 2 * margin)
        for (const door of sorted) {
          const w = Math.min(door.w, maxW)
          const h = Math.min(door.h, maxH)
          const y = clamp(door.y, innerMinY + h / 2, innerMaxY - h / 2)
          const z = frontZ + 2 - door.d / 2
          const single = sorted.length === 1
          const fitted: FurniturePart = { ...door, w, h, y, z, x: single ? 0 : door.x }
          fittedDoors.set(door.id, fitted)
        }
        if (sorted.length > 1 && sorted.every((door) => door.leaves !== 2)) {
          const totalWidth = sorted.reduce((sum, door) => sum + Math.min(door.w, maxW), 0)
          const gap = 3
          const groupWidth = totalWidth + gap * (sorted.length - 1)
          let cursor = -groupWidth / 2
          for (const door of sorted) {
            const fitted = fittedDoors.get(door.id)!
            fitted.x = cursor + fitted.w / 2
            cursor += fitted.w + gap
          }
        }
      }
      next = next.map((part) => {
        const fitted = fittedDoors.get(part.id)
        if (!fitted) return part
        if (
          Math.abs(fitted.x - part.x) > 0.5 ||
          Math.abs(fitted.y - part.y) > 0.5 ||
          Math.abs(fitted.z - part.z) > 0.5 ||
          fitted.w !== part.w ||
          fitted.h !== part.h
        ) {
          changed += 1
        }
        return fitted
      })
      if (changed > 0) report.push(`${changed} porte(s) recentrée(s) sur la façade`)
    }

    // Tiroirs : largeur, façade et répartition verticale par colonne.
    const drawers = next.filter((part) => part.type === 'drawer' && !refById.has(part.id))
    if (drawers.length) {
      const columns = new Map<number, FurniturePart[]>()
      for (const drawer of drawers) {
        const key = Math.round(drawer.x / 50)
        const column = columns.get(key) ?? []
        column.push(drawer)
        columns.set(key, column)
      }
      let changed = 0
      const fittedDrawers = new Map<string, FurniturePart>()
      for (const column of columns.values()) {
        const sorted = [...column].sort((a, b) => a.y - b.y)
        const maxW = Math.max(40, innerWidth - 2 * margin)
        const maxH = Math.max(40, innerHeight - 2 * margin)
        const singleColumn = columns.size === 1
        const spanMin = Math.min(...sorted.map((drawer) => drawer.y - drawer.h / 2))
        const spanMax = Math.max(...sorted.map((drawer) => drawer.y + drawer.h / 2))
        const gap = 8
        const available = Math.max(20, spanMax - spanMin - gap * (sorted.length - 1))
        const height = sorted.length > 1 ? Math.min(maxH, available / sorted.length) : Math.min(sorted[0].h, maxH)
        let cursor = sorted.length > 1 ? clamp(spanMin, innerMinY, innerMaxY - height * sorted.length - gap * (sorted.length - 1)) : sorted[0].y - height / 2
        for (const drawer of sorted) {
          const w = Math.min(drawer.w, maxW)
          const y = sorted.length > 1 ? cursor + height / 2 : clamp(drawer.y, innerMinY + height / 2, innerMaxY - height / 2)
          const fitted: FurniturePart = {
            ...drawer,
            w,
            h: height,
            x: singleColumn ? 0 : clamp(drawer.x, innerMinX + w / 2, innerMaxX - w / 2),
            y,
            z: frontZ - 4,
          }
          fittedDrawers.set(drawer.id, fitted)
          if (sorted.length > 1) cursor += height + gap
        }
      }
      next = next.map((part) => {
        const fitted = fittedDrawers.get(part.id)
        if (!fitted) return part
        if (
          Math.abs(fitted.x - part.x) > 0.5 ||
          Math.abs(fitted.y - part.y) > 0.5 ||
          Math.abs(fitted.z - part.z) > 0.5 ||
          fitted.w !== part.w ||
          fitted.h !== part.h
        ) {
          changed += 1
        }
        return fitted
      })
      if (changed > 0) report.push(`${changed} tiroir(s) réaligné(s) et réparti(s)`)
    }
  }

  // Pieds : au sol, et aux angles s'ils ont été déplacés.
  const carcassForLegs = next.filter((part) => CARCASS_TYPES.includes(part.type))
  const legBounds = carcassForLegs.length ? boundsOf(carcassForLegs) : null
  let legs = 0
  next = next.map((part) => {
    if (part.type !== 'leg') return part
    if (refById.has(part.id)) return part
    let x = part.x
    let z = part.z
    const y = part.h / 2
    if (legBounds) {
      const inset = 45
      const targets = [
        { x: legBounds.minX + inset, z: legBounds.minZ + inset },
        { x: legBounds.maxX - inset, z: legBounds.minZ + inset },
        { x: legBounds.minX + inset, z: legBounds.maxZ - inset },
        { x: legBounds.maxX - inset, z: legBounds.maxZ - inset },
      ]
      let best = targets[0]
      let bestDistance = Infinity
      for (const target of targets) {
        const distance = Math.hypot(part.x - target.x, part.z - target.z)
        if (distance < bestDistance) {
          bestDistance = distance
          best = target
        }
      }
      if (bestDistance > 100) {
        x = best.x
        z = best.z
      }
    }
    if (Math.abs(x - part.x) > 0.5 || Math.abs(y - part.y) > 0.5 || Math.abs(z - part.z) > 0.5) {
      legs += 1
      return { ...part, x, y, z }
    }
    return part
  })
  if (legs > 0) report.push(`${legs} pied(s) repositionné(s) au sol et aux angles`)

  const bounds = boundsOf(next)
  const dx = Math.round(-bounds.cx)
  const dy = Math.round(-bounds.minY)
  const dz = Math.round(-bounds.cz)
  if (dx !== 0 || dy !== 0 || dz !== 0) {
    next = next.map((part) => ({ ...part, x: part.x + dx, y: part.y + dy, z: part.z + dz }))
    report.push('Modèle recentré et posé au sol')
  }

  return { parts: next, report }
}

export type NormalizedParams = {
  params: CabinetParams
  report: string[]
}

/** Arrondit et borne les paramètres du caisson sur mesure. */
export function normalizeCabinetParams(params: CabinetParams): NormalizedParams {
  const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
  const roundTo = (value: number, step: number) => Math.round(value / step) * step

  const width = clamp(roundTo(params.width || 0, 10), 300, 3000)
  const height = clamp(roundTo(params.height || 0, 10), 300, 2600)
  const depth = clamp(roundTo(params.depth || 0, 10), 150, 800)
  const shelves = clamp(Math.round(params.shelves || 0), 0, 8)
  const drawers = clamp(Math.round(params.drawers || 0), 0, 6)
  const doors = clamp(Math.round(params.doors || 0), 0, 6)
  const report: string[] = []

  if (width !== params.width) report.push(`Largeur ajustée à ${width} mm`)
  if (height !== params.height) report.push(`Hauteur ajustée à ${height} mm`)
  if (depth !== params.depth) report.push(`Profondeur ajustée à ${depth} mm`)
  if (shelves !== params.shelves) report.push(`Nombre d'étagères ajusté à ${shelves}`)
  if (drawers !== params.drawers) report.push(`Nombre de tiroirs ajusté à ${drawers}`)
  if (doors !== params.doors) report.push(`Nombre de portes ajusté à ${doors}`)

  return {
    params: {
      ...params,
      width,
      height,
      depth,
      shelves,
      drawers,
      doors,
      color: params.color ?? defaultColorFor(params.material),
      handle: params.handle ?? 'bar',
      handleFinish: params.handleFinish ?? 'steel',
      plinth: params.plinth ?? 'recessed',
    },
    report,
  }
}

export type CompositionSummary = {
  panels: number
  shelves: number
  drawers: number
  doors: number
  legs: number
  others: number
}

export function summarizeParts(parts: FurniturePart[]): CompositionSummary {
  const summary: CompositionSummary = { panels: 0, shelves: 0, drawers: 0, doors: 0, legs: 0, others: 0 }
  for (const part of parts) {
    if (part.type === 'panel') summary.panels += 1
    else if (part.type === 'shelf') summary.shelves += 1
    else if (part.type === 'drawer') summary.drawers += 1
    else if (part.type === 'door') summary.doors += 1
    else if (part.type === 'leg') summary.legs += 1
    else summary.others += 1
  }
  return summary
}

export type PartOverlap = {
  a: FurniturePart
  b: FurniturePart
}

function partBox(part: FurniturePart) {
  const theta = ((part.ry || 0) * Math.PI) / 180
  const c = Math.abs(Math.cos(theta))
  const s = Math.abs(Math.sin(theta))
  const hx = (part.w / 2) * c + (part.d / 2) * s
  const hz = part.type === 'drawer' ? part.d / 2 : (part.w / 2) * s + (part.d / 2) * c
  const zShift = part.type === 'drawer' ? -part.d / 2 : 0
  return {
    minX: part.x - hx,
    maxX: part.x + hx,
    minY: part.y - part.h / 2,
    maxY: part.y + part.h / 2,
    minZ: part.z + zShift - hz,
    maxZ: part.z + zShift + hz,
  }
}

/** Détecte les chevauchements entre les composants ajoutés et le reste du meuble. */
export function detectOverlaps(extras: FurniturePart[], others: FurniturePart[], tolerance = 3): PartOverlap[] {
  if (!extras.length) return []
  const containers: PartType[] = ['panel', 'plinth', 'rail']
  const candidates = others.filter((part) => !containers.includes(part.type))
  const overlaps: PartOverlap[] = []
  const seen = new Set<string>()

  const check = (a: FurniturePart, b: FurniturePart) => {
    if (a.id === b.id) return
    const key = a.id < b.id ? `${a.id}|${b.id}` : `${b.id}|${a.id}`
    if (seen.has(key)) return
    const boxA = partBox(a)
    const boxB = partBox(b)
    const dx = Math.min(boxA.maxX, boxB.maxX) - Math.max(boxA.minX, boxB.minX)
    const dy = Math.min(boxA.maxY, boxB.maxY) - Math.max(boxA.minY, boxB.minY)
    const dz = Math.min(boxA.maxZ, boxB.maxZ) - Math.max(boxA.minZ, boxB.minZ)
    if (dx > tolerance && dy > tolerance && dz > tolerance) {
      seen.add(key)
      overlaps.push({ a, b })
    }
  }

  for (const extra of extras) {
    for (const other of candidates) check(extra, other)
  }
  for (let i = 0; i < extras.length; i++) {
    for (let j = i + 1; j < extras.length; j++) check(extras[i], extras[j])
  }

  return overlaps.slice(0, 20)
}
