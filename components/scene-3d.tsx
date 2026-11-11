'use client'

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { LoaderCircle } from 'lucide-react'
import { loadThree, type ThreeNS } from '@/lib/three-loader'
import { MATERIALS, DEFAULT_MATERIAL, defaultColorFor, type FurniturePart, type HandleFinish } from '@/lib/catalog'

export type Scene3DHandle = {
  fit: () => void
  setAll: (open: boolean) => void
  toggle: (id: string) => void
  setView: (view: ViewPreset) => void
}

export type ViewPreset = 'iso' | 'front' | 'side' | 'top'

type Anim = {
  obj: ThreeNS
  mode: 'rotateY' | 'rotateX' | 'translateZ' | 'translateX'
  amount: number
}

type PartRecord = {
  group: ThreeNS
  sig: string
  anims: Anim[]
}

type Props = {
  parts: FurniturePart[]
  selectedId?: string | null
  onSelect?: (id: string | null) => void
  onMove?: (id: string, x: number, z: number) => void
  onToggle?: () => void
  interactive?: boolean
  className?: string
}

function signature(part: FurniturePart): string {
  return [
    part.type,
    part.material,
    part.color || '',
    part.thickness,
    part.w,
    part.h,
    part.d,
    part.shape || '',
    part.cornerRadius || '',
    part.leaves || '',
    part.hinge || '',
    part.motion || '',
    part.handle || '',
    part.handleFinish || '',
  ].join('|')
}

const EDGE_COLOR = 0x3a3025

export const Scene3D = forwardRef<Scene3DHandle, Props>(function Scene3D(props, ref) {
  const mountRef = useRef<HTMLDivElement | null>(null)
  const handlersRef = useRef({ onSelect: props.onSelect, onMove: props.onMove, onToggle: props.onToggle, interactive: props.interactive })
  const partsRef = useRef<FurniturePart[]>(props.parts)
  const selectedRef = useRef<string | null>(props.selectedId ?? null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [retry, setRetry] = useState(0)
  const internalRef = useRef<{
    render: (parts: FurniturePart[]) => void
    fit: () => void
    setAll: (open: boolean) => void
    setSelected: (id: string | null) => void
    toggle: (id: string) => void
    setView: (view: ViewPreset) => void
  } | null>(null)

  handlersRef.current = { onSelect: props.onSelect, onMove: props.onMove, onToggle: props.onToggle, interactive: props.interactive }
  partsRef.current = props.parts
  selectedRef.current = props.selectedId ?? null

  useImperativeHandle(ref, () => ({
    fit: () => internalRef.current?.fit(),
    setAll: (open: boolean) => internalRef.current?.setAll(open),
    toggle: (id: string) => internalRef.current?.toggle(id),
    setView: (view: ViewPreset) => internalRef.current?.setView(view),
  }), [])

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return
    let disposed = false
    let frame = 0
    let teardown: (() => void) | null = null
    setStatus('loading')

    loadThree()
      .then((THREE) => {
        if (disposed || !mountRef.current) return

        const scene = new THREE.Scene()
        const camera = new THREE.PerspectiveCamera(38, 1, 1, 12000)
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
        renderer.shadowMap.enabled = true
        renderer.shadowMap.type = THREE.PCFShadowMap
        if ('outputEncoding' in renderer) renderer.outputEncoding = THREE.sRGBEncoding
        if ('toneMapping' in renderer) {
          renderer.toneMapping = THREE.ACESFilmicToneMapping
          renderer.toneMappingExposure = 1.05
        }
        renderer.domElement.style.touchAction = 'none'
        mount.appendChild(renderer.domElement)

        const orbit = new THREE.OrbitControls(camera, renderer.domElement)
        orbit.enableDamping = true
        orbit.dampingFactor = 0.07
        orbit.maxPolarAngle = Math.PI * 0.495
        orbit.screenSpacePanning = false

        scene.add(new THREE.HemisphereLight(0xffffff, 0xb4aea4, 0.42))
        const sun = new THREE.DirectionalLight(0xfff5e8, 0.8)
        sun.castShadow = true
        sun.shadow.mapSize.set(1024, 1024)
        sun.shadow.radius = 7
        sun.shadow.bias = -0.0004
        scene.add(sun)
        scene.add(sun.target)

        const fill = new THREE.DirectionalLight(0xf2f6f8, 0.3)
        fill.position.set(-1.2, 1.1, 1.0)
        scene.add(fill)

        const floor = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShadowMaterial({ opacity: 0.07 }))
        floor.rotation.x = -Math.PI / 2
        floor.receiveShadow = true
        scene.add(floor)

        const shadowCanvas = document.createElement('canvas')
        shadowCanvas.width = 256
        shadowCanvas.height = 256
        const shadowContext = shadowCanvas.getContext('2d')
        if (shadowContext) {
          const gradient = shadowContext.createRadialGradient(128, 128, 8, 128, 128, 128)
          gradient.addColorStop(0, 'rgba(30, 38, 34, 0.42)')
          gradient.addColorStop(0.5, 'rgba(30, 38, 34, 0.16)')
          gradient.addColorStop(1, 'rgba(30, 38, 34, 0)')
          shadowContext.fillStyle = gradient
          shadowContext.fillRect(0, 0, 256, 256)
        }
        const contact = new THREE.Mesh(
          new THREE.PlaneGeometry(1, 1),
          new THREE.MeshBasicMaterial({
            map: new THREE.CanvasTexture(shadowCanvas),
            transparent: true,
            depthWrite: false,
            opacity: 0.85,
          }),
        )
        contact.rotation.x = -Math.PI / 2
        contact.position.y = 0.8
        contact.renderOrder = -1
        scene.add(contact)

        const grid = new THREE.GridHelper(400, 24, 0xb7c1b9, 0xdfe6e1)
        const gridMat = grid.material as ThreeNS
        gridMat.transparent = true
        gridMat.opacity = 0.32
        grid.position.y = 0.4
        scene.add(grid)

        const root = new THREE.Group()
        scene.add(root)

        const edgeMat = new THREE.LineBasicMaterial({ color: EDGE_COLOR, transparent: true, opacity: 0.14 })
        const metalMat = new THREE.MeshStandardMaterial({ color: 0x7d776e, metalness: 0.65, roughness: 0.36 })
        const darkMat = new THREE.MeshStandardMaterial({ color: 0x2f2820, roughness: 0.85 })
        const matCache = new Map<string, ThreeNS>()

        const linearColor = (hex: string) => {
          const color = new THREE.Color(hex)
          if (typeof color.convertSRGBToLinear === 'function') color.convertSRGBToLinear()
          return color
        }

        const handleMaterials: Record<HandleFinish, ThreeNS> = {
          steel: new THREE.MeshStandardMaterial({ color: linearColor('#9aa0a0'), metalness: 0.7, roughness: 0.32 }),
          black: new THREE.MeshStandardMaterial({ color: linearColor('#2b2b2b'), metalness: 0.45, roughness: 0.5 }),
          brass: new THREE.MeshStandardMaterial({ color: linearColor('#b08d57'), metalness: 0.78, roughness: 0.3 }),
          wood: new THREE.MeshStandardMaterial({ color: linearColor('#8a6a4a'), metalness: 0.05, roughness: 0.7 }),
        }

        const grainCanvas = document.createElement('canvas')
        grainCanvas.width = 256
        grainCanvas.height = 256
        const grainContext = grainCanvas.getContext('2d')
        if (grainContext) {
          grainContext.fillStyle = '#808080'
          grainContext.fillRect(0, 0, 256, 256)
          for (let i = 0; i < 120; i += 1) {
            const x = Math.random() * 256
            const alpha = 0.04 + Math.random() * 0.1
            grainContext.strokeStyle = Math.random() > 0.5 ? `rgba(255,255,255,${alpha})` : `rgba(0,0,0,${alpha})`
            grainContext.lineWidth = 0.5 + Math.random() * 1.5
            grainContext.beginPath()
            grainContext.moveTo(x, 0)
            grainContext.bezierCurveTo(x + 4, 70, x - 4, 170, x + 2, 256)
            grainContext.stroke()
          }
        }
        const grainTexture = new THREE.CanvasTexture(grainCanvas)
        grainTexture.wrapS = THREE.RepeatWrapping
        grainTexture.wrapT = THREE.RepeatWrapping
        grainTexture.repeat.set(2, 2)

        const records = new Map<string, PartRecord>()
        const opening = new Map<string, { open: number; target: number }>()
        let helper: ThreeNS = null

        function materialFor(part: FurniturePart): ThreeNS {
          const source = MATERIALS[part.material] ?? MATERIALS[DEFAULT_MATERIAL]
          const hex = part.color || defaultColorFor(part.material)
          const key = `${part.material}:${hex}`
          if (matCache.has(key)) return matCache.get(key)
          const woody = part.material === 'chene' || part.material === 'noyer' || part.material === 'blanc' || part.material === 'sauge' || part.material === 'melamine'
          const material = new THREE.MeshStandardMaterial({
            color: linearColor(hex),
            roughness: source.roughness,
            metalness: source.metalness,
            transparent: source.opacity != null,
            opacity: source.opacity ?? 1,
            ...(woody ? { bumpMap: grainTexture, bumpScale: 0.035 } : {}),
          })
          matCache.set(key, material)
          return material
        }

        function addEdges(mesh: ThreeNS) {
          mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry), edgeMat))
        }

        function boxMesh(parent: ThreeNS, material: ThreeNS, x: number, y: number, z: number, sx: number, sy: number, sz: number, edges = true) {
          const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), material)
          mesh.position.set(x, y, z)
          mesh.castShadow = true
          mesh.receiveShadow = true
          if (edges) addEdges(mesh)
          parent.add(mesh)
          return mesh
        }

        function roundedBoxGeometry(w: number, d: number, thickness: number, radius: number) {
          const r = Math.max(1, Math.min(radius, Math.min(w, d) / 2 - 1))
          const shape = new THREE.Shape()
          const x = -w / 2
          const y = -d / 2
          shape.moveTo(x + r, y)
          shape.lineTo(x + w - r, y)
          shape.quadraticCurveTo(x + w, y, x + w, y + r)
          shape.lineTo(x + w, y + d - r)
          shape.quadraticCurveTo(x + w, y + d, x + w - r, y + d)
          shape.lineTo(x + r, y + d)
          shape.quadraticCurveTo(x, y + d, x, y + d - r)
          shape.lineTo(x, y + r)
          shape.quadraticCurveTo(x, y, x + r, y)
          const geometry = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false, curveSegments: 14 })
          geometry.translate(0, 0, -thickness / 2)
          geometry.rotateX(-Math.PI / 2)
          geometry.computeVertexNormals()
          return geometry
        }

        function shapeGeometry(part: FurniturePart) {
          const { w, h, d, shape } = part
          if (shape === 'round') {
            const r = Math.min(w, d) / 2
            return { geometry: new THREE.CylinderGeometry(r, r, h, 48), edges: false }
          }
          if (shape === 'oval') {
            const geometry = new THREE.CylinderGeometry(d / 2, d / 2, h, 48)
            geometry.scale(w / d, 1, 1)
            return { geometry, edges: false }
          }
          if (shape === 'rounded') {
            return { geometry: roundedBoxGeometry(w, d, h, part.cornerRadius || 50), edges: true }
          }
          return { geometry: new THREE.BoxGeometry(w, h, d), edges: true }
        }

        function addHandle(parent: ThreeNS, part: FurniturePart, x: number, y: number, z: number, vertical: boolean) {
          const kind = part.handle ?? 'bar'
          if (kind === 'none') return
          const handleMaterial = handleMaterials[part.handleFinish ?? 'steel'] ?? metalMat
          if (kind === 'recess') {
            boxMesh(parent, darkMat, x, y, z, Math.max(56, part.w * 0.34), 16, 7, false)
            return
          }
          if (kind === 'knob') {
            const knob = new THREE.Mesh(new THREE.SphereGeometry(11, 20, 20), handleMaterial)
            knob.position.set(x, y, z)
            knob.castShadow = true
            parent.add(knob)
            return
          }
          const len = vertical
            ? Math.min(300, Math.max(60, part.h * 0.2))
            : Math.min(160, Math.max(48, part.w * 0.32))
          const bar = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, len, 12), handleMaterial)
          if (!vertical) bar.rotation.z = Math.PI / 2
          bar.position.set(x, y, z)
          bar.castShadow = true
          parent.add(bar)
        }

        function buildGroup(part: FurniturePart): { group: ThreeNS; anims: Anim[] } {
          const group = new THREE.Group()
          const anims: Anim[] = []
          const material = materialFor(part)
          const { w, h, d } = part
          const t = part.thickness

          if (part.type === 'niche') {
            boxMesh(group, material, -w / 2 + t / 2, 0, 0, t, h, d)
            boxMesh(group, material, w / 2 - t / 2, 0, 0, t, h, d)
            boxMesh(group, material, 0, h / 2 - t / 2, 0, w - 2 * t, t, d)
            boxMesh(group, material, 0, -h / 2 + t / 2, 0, w - 2 * t, t, d)
            boxMesh(group, material, 0, 0, -d / 2 + t / 2, w - 2 * t, h - 2 * t, t)
            return { group, anims }
          }

          if (part.type === 'rod') {
            const rod = new THREE.Mesh(new THREE.CylinderGeometry(h / 2, h / 2, w, 20), metalMat)
            rod.rotation.z = Math.PI / 2
            rod.castShadow = true
            group.add(rod)
            return { group, anims }
          }

          if (part.type === 'leg') {
            let geometry
            const span = Math.min(w, d)
            if (part.shape === 'round') geometry = new THREE.CylinderGeometry(span / 2, span / 2, h, 24)
            else if (part.shape === 'conical') geometry = new THREE.CylinderGeometry(span * 0.2, span / 2, h, 20)
            else geometry = new THREE.BoxGeometry(w, h, d)
            const mesh = new THREE.Mesh(geometry, material)
            mesh.castShadow = true
            mesh.receiveShadow = true
            if (part.shape !== 'round' && part.shape !== 'conical') addEdges(mesh)
            group.add(mesh)
            return { group, anims }
          }

          if (part.type === 'drawer') {
            const slider = new THREE.Group()
            group.add(slider)
            boxMesh(slider, material, 0, 0, 0, w, h, t)
            const bd = Math.max(t * 2, d - t)
            const zc = -t / 2 - bd / 2
            boxMesh(slider, material, 0, -h / 2 + t / 2, zc, w - 2 * t, t, bd, false)
            boxMesh(slider, material, -w / 2 + t / 2, 0, zc, t, h - 2 * t, bd, false)
            boxMesh(slider, material, w / 2 - t / 2, 0, zc, t, h - 2 * t, bd, false)
            boxMesh(slider, material, 0, 0, zc - bd / 2 + t / 2, w - 2 * t, h - 2 * t, t, false)
            addHandle(slider, part, 0, 0, t / 2 + 14, false)
            anims.push({ obj: slider, mode: 'translateZ', amount: d * 0.7 })
            return { group, anims }
          }

          if (part.type === 'door') {
            const motion = part.motion ?? 'hinge-left'
            if (motion === 'slide-x') {
              const slider = new THREE.Group()
              group.add(slider)
              const mesh = boxMesh(slider, material, 0, 0, 0, w, h, t)
              addHandle(mesh, part, w / 2 - 60, 0, t / 2 + 12, true)
              anims.push({ obj: slider, mode: 'translateX', amount: w * 0.95 })
              return { group, anims }
            }
            if (motion === 'tilt-down' || motion === 'tilt-up') {
              const down = motion === 'tilt-down'
              const pivot = new THREE.Group()
              pivot.position.set(0, down ? -h / 2 : h / 2, 0)
              group.add(pivot)
              const mesh = boxMesh(pivot, material, 0, down ? h / 2 : -h / 2, 0, w, h, t)
              addHandle(mesh, part, 0, down ? h / 2 - 30 : -h / 2 + 30, t / 2 + 12, false)
              anims.push({ obj: pivot, mode: 'rotateX', amount: down ? 1.45 : -1.45 })
              return { group, anims }
            }
            const leaves = part.leaves === 2 ? 2 : 1
            if (leaves === 2) {
              const leafW = (w - 3) / 2
              const left = new THREE.Group()
              left.position.set(-w / 2, 0, 0)
              group.add(left)
              const leftMesh = boxMesh(left, material, leafW / 2, 0, 0, leafW, h, t)
              addHandle(leftMesh, part, leafW / 2 - 40, 0, t / 2 + 12, true)
              anims.push({ obj: left, mode: 'rotateY', amount: -1.65 })
              const right = new THREE.Group()
              right.position.set(w / 2, 0, 0)
              group.add(right)
              const rightMesh = boxMesh(right, material, -leafW / 2, 0, 0, leafW, h, t)
              addHandle(rightMesh, part, -leafW / 2 + 40, 0, t / 2 + 12, true)
              anims.push({ obj: right, mode: 'rotateY', amount: 1.65 })
              return { group, anims }
            }
            const leftHinge = (part.hinge ?? 'left') === 'left'
            const pivot = new THREE.Group()
            pivot.position.set(leftHinge ? -w / 2 : w / 2, 0, 0)
            group.add(pivot)
            const mesh = boxMesh(pivot, material, leftHinge ? w / 2 : -w / 2, 0, 0, w, h, t)
            addHandle(mesh, part, leftHinge ? w / 2 - 40 : -w / 2 + 40, 0, t / 2 + 12, true)
            anims.push({ obj: pivot, mode: 'rotateY', amount: leftHinge ? -1.65 : 1.65 })
            return { group, anims }
          }

          if (part.shape === 'l') {
            const arm = Math.min(w, d) * 0.5
            boxMesh(group, material, 0, 0, -(d - arm) / 2, w, h, arm)
            boxMesh(group, material, -(w - arm) / 2, 0, arm / 2, w - arm, h, d - arm)
            return { group, anims }
          }

          const { geometry, edges } = shapeGeometry(part)
          const mesh = new THREE.Mesh(geometry, material)
          mesh.castShadow = true
          mesh.receiveShadow = true
          if (edges) addEdges(mesh)
          group.add(mesh)
          if (part.motion === 'slide-z') {
            const slider = new THREE.Group()
            group.remove(mesh)
            slider.add(mesh)
            group.add(slider)
            addHandle(slider, part, 0, 0, h / 2 + 10, false)
            anims.push({ obj: slider, mode: 'translateZ', amount: d * 0.8 })
          }
          return { group, anims }
        }

        function applyAnim(record: PartRecord, open: number) {
          for (const anim of record.anims) {
            if (anim.mode === 'rotateY') anim.obj.rotation.y = anim.amount * open
            else if (anim.mode === 'rotateX') anim.obj.rotation.x = anim.amount * open
            else if (anim.mode === 'translateZ') anim.obj.position.z = anim.amount * open
            else if (anim.mode === 'translateX') anim.obj.position.x = anim.amount * open
          }
        }

        function disposeGroup(group: ThreeNS) {
          group.traverse((object: ThreeNS) => {
            if (object.geometry) object.geometry.dispose()
          })
        }

        function showHelper(id: string | null) {
          if (!id || !records.has(id)) {
            if (helper) helper.visible = false
            return
          }
          const target = records.get(id)!.group
          if (!helper) {
            helper = new THREE.BoxHelper(target, 0xb8795e)
            const hm = helper.material as ThreeNS
            hm.transparent = true
            hm.opacity = 0.85
            hm.depthTest = false
            scene.add(helper)
          }
          helper.setFromObject(target)
          helper.visible = true
        }

        function render(parts: FurniturePart[]) {
          const seen = new Set<string>()
          for (const part of parts) {
            seen.add(part.id)
            const sig = signature(part)
            let record = records.get(part.id)
            if (!record || record.sig !== sig) {
              if (record) {
                root.remove(record.group)
                disposeGroup(record.group)
              }
              const built = buildGroup(part)
              built.group.userData.partId = part.id
              root.add(built.group)
              record = { group: built.group, sig, anims: built.anims }
              records.set(part.id, record)
              if (!opening.has(part.id)) opening.set(part.id, { open: 0, target: 0 })
            }
            record.group.position.set(part.x, part.y, part.z)
            record.group.rotation.y = ((part.ry || 0) * Math.PI) / 180
            applyAnim(record, opening.get(part.id)!.open)
          }
          for (const [id, record] of Array.from(records.entries())) {
            if (seen.has(id)) continue
            root.remove(record.group)
            disposeGroup(record.group)
            records.delete(id)
            opening.delete(id)
          }
          showHelper(selectedRef.current)
        }

        function bounds() {
          const parts = partsRef.current
          if (!parts.length) return { cx: 0, cy: 400, cz: 0, radius: 400, spanX: 800, spanZ: 800 }
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
            const hz = part.type === 'drawer' ? part.d / 2 : (part.w / 2) * s + (part.d / 2) * c
            const zShift = part.type === 'drawer' ? -part.d / 2 : 0
            const hy = part.h / 2
            minX = Math.min(minX, part.x - hx)
            maxX = Math.max(maxX, part.x + hx)
            minY = Math.min(minY, part.y - hy)
            maxY = Math.max(maxY, part.y + hy)
            minZ = Math.min(minZ, part.z + zShift - hz)
            maxZ = Math.max(maxZ, part.z + zShift + hz)
          }
          const radius = Math.max(maxX - minX, maxY - minY, maxZ - minZ) / 2
          return {
            cx: (minX + maxX) / 2,
            cy: (minY + maxY) / 2,
            cz: (minZ + maxZ) / 2,
            radius: radius || 200,
            spanX: maxX - minX,
            spanZ: maxZ - minZ,
          }
        }

        function fit() {
          const { cx, cy, cz, radius, spanX, spanZ } = bounds()
          const dist = radius * 3.9 + 160
          camera.position.set(cx + dist * 0.46, cy + dist * 0.34, cz + dist * 0.98)
          orbit.target.set(cx, cy + radius * 0.03, cz)
          orbit.minDistance = Math.max(radius * 0.6, 60)
          orbit.maxDistance = radius * 10 + 400
          camera.near = Math.max(radius * 0.02, 1)
          camera.far = dist * 14
          camera.updateProjectionMatrix()
          orbit.update()

          grid.scale.setScalar((radius * 6) / 400)
          floor.scale.set(radius * 8, radius * 8, 1)
          contact.position.set(cx, 0.8, cz)
          contact.scale.set(Math.max(spanX * 1.55, 400), Math.max(spanZ * 2.3, 400), 1)
          sun.position.set(cx + radius * 0.45, cy + radius * 3.1, cz + radius * 1.0)
          sun.target.position.set(cx, cy, cz)
          sun.target.updateMatrixWorld()
          const sc = sun.shadow.camera
          const extent = radius * 1.8 + 120
          sc.left = -extent
          sc.right = extent
          sc.top = extent
          sc.bottom = -extent
          sc.near = 1
          sc.far = radius * 8 + 800
          sc.updateProjectionMatrix()
        }

        function setView(view: ViewPreset) {
          const { cx, cy, cz, radius } = bounds()
          const dist = radius * 3.9 + 160
          orbit.target.set(cx, cy, cz)
          if (view === 'front') camera.position.set(cx, cy + radius * 0.08, cz + dist * 1.12)
          else if (view === 'side') camera.position.set(cx + dist * 1.12, cy + radius * 0.08, cz)
          else if (view === 'top') camera.position.set(cx, cy + dist * 1.15, cz + dist * 0.04)
          else camera.position.set(cx + dist * 0.46, cy + dist * 0.34, cz + dist * 0.98)
          orbit.minDistance = Math.max(radius * 0.6, 60)
          orbit.maxDistance = radius * 10 + 400
          orbit.update()
        }

        function setAll(open: boolean) {
          for (const [id, state] of opening) {
            const record = records.get(id)
            if (record && record.anims.length) state.target = open ? 1 : 0
          }
        }

        function toggle(id: string) {
          const state = opening.get(id)
          if (state) state.target = state.target ? 0 : 1
          handlersRef.current.onToggle?.()
        }

        function partIdAt(object: ThreeNS): string | null {
          let current = object
          while (current) {
            if (current.userData && current.userData.partId) return current.userData.partId as string
            current = current.parent
          }
          return null
        }

        const ray = new THREE.Raycaster()
        const pointer = new THREE.Vector2()
        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
        const point = new THREE.Vector3()
        let drag: { id: string; y: number } | null = null

        function setPointer(event: PointerEvent | MouseEvent) {
          const rect = renderer.domElement.getBoundingClientRect()
          pointer.set(
            ((event.clientX - rect.left) / rect.width) * 2 - 1,
            -((event.clientY - rect.top) / rect.height) * 2 + 1,
          )
          ray.setFromCamera(pointer, camera)
        }

        function onPointerDown(event: PointerEvent) {
          setPointer(event)
          const hit = ray.intersectObjects(root.children, true)[0]
          const id = hit ? partIdAt(hit.object) : null
          handlersRef.current.onSelect?.(id)
          selectedRef.current = id
          showHelper(id)
          if (id && hit && handlersRef.current.onMove && handlersRef.current.interactive !== false) {
            drag = { id, y: hit.point.y }
            orbit.enabled = false
          }
        }

        function onPointerMove(event: PointerEvent) {
          if (!drag || !handlersRef.current.onMove) return
          setPointer(event)
          plane.constant = -drag.y
          if (!ray.ray.intersectPlane(plane, point)) return
          handlersRef.current.onMove(drag.id, Math.round(point.x / 10) * 10, Math.round(point.z / 10) * 10)
        }

        function onPointerUp() {
          if (drag) {
            drag = null
            orbit.enabled = true
          }
        }

        function onDoubleClick(event: MouseEvent) {
          setPointer(event)
          const hit = ray.intersectObjects(root.children, true)[0]
          const id = hit ? partIdAt(hit.object) : null
          if (id) toggle(id)
        }

        renderer.domElement.addEventListener('pointerdown', onPointerDown)
        window.addEventListener('pointermove', onPointerMove)
        window.addEventListener('pointerup', onPointerUp)
        renderer.domElement.addEventListener('dblclick', onDoubleClick)

        const resize = () => {
          const width = mount.clientWidth || 1
          const height = mount.clientHeight || 1
          renderer.setSize(width, height, false)
          renderer.domElement.style.width = '100%'
          renderer.domElement.style.height = '100%'
          camera.aspect = width / height
          camera.updateProjectionMatrix()
        }
        const observer = new ResizeObserver(resize)
        observer.observe(mount)
        resize()

        const clock = new THREE.Clock()
        let active = false
        let inView = true
        const loop = () => {
          if (!active) return
          frame = requestAnimationFrame(loop)
          const dt = Math.min(clock.getDelta(), 0.05)
          for (const [id, state] of opening) {
            if (state.open === state.target) continue
            state.open += (state.target - state.open) * Math.min(1, dt * 8)
            if (Math.abs(state.target - state.open) < 0.003) state.open = state.target
            const record = records.get(id)
            if (record) applyAnim(record, state.open)
          }
          if (helper && helper.visible && selectedRef.current && records.has(selectedRef.current)) {
            helper.setFromObject(records.get(selectedRef.current)!.group)
          }
          orbit.update()
          renderer.render(scene, camera)
        }
        const start = () => {
          if (active) return
          active = true
          clock.getDelta()
          loop()
        }
        const stop = () => {
          active = false
          cancelAnimationFrame(frame)
        }
        const sync = () => {
          if (!document.hidden && inView) start()
          else stop()
        }
        const onVisibility = () => sync()
        document.addEventListener('visibilitychange', onVisibility)
        const intersection = new IntersectionObserver(
          (entries) => {
            inView = entries.some((entry) => entry.isIntersecting)
            sync()
          },
          { threshold: 0.01 },
        )
        intersection.observe(mount)
        start()

        internalRef.current = {
          render,
          fit,
          setAll,
          setView,
          setSelected: (id: string | null) => {
            selectedRef.current = id
            showHelper(id)
          },
          toggle,
        }

        render(partsRef.current)
        fit()
        setStatus('ready')

        teardown = () => {
          stop()
          document.removeEventListener('visibilitychange', onVisibility)
          intersection.disconnect()
          observer.disconnect()
          renderer.domElement.removeEventListener('pointerdown', onPointerDown)
          window.removeEventListener('pointermove', onPointerMove)
          window.removeEventListener('pointerup', onPointerUp)
          renderer.domElement.removeEventListener('dblclick', onDoubleClick)
          orbit.dispose()
          scene.traverse((object: ThreeNS) => {
            if (object.geometry) object.geometry.dispose()
            const materials = object.material ? (Array.isArray(object.material) ? object.material : [object.material]) : []
            for (const material of materials) {
              for (const key of ['map', 'bumpMap', 'normalMap', 'roughnessMap', 'metalnessMap', 'alphaMap']) {
                const texture = material[key]
                if (texture && typeof texture.dispose === 'function') texture.dispose()
              }
              if (typeof material.dispose === 'function') material.dispose()
            }
          })
          grainTexture.dispose()
          renderer.dispose()
          if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement)
          internalRef.current = null
        }
      })
      .catch(() => {
        setStatus('error')
      })

    return () => {
      disposed = true
      cancelAnimationFrame(frame)
      teardown?.()
    }
  }, [retry])

  useEffect(() => {
    internalRef.current?.render(props.parts)
  }, [props.parts])

  useEffect(() => {
    internalRef.current?.setSelected(props.selectedId ?? null)
  }, [props.selectedId])

  return (
    <div
      className={props.className}
      ref={mountRef}
      role="group"
      aria-label="Aperçu 3D du meuble"
    >
      {status !== 'ready' && (
        <div className={`scene-state ${status === 'error' ? 'is-error' : ''}`} role="status" aria-live="polite">
          {status === 'loading' ? (
            <>
              <LoaderCircle className="spin" />
              <span>Chargement de la scène…</span>
            </>
          ) : (
            <>
              <span>La scène 3D n&apos;a pas pu se charger.</span>
              <button type="button" onClick={() => setRetry((value) => value + 1)}>Réessayer</button>
            </>
          )}
        </div>
      )}
    </div>
  )
})

export default Scene3D
