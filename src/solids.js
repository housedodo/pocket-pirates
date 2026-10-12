// Things the ship cannot sail through: boats, whales, wrecks, piers. Each solid is a circle { x, z, r } or,
// with an axis, a capsule { x, z, ax, az, hl, r } (a segment of half-length hl through (x, z) along (ax, az), thickened by r).
/** push `pos` (a ship of this radius) out of every solid; true if anything was hit */
export function pushOut(pos, radius, list) {
  let hit = false;
  for (const o of list) {
    let cx = o.x, cz = o.z;
    if (o.hl) { const t = Math.max(-o.hl, Math.min(o.hl, (pos.x - o.x) * o.ax + (pos.z - o.z) * o.az)); cx = o.x + o.ax * t; cz = o.z + o.az * t; }
    let dx = pos.x - cx, dz = pos.z - cz;
    const d = Math.hypot(dx, dz), lim = o.r + radius;
    if (d >= lim) continue;
    if (d < 0.001) { dx = o.hl ? -o.az : 1; dz = o.hl ? o.ax : 0; } 
    const k = lim / Math.max(d, 0.001);
    pos.x = cx + dx * k; pos.z = cz + dz * k; hit = true;
  }
  return hit;
}
