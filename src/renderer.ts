/**
 * @file renderer.ts
 * @description VizLang SVG renderer — converts a {@link VizAST} into a
 * self-contained SVG string.
 *
 * ## Design notes
 *
 * - **No external dependencies.** Every SVG element is constructed via plain
 *   string concatenation; no DOM, no canvas, no third-party library.
 * - **Deterministic output.** Given identical input the renderer always
 *   produces byte-for-byte identical SVG. Floating-point coordinates are
 *   rounded to two decimal places to keep the output stable and readable.
 * - **Coordinate system.** SVG's origin is top-left. The y-axis is therefore
 *   inverted: higher data values map to *smaller* pixel y-coordinates.
 * - **Chart area.** The drawable region is inset by `PADDING` on all sides,
 *   leaving room for axis labels, tick labels, and the title.
 *
 * @module
 */

import { ChartType, DataPoint, VizAST } from "./types.js";

// ---------------------------------------------------------------------------
// Rendering defaults
// ---------------------------------------------------------------------------

/**
 * Immutable rendering configuration applied to every chart.
 * Override by forking the renderer or extending the language with config keys.
 */
const RENDER_DEFAULTS = {
  /** Total SVG canvas width in pixels. */
  canvasWidth: 640,
  /** Total SVG canvas height in pixels. */
  canvasHeight: 400,
  /** Uniform inset (px) on all four sides of the chart area. */
  padding: 40,

  // Typography
  fontFamily: "sans-serif",
  titleFontSize: 16,
  axisLabelFontSize: 12,
  tickLabelFontSize: 10,

  // Colours
  backgroundColor: "#ffffff",
  gridLineColor: "#e0e0e0",
  axisColor: "#333333",
  dataColor: "#4a90d9",

  // Data elements
  lineStrokeWidth: 2,
  lineDotRadius: 3,
  barGapRatio: 0.2,   // fraction of each bar slot reserved as inter-bar gap
  scatterDotRadius: 4,

  // Grid
  gridLineCount: 5,   // number of horizontal grid lines (excluding the x-axis)
} as const;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Render a {@link VizAST} to a self-contained SVG string.
 *
 * The output includes:
 * - White background rectangle
 * - Horizontal grid lines with y-tick labels
 * - X and Y axes
 * - Chart-type-specific data elements (`<path>`, `<rect>`, or `<circle>`)
 * - X-axis tick labels
 * - Optional chart title
 * - Optional axis labels
 *
 * @param ast - A validated AST produced by {@link parse}.
 * @returns A complete `<svg>…</svg>` string, ready to save as `.svg` or
 *   inject directly into an HTML page.
 *
 * @example
 * ```ts
 * import { render } from "./renderer.js";
 * const svgString = render(ast);
 * fs.writeFileSync("chart.svg", svgString);
 * ```
 */
export function render(ast: VizAST): string {
  const {
    canvasWidth,
    canvasHeight,
    padding,
    gridLineCount,
  } = RENDER_DEFAULTS;

  // ── Chart area dimensions ─────────────────────────────────────────────────
  const chartWidth = canvasWidth - padding * 2;
  const chartHeight = canvasHeight - padding * 2;

  // ── Y scale ───────────────────────────────────────────────────────────────
  const yDataMin = 0;
  const yDataMax = computeNiceMax(Math.max(...ast.data.map((d) => d.y)));

  // ── X scale ───────────────────────────────────────────────────────────────
  const allXNumeric = ast.data.every((d) => typeof d.x === "number");
  let xDataMin = 0;
  let xDataMax = 0;

  if (allXNumeric) {
    const xValues = ast.data.map((d) => d.x as number);
    xDataMin = Math.min(...xValues);
    xDataMax = Math.max(...xValues);
  }

  // ── Coordinate mapping functions ──────────────────────────────────────────

  /**
   * Maps a data-point index to its pixel x-coordinate.
   * For numeric x, uses linear interpolation across the x range.
   * For categorical x, distributes points evenly across the chart width.
   */
  function toPixelX(dataIndex: number): number {
    if (allXNumeric) {
      if (xDataMax === xDataMin) return padding + chartWidth / 2;
      const ratio = ((ast.data[dataIndex].x as number) - xDataMin) / (xDataMax - xDataMin);
      return round(padding + ratio * chartWidth);
    }
    if (ast.data.length === 1) return padding + chartWidth / 2;
    return round(padding + (dataIndex / (ast.data.length - 1)) * chartWidth);
  }

  /**
   * Maps a data value to its pixel y-coordinate.
   * SVG y increases downward, so higher values map to smaller y pixels.
   */
  function toPixelY(value: number): number {
    if (yDataMax === yDataMin) return padding + chartHeight / 2;
    const ratio = (value - yDataMin) / (yDataMax - yDataMin);
    return round(padding + chartHeight - ratio * chartHeight);
  }

  // ── Bar chart geometry ────────────────────────────────────────────────────

  /** Left edge pixel x of bar at `dataIndex`. */
  function barLeftEdge(dataIndex: number): number {
    const slotWidth = chartWidth / ast.data.length;
    return round(padding + dataIndex * slotWidth + (slotWidth * RENDER_DEFAULTS.barGapRatio) / 2);
  }

  /** Pixel width of every bar (uniform). */
  function barPixelWidth(): number {
    return round((chartWidth / ast.data.length) * (1 - RENDER_DEFAULTS.barGapRatio));
  }

  // ── Build SVG ─────────────────────────────────────────────────────────────
  const elements: string[] = [];

  // Root element
  elements.push(
    `<svg xmlns="http://www.w3.org/2000/svg"` +
    ` width="${canvasWidth}" height="${canvasHeight}"` +
    ` viewBox="0 0 ${canvasWidth} ${canvasHeight}">`,
  );

  // Background
  elements.push(
    `  <rect width="${canvasWidth}" height="${canvasHeight}"` +
    ` fill="${RENDER_DEFAULTS.backgroundColor}" />`,
  );

  // ── Grid lines + y-tick labels ────────────────────────────────────────────
  for (let gridIndex = 0; gridIndex <= gridLineCount; gridIndex++) {
    const ratio = gridIndex / gridLineCount;
    const gridY = round(padding + chartHeight - ratio * chartHeight);
    const tickValue = yDataMin + ratio * (yDataMax - yDataMin);
    const tickLabel = formatTickLabel(tickValue);

    elements.push(
      `  <line x1="${padding}" y1="${gridY}" x2="${padding + chartWidth}" y2="${gridY}"` +
      ` stroke="${RENDER_DEFAULTS.gridLineColor}" stroke-width="0.5" />`,
    );
    elements.push(
      `  <text x="${padding - 6}" y="${gridY + 4}"` +
      ` text-anchor="end"` +
      ` font-family="${RENDER_DEFAULTS.fontFamily}"` +
      ` font-size="${RENDER_DEFAULTS.tickLabelFontSize}"` +
      ` fill="${RENDER_DEFAULTS.axisColor}">${tickLabel}</text>`,
    );
  }

  // ── Axes ──────────────────────────────────────────────────────────────────

  // X-axis (horizontal line at the bottom of the chart area)
  elements.push(
    `  <line x1="${padding}" y1="${padding + chartHeight}"` +
    ` x2="${padding + chartWidth}" y2="${padding + chartHeight}"` +
    ` stroke="${RENDER_DEFAULTS.axisColor}" stroke-width="1" />`,
  );

  // Y-axis (vertical line at the left edge of the chart area)
  elements.push(
    `  <line x1="${padding}" y1="${padding}"` +
    ` x2="${padding}" y2="${padding + chartHeight}"` +
    ` stroke="${RENDER_DEFAULTS.axisColor}" stroke-width="1" />`,
  );

  // ── Data elements ─────────────────────────────────────────────────────────
  switch (ast.type) {
    case "line":
      renderLineChart(elements, ast.data, toPixelX, toPixelY);
      break;
    case "bar":
      renderBarChart(elements, ast.data, barLeftEdge, barPixelWidth, toPixelY);
      break;
    case "scatter":
      renderScatterChart(elements, ast.data, toPixelX, toPixelY);
      break;
  }

  // ── X-axis tick labels ────────────────────────────────────────────────────
  const xTickY = padding + chartHeight + 16;

  for (let dataIndex = 0; dataIndex < ast.data.length; dataIndex++) {
    const tickX =
      ast.type === "bar"
        ? barLeftEdge(dataIndex) + barPixelWidth() / 2
        : toPixelX(dataIndex);

    elements.push(
      `  <text x="${tickX}" y="${xTickY}"` +
      ` text-anchor="middle"` +
      ` font-family="${RENDER_DEFAULTS.fontFamily}"` +
      ` font-size="${RENDER_DEFAULTS.tickLabelFontSize}"` +
      ` fill="${RENDER_DEFAULTS.axisColor}">${escapeXml(String(ast.data[dataIndex].x))}</text>`,
    );
  }

  // ── Chart title ───────────────────────────────────────────────────────────
  if (ast.title) {
    elements.push(
      `  <text x="${canvasWidth / 2}" y="${padding / 2 + 4}"` +
      ` text-anchor="middle"` +
      ` font-family="${RENDER_DEFAULTS.fontFamily}"` +
      ` font-size="${RENDER_DEFAULTS.titleFontSize}"` +
      ` font-weight="bold"` +
      ` fill="${RENDER_DEFAULTS.axisColor}">${escapeXml(ast.title)}</text>`,
    );
  }

  // ── Axis labels ───────────────────────────────────────────────────────────

  // X-axis label (centred below the tick labels)
  if (ast.x) {
    elements.push(
      `  <text x="${padding + chartWidth / 2}" y="${canvasHeight - 6}"` +
      ` text-anchor="middle"` +
      ` font-family="${RENDER_DEFAULTS.fontFamily}"` +
      ` font-size="${RENDER_DEFAULTS.axisLabelFontSize}"` +
      ` fill="${RENDER_DEFAULTS.axisColor}">${escapeXml(ast.x)}</text>`,
    );
  }

  // Y-axis label (rotated 90°, centred alongside the y-axis)
  if (ast.y) {
    const yLabelX = 14;
    const yLabelY = padding + chartHeight / 2;
    elements.push(
      `  <text x="${yLabelX}" y="${yLabelY}"` +
      ` text-anchor="middle"` +
      ` font-family="${RENDER_DEFAULTS.fontFamily}"` +
      ` font-size="${RENDER_DEFAULTS.axisLabelFontSize}"` +
      ` fill="${RENDER_DEFAULTS.axisColor}"` +
      ` transform="rotate(-90, ${yLabelX}, ${yLabelY})">${escapeXml(ast.y)}</text>`,
    );
  }

  elements.push("</svg>");

  return elements.join("\n");
}

// ---------------------------------------------------------------------------
// Chart-type renderers
// ---------------------------------------------------------------------------

/**
 * Renders a line chart by building a single `<path>` connecting all points
 * and placing a small `<circle>` dot at each data point.
 */
function renderLineChart(
  elements: string[],
  data: DataPoint[],
  toPixelX: (index: number) => number,
  toPixelY: (value: number) => number,
): void {
  if (data.length === 0) return;

  // Construct the polyline path string
  const pathCommands = data.map((point, i) => {
    const px = toPixelX(i);
    const py = toPixelY(point.y);
    return i === 0 ? `M ${px} ${py}` : `L ${px} ${py}`;
  });

  elements.push(
    `  <path d="${pathCommands.join(" ")}"` +
    ` fill="none"` +
    ` stroke="${RENDER_DEFAULTS.dataColor}"` +
    ` stroke-width="${RENDER_DEFAULTS.lineStrokeWidth}"` +
    ` stroke-linecap="round"` +
    ` stroke-linejoin="round" />`,
  );

  // Data-point dots
  for (let i = 0; i < data.length; i++) {
    elements.push(
      `  <circle cx="${toPixelX(i)}" cy="${toPixelY(data[i].y)}"` +
      ` r="${RENDER_DEFAULTS.lineDotRadius}"` +
      ` fill="${RENDER_DEFAULTS.dataColor}" />`,
    );
  }
}

/**
 * Renders a bar chart with one vertical `<rect>` per data point.
 * Bars grow upward from the x-axis baseline.
 */
function renderBarChart(
  elements: string[],
  data: DataPoint[],
  barLeftEdge: (index: number) => number,
  barPixelWidth: () => number,
  toPixelY: (value: number) => number,
): void {
  const barWidth = barPixelWidth();
  const baselineY = toPixelY(0); // pixel y of the x-axis

  for (let i = 0; i < data.length; i++) {
    const barX = barLeftEdge(i);
    const barTop = toPixelY(data[i].y);
    const barHeight = baselineY - barTop;

    elements.push(
      `  <rect x="${barX}" y="${barTop}"` +
      ` width="${barWidth}" height="${barHeight}"` +
      ` fill="${RENDER_DEFAULTS.dataColor}" rx="2" />`,
    );
  }
}

/**
 * Renders a scatter plot with one `<circle>` per data point.
 */
function renderScatterChart(
  elements: string[],
  data: DataPoint[],
  toPixelX: (index: number) => number,
  toPixelY: (value: number) => number,
): void {
  for (let i = 0; i < data.length; i++) {
    elements.push(
      `  <circle cx="${toPixelX(i)}" cy="${toPixelY(data[i].y)}"` +
      ` r="${RENDER_DEFAULTS.scatterDotRadius}"` +
      ` fill="${RENDER_DEFAULTS.dataColor}" opacity="0.8" />`,
    );
  }
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Computes a "nice" upper bound for the y-axis that is slightly above
 * `rawMax` and falls on a human-readable value (1, 1.5, 2, 3, 5, 7, or 10
 * scaled to the appropriate order of magnitude).
 *
 * @param rawMax - The largest y-value in the data set.
 */
function computeNiceMax(rawMax: number): number {
  if (rawMax <= 0) return 10;

  const magnitude = Math.pow(10, Math.floor(Math.log10(rawMax)));
  const normalised = rawMax / magnitude;

  let niceFactor: number;
  if (normalised <= 1) niceFactor = 1;
  else if (normalised <= 1.5) niceFactor = 1.5;
  else if (normalised <= 2) niceFactor = 2;
  else if (normalised <= 3) niceFactor = 3;
  else if (normalised <= 5) niceFactor = 5;
  else if (normalised <= 7) niceFactor = 7;
  else niceFactor = 10;

  return niceFactor * magnitude;
}

/**
 * Formats a numeric tick label.
 * Integers are displayed without a decimal point; all others show one decimal.
 */
function formatTickLabel(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

/**
 * Rounds a floating-point pixel coordinate to two decimal places.
 * Keeps SVG output readable and avoids long irrational strings.
 */
function round(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Escapes the five XML special characters so that arbitrary strings can be
 * safely embedded inside SVG text content or attribute values.
 */
function escapeXml(raw: string): string {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
