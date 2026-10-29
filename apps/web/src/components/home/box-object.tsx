'use client'

// The one object on the page: an open box, drawn as a white wireframe the visitor turns.
// Server markup is a static SVG projection. On mount a 2D canvas replaces it (no WebGL),
// and it redraws only on input: drag, arrow keys or the buttons. Nothing rotates by itself.

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { BOX_HOME, boxGeometry, projectBox } from './box-geometry'

const SIZE = 440
const TURNS = {
  left: [-0.3, 0],
  right: [0.3, 0],
  up: [0, 0.2],
  down: [0, -0.2],
} as const
const KEYS: Record<string, readonly [number, number]> = {
  ArrowLeft: [-0.2, 0],
  ArrowRight: [0.2, 0],
  ArrowUp: [0, 0.15],
  ArrowDown: [0, -0.15],
}

const deg = (r: number) => Math.round((r * 180) / Math.PI)

export function BoxObject() {
  const lines = useMemo(() => boxGeometry(), [])
  const fallback = useMemo(() => projectBox(lines, BOX_HOME.yaw, BOX_HOME.pitch, SIZE), [lines])
  const stageRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const view = useRef<{ yaw: number; pitch: number }>({ ...BOX_HOME })
  const frame = useRef(0)
  const drag = useRef<{ x: number; y: number } | null>(null)
  const [live, setLive] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [readout, setReadout] = useState('')

  const draw = useCallback(() => {
    frame.current = 0
    const stage = stageRef.current
    const cv = canvasRef.current
    const ctx = cv?.getContext('2d')
    if (!stage || !cv || !ctx) return
    const w = stage.clientWidth || SIZE
    const k = 2
    cv.width = w * k
    cv.height = w * k
    ctx.scale(k, k)
    ctx.lineWidth = 1.5
    ctx.lineCap = 'round'
    for (const [x1, y1, x2, y2, a] of projectBox(lines, view.current.yaw, view.current.pitch, w)) {
      ctx.strokeStyle = `rgba(255,255,255,${a.toFixed(2)})`
      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
      ctx.stroke()
    }
  }, [lines])

  const request = useCallback(() => {
    if (!frame.current) frame.current = requestAnimationFrame(draw)
    setReadout(`Turned to ${deg(view.current.yaw)} degrees, tilted ${deg(view.current.pitch)} degrees.`)
  }, [draw])

  const turn = useCallback(
    (dy: number, dp: number) => {
      const v = view.current
      v.yaw += dy
      v.pitch = Math.max(-1.3, Math.min(1.3, v.pitch + dp))
      request()
    },
    [request],
  )

  useEffect(() => {
    const cv = canvasRef.current
    const stage = stageRef.current
    if (!cv || !stage || !cv.getContext('2d')) return // keep the static SVG and hide the controls
    setLive(true)
    draw()
    const ro = new ResizeObserver(() => draw())
    ro.observe(stage)
    return () => {
      ro.disconnect()
      cancelAnimationFrame(frame.current)
    }
  }, [draw])

  const onKey = (e: KeyboardEvent) => {
    const m = KEYS[e.key]
    if (!m) return
    e.preventDefault()
    turn(m[0], m[1])
  }
  const onMove = (e: PointerEvent) => {
    if (!drag.current) return
    turn((e.clientX - drag.current.x) * 0.01, (e.clientY - drag.current.y) * 0.01)
    drag.current = { x: e.clientX, y: e.clientY }
  }
  const end = () => {
    drag.current = null
    setDragging(false)
  }
  const reset = () => {
    view.current = { ...BOX_HOME }
    request()
  }

  return (
    <figure className="obj">
      <div
        ref={stageRef}
        className={`obj-stage${dragging ? ' is-drag' : ''}`}
        tabIndex={0}
        role="img"
        aria-label="A wireframe open box with a file sheet dropping into it. Drag it, use the arrow keys, or use the buttons below to turn it."
        onKeyDown={onKey}
        onPointerDown={(e) => {
          drag.current = { x: e.clientX, y: e.clientY }
          e.currentTarget.setPointerCapture(e.pointerId)
          setDragging(true)
        }}
        onPointerMove={onMove}
        onPointerUp={end}
        onPointerCancel={end}
      >
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          fill="none"
          stroke="#fff"
          strokeWidth="1.5"
          strokeLinecap="round"
          aria-hidden="true"
          focusable="false"
          className={live ? 'is-off' : undefined}
        >
          {fallback.map(([x1, y1, x2, y2, a], i) => (
            <line key={i} x1={x1.toFixed(1)} y1={y1.toFixed(1)} x2={x2.toFixed(1)} y2={y2.toFixed(1)} strokeOpacity={a.toFixed(2)} />
          ))}
        </svg>
        <canvas ref={canvasRef} hidden={!live} />
      </div>
      <div className="obj-controls" role="group" aria-label="Turn the object" hidden={!live}>
        {(Object.keys(TURNS) as (keyof typeof TURNS)[]).map((k) => (
          <button key={k} type="button" className="pd-button pd-button--ghost" onClick={() => turn(TURNS[k][0], TURNS[k][1])}>
            {k === 'up' ? 'Tilt up' : k === 'down' ? 'Tilt down' : `Turn ${k}`}
          </button>
        ))}
        <button type="button" className="pd-button pd-button--ghost" onClick={reset}>
          Reset
        </button>
      </div>
      <p className="sr" aria-live="polite">
        {readout}
      </p>
    </figure>
  )
}
