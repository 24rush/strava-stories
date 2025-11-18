import type { LatLng } from "./LatLng";

export class XYPoint {
  x: number = 0;
  y: number = 0;
}

export function getBounds(points) {
  let minLat = Infinity, maxLat = -Infinity;
  let minLng = Infinity, maxLng = -Infinity;

  for (const pt of points) {
    minLat = Math.min(minLat, pt.lat);
    maxLat = Math.max(maxLat, pt.lat);
    minLng = Math.min(minLng, pt.lng);
    maxLng = Math.max(maxLng, pt.lng);
  }

  return { minLat, maxLat, minLng, maxLng };
}

export function projectLatLngToCanvas(lat, lng, bounds, canvasWidth, canvasHeight) {
  const { minLat, maxLat, minLng, maxLng } = bounds;

  // Normalize longitudes and latitudes to [0, 1]
  const x = (lng - minLng) / (maxLng - minLng) * canvasWidth;
  const y = (maxLat - lat) / (maxLat - minLat) * canvasHeight; // Y is inverted

  return { x, y };
}

export function decodePolyline(encoded) {
  let points = [];
  let index = 0, lat = 0, lng = 0;

  while (index < encoded.length) {
    let b, shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    let dlat = (result & 1) ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    let dlng = (result & 1) ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return points;
}

export function mercatorProject(points, baseSize, padding = 40) {
  if (points.length === 0) return { projected: [], width: 0, height: 0 };

  baseSize -= 2 * padding;

  const mercatorY = lat => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
  const projected = points.map(p => ({
    x: p.lng,
    y: p.lat
  }));

  const xs = projected.map(p => p.x);
  const ys = projected.map(p => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);

  const projectedWidth = maxX - minX;
  const projectedHeight = maxY - minY;

  // Set a desired drawing area size, or base it on one dimension    
  const aspect = projectedWidth / projectedHeight;

  let width, height, scale;
  if (aspect > 1) {
    width = baseSize + padding * 2;
    scale = baseSize / projectedWidth;
    height = projectedHeight * scale + padding * 2;
  } else {
    height = baseSize + padding * 2;
    scale = baseSize / projectedHeight;
    width = projectedWidth * scale + padding * 2;
  }

  // Map projected points to canvas coordinates
  const normalized = projected.map(p => ({
    x: (p.x - minX) * scale + padding,
    y: (maxY - p.y) * scale + padding  // invert Y for canvas
  }));

  return { points: normalized, width, height };
}

export function project(points, canvasWidth, canvasHeight) {
  if (points.length === 0) return [];

  const lats = points.map(p => p.lat);
  const lngs = points.map(p => p.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  const dataWidth = maxLng - minLng;
  const dataHeight = maxLat - minLat;

  const dataAspect = dataWidth / dataHeight;
  const canvasAspect = canvasWidth / canvasHeight;

  let scale;
  let xOffset = 0;
  let yOffset = 0;

  if (dataAspect > canvasAspect) {
    // Use full canvas width, letterbox vertically
    scale = canvasWidth / dataWidth;
    const scaledHeight = dataHeight * scale;
    yOffset = (canvasHeight - scaledHeight) / 2;
  } else {
    // Use full canvas height, pillarbox horizontally
    scale = canvasHeight / dataHeight;
    const scaledWidth = dataWidth * scale;
    xOffset = (canvasWidth - scaledWidth) / 2;
  }

  // Project points with preserved aspect ratio and centered
  return points.map(p => ({
    x: ((p.lng - minLng) * scale) + xOffset,
    y: canvasHeight - (((p.lat - minLat) * scale) + yOffset)
  }));
}

export function generateXYFromPoints(elevations: number[], maxWidth: number, maxHeight: number): { x: number; y: number }[] {
  const minElevation = Math.min(...elevations);
  const maxElevation = Math.max(...elevations);

  const elevationRange = maxElevation - minElevation;

  // Generate polyline points
  const stepX = maxWidth / (elevations.length - 1);

  const points: { x: number; y: number }[] = [];
  elevations.forEach((elev, i) => {
    if (i % 25) return;

    const x = i * stepX;

    // Invert Y: higher elevation = higher on canvas
    const normalized = (elev - minElevation) / elevationRange;
    const y = maxHeight - 0 - normalized * maxHeight;

    points.push({ x, y });
  });

  return points;
}

export function generateXYFromLatLng(trackPoints: LatLng[], maxWidth: number, maxHeight: number): { pts: { x: number; y: number }[], width: number, height: number } {
  const bounds = getBounds(trackPoints);

  // Estimate size needed for canvas
  const latRange = bounds.maxLat - bounds.minLat;
  const lngRange = bounds.maxLng - bounds.minLng;

  const aspectRatio = lngRange / latRange;
  let fitWidth = maxWidth;
  let fitHeight = fitWidth / aspectRatio;

  if (fitHeight > maxWidth) {
    fitHeight = maxWidth;
    fitWidth = fitHeight * aspectRatio;
  }

  const projectedPoints = trackPoints
    .map((pt) =>
      projectLatLngToCanvas(
        pt.lat,
        pt.lng,
        bounds,
        fitWidth,
        fitHeight,
      ),
    )
    .map((p) => ({
      x: p.x,
      y: p.y,
    }));

  return { pts: projectedPoints, width: fitWidth, height: fitHeight };
}