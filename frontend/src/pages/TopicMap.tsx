import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { messagePath } from '../utils/routes'

interface Point {
  id: number; x: number; y: number; c: number
  a: string; s: string; m: string; p: string; t: string[]
}
interface Cluster {
  id: number; label: string; count: number
  cx: number; cy: number; top_words: string; top_authors: string
}
interface AuthorSuggestion { name: string; post_count: number }

function clusterColor(id: number): string {
  const hue = (id * 137.508) % 360
  return `hsl(${hue}, 65%, 55%)`
}

function yearColor(ym: string): string {
  if (!ym) return '#444'
  const year = parseInt(ym.split('-')[0])
  const t = (year - 1996) / 7
  const hue = t * 270
  return `hsl(${hue}, 60%, 50%)`
}

function authorColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0
  const hue = Math.abs(hash) % 360
  return `hsl(${hue}, 55%, 55%)`
}

function tagColors(tags: string[]): string {
  if (tags.length === 0) return '#333'
  // Use the first tag's hue
  const tagHues: Record<string, number> = {
    ai: 280, crypto: 160, nanotech: 130, cryonics: 230, biology: 145,
    space: 260, consciousness: 310, economics: 85, philosophy: 340,
    politics: 25, computing: 200, transhumanism: 55, physics: 185,
  }
  const hue = tagHues[tags[0]] ?? 0
  return `hsl(${hue}, 65%, 55%)`
}

type ColorMode = 'cluster' | 'year' | 'author' | 'tag'

export default function TopicMap() {
  const [allPoints, setAllPoints] = useState<Point[]>([])
  const [clusters, setClusters] = useState<Cluster[]>([])
  const [colorMode, setColorMode] = useState<ColorMode>('cluster')
  const [hoveredPoint, setHoveredPoint] = useState<Point | null>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [loading, setLoading] = useState(true)
  const canvasRef = useRef<HTMLCanvasElement>(null)
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

  useEffect(() => {
    Promise.all([
      fetch('/api/map/points').then(r => r.json()),
      fetch('/api/map/clusters').then(r => r.json()),
    ]).then(([pointsData, clustersData]) => {
      setAllPoints(pointsData.points)
      setClusters(clustersData)
      const xs = pointsData.points.map((p: Point) => p.x)
      const ys = pointsData.points.map((p: Point) => p.y)
      boundsRef.current = {
        minX: Math.min(...xs), maxX: Math.max(...xs),
        minY: Math.min(...ys), maxY: Math.max(...ys),
      }
      setLoading(false)
    })
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

  // Filter points
  const points = useMemo(() => {
    let filtered = allPoints
    if (selectedCluster !== null) {
      filtered = filtered.filter(p => p.c === selectedCluster)
    }
    if (selectedTag) {
      filtered = filtered.filter(p => p.t.includes(selectedTag))
    }
    if (participants.length > 0) {
      filtered = filtered.filter(p => participants.includes(p.a))
    }
    return filtered
  }, [allPoints, selectedCluster, selectedTag, participants])

  const isFiltered = selectedCluster !== null || selectedTag !== null || participants.length > 0

  const toCanvas = useCallback((px: number, py: number, canvas: HTMLCanvasElement) => {
    const { minX, maxX, minY, maxY } = boundsRef.current
    const w = canvas.width
    const h = canvas.height
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

  // Draw
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || allPoints.length === 0) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * window.devicePixelRatio
    canvas.height = rect.height * window.devicePixelRatio
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)

    ctx.fillStyle = '#0d1117'
    ctx.fillRect(0, 0, rect.width, rect.height)

    // Dot size scales with zoom
    const dotSize = Math.max(0.8, Math.min(4, 0.8 * Math.sqrt(view.scale)))

    // If filtered, draw dimmed background points first
    if (isFiltered) {
      ctx.globalAlpha = 0.08
      ctx.fillStyle = '#555'
      for (const p of allPoints) {
        const { x, y } = toCanvas(p.x, p.y, canvas)
        const sx = x / window.devicePixelRatio
        const sy = y / window.devicePixelRatio
        if (sx < -5 || sx > rect.width + 5 || sy < -5 || sy > rect.height + 5) continue
        ctx.fillRect(sx - dotSize * 0.5, sy - dotSize * 0.5, dotSize, dotSize)
      }
    }

    // Draw active points
    ctx.globalAlpha = isFiltered ? 0.9 : 0.6
    for (const p of points) {
      const { x, y } = toCanvas(p.x, p.y, canvas)
      const sx = x / window.devicePixelRatio
      const sy = y / window.devicePixelRatio
      if (sx < -5 || sx > rect.width + 5 || sy < -5 || sy > rect.height + 5) continue

      ctx.fillStyle = colorMode === 'cluster' ? clusterColor(p.c)
        : colorMode === 'year' ? yearColor(p.m)
        : colorMode === 'author' ? authorColor(p.a)
        : tagColors(p.t)
      ctx.fillRect(sx - dotSize, sy - dotSize, dotSize * 2, dotSize * 2)
    }

    ctx.globalAlpha = 1.0

    // Cluster labels
    if (colorMode === 'cluster') {
      ctx.font = `${Math.max(9, Math.min(13, 10 * Math.sqrt(view.scale)))}px -apple-system, sans-serif`
      ctx.textAlign = 'center'
      for (const c of clusters) {
        if (selectedCluster !== null && c.id !== selectedCluster) continue
        const { x, y } = toCanvas(c.cx, c.cy, canvas)
        const sx = x / window.devicePixelRatio
        const sy = y / window.devicePixelRatio
        if (sx < 0 || sx > rect.width || sy < 0 || sy > rect.height) continue
        if (view.scale > 0.8 || c.count > 2000) {
          const label = c.label.split(' / ').slice(0, 2).join(' / ')
          const tw = ctx.measureText(label).width
          ctx.fillStyle = 'rgba(13, 17, 23, 0.75)'
          ctx.fillRect(sx - tw / 2 - 3, sy - 7, tw + 6, 16)
          ctx.fillStyle = clusterColor(c.id)
          ctx.fillText(label, sx, sy + 4)
        }
      }
    }

    // Year legend
    if (colorMode === 'year') {
      ctx.font = '9px monospace'
      ctx.textAlign = 'left'
      for (let y = 1996; y <= 2003; y++) {
        const i = y - 1996
        ctx.fillStyle = yearColor(`${y}-01`)
        ctx.fillRect(rect.width - 80, 10 + i * 14, 10, 10)
        ctx.fillStyle = '#8b949e'
        ctx.fillText(String(y), rect.width - 65, 19 + i * 14)
      }
    }
  }, [allPoints, points, clusters, view, colorMode, isFiltered, selectedCluster, toCanvas])

  // Mouse handlers
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    setMousePos({ x: e.clientX, y: e.clientY })

    if (dragging) {
      didDragRef.current = true
      setView(v => ({
        ...v,
        ox: dragStart.ox + (mx - dragStart.x) * window.devicePixelRatio,
        oy: dragStart.oy + (my - dragStart.y) * window.devicePixelRatio,
      }))
      return
    }

    let nearest: Point | null = null
    let minDist = 100
    for (const p of points) {
      const { x, y } = toCanvas(p.x, p.y, canvas)
      const dx = x / window.devicePixelRatio - mx
      const dy = y / window.devicePixelRatio - my
      const dist = dx * dx + dy * dy
      if (dist < minDist) { minDist = dist; nearest = p }
    }
    setHoveredPoint(nearest)
  }, [points, dragging, dragStart, toCanvas])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const factor = e.deltaY > 0 ? 0.9 : 1.1
    // Zoom toward the mouse cursor position
    const mx = (e.clientX - rect.left) * window.devicePixelRatio
    const my = (e.clientY - rect.top) * window.devicePixelRatio
    setView(v => {
      const newScale = Math.max(0.1, Math.min(50, v.scale * factor))
      const cx = rect.width * window.devicePixelRatio / 2 + v.ox
      const cy = rect.height * window.devicePixelRatio / 2 + v.oy
      // Adjust offset so the point under the cursor stays fixed
      const newOx = v.ox - (mx - cx) * (factor - 1)
      const newOy = v.oy - (my - cy) * (factor - 1)
      return { ox: newOx, oy: newOy, scale: newScale }
    })
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    didDragRef.current = false
    setDragging(true)
    setDragStart({ x: e.clientX - rect.left, y: e.clientY - rect.top, ox: view.ox, oy: view.oy })
  }, [view])

  const handleMouseUp = useCallback(() => { setDragging(false) }, [])

  const handleClick = useCallback(() => {
    if (didDragRef.current) return // Don't navigate if we just dragged
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

  if (loading) return <div className="loading">Loading 132K message embeddings...</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 50px)', margin: '-8px -16px', padding: '0 8px', overflow: 'hidden' }}>
      {/* Controls bar */}
      <div style={{ display: 'flex', gap: 6, padding: '4px 0', fontSize: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ color: 'var(--text-tertiary)' }}>
          {points.length.toLocaleString()}{isFiltered ? ` / ${allPoints.length.toLocaleString()}` : ''} msgs
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

      {/* Canvas */}
      <div style={{ flex: 1, position: 'relative' }}>
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height: '100%', cursor: dragging ? 'grabbing' : hoveredPoint ? 'pointer' : 'grab' }}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          onClick={handleClick}
        />

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
              <span style={{ color: clusterColor(hoveredPoint.c), fontSize: 9 }}>
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
