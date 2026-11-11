'use client'

export type ThreeNS = any

let threePromise: Promise<ThreeNS> | null = null

/**
 * Charge Three.js (r128) et OrbitControls depuis les fichiers servis par
 * l'application, une seule fois, puis résout avec le namespace global THREE.
 *
 * Les fichiers sont versionnés dans public/vendor : la scène reste disponible
 * hors ligne et ne dépend plus d'un CDN tiers.
 */
export function loadThree(): Promise<ThreeNS> {
  if (typeof window === 'undefined') return Promise.reject(new Error('no-window'))
  const scope = window as unknown as { THREE?: ThreeNS }
  if (scope.THREE && scope.THREE.OrbitControls) return Promise.resolve(scope.THREE)
  if (threePromise) return threePromise
  threePromise = new Promise<ThreeNS>((resolve, reject) => {
    const core = document.createElement('script')
    core.src = '/vendor/three.min.js'
    core.async = true
    core.onload = () => {
      const controls = document.createElement('script')
      controls.src = '/vendor/OrbitControls.js'
      controls.async = true
      controls.onload = () => {
        const three = (window as unknown as { THREE?: ThreeNS }).THREE
        if (three && three.OrbitControls) resolve(three)
        else reject(new Error('orbit-controls-missing'))
      }
      controls.onerror = () => reject(new Error('orbit-controls-load-failed'))
      document.head.appendChild(controls)
    }
    core.onerror = () => reject(new Error('three-load-failed'))
    document.head.appendChild(core)
  })
  return threePromise
}
