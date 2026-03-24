import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { messagePath } from '../utils/routes'
import { useTitle } from '../utils/useTitle'

interface Point {
  id: number; x: number; y: number; z: number; c: number
  a: string; s: string; m: string; p: string; t: string[]; th: string
}
interface Cluster {
  id: number; label: string; count: number
  cx: number; cy: number; cz: number; top_words: string; top_authors: string
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
  return hslToRgb(((year - 1996) / 7) * 270, 60, 50)
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
  return hslToRgb(tagHues[tags[0]] ?? 0, 65, 55)
}
function clusterColorCss(id: number): string {
  return `hsl(${(id * 137.508) % 360}, 65%, 55%)`
}

// Vertex shader with size attenuation for perspective
const vertexShader = `
  attribute float alpha;
  attribute float pointSize;
  varying float vAlpha;
  varying vec3 vColor;
  void main() {
    vAlpha = alpha;
    vColor = color;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = pointSize * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`
const fragmentShader = `
  varying float vAlpha;
  varying vec3 vColor;
  void main() {
    vec2 center = gl_PointCoord - vec2(0.5);
    if (dot(center, center) > 0.25) discard;
    gl_FragColor = vec4(vColor, vAlpha);
  }
`

export default function Embeddings3D() {
  useTitle('Embeddings 3D')
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

  // Three.js refs
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const pointsObjRef = useRef<THREE.Points | null>(null)
  const bgPointsObjRef = useRef<THREE.Points | null>(null)
  const animFrameRef = useRef<number>(0)
  const raycasterRef = useRef(new THREE.Raycaster())
  const mouseRef = useRef(new THREE.Vector2())

  // FPS counter
  const fpsRef = useRef<HTMLDivElement>(null)
  const frameTimesRef = useRef<number[]>([])

  // Data bounds for centering
  const centerRef = useRef(new THREE.Vector3())
  const scaleRef = useRef(1)

  // Load data
  useEffect(() => {
    fetch('/api/map/clusters3d').then(r => r.json()).then(setClusters)
    let accumulated: Point[] = []
    const loadChunk = async (chunk: number) => {
      const res = await fetch(`/api/map/points3d?chunk=${chunk}`)
      const data = await res.json()
      accumulated = [...accumulated, ...data.points]
      setAllPoints([...accumulated])
      setTotalPointCount(data.total)
      setLoading(false)
      if (data.has_more) {
        requestAnimationFrame(() => loadChunk(chunk + 1))
      }
    }
    loadChunk(0)
  }, [])

  // Compute center and scale from data
  useEffect(() => {
    if (allPoints.length === 0) return
    let minX = Infinity, maxX = -Infinity
    let minY = Infinity, maxY = -Infinity
    let minZ = Infinity, maxZ = -Infinity
    for (const p of allPoints) {
      if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x
      if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y
      if (p.z < minZ) minZ = p.z; if (p.z > maxZ) maxZ = p.z
    }
    centerRef.current.set((minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2)
    const range = Math.max(maxX - minX, maxY - minY, maxZ - minZ)
    scaleRef.current = range > 0 ? 20 / range : 1 // Normalize to ~20 units
  }, [allPoints])

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

  // Initialize Three.js
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    renderer.setClearColor(0x0d1117)
    renderer.setPixelRatio(window.devicePixelRatio)
    container.appendChild(renderer.domElement)
    renderer.domElement.style.position = 'absolute'
    renderer.domElement.style.inset = '0'

    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000)
    camera.position.set(0, 0, 35)

    const scene = new THREE.Scene()

    // Orbit controls
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.1
    controls.rotateSpeed = 0.8
    controls.zoomSpeed = 1.2
    controls.panSpeed = 0.8
    controls.minDistance = 5
    controls.maxDistance = 200

    rendererRef.current = renderer
    sceneRef.current = scene
    cameraRef.current = camera
    controlsRef.current = controls

    // Raycaster for hover
    raycasterRef.current.params.Points = { threshold: 0.3 }

    const handleResize = () => {
      const rect = container.getBoundingClientRect()
      renderer.setSize(rect.width, rect.height)
      camera.aspect = rect.width / rect.height
      camera.updateProjectionMatrix()
    }
    handleResize()

    const obs = new ResizeObserver(handleResize)
    obs.observe(container)

    // Render loop
    const loop = () => {
      animFrameRef.current = requestAnimationFrame(loop)
      controls.update()
      const now = performance.now()
      const times = frameTimesRef.current
      times.push(now)
      while (times.length > 0 && times[0] < now - 1000) times.shift()
      if (fpsRef.current) fpsRef.current.textContent = `${times.length} fps`
      renderer.render(scene, camera)
    }
    loop()

    return () => {
      obs.disconnect()
      cancelAnimationFrame(animFrameRef.current)
      controls.dispose()
      container.removeChild(renderer.domElement)
      renderer.dispose()
    }
  }, [])

  // Build geometry
  useEffect(() => {
    const scene = sceneRef.current
    if (!scene || allPoints.length === 0) return

    const center = centerRef.current
    const s = scaleRef.current
    const ht = highlightedThread

    // Remove old
    if (bgPointsObjRef.current) { scene.remove(bgPointsObjRef.current); bgPointsObjRef.current.geometry.dispose() }
    if (pointsObjRef.current) { scene.remove(pointsObjRef.current); pointsObjRef.current.geometry.dispose() }

    // Background points (when filtered)
    if (isFiltered) {
      const n = allPoints.length
      const pos = new Float32Array(n * 3)
      const col = new Float32Array(n * 3)
      const alp = new Float32Array(n)
      const siz = new Float32Array(n)
      for (let i = 0; i < n; i++) {
        const p = allPoints[i]
        pos[i*3] = (p.x - center.x) * s
        pos[i*3+1] = (p.y - center.y) * s
        pos[i*3+2] = (p.z - center.z) * s
        col[i*3] = 0.33; col[i*3+1] = 0.33; col[i*3+2] = 0.33
        alp[i] = 0.06
        siz[i] = 0.08
      }
      const geo = new THREE.BufferGeometry()
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3))
      geo.setAttribute('alpha', new THREE.BufferAttribute(alp, 1))
      geo.setAttribute('pointSize', new THREE.BufferAttribute(siz, 1))
      const mat = new THREE.ShaderMaterial({
        vertexShader, fragmentShader, vertexColors: true, transparent: true, depthTest: false,
      })
      const obj = new THREE.Points(geo, mat)
      scene.add(obj)
      bgPointsObjRef.current = obj
    }

    // Active points
    const n = points.length
    const pos = new Float32Array(n * 3)
    const col = new Float32Array(n * 3)
    const alp = new Float32Array(n)
    const siz = new Float32Array(n)

    for (let i = 0; i < n; i++) {
      const p = points[i]
      pos[i*3] = (p.x - center.x) * s
      pos[i*3+1] = (p.y - center.y) * s
      pos[i*3+2] = (p.z - center.z) * s

      const inThread = ht && ht.has(p.id)
      alp[i] = ht ? (inThread ? 1.0 : 0.06) : (isFiltered ? 0.85 : 0.5)
      siz[i] = inThread ? 0.3 : 0.1

      const [r, g, b] = colorMode === 'cluster' ? clusterColorRgb(p.c)
        : colorMode === 'year' ? yearColorRgb(p.m)
        : colorMode === 'author' ? authorColorRgb(p.a)
        : tagColorRgb(p.t)
      col[i*3] = r; col[i*3+1] = g; col[i*3+2] = b
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3))
    geo.setAttribute('alpha', new THREE.BufferAttribute(alp, 1))
    geo.setAttribute('pointSize', new THREE.BufferAttribute(siz, 1))

    const mat = new THREE.ShaderMaterial({
      vertexShader, fragmentShader, vertexColors: true, transparent: true, depthTest: false,
    })
    const obj = new THREE.Points(geo, mat)
    scene.add(obj)
    pointsObjRef.current = obj
  }, [allPoints, points, colorMode, isFiltered, highlightedThread])

  // Hover via raycasting
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const container = containerRef.current
    const camera = cameraRef.current
    if (!container || !camera) return
    const rect = container.getBoundingClientRect()
    setMousePos({ x: e.clientX, y: e.clientY })

    mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1

    const raycaster = raycasterRef.current
    raycaster.setFromCamera(mouseRef.current, camera)

    const obj = pointsObjRef.current
    if (!obj) { setHoveredPoint(null); return }
    const intersects = raycaster.intersectObject(obj)
    if (intersects.length > 0 && intersects[0].index !== undefined) {
      setHoveredPoint(points[intersects[0].index])
    } else {
      setHoveredPoint(null)
    }
  }, [points])

  const handleClick = useCallback(() => {
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

  const resetCamera = () => {
    const camera = cameraRef.current
    const controls = controlsRef.current
    if (!camera || !controls) return
    camera.position.set(0, 0, 35)
    controls.target.set(0, 0, 0)
    controls.update()
  }

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

        <span style={{ color: 'var(--text-tertiary)' }}>color:</span>
        {(['cluster', 'year', 'author', 'tag'] as ColorMode[]).map(m => (
          <a key={m} href="#" onClick={e => { e.preventDefault(); setColorMode(m) }}
            style={{ color: colorMode === m ? 'var(--accent)' : 'var(--text-tertiary)' }}>{m}</a>
        ))}
        <span style={{ color: 'var(--border)' }}>|</span>

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

        <select
          value={selectedTag || ''}
          onChange={e => setSelectedTag(e.target.value || null)}
          style={{ fontSize: 10, background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 3, padding: '1px 4px' }}
        >
          <option value="">all tags</option>
          {allTags.map(t => (<option key={t} value={t}>{t}</option>))}
        </select>

        <div style={{ position: 'relative' }}>
          <input
            type="text" placeholder="author..."
            value={participantInput}
            onChange={e => { setParticipantInput(e.target.value); setShowSuggestions(true) }}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={e => { if (e.key === 'Enter' && suggestions.length > 0) { e.preventDefault(); addParticipant(suggestions[0].name) } }}
            style={{ width: 120, fontSize: 10, background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 3, padding: '1px 4px' }}
          />
          {showSuggestions && suggestions.length > 0 && (
            <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 50, background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 3, maxHeight: 160, overflow: 'auto', width: 220 }}>
              {suggestions.map(s => (
                <div key={s.name} onClick={() => addParticipant(s.name)}
                  style={{ padding: '2px 6px', cursor: 'pointer', fontSize: 10, display: 'flex', justifyContent: 'space-between' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-tertiary)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
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
          drag rotate · scroll zoom · right-drag pan · click open
        </span>
        <a href="#" onClick={e => { e.preventDefault(); resetCamera() }}
          style={{ color: 'var(--text-tertiary)' }}>reset</a>
      </div>

      {/* 3D Canvas */}
      <div
        ref={containerRef}
        style={{ flex: 1, position: 'relative', overflow: 'hidden', cursor: hoveredPoint ? 'pointer' : 'grab' }}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
      >
        {loading && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: '#0d1117', zIndex: 10, color: 'var(--text-tertiary)', fontSize: 12,
          }}>
            Loading message embeddings...
          </div>
        )}

        <div ref={fpsRef} style={{
          position: 'absolute', bottom: 6, right: 8,
          color: 'rgba(139, 148, 158, 0.5)', fontSize: 9,
          fontFamily: 'monospace', zIndex: 2, pointerEvents: 'none',
        }} />

        {hoveredPoint && (
          <div style={{
            position: 'fixed', left: mousePos.x + 12, top: mousePos.y - 10,
            background: 'var(--bg-secondary)', border: '1px solid var(--border)',
            borderRadius: 3, padding: '6px 8px', fontSize: 10, maxWidth: 350,
            pointerEvents: 'none', zIndex: 1000,
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
