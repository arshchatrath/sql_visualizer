import { useEffect, useRef } from 'react'
import * as THREE from 'three'

const BG_HEX = 0x0e0a06
const GRID_LINE_HEX = 0xa97a2c // --color-accent-dim
const GRID_CENTER_HEX = 0x57e6c7 // --color-accent2
const GRID_SIZE = 40
const GRID_DIVISIONS = 20
const GRID_OPACITY = 0.55
const DRIFT_SPEED = 0.0009 // grid-cells per ms, tuned to read as a slow, deliberate glide

/**
 * A slow, atmospheric 3D grid receding into fog behind the landing screen —
 * rows of data extending away into the dark, drifting at a steady pulse,
 * rendered literally rather than implied. A transparent WebGL canvas over the
 * existing near-black background, so the CSS glow layer still shows through.
 *
 * Deliberately restrained: one muted grid plane, no particles, no bloom,
 * fog fading it to the same near-black as the page background so it reads
 * as depth rather than a "3D demo" bolted onto a 2D screen.
 */
export function DataGridScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const container = canvas?.parentElement
    if (!canvas || !container) return

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
    } catch {
      // WebGL unavailable in this environment — the landing-glow CSS
      // layer still carries some ambient background on its own.
      return
    }

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const scene = new THREE.Scene()
    scene.fog = new THREE.Fog(BG_HEX, 10, 30)

    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100)
    camera.position.set(0, 2.8, 4)
    camera.lookAt(0, -2.5, -22)

    const grid = new THREE.GridHelper(GRID_SIZE, GRID_DIVISIONS, GRID_CENTER_HEX, GRID_LINE_HEX)
    const gridMaterial = grid.material as THREE.LineBasicMaterial
    gridMaterial.transparent = true
    gridMaterial.opacity = GRID_OPACITY
    grid.position.set(0, -1.2, -22)
    scene.add(grid)

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

    const resize = () => {
      const { clientWidth, clientHeight } = container
      if (clientWidth === 0 || clientHeight === 0) return
      renderer.setSize(clientWidth, clientHeight, false)
      camera.aspect = clientWidth / clientHeight
      camera.updateProjectionMatrix()
    }
    resize()

    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(container)

    let isPageVisible = document.visibilityState === 'visible'
    const onVisibilityChange = () => {
      isPageVisible = document.visibilityState === 'visible'
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    const cellSize = GRID_SIZE / GRID_DIVISIONS
    const baseZ = grid.position.z
    let rafId = 0

    const renderFrame = (time: number) => {
      if (isPageVisible) {
        grid.position.z = baseZ + ((time * DRIFT_SPEED) % cellSize)
        renderer.render(scene, camera)
      }
      rafId = requestAnimationFrame(renderFrame)
    }

    if (reducedMotion) {
      renderer.render(scene, camera)
    } else {
      rafId = requestAnimationFrame(renderFrame)
    }

    return () => {
      cancelAnimationFrame(rafId)
      resizeObserver.disconnect()
      document.removeEventListener('visibilitychange', onVisibilityChange)
      grid.geometry.dispose()
      gridMaterial.dispose()
      renderer.dispose()
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full -z-10"
    />
  )
}
