'use strict';

// Rutas por los senderos: el héroe va por los caminos del mapa (walkGrid, de caminos.js) y no atraviesa casas.
// A* sobre una grilla de 4 unidades: el sendero cuesta 1, el pasto 10 y el agua o los edificios no se pisan.
// Después se acorta en línea recta solo por donde sigue siendo sendero y se suavizan las esquinas.
const walkCost = [1, 10, Infinity];
function walkCell(x, y) {
  const { cols, rows, cell } = walkGrid;
  return [Math.max(0, Math.min(cols - 1, Math.floor(x / cell))), Math.max(0, Math.min(rows - 1, Math.floor(y / cell)))];
}
const walkType = (c, r) => Number(walkGrid.data[r * walkGrid.cols + c]);
function walkRoute(from, to) {
  const { cols, rows, cell } = walkGrid;
  const [sc, sr] = walkCell(from.x, from.y), [gc, gr] = walkCell(to.x, to.y);
  const start = sr * cols + sc, goal = gr * cols + gc;
  if (start === goal) return [from, to];
  const cost = index => index === start || index === goal ? Math.min(walkCost[walkType(index % cols, Math.floor(index / cols))], 6) :
    walkCost[walkType(index % cols, Math.floor(index / cols))];
  const g = new Float32Array(cols * rows).fill(Infinity), came = new Int32Array(cols * rows).fill(-1);
  const closed = new Uint8Array(cols * rows);
  const heap = [];   // [f, index]
  const push = (f, i) => { heap.push([f, i]); let k = heap.length - 1;
    while (k) { const p = (k - 1) >> 1; if (heap[p][0] <= heap[k][0]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; k = p; } };
  const pop = () => { const top = heap[0], last = heap.pop();
    if (heap.length) { heap[0] = last; let k = 0;
      for (;;) { const a = 2 * k + 1, b = a + 1; let m = k;
        if (a < heap.length && heap[a][0] < heap[m][0]) m = a; if (b < heap.length && heap[b][0] < heap[m][0]) m = b;
        if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; k = m; } }
    return top; };
  const h = i => { const dx = Math.abs(i % cols - gc), dy = Math.abs(Math.floor(i / cols) - gr); return Math.max(dx, dy) + .41 * Math.min(dx, dy); };
  g[start] = 0; push(h(start), start);
  while (heap.length) {
    const [, i] = pop();
    if (closed[i]) continue;
    if (i === goal) break;
    closed[i] = 1;
    const c = i % cols, r = Math.floor(i / cols);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nc = c + dx, nr = r + dy;
      if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue;
      const n = nr * cols + nc, step = cost(n);
      if (step === Infinity || closed[n]) continue;
      const next = g[i] + step * (dx && dy ? 1.41 : 1);
      if (next < g[n]) { g[n] = next; came[n] = i; push(next + h(n), n); }
    }
  }
  if (came[goal] < 0) return [from, to];
  const cells = [];
  for (let i = goal; i >= 0; i = came[i]) cells.unshift(i);
  const center = i => ({ x: (i % cols + .5) * cell, y: (Math.floor(i / cols) + .5) * cell });
  // Atajo en línea recta solo si todo el tramo es del mismo tipo de suelo o mejor (no corta por el pasto entre dos senderos).
  const clear = (a, b) => {
    const pa = center(a), pb = center(b), limit = Math.min(walkType(a % cols, Math.floor(a / cols)), walkType(b % cols, Math.floor(b / cols)));
    const steps = Math.ceil(Math.hypot(pb.x - pa.x, pb.y - pa.y) / (cell / 2));
    for (let k = 1; k < steps; k++) {
      const [c, r] = walkCell(pa.x + (pb.x - pa.x) * k / steps, pa.y + (pb.y - pa.y) * k / steps);
      if (walkType(c, r) > limit) return false;
    }
    return true;
  };
  const kept = [cells[0]];
  for (let k = 0; k < cells.length - 1;) {
    let far = k + 1;
    for (let j = cells.length - 1; j > k + 1; j--) if (clear(cells[k], cells[j])) { far = j; break; }
    kept.push(cells[far]);
    k = far;
  }
  let points = [from, ...kept.slice(1, -1).map(center), to];
  // Esquinas redondeadas (Chaikin, dos pasadas): el héroe dobla en curva, como por un sendero.
  for (let pass = 0; pass < 2 && points.length > 2; pass++) {
    const next = [points[0]];
    for (let k = 0; k < points.length - 1; k++) {
      const a = points[k], b = points[k + 1];
      if (k > 0) next.push({ x: a.x * .75 + b.x * .25, y: a.y * .75 + b.y * .25 });
      if (k < points.length - 2) next.push({ x: a.x * .25 + b.x * .75, y: a.y * .25 + b.y * .75 });
    }
    next.push(points[points.length - 1]);
    points = next;
  }
  return points;
}
// Largo de una ruta y punto a una distancia dada sobre ella.
const routeLength = points => points.reduce((sum, p, k) => k ? sum + Math.hypot(p.x - points[k - 1].x, p.y - points[k - 1].y) : 0, 0);
function routePoint(points, distance) {
  for (let k = 1; k < points.length; k++) {
    const a = points[k - 1], b = points[k], length = Math.hypot(b.x - a.x, b.y - a.y);
    if (distance <= length) { const t = length ? distance / length : 1; return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }; }
    distance -= length;
  }
  return points[points.length - 1];
}
