import { describe, expect, it } from 'vitest'
import {
  TEMPLATES,
  autoFitParts,
  boundsOf,
  buildCabinetParts,
  colorNameFor,
  defaultColorFor,
  detectOverlaps,
  normalizeCabinetParams,
  summarizeParts,
  type FurniturePart,
} from './catalog'
import { decodeShareConfig, encodeShareConfig, parseConfig, serializeConfig, type SavedConfig } from './config'

function part(overrides: Partial<FurniturePart> & Pick<FurniturePart, 'id' | 'type'>): FurniturePart {
  return {
    id: overrides.id,
    type: overrides.type,
    label: overrides.label ?? 'Pièce',
    material: overrides.material ?? 'chene',
    color: overrides.color ?? defaultColorFor(overrides.material ?? 'chene'),
    thickness: overrides.thickness ?? 18,
    w: overrides.w ?? 100,
    h: overrides.h ?? 100,
    d: overrides.d ?? 18,
    x: overrides.x ?? 0,
    y: overrides.y ?? 50,
    z: overrides.z ?? 0,
    ry: overrides.ry ?? 0,
    handle: overrides.handle,
    handleFinish: overrides.handleFinish,
    motion: overrides.motion,
    leaves: overrides.leaves,
    hinge: overrides.hinge,
  }
}

describe('normalizeCabinetParams', () => {
  it('arrondit les dimensions au pas de 10 mm et borne les quantités', () => {
    const result = normalizeCabinetParams({
      width: 1234,
      height: 2087,
      depth: 463,
      shelves: 12,
      drawers: -2,
      doors: 2,
      material: 'chene',
    })
    expect(result.params.width).toBe(1230)
    expect(result.params.height).toBe(2090)
    expect(result.params.depth).toBe(460)
    expect(result.params.shelves).toBe(8)
    expect(result.params.drawers).toBe(0)
    expect(result.params.color).toBe(defaultColorFor('chene'))
    expect(result.report.length).toBeGreaterThan(0)
  })

  it('borne les dimensions hors-tout', () => {
    const result = normalizeCabinetParams({
      width: 10,
      height: 9000,
      depth: 10,
      shelves: 0,
      drawers: 0,
      doors: 0,
      material: 'chene',
    })
    expect(result.params.width).toBe(300)
    expect(result.params.height).toBe(2600)
    expect(result.params.depth).toBe(150)
  })
})

describe('boundsOf', () => {
  it('interprète la position d’un tiroir par sa façade', () => {
    const drawer = part({ id: 'd', type: 'drawer', w: 500, h: 150, d: 400, z: 100, y: 75 })
    const bounds = boundsOf([drawer])
    expect(bounds.maxZ).toBe(100)
    expect(bounds.minZ).toBe(-300)
  })
})

describe('autoFitParts', () => {
  it('aligne une porte sur la façade du caisson', () => {
    const carcass = part({ id: 'c', type: 'panel', w: 1000, h: 2000, d: 18, y: 1000, z: 0 })
    const door = part({ id: 'p', type: 'door', w: 900, h: 1500, d: 18, y: 1000, z: 0 })
    const result = autoFitParts([carcass, door])
    const fittedCarcass = result.parts.find((item) => item.id === 'c')
    const fittedDoor = result.parts.find((item) => item.id === 'p')
    expect(fittedCarcass).toBeDefined()
    expect(fittedDoor).toBeDefined()
    const carcassMax = (fittedCarcass?.z ?? 0) + (fittedCarcass?.d ?? 0) / 2
    const doorMax = (fittedDoor?.z ?? 0) + (fittedDoor?.d ?? 0) / 2
    expect(doorMax - carcassMax).toBeCloseTo(2, 0)
    expect(result.report.join(' ')).toMatch(/porte/i)
  })

  it('repose les pieds au sol', () => {
    const leg = part({ id: 'l', type: 'leg', w: 50, h: 100, d: 50, y: 250 })
    const result = autoFitParts([leg])
    expect(result.parts[0].y).toBe(50)
    expect(result.report.join(' ')).toMatch(/pied/i)
  })
})

describe('detectOverlaps', () => {
  it('détecte deux composants ajoutés qui se chevauchent', () => {
    const a = part({ id: 'a', type: 'drawer', w: 500, h: 150, d: 400, z: 100, y: 75 })
    const b = part({ id: 'b', type: 'drawer', w: 500, h: 150, d: 400, z: 100, y: 75 })
    expect(detectOverlaps([a], [b])).toHaveLength(1)
  })

  it('ignore les panneaux qui servent de contenant', () => {
    const drawer = part({ id: 'a', type: 'drawer', w: 500, h: 150, d: 400, z: 100, y: 75 })
    const panel = part({ id: 'p', type: 'panel', w: 1000, h: 2000, d: 18, y: 1000, z: 0 })
    expect(detectOverlaps([drawer], [panel])).toHaveLength(0)
  })
})

describe('buildCabinetParts', () => {
  it('applique la couleur et la finition de poignée choisies', () => {
    const parts = buildCabinetParts({
      width: 1200,
      height: 2100,
      depth: 450,
      shelves: 2,
      drawers: 2,
      doors: 2,
      material: 'noyer',
      color: '#3f2d24',
      handle: 'knob',
      handleFinish: 'brass',
      plinth: 'recessed',
    })
    const drawer = parts.find((item) => item.type === 'drawer')
    const door = parts.find((item) => item.type === 'door')
    expect(drawer?.color).toBe('#3f2d24')
    expect(drawer?.handle).toBe('knob')
    expect(drawer?.handleFinish).toBe('brass')
    expect(door?.handleFinish).toBe('brass')
  })

  it('gère le socle affleurant et son absence', () => {
    const base = {
      width: 1200,
      height: 2100,
      depth: 450,
      shelves: 0,
      drawers: 0,
      doors: 0,
      material: 'chene' as const,
    }
    const flush = buildCabinetParts({ ...base, plinth: 'flush' })
    const none = buildCabinetParts({ ...base, plinth: 'none' })
    expect(flush.some((item) => item.id === 'base-plinth')).toBe(true)
    expect(none.some((item) => item.id === 'base-plinth')).toBe(false)
  })
})

describe('summarizeParts', () => {
  it('compte les familles de composants', () => {
    const summary = summarizeParts([
      part({ id: 'p', type: 'panel' }),
      part({ id: 's', type: 'shelf' }),
      part({ id: 'd', type: 'drawer' }),
      part({ id: 'o', type: 'door' }),
      part({ id: 'l', type: 'leg' }),
      part({ id: 'r', type: 'rod' }),
    ])
    expect(summary).toEqual({ panels: 1, shelves: 1, drawers: 1, doors: 1, legs: 1, others: 1 })
  })
})

describe('matériaux', () => {
  it('retourne la teinte par défaut et son nom', () => {
    expect(defaultColorFor('chene')).toBe('#c9a274')
    expect(colorNameFor('chene', '#b98a55')).toBe('Miel')
    expect(colorNameFor('noyer', '#5d4436')).toBe('Fumé')
  })
})

describe('variantes de modèles', () => {
  it('propose plusieurs variantes pour la commode', () => {
    const template = TEMPLATES.find((item) => item.key === 'commode')
    expect(template?.variants).toHaveLength(3)
    expect(template?.variants?.[0].build().filter((item) => item.type === 'drawer')).toHaveLength(2)
    expect(template?.variants?.[2].build().filter((item) => item.type === 'drawer')).toHaveLength(4)
  })
})

describe('sérialisation de configuration', () => {
  const config: SavedConfig = {
    version: 1,
    projectName: 'Salon Martin',
    savedAt: '2026-01-01T00:00:00.000Z',
    params: {
      width: 1200,
      height: 2100,
      depth: 450,
      shelves: 2,
      drawers: 2,
      doors: 2,
      material: 'chene',
      color: '#c9a274',
      handle: 'bar',
      handleFinish: 'steel',
      plinth: 'recessed',
    },
    templateKey: 'commode',
    variantKey: '3',
    templateParts: [],
    extras: [],
    overrides: {},
    removed: [],
  }

  it('fait un aller-retour JSON', () => {
    const parsed = parseConfig(serializeConfig(config))
    expect(parsed?.projectName).toBe('Salon Martin')
    expect(parsed?.templateKey).toBe('commode')
    expect(parsed?.variantKey).toBe('3')
    expect(parsed?.params.width).toBe(1200)
  })

  it('fait un aller-retour via un lien de partage', () => {
    const encoded = encodeShareConfig(config)
    const decoded = decodeShareConfig(encoded)
    expect(decoded?.projectName).toBe('Salon Martin')
    expect(decoded?.params.material).toBe('chene')
  })

  it('refuse une configuration invalide', () => {
    expect(parseConfig('{"version":1}')).toBeNull()
    expect(parseConfig('not json')).toBeNull()
  })
})
