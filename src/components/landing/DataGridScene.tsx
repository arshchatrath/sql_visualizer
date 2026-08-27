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
 * rendered literally rather than implied. A transparent WebGL canvas over the existing near-black
 * background, so the CSS glow layer still shows through underneath it.
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

    // What actually sells a floor grid as 3D isn't steepness of the down-tilt
    // — it's camera height above the plane plus keeping the visible depth
    // range well clear of the camera. An earlier attempt sat the camera
    // almost on the grid plane with the grid's near edge crossing behind the
    // camera; nearly the entire visible depth range then landed compressed
    // into a sliver of screen space, so it read as flat horizontal bands no
    // matter the tilt angle (confirmed by projecting sample grid points
    // through the camera matrix — verify visually before re-tuning by feel).
    // Sitting the camera well above the plane and aiming far down the
    // recession spreads that range across the frame: wide and off-screen
    // near the bottom, converging toward a horizon well within the frustum.
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100)
    camera.position.set(0, 2.8, 4)
    camera.lookAt(0, -2.5, -22)

    const grid = new THREE.GridHelper(GRID_SIZE, GRID_DIVISIONS, GRID_CENTER_HEX, GRID_LINE_HEX)
    const gridMaterial = grid.material as THREE.LineBasicMaterial
    gridMaterial.transparent = true
    gridMaterial.opacity = GRID_OPACITY
    // Each depth-direction ("column") line spans the grid's full local z
    // extent in one draw call. If any part of that line sits behind the
    // camera, it needs near-plane clipping — and that clipping silently
    // dropped the whole line under swiftshader's line rasterizer (verified
    // by isolating GL draw calls: the row lines, which never cross behind
    // the camera, rendered correctly every frame, while every column line
    // rendered nothing). Shifting the whole plane back so its nearest edge
    // stays safely in front of the camera sidesteps the clipping path
    // entirely instead of depending on it working.
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
        // Cycle the grid forward by exactly one cell width so the loop
        // seam is invisible — reads as an endless plane sliding past,
        // not a bounded tile repeating.
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
