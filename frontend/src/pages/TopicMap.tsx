import { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { messagePath } from '../utils/routes'

interface Point {
  id: number; x: number; y: number; c: number
  a: string; s: string; m: string
}
interface Cluster {
  id: number; label: string; count: number
  cx: number; cy: number; top_words: string; top_authors: string
}

// Generate distinct colors for clusters using golden ratio hue spacing
function clusterColor(id: number, _total?: number): string {
  const hue = (id * 137.508) % 360
  return `hsl(${hue}, 65%, 55%)`
}

function yearColor(ym: string): string {
  if (!ym) return '#444'
  const year = parseInt(ym.split('-')[0])
  const t = (year - 1996) / 7 // 1996-2003
  const hue = t * 270 // blue to red
  return `hsl(${hue}, 60%, 50%)`
}

type ColorMode = 'cluster' | 'year'

export default function TopicMap() {
  const [points, setPoints] = useState<Point[]>([])
  const [clusters, setClusters] = useState<Cluster[]>([])
  const [colorMode, setColorMode] = useState<ColorMode>('cluster')
  const [hoveredPoint, setHoveredPoint] = useState<Point | null>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [loading, setLoading] = useState(true)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const navigate = useNavigate()

  // View transform
  const [view, setView] = useState({ ox: 0, oy: 0, scale: 1 })
  const [dragging, setDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, ox: 0, oy: 0 })

  // Data bounds
  const boundsRef = useRef({ minX: 0, maxX: 1, minY: 0, maxY: 1 })

  useEffect(() => {
    Promise.all([
      fetch('/api/map/points').then(r => r.json()),
      fetch('/api/map/clusters').then(r => r.json()),
    ]).then(([pointsData, clustersData]) => {
      setPoints(pointsData.points)
      setClusters(clustersData)

      // Compute bounds
      const xs = pointsData.points.map((p: Point) => p.x)
      const ys = pointsData.points.map((p: Point) => p.y)
      boundsRef.current = {
        minX: Math.min(...xs), maxX: Math.max(...xs),
        minY: Math.min(...ys), maxY: Math.max(...ys),
      }
      setLoading(false)
    })
  }, [])

  // Convert data coords to canvas coords
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
    const dataX = (px - (minX + maxX) / 2) * s + cx
    const dataY = (py - (minY + maxY) / 2) * s + cy
    return { x: dataX, y: dataY }
  }, [view])

  // Draw
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || points.length === 0) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size to container
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * window.devicePixelRatio
    canvas.height = rect.height * window.devicePixelRatio
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)

    // Clear
    ctx.fillStyle = '#0d1117'
    ctx.fillRect(0, 0, rect.width, rect.height)

    const nClusters = clusters.length || 75

    // Draw points
    for (const p of points) {
      const { x, y } = toCanvas(p.x, p.y, canvas)
      const sx = x / window.devicePixelRatio
      const sy = y / window.devicePixelRatio

      if (sx < -5 || sx > rect.width + 5 || sy < -5 || sy > rect.height + 5) continue

      ctx.fillStyle = colorMode === 'cluster'
        ? clusterColor(p.c, nClusters)
        : yearColor(p.m)

      ctx.globalAlpha = 0.6
      ctx.fillRect(sx - 0.8, sy - 0.8, 1.6, 1.6)
    }

    ctx.globalAlpha = 1.0

    // Draw cluster labels
    if (colorMode === 'cluster') {
      ctx.font = '10px -apple-system, sans-serif'
      ctx.textAlign = 'center'
      for (const c of clusters) {
        const { x, y } = toCanvas(c.cx, c.cy, canvas)
        const sx = x / window.devicePixelRatio
        const sy = y / window.devicePixelRatio

        if (sx < 0 || sx > rect.width || sy < 0 || sy > rect.height) continue

        // Only show labels when zoomed in enough or cluster is large
        if (view.scale > 0.8 || c.count > 2000) {
          ctx.fillStyle = 'rgba(13, 17, 23, 0.7)'
          const label = c.label.split(' / ').slice(0, 2).join(' / ')
          const tw = ctx.measureText(label).width
          ctx.fillRect(sx - tw / 2 - 3, sy - 6, tw + 6, 14)

          ctx.fillStyle = clusterColor(c.id, nClusters)
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
  }, [points, clusters, view, colorMode, toCanvas])

  // Mouse handlers
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top

    setMousePos({ x: e.clientX, y: e.clientY })

    if (dragging) {
      setView(v => ({
        ...v,
        ox: dragStart.ox + (mx - dragStart.x) * window.devicePixelRatio,
        oy: dragStart.oy + (my - dragStart.y) * window.devicePixelRatio,
      }))
      return
    }

    // Find nearest point
    let nearest: Point | null = null
    let minDist = 100 // pixel threshold squared

    for (const p of points) {
      const { x, y } = toCanvas(p.x, p.y, canvas)
      const dx = x / window.devicePixelRatio - mx
      const dy = y / window.devicePixelRatio - my
      const dist = dx * dx + dy * dy
      if (dist < minDist) {
        minDist = dist
        nearest = p
      }
    }
    setHoveredPoint(nearest)
  }, [points, dragging, dragStart, toCanvas])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const factor = e.deltaY > 0 ? 0.9 : 1.1
    setView(v => ({ ...v, scale: Math.max(0.1, Math.min(50, v.scale * factor)) }))
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    setDragging(true)
    setDragStart({ x: e.clientX - rect.left, y: e.clientY - rect.top, ox: view.ox, oy: view.oy })
  }, [view])

  const handleMouseUp = useCallback(() => {
    setDragging(false)
  }, [])

  const handleClick = useCallback((_e: React.MouseEvent) => {
    if (hoveredPoint) {
      navigate(messagePath(hoveredPoint.id))
    }
  }, [hoveredPoint, navigate])

  if (loading) return <div className="loading">Loading 132K message embeddings...</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 50px)' }}>
      <div style={{ display: 'flex', gap: 8, padding: '4px 0', fontSize: 10, alignItems: 'center' }}>
        <span style={{ color: 'var(--text-tertiary)' }}>{points.length.toLocaleString()} messages</span>
        <span style={{ color: 'var(--border)' }}>|</span>
        <span style={{ color: 'var(--text-tertiary)' }}>color:</span>
        {(['cluster', 'year'] as ColorMode[]).map(m => (
          <a key={m} href="#" onClick={e => { e.preventDefault(); setColorMode(m) }}
            style={{ color: colorMode === m ? 'var(--accent)' : 'var(--text-tertiary)' }}>{m}</a>
        ))}
        <span style={{ color: 'var(--border)' }}>|</span>
        <span style={{ color: 'var(--text-tertiary)' }}>scroll to zoom, drag to pan, click to open message</span>
        <span style={{ color: 'var(--border)' }}>|</span>
        <a href="#" onClick={e => { e.preventDefault(); setView({ ox: 0, oy: 0, scale: 1 }) }}
          style={{ color: 'var(--text-tertiary)' }}>reset view</a>
      </div>

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
            padding: '4px 8px',
            fontSize: 10,
            maxWidth: 300,
            pointerEvents: 'none',
            zIndex: 1000,
          }}>
            <div style={{ fontWeight: 600 }}>{hoveredPoint.s || '(no subject)'}</div>
            <div style={{ color: 'var(--accent)' }}>{hoveredPoint.a}</div>
            <div style={{ color: 'var(--text-tertiary)' }}>{hoveredPoint.m}</div>
          </div>
        )}
      </div>
    </div>
  )
}
