// Wireframe of an open box with a file sheet dropping in. Pure functions shared by the
// server-rendered SVG fallback and the client canvas, so both draw the same object.

export type Vec3 = [number, number, number]
export type Polyline = Vec3[]
/** x1, y1, x2, y2, opacity */
export type Segment = [number, number, number, number, number]

export const BOX_HOME = { yaw: 0.6, pitch: 0.35 } as const

const rotz = (poly: Polyline, a: number): Polyline => {
  const c = Math.cos(a)
  const s = Math.sin(a)
  return poly.map(([x, y, z]) => [x * c - y * s, x * s + y * c, z])
}
const shift = (poly: Polyline, dx: number, dy: number, dz: number): Polyline =>
  poly.map(([x, y, z]) => [x + dx, y + dy, z + dz])

/** A sheet with a folded corner and four ruled lines. */
function sheet(w: number, h: number, c: number, lines: number): Polyline[] {
  const out: Polyline[] = [
    [[-w, -h, 0], [w, -h, 0], [w, h - c, 0], [w - c, h, 0], [-w, h, 0], [-w, -h, 0]],
    [[w - c, h, 0], [w - c, h - c, 0], [w, h - c, 0]],
  ]
  for (let i = 0; i < lines; i++) {
    const y = h - c - 0.28 - i * 0.27
    out.push([[-w * 0.72, y, 0], [i === lines - 1 ? 0.1 : w * 0.72, y, 0]])
  }
  return out
}

export function boxGeometry(): Polyline[] {
  const w = 1
  const d = 0.72
  const yb = -0.85
  const yt = 0.25
  const f = 0.62
  const o = 0.5
  const ring: [number, number][] = [[-w, -d], [w, -d], [w, d], [-w, d], [-w, -d]]
  const lines: Polyline[] = [
    ring.map(([x, z]) => [x, yb, z] as Vec3),
    ring.map(([x, z]) => [x, yt, z] as Vec3),
  ]
  ring.slice(0, 4).forEach(([x, z]) => lines.push([[x, yb, z], [x, yt, z]]))
  // four open flaps hinged on the top edges, tipped outward
  lines.push([[-w, yt, -d], [w, yt, -d], [w, yt + f, -d - o], [-w, yt + f, -d - o], [-w, yt, -d]])
  lines.push([[-w, yt, d], [w, yt, d], [w, yt + f, d + o * 0.6], [-w, yt + f, d + o * 0.6], [-w, yt, d]])
  lines.push([[-w, yt, -d], [-w, yt, d], [-w - o, yt + f * 0.8, d], [-w - o, yt + f * 0.8, -d], [-w, yt, -d]])
  lines.push([[w, yt, -d], [w, yt, d], [w + o, yt + f * 0.8, d], [w + o, yt + f * 0.8, -d], [w, yt, -d]])
  sheet(0.5, 0.78, 0.22, 4).forEach((p) => lines.push(shift(rotz(p, -0.14), 0, 0.9, 0)))
  return lines
}

/** Perspective projection; nearer edges get a higher opacity. */
export function projectBox(lines: Polyline[], yaw: number, pitch: number, size: number): Segment[] {
  const cy = Math.cos(yaw)
  const sy = Math.sin(yaw)
  const cp = Math.cos(pitch)
  const sp = Math.sin(pitch)
  const scale = size / 4.2
  const pr = ([x, y, z]: Vec3): Vec3 => {
    const x1 = x * cy + z * sy
    const z1 = -x * sy + z * cy
    const y2 = y * cp - z1 * sp
    const z2 = y * sp + z1 * cp
    const s = 6 / (6 - z2)
    return [size / 2 + x1 * s * scale, size / 2 - y2 * s * scale, z2]
  }
  const segs: Segment[] = []
  for (const poly of lines) {
    const q = poly.map(pr)
    for (let i = 0; i < q.length - 1; i++) {
      const a = q[i]!
      const b = q[i + 1]!
      const z = (a[2] + b[2]) / 2
      segs.push([a[0], a[1], b[0], b[1], Math.max(0.22, Math.min(1, 0.62 + z * 0.4))])
    }
  }
  return segs
}
