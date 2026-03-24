import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import * as THREE from 'three'
import { messagePath } from '../utils/routes'
import { useTitle } from '../utils/useTitle'

interface Point {
  id: number; x: number; y: number; c: number
  a: string; s: string; m: string; p: string; t: string[]; th: string
}
interface Cluster {
  id: number; label: string; count: number
  cx: number; cy: number; top_words: string; top_authors: string
}
interface AuthorSuggestion { name: string; post_count: number }

type ColorMode = 'cluster' | 'year' | 'author' | 'tag'

// --- Color helpers (return [r,g,b] in 0-1) ---
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h /= 360; s /= 100; l /= 100
  if (s === 0) return [l, l, l]
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1; if (t > 1) t -= 1
    if (t < 1/6) return p + (q - p) * 6 * t
    if (t < 1/2) return q
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6
    return p
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  return [hue2rgb(p, q, h + 1/3), hue2rgb(p, q, h), hue2rgb(p, q, h - 1/3)]
}

function clusterColorRgb(id: number): [number, number, number] {
  return hslToRgb((id * 137.508) % 360, 65, 55)
}

function yearColorRgb(ym: string): [number, number, number] {
  if (!ym) return [0.27, 0.27, 0.27]
  const year = parseInt(ym.split('-')[0])
  const t = (year - 1996) / 7
  return hslToRgb(t * 270, 60, 50)
}

function authorColorRgb(name: string): [number, number, number] {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0
  return hslToRgb(Math.abs(hash) % 360, 55, 55)
}

const tagHues: Record<string, number> = {
  ai: 280, crypto: 160, nanotech: 130, cryonics: 230, biology: 145,
  space: 260, consciousness: 310, economics: 85, philosophy: 340,
  politics: 25, computing: 200, transhumanism: 55, physics: 185,
}

function tagColorRgb(tags: string[]): [number, number, number] {
  if (tags.length === 0) return [0.2, 0.2, 0.2]
  const hue = tagHues[tags[0]] ?? 0
  return hslToRgb(hue, 65, 55)
}

function clusterColorCss(id: number): string {
  const hue = (id * 137.508) % 360
  return `hsl(${hue}, 65%, 55%)`
}

// --- Spatial hash for O(1) hover detection ---
class SpatialHash {
  private cellSize: number
  private cells = new Map<string, number[]>()
  private xs: Float32Array
  private ys: Float32Array

  constructor(cellSize: number) {
    this.cellSize = cellSize
    this.xs = new Float32Array(0)
    this.ys = new Float32Array(0)
  }

  build(xs: Float32Array, ys: Float32Array) {
    this.cells.clear()
    this.xs = xs
    this.ys = ys
    for (let i = 0; i < xs.length; i++) {
      const key = `${Math.floor(xs[i] / this.cellSize)},${Math.floor(ys[i] / this.cellSize)}`
      let cell = this.cells.get(key)
      if (!cell) { cell = []; this.cells.set(key, cell) }
      cell.push(i)
    }
  }

  findNearest(x: number, y: number, maxDist: number): number {
    const r = Math.ceil(maxDist / this.cellSize)
    const cx = Math.floor(x / this.cellSize)
    const cy = Math.floor(y / this.cellSize)
    let bestIdx = -1
    let bestDist = maxDist * maxDist

    for (let dx = -r; dx <= r; dx++) {
      for (let dy = -r; dy <= r; dy++) {
        const cell = this.cells.get(`${cx + dx},${cy + dy}`)
        if (!cell) continue
        for (const i of cell) {
          const ddx = this.xs[i] - x
          const ddy = this.ys[i] - y
          const d = ddx * ddx + ddy * ddy
          if (d < bestDist) { bestDist = d; bestIdx = i }
        }
      }
    }
    return bestIdx
  }
}

// Custom shader for points with per-vertex alpha
const vertexShader = `
  attribute float alpha;
  attribute float size;
  varying float vAlpha;
  varying vec3 vColor;
  void main() {
    vAlpha = alpha;
    vColor = color;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size;
    gl_Position = projectionMatrix * mvPosition;
  }
`

const fragmentShader = `
  varying float vAlpha;
  varying vec3 vColor;
  void main() {
    // Circle shape
    vec2 center = gl_PointCoord - vec2(0.5);
    float dist = dot(center, center);
    if (dist > 0.25) discard;
    gl_FragColor = vec4(vColor, vAlpha);
  }
`

export default function FastMap() {
  useTitle('Embeddings (WebGL)')
  const [allPoints, setAllPoints] = useState<Point[]>([])
  const [totalPointCount, setTotalPointCount] = useState(0)
  const [clusters, setClusters] = useState<Cluster[]>([])
  const [colorMode, setColorMode] = useState<ColorMode>('cluster')
  const [hoveredPoint, setHoveredPoint] = useState<Point | null>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [loading, setLoading] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  // Filters
  const [selectedCluster, setSelectedCluster] = useState<number | null>(null)
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [participants, setParticipants] = useState<string[]>([])
  const [participantInput, setParticipantInput] = useState('')
  const [suggestions, setSuggestions] = useState<AuthorSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [allTags] = useState<string[]>([
    'ai', 'crypto', 'nanotech', 'cryonics', 'biology', 'space',
    'consciousness', 'economics', 'philosophy', 'politics',
    'computing', 'transhumanism', 'physics',
  ])

  // View transform
  const [view, setView] = useState({ ox: 0, oy: 0, scale: 1 })
  const [dragging, setDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, ox: 0, oy: 0 })
  const didDragRef = useRef(false)
  const boundsRef = useRef({ minX: 0, maxX: 1, minY: 0, maxY: 1 })

  // Three.js refs
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null)
  const pointsObjRef = useRef<THREE.Points | null>(null)
  const bgPointsObjRef = useRef<THREE.Points | null>(null)
  const animFrameRef = useRef<number>(0)

  // Spatial hash for hover
  const spatialHashRef = useRef(new SpatialHash(15))
  const screenPosRef = useRef<Float32Array>(new Float32Array(0))
  const screenPosYRef = useRef<Float32Array>(new Float32Array(0))

  // FPS counter
  const fpsRef = useRef<HTMLDivElement>(null)
  const frameTimesRef = useRef<number[]>([])

  // Label canvas overlay
  const labelCanvasRef = useRef<HTMLCanvasElement>(null)

  // Load data
  useEffect(() => {
    fetch('/api/map/clusters').then(r => r.json()).then(setClusters)
    let accumulated: Point[] = []
    let boundsSet = false
    const loadChunk = async (chunk: number) => {
      const res = await fetch(`/api/map/points?chunk=${chunk}`)
      const data = await res.json()
      accumulated = [...accumulated, ...data.points]
      setAllPoints([...accumulated])
      setTotalPointCount(data.total)
      if (!boundsSet && accumulated.length > 0) {
        boundsSet = true
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
        for (const p of accumulated) {
          if (p.x < minX) minX = p.x
          if (p.x > maxX) maxX = p.x
          if (p.y < minY) minY = p.y
          if (p.y > maxY) maxY = p.y
        }
        const padX = (maxX - minX) * 0.5
        const padY = (maxY - minY) * 0.5
        boundsRef.current = { minX: minX - padX, maxX: maxX + padX, minY: minY - padY, maxY: maxY + padY }
      }
      setLoading(false)
      if (data.has_more) {
        requestAnimationFrame(() => loadChunk(chunk + 1))
      }
    }
    loadChunk(0)
  }, [])

  // Autocomplete
  useEffect(() => {
    if (participantInput.length < 2) { setSuggestions([]); return }
    const timer = setTimeout(() => {
      fetch(`/api/authors/search?q=${encodeURIComponent(participantInput)}&limit=8`)
        .then(r => r.json())
        .then(setSuggestions)
    }, 150)
    return () => clearTimeout(timer)
  }, [participantInput])

  // Thread index
  const threadIndex = useMemo(() => {
    const idx = new Map<string, Set<number>>()
    for (const p of allPoints) {
      if (!p.th) continue
      let s = idx.get(p.th)
      if (!s) { s = new Set(); idx.set(p.th, s) }
      s.add(p.id)
    }
    return idx
  }, [allPoints])

  const highlightedThread = useMemo(() => {
    if (!hoveredPoint?.th) return null
    return threadIndex.get(hoveredPoint.th) || null
  }, [hoveredPoint, threadIndex])

  // Filter points
  const points = useMemo(() => {
    let filtered = allPoints
    if (selectedCluster !== null) filtered = filtered.filter(p => p.c === selectedCluster)
    if (selectedTag) filtered = filtered.filter(p => p.t.includes(selectedTag))
    if (participants.length > 0) filtered = filtered.filter(p => participants.includes(p.a))
    return filtered
  }, [allPoints, selectedCluster, selectedTag, participants])

  const isFiltered = selectedCluster !== null || selectedTag !== null || participants.length > 0

  // Map data coords to screen coords
  const toScreen = useCallback((px: number, py: number, w: number, h: number) => {
    const { minX, maxX, minY, maxY } = boundsRef.current
    const padding = 40
    const scaleX = (w - padding * 2) / (maxX - minX)
    const scaleY = (h - padding * 2) / (maxY - minY)
    const s = Math.min(scaleX, scaleY) * view.scale
    const cx = w / 2 + view.ox
    const cy = h / 2 + view.oy
    return {
      x: (px - (minX + maxX) / 2) * s + cx,
      y: (py - (minY + maxY) / 2) * s + cy,
    }
  }, [view])

  // Initialize Three.js
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false })
    renderer.setClearColor(0x0d1117)
    renderer.setPixelRatio(window.devicePixelRatio)
    container.appendChild(renderer.domElement)
    renderer.domElement.style.position = 'absolute'
    renderer.domElement.style.top = '0'
    renderer.domElement.style.left = '0'
    renderer.domElement.style.width = '100%'
    renderer.domElement.style.height = '100%'

    const scene = new THREE.Scene()
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10)
    camera.position.z = 1

    rendererRef.current = renderer
    sceneRef.current = scene
    cameraRef.current = camera

    const handleResize = () => {
      const rect = container.getBoundingClientRect()
      renderer.setSize(rect.width, rect.height)
      camera.left = 0; camera.right = rect.width
      camera.top = 0; camera.bottom = rect.height
      camera.updateProjectionMatrix()
      // Also resize label canvas
      const lc = labelCanvasRef.current
      if (lc) {
        lc.width = rect.width * window.devicePixelRatio
        lc.height = rect.height * window.devicePixelRatio
        lc.style.width = rect.width + 'px'
        lc.style.height = rect.height + 'px'
      }
    }
    handleResize()

    const obs = new ResizeObserver(handleResize)
    obs.observe(container)

    return () => {
      obs.disconnect()
      cancelAnimationFrame(animFrameRef.current)
      container.removeChild(renderer.domElement)
      renderer.dispose()
    }
  }, [])

  // Build/update geometry whenever points, colors, or highlight changes
  useEffect(() => {
    const scene = sceneRef.current
    if (!scene || allPoints.length === 0) return

    const container = containerRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()
    const w = rect.width
    const h = rect.height

    const ht = highlightedThread
    const dotSize = Math.max(2, Math.min(8, 2 * Math.sqrt(view.scale))) * window.devicePixelRatio

    // Remove old objects
    if (bgPointsObjRef.current) { scene.remove(bgPointsObjRef.current); bgPointsObjRef.current.geometry.dispose() }
    if (pointsObjRef.current) { scene.remove(pointsObjRef.current); pointsObjRef.current.geometry.dispose() }

    // If filtered, draw background points
    if (isFiltered) {
      const n = allPoints.length
      const positions = new Float32Array(n * 3)
      const colors = new Float32Array(n * 3)
      const alphas = new Float32Array(n)
      const sizes = new Float32Array(n)

      for (let i = 0; i < n; i++) {
        const p = allPoints[i]
        const { x, y } = toScreen(p.x, p.y, w, h)
        positions[i * 3] = x
        positions[i * 3 + 1] = h - y // flip Y for Three.js
        positions[i * 3 + 2] = 0
        colors[i * 3] = 0.33; colors[i * 3 + 1] = 0.33; colors[i * 3 + 2] = 0.33
        alphas[i] = 0.08
        sizes[i] = dotSize
      }

      const bgGeo = new THREE.BufferGeometry()
      bgGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
      bgGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
      bgGeo.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1))
      bgGeo.setAttribute('size', new THREE.BufferAttribute(sizes, 1))

      const bgMat = new THREE.ShaderMaterial({
        vertexShader, fragmentShader,
        vertexColors: true,
        transparent: true,
        depthTest: false,
      })
      const bgObj = new THREE.Points(bgGeo, bgMat)
      scene.add(bgObj)
      bgPointsObjRef.current = bgObj
    }

    // Active points
    const n = points.length
    const positions = new Float32Array(n * 3)
    const colors = new Float32Array(n * 3)
    const alphas = new Float32Array(n)
    const sizes = new Float32Array(n)
    const screenXs = new Float32Array(n)
    const screenYs = new Float32Array(n)

    for (let i = 0; i < n; i++) {
      const p = points[i]
      const { x, y } = toScreen(p.x, p.y, w, h)
      positions[i * 3] = x
      positions[i * 3 + 1] = h - y
      positions[i * 3 + 2] = 0

      const inThread = ht && ht.has(p.id)
      alphas[i] = ht ? (inThread ? 1.0 : 0.08) : (isFiltered ? 0.9 : 0.6)
      sizes[i] = inThread ? dotSize * 2.5 : dotSize

      const [r, g, b] = colorMode === 'cluster' ? clusterColorRgb(p.c)
        : colorMode === 'year' ? yearColorRgb(p.m)
        : colorMode === 'author' ? authorColorRgb(p.a)
        : tagColorRgb(p.t)
      colors[i * 3] = r; colors[i * 3 + 1] = g; colors[i * 3 + 2] = b

      screenXs[i] = x
      screenYs[i] = y
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geo.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1))
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1))

    const mat = new THREE.ShaderMaterial({
      vertexShader, fragmentShader,
      vertexColors: true,
      transparent: true,
      depthTest: false,
    })
    const obj = new THREE.Points(geo, mat)
    scene.add(obj)
    pointsObjRef.current = obj

    // Update spatial hash
    screenPosRef.current = screenXs
    screenPosYRef.current = screenYs
    spatialHashRef.current.build(screenXs, screenYs)

  }, [allPoints, points, view, colorMode, isFiltered, highlightedThread, toScreen])

  // Draw cluster labels on overlay canvas
  useEffect(() => {
    const lc = labelCanvasRef.current
    if (!lc || colorMode !== 'cluster') return
    const ctx = lc.getContext('2d')
    if (!ctx) return
    const container = containerRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()
    const w = rect.width
    const h = rect.height
    const dpr = window.devicePixelRatio

    ctx.clearRect(0, 0, lc.width, lc.height)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const fontSize = Math.max(9, Math.min(13, 10 * Math.sqrt(view.scale)))
    ctx.font = `${fontSize}px -apple-system, sans-serif`
    ctx.textAlign = 'center'

    for (const c of clusters) {
      if (selectedCluster !== null && c.id !== selectedCluster) continue
      const { x, y } = toScreen(c.cx, c.cy, w, h)
      if (x < 0 || x > w || y < 0 || y > h) continue
      if (view.scale > 0.8 || c.count > 2000) {
        const label = c.label.split(' / ').slice(0, 2).join(' / ')
        const tw = ctx.measureText(label).width
        ctx.fillStyle = 'rgba(13, 17, 23, 0.75)'
        ctx.fillRect(x - tw / 2 - 3, y - 7, tw + 6, 16)
        ctx.fillStyle = clusterColorCss(c.id)
        ctx.fillText(label, x, y + 4)
      }
    }

    // Year legend
    if (colorMode === 'year') {
      ctx.font = '9px monospace'
      ctx.textAlign = 'left'
      for (let y = 1996; y <= 2003; y++) {
        const i = y - 1996
        const [r, g, b] = yearColorRgb(`${y}-01`)
        ctx.fillStyle = `rgb(${r*255},${g*255},${b*255})`
        ctx.fillRect(w - 80, 10 + i * 14, 10, 10)
        ctx.fillStyle = '#8b949e'
        ctx.fillText(String(y), w - 65, 19 + i * 14)
      }
    }
  }, [clusters, view, colorMode, selectedCluster, toScreen])

  // Render loop
  useEffect(() => {
    const renderer = rendererRef.current
    const scene = sceneRef.current
    const camera = cameraRef.current
    if (!renderer || !scene || !camera) return

    const loop = () => {
      animFrameRef.current = requestAnimationFrame(loop)

      // FPS
      const now = performance.now()
      const times = frameTimesRef.current
      times.push(now)
      while (times.length > 0 && times[0] < now - 1000) times.shift()
      if (fpsRef.current) {
        fpsRef.current.textContent = `${times.length} fps`
      }

      renderer.render(scene, camera)
    }
    loop()

    return () => cancelAnimationFrame(animFrameRef.current)
  }, [])

  // Mouse handlers
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const container = containerRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    setMousePos({ x: e.clientX, y: e.clientY })

    if (dragging) {
      didDragRef.current = true
      setView(v => ({
        ...v,
        ox: dragStart.ox + (mx - dragStart.x),
        oy: dragStart.oy + (my - dragStart.y),
      }))
      return
    }

    // Spatial hash lookup
    const idx = spatialHashRef.current.findNearest(mx, my, 10)
    setHoveredPoint(idx >= 0 ? points[idx] : null)
  }, [points, dragging, dragStart])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const container = containerRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()
    const factor = e.deltaY > 0 ? 0.9 : 1.1
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    setView(v => {
      const newScale = Math.max(0.1, Math.min(50, v.scale * factor))
      const cx = rect.width / 2 + v.ox
      const cy = rect.height / 2 + v.oy
      const newOx = v.ox - (mx - cx) * (factor - 1)
      const newOy = v.oy - (my - cy) * (factor - 1)
      return { ox: newOx, oy: newOy, scale: newScale }
    })
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const container = containerRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()
    didDragRef.current = false
    setDragging(true)
    setDragStart({ x: e.clientX - rect.left, y: e.clientY - rect.top, ox: view.ox, oy: view.oy })
  }, [view])

  const handleMouseUp = useCallback(() => { setDragging(false) }, [])

  const handleClick = useCallback(() => {
    if (didDragRef.current) return
    if (hoveredPoint) navigate(messagePath(hoveredPoint.id))
  }, [hoveredPoint, navigate])

  const addParticipant = (name: string) => {
    if (!participants.includes(name)) setParticipants([...participants, name])
    setParticipantInput('')
    setSuggestions([])
    setShowSuggestions(false)
  }

  const truncatePreview = (text: string, words: number) => {
    const w = text.split(/\s+/)
    return w.length > words ? w.slice(0, words).join(' ') + '...' : text
  }

  if (loading) return <div className="loading">Loading message embeddings...</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 50px)', margin: '-8px -16px', padding: '0 8px', overflow: 'hidden' }}>
      {/* Controls bar */}
      <div style={{ display: 'flex', gap: 6, padding: '4px 0', fontSize: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ color: 'var(--text-tertiary)' }}>
          {points.length.toLocaleString()}{isFiltered ? ` / ${allPoints.length.toLocaleString()}` : ''} msgs
          {totalPointCount > 0 && allPoints.length < totalPointCount && (
            <span style={{ color: 'var(--yellow)' }}> (loading {Math.round(allPoints.length / totalPointCount * 100)}%)</span>
          )}
        </span>
        <span style={{ color: 'var(--border)' }}>|</span>

        {/* Color mode */}
        <span style={{ color: 'var(--text-tertiary)' }}>color:</span>
        {(['cluster', 'year', 'author', 'tag'] as ColorMode[]).map(m => (
          <a key={m} href="#" onClick={e => { e.preventDefault(); setColorMode(m) }}
            style={{ color: colorMode === m ? 'var(--accent)' : 'var(--text-tertiary)' }}>{m}</a>
        ))}
        <span style={{ color: 'var(--border)' }}>|</span>

        {/* Cluster filter */}
        <select
          value={selectedCluster ?? ''}
          onChange={e => setSelectedCluster(e.target.value ? parseInt(e.target.value) : null)}
          style={{ fontSize: 10, background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 3, padding: '1px 4px' }}
        >
          <option value="">all clusters</option>
          {clusters.sort((a, b) => b.count - a.count).map(c => (
            <option key={c.id} value={c.id}>{c.label} ({c.count})</option>
          ))}
        </select>

        {/* Tag filter */}
        <select
          value={selectedTag || ''}
          onChange={e => setSelectedTag(e.target.value || null)}
          style={{ fontSize: 10, background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 3, padding: '1px 4px' }}
        >
          <option value="">all tags</option>
          {allTags.map(t => (<option key={t} value={t}>{t}</option>))}
        </select>

        {/* Author filter */}
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            placeholder="author..."
            value={participantInput}
            onChange={e => { setParticipantInput(e.target.value); setShowSuggestions(true) }}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={e => {
              if (e.key === 'Enter' && suggestions.length > 0) {
                e.preventDefault(); addParticipant(suggestions[0].name)
              }
            }}
            style={{ width: 120, fontSize: 10, background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 3, padding: '1px 4px' }}
          />
          {showSuggestions && suggestions.length > 0 && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, zIndex: 50,
              background: 'var(--bg-secondary)', border: '1px solid var(--border)',
              borderRadius: 3, maxHeight: 160, overflow: 'auto', width: 220,
            }}>
              {suggestions.map(s => (
                <div key={s.name} onClick={() => addParticipant(s.name)}
                  style={{ padding: '2px 6px', cursor: 'pointer', fontSize: 10, display: 'flex', justifyContent: 'space-between' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-tertiary)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <span>{s.name}</span>
                  <span style={{ color: 'var(--text-tertiary)' }}>{s.post_count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        {participants.map(p => (
          <span key={p} style={{ background: 'var(--bg-tertiary)', padding: '1px 5px', borderRadius: 2, fontSize: 10, display: 'flex', alignItems: 'center', gap: 3 }}>
            {p}
            <a href="#" onClick={e => { e.preventDefault(); setParticipants(participants.filter(x => x !== p)) }}
              style={{ color: 'var(--text-tertiary)', fontSize: 9 }}>x</a>
          </span>
        ))}

        {isFiltered && (
          <>
            <span style={{ color: 'var(--border)' }}>|</span>
            <a href="#" onClick={e => { e.preventDefault(); setSelectedCluster(null); setSelectedTag(null); setParticipants([]) }}
              style={{ color: 'var(--text-tertiary)' }}>clear all</a>
          </>
        )}

        <span style={{ marginLeft: 'auto', color: 'var(--text-tertiary)' }}>
          scroll zoom · drag pan · click open
        </span>
        <a href="#" onClick={e => { e.preventDefault(); setView({ ox: 0, oy: 0, scale: 1 }) }}
          style={{ color: 'var(--text-tertiary)' }}>reset</a>
      </div>

      {/* WebGL Canvas */}
      <div
        ref={containerRef}
        style={{
          flex: 1, position: 'relative', overflow: 'hidden',
          cursor: dragging ? 'grabbing' : hoveredPoint ? 'pointer' : 'grab',
        }}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onClick={handleClick}
      >
        {/* Label overlay canvas */}
        <canvas
          ref={labelCanvasRef}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }}
        />

        {/* FPS counter */}
        <div
          ref={fpsRef}
          style={{
            position: 'absolute', bottom: 6, right: 8,
            color: 'rgba(139, 148, 158, 0.5)', fontSize: 9,
            fontFamily: 'monospace', zIndex: 2, pointerEvents: 'none',
          }}
        />

        {/* Tooltip */}
        {hoveredPoint && (
          <div style={{
            position: 'fixed',
            left: mousePos.x + 12,
            top: mousePos.y - 10,
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: 3,
            padding: '6px 8px',
            fontSize: 10,
            maxWidth: 350,
            pointerEvents: 'none',
            zIndex: 1000,
          }}>
            <div style={{ fontWeight: 600, marginBottom: 2 }}>{hoveredPoint.s || '(no subject)'}</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 3 }}>
              <span style={{ color: 'var(--accent)' }}>{hoveredPoint.a}</span>
              <span style={{ color: 'var(--text-tertiary)' }}>{hoveredPoint.m}</span>
              <span style={{ color: clusterColorCss(hoveredPoint.c), fontSize: 9 }}>
                {clusters.find(c => c.id === hoveredPoint.c)?.label || `cluster ${hoveredPoint.c}`}
              </span>
            </div>
            {hoveredPoint.p && (
              <div style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: 9, lineHeight: 1.4 }}>
                {truncatePreview(hoveredPoint.p, 50)}
              </div>
            )}
            {hoveredPoint.t.length > 0 && (
              <div style={{ marginTop: 3, display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                {hoveredPoint.t.map(t => (
                  <span key={t} style={{ background: 'var(--bg-tertiary)', padding: '0 3px', borderRadius: 2, fontSize: 8, color: 'var(--text-tertiary)' }}>{t}</span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
