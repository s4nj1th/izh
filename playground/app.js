/**
 * @file app.js
 * @description VizLang Playground — browser entry point.
 *
 * This file is a self-contained, dependency-free implementation of the
 * VizLang parser and renderer, duplicated from the TypeScript source so that
 * the playground works by opening index.html directly in a browser — no
 * build step, no bundler, no server required.
 *
 * The module is structured in three sections:
 *   1. Parser   — converts a .vizl source string into an AST object.
 *   2. Renderer — converts an AST object into an SVG string.
 *   3. App      — wires up the DOM: editor textarea → live SVG preview.
 */

// =============================================================================
// Section 1 — Parser
// =============================================================================

/** Chart types accepted by the `chart:` key. */
const VALID_CHART_TYPES = ["line", "bar", "scatter"];

/**
 * Parse a VizLang source string into an AST object.
 *
 * @param {string} source - Raw contents of a `.vizl` file.
 * @returns {{ type: string, title?: string, x?: string, y?: string,
 *             data: Array<{ x: string|number, y: number }> }}
 * @throws {Error} With a human-readable message including the line number.
 */
function parse(source) {
  const lines = source.split("\n");

  let chartType = undefined;
  let title = undefined;
  let xAxisLabel = undefined;
  let yAxisLabel = undefined;
  /** @type {Array<{ x: string|number, y: number }>} */
  const dataPoints = [];
  let inDataBlock = false;

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const lineNumber = lineIndex + 1; // 1-indexed for error messages
    const rawLine = lines[lineIndex];
    const trimmedLine = rawLine.trim();

    // Skip blank lines and comment lines
    if (trimmedLine === "") continue;
    if (trimmedLine.startsWith("#")) continue;

    // ── Data block: parse comma-separated rows ──────────────────────────────
    if (inDataBlock) {
      const commaIndex = trimmedLine.indexOf(",");

      if (commaIndex === -1) {
        throw new Error(
          `[line ${lineNumber}] Expected a data row "x, y" but found no comma\n  → ${trimmedLine}`,
        );
      }

      const rawXValue = trimmedLine.substring(0, commaIndex).trim();
      const rawYValue = trimmedLine.substring(commaIndex + 1).trim();

      if (rawXValue === "") {
        throw new Error(
          `[line ${lineNumber}] x-value is empty in data row\n  → ${trimmedLine}`,
        );
      }

      const parsedYValue = Number(rawYValue);
      if (isNaN(parsedYValue)) {
        throw new Error(
          `[line ${lineNumber}] y-value "${rawYValue}" is not a number\n  → ${trimmedLine}`,
        );
      }

      // Coerce x to a number when it is fully numeric, otherwise keep as string.
      const parsedXValue = isNumericString(rawXValue) ? Number(rawXValue) : rawXValue;
      dataPoints.push({ x: parsedXValue, y: parsedYValue });
      continue;
    }

    // ── Key-value pair ──────────────────────────────────────────────────────
    const colonIndex = trimmedLine.indexOf(":");

    if (colonIndex === -1) {
      throw new Error(
        `[line ${lineNumber}] Expected "key: value" but found no colon\n  → ${trimmedLine}`,
      );
    }

    const key = trimmedLine.substring(0, colonIndex).trim().toLowerCase();
    const value = trimmedLine.substring(colonIndex + 1).trim();

    switch (key) {
      case "chart":
        if (!VALID_CHART_TYPES.includes(value)) {
          throw new Error(
            `[line ${lineNumber}] Unknown chart type "${value}" — valid options: ${VALID_CHART_TYPES.join(", ")}`,
          );
        }
        chartType = value;
        break;

      case "title":
        title = value;
        break;

      case "x":
        xAxisLabel = value;
        break;

      case "y":
        yAxisLabel = value;
        break;

      case "data":
        // The value after "data:" is ignored — it just starts the data block.
        inDataBlock = true;
        break;

      default:
        // Unknown keys are silently ignored for forward-compatibility.
        break;
    }
  }

  // ── Post-parse validation ─────────────────────────────────────────────────

  if (!chartType) {
    throw new Error('Missing required "chart:" declaration');
  }

  if (dataPoints.length === 0) {
    throw new Error('No data rows found — add a "data:" section with at least one row');
  }

  const ast = { type: chartType, data: dataPoints };
  if (title !== undefined) ast.title = title;
  if (xAxisLabel !== undefined) ast.x = xAxisLabel;
  if (yAxisLabel !== undefined) ast.y = yAxisLabel;

  return ast;
}

// =============================================================================
// Section 2 — Renderer
// =============================================================================

/** Immutable rendering configuration used by every chart. */
const RENDER_DEFAULTS = {
  canvasWidth: 640,
  canvasHeight: 400,
  padding: 40,

  fontFamily: "sans-serif",
  titleFontSize: 16,
  axisLabelFontSize: 12,
  tickLabelFontSize: 10,

  backgroundColor: "#ffffff",
  gridLineColor: "#e0e0e0",
  axisColor: "#333333",
  dataColor: "#4a90d9",

  lineStrokeWidth: 2,
  lineDotRadius: 3,
  barGapRatio: 0.2,
  scatterDotRadius: 4,

  gridLineCount: 5,
};

/**
 * Render a VizLang AST to a self-contained SVG string.
 *
 * @param {{ type: string, title?: string, x?: string, y?: string,
 *           data: Array<{ x: string|number, y: number }> }} ast
 * @returns {string} Complete `<svg>…</svg>` markup.
 */
function render(ast) {
  const { canvasWidth, canvasHeight, padding, gridLineCount } = RENDER_DEFAULTS;

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
    const xValues = ast.data.map((d) => d.x);
    xDataMin = Math.min(...xValues);
    xDataMax = Math.max(...xValues);
  }

  // ── Coordinate mapping ────────────────────────────────────────────────────

  /** Maps a data-point index to its pixel x-coordinate. */
  function toPixelX(dataIndex) {
    if (allXNumeric) {
      if (xDataMax === xDataMin) return padding + chartWidth / 2;
      const ratio = (ast.data[dataIndex].x - xDataMin) / (xDataMax - xDataMin);
      return round(padding + ratio * chartWidth);
    }
    if (ast.data.length === 1) return padding + chartWidth / 2;
    return round(padding + (dataIndex / (ast.data.length - 1)) * chartWidth);
  }

  /** Maps a data value to its pixel y-coordinate (SVG y increases downward). */
  function toPixelY(value) {
    if (yDataMax === yDataMin) return padding + chartHeight / 2;
    const ratio = (value - yDataMin) / (yDataMax - yDataMin);
    return round(padding + chartHeight - ratio * chartHeight);
  }

  /** Left edge pixel x of bar at `dataIndex`. */
  function barLeftEdge(dataIndex) {
    const slotWidth = chartWidth / ast.data.length;
    return round(padding + dataIndex * slotWidth + (slotWidth * RENDER_DEFAULTS.barGapRatio) / 2);
  }

  /** Pixel width of every bar (uniform). */
  function barPixelWidth() {
    return round((chartWidth / ast.data.length) * (1 - RENDER_DEFAULTS.barGapRatio));
  }

  // ── Build SVG elements ────────────────────────────────────────────────────
  const elements = [];

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

  // Grid lines + y-tick labels
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
      `  <text x="${padding - 6}" y="${gridY + 4}" text-anchor="end"` +
      ` font-family="${RENDER_DEFAULTS.fontFamily}"` +
      ` font-size="${RENDER_DEFAULTS.tickLabelFontSize}"` +
      ` fill="${RENDER_DEFAULTS.axisColor}">${tickLabel}</text>`,
    );
  }

  // Axes
  elements.push(
    `  <line x1="${padding}" y1="${padding + chartHeight}"` +
    ` x2="${padding + chartWidth}" y2="${padding + chartHeight}"` +
    ` stroke="${RENDER_DEFAULTS.axisColor}" stroke-width="1" />`,
  );
  elements.push(
    `  <line x1="${padding}" y1="${padding}"` +
    ` x2="${padding}" y2="${padding + chartHeight}"` +
    ` stroke="${RENDER_DEFAULTS.axisColor}" stroke-width="1" />`,
  );

  // Data elements
  if (ast.type === "line") {
    const pathCommands = ast.data.map((point, i) => {
      const px = toPixelX(i);
      const py = toPixelY(point.y);
      return i === 0 ? `M ${px} ${py}` : `L ${px} ${py}`;
    });
    elements.push(
      `  <path d="${pathCommands.join(" ")}" fill="none"` +
      ` stroke="${RENDER_DEFAULTS.dataColor}"` +
      ` stroke-width="${RENDER_DEFAULTS.lineStrokeWidth}"` +
      ` stroke-linecap="round" stroke-linejoin="round" />`,
    );
    for (let i = 0; i < ast.data.length; i++) {
      elements.push(
        `  <circle cx="${toPixelX(i)}" cy="${toPixelY(ast.data[i].y)}"` +
        ` r="${RENDER_DEFAULTS.lineDotRadius}" fill="${RENDER_DEFAULTS.dataColor}" />`,
      );
    }
  } else if (ast.type === "bar") {
    const bw = barPixelWidth();
    const baselineY = toPixelY(0);
    for (let i = 0; i < ast.data.length; i++) {
      const barTop = toPixelY(ast.data[i].y);
      elements.push(
        `  <rect x="${barLeftEdge(i)}" y="${barTop}"` +
        ` width="${bw}" height="${baselineY - barTop}"` +
        ` fill="${RENDER_DEFAULTS.dataColor}" rx="2" />`,
      );
    }
  } else if (ast.type === "scatter") {
    for (let i = 0; i < ast.data.length; i++) {
      elements.push(
        `  <circle cx="${toPixelX(i)}" cy="${toPixelY(ast.data[i].y)}"` +
        ` r="${RENDER_DEFAULTS.scatterDotRadius}"` +
        ` fill="${RENDER_DEFAULTS.dataColor}" opacity="0.8" />`,
      );
    }
  }

  // X-axis tick labels
  const xTickY = padding + chartHeight + 16;
  for (let i = 0; i < ast.data.length; i++) {
    const tickX = ast.type === "bar" ? barLeftEdge(i) + barPixelWidth() / 2 : toPixelX(i);
    elements.push(
      `  <text x="${tickX}" y="${xTickY}" text-anchor="middle"` +
      ` font-family="${RENDER_DEFAULTS.fontFamily}"` +
      ` font-size="${RENDER_DEFAULTS.tickLabelFontSize}"` +
      ` fill="${RENDER_DEFAULTS.axisColor}">${escapeXml(String(ast.data[i].x))}</text>`,
    );
  }

  // Chart title
  if (ast.title) {
    elements.push(
      `  <text x="${canvasWidth / 2}" y="${padding / 2 + 4}" text-anchor="middle"` +
      ` font-family="${RENDER_DEFAULTS.fontFamily}"` +
      ` font-size="${RENDER_DEFAULTS.titleFontSize}"` +
      ` font-weight="bold"` +
      ` fill="${RENDER_DEFAULTS.axisColor}">${escapeXml(ast.title)}</text>`,
    );
  }

  // Axis labels
  if (ast.x) {
    elements.push(
      `  <text x="${padding + chartWidth / 2}" y="${canvasHeight - 6}"` +
      ` text-anchor="middle"` +
      ` font-family="${RENDER_DEFAULTS.fontFamily}"` +
      ` font-size="${RENDER_DEFAULTS.axisLabelFontSize}"` +
      ` fill="${RENDER_DEFAULTS.axisColor}">${escapeXml(ast.x)}</text>`,
    );
  }
  if (ast.y) {
    const yLabelX = 14;
    const yLabelY = padding + chartHeight / 2;
    elements.push(
      `  <text x="${yLabelX}" y="${yLabelY}" text-anchor="middle"` +
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
// Renderer helpers
// ---------------------------------------------------------------------------

/**
 * Computes a "nice" y-axis upper bound slightly above `rawMax`.
 * @param {number} rawMax
 * @returns {number}
 */
function computeNiceMax(rawMax) {
  if (rawMax <= 0) return 10;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawMax)));
  const normalised = rawMax / magnitude;
  let niceFactor;
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
 * Formats a numeric y-tick label.
 * @param {number} value
 * @returns {string}
 */
function formatTickLabel(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

/**
 * Rounds a pixel coordinate to two decimal places for readable SVG output.
 * @param {number} value
 * @returns {number}
 */
function round(value) {
  return Math.round(value * 100) / 100;
}

/**
 * Escapes the five XML special characters so that arbitrary strings are safe
 * inside SVG text content and attribute values.
 * @param {string} raw
 * @returns {string}
 */
function escapeXml(raw) {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Returns true if `value` is a string that represents a finite number.
 * @param {string} value
 * @returns {boolean}
 */
function isNumericString(value) {
  return value !== "" && isFinite(Number(value)) && !isNaN(Number(value));
}

// =============================================================================
// Section 3 — App
// =============================================================================

/**
 * Built-in example sources loaded via the Examples dropdown.
 * Keys correspond to `data-example` attributes in index.html.
 */
const EXAMPLE_SOURCES = {
  line: `# Line chart example
chart: line
title: Monthly Revenue

x: month
y: revenue ($k)

data:
Jan, 12
Feb, 19
Mar, 15
Apr, 22
May, 28
Jun, 25
Jul, 30
Aug, 34
Sep, 31
Oct, 38
Nov, 42
Dec, 48`,

  bar: `# Bar chart example
chart: bar
title: Quarterly Sales

x: quarter
y: units sold

data:
Q1, 340
Q2, 520
Q3, 480
Q4, 610`,

  scatter: `# Scatter plot example
chart: scatter
title: Height vs Weight

x: height (cm)
y: weight (kg)

data:
155, 52
160, 58
165, 62
168, 65
170, 68
172, 70
175, 74
178, 78
180, 80
183, 85
185, 88
190, 92`,
};

// ── DOM references ────────────────────────────────────────────────────────────

const editorTextarea = /** @type {HTMLTextAreaElement} */ (document.getElementById("editor"));
const previewContainer = /** @type {HTMLDivElement} */ (document.getElementById("preview"));
const errorBar = /** @type {HTMLDivElement} */ (document.getElementById("errorBar"));
const statusDot = /** @type {HTMLSpanElement} */ (document.getElementById("statusDot"));
const statusText = /** @type {HTMLSpanElement} */ (document.getElementById("statusText"));
const examplesButton = /** @type {HTMLButtonElement} */ (document.getElementById("examplesBtn"));
const examplesMenu = /** @type {HTMLDivElement} */ (document.getElementById("examplesMenu"));
const copySvgButton = /** @type {HTMLButtonElement} */ (document.getElementById("copyBtn"));

// ── State ─────────────────────────────────────────────────────────────────────

/** The SVG string produced by the most recent successful render, or "". */
let lastRenderedSvg = "";

/** Timer handle for debouncing editor input. */
let debounceTimer = null;

// ── Core update function ──────────────────────────────────────────────────────

/**
 * Parse the current editor value and update the preview or error bar.
 * Called on every (debounced) editor input event.
 */
function updatePreview() {
  const source = editorTextarea.value;

  if (!source.trim()) {
    previewContainer.innerHTML =
      `<span style="color:var(--tm);font-size:14px">Type some VizLang to see a chart…</span>`;
    clearError();
    setStatus("ready", false);
    lastRenderedSvg = "";
    return;
  }

  try {
    const ast = parse(source);
    const svgOutput = render(ast);

    lastRenderedSvg = svgOutput;
    previewContainer.innerHTML = svgOutput;
    clearError();
    setStatus(`${ast.type} · ${ast.data.length} points`, false);
  } catch (err) {
    showError(err instanceof Error ? err.message : String(err));
    setStatus("error", true);
    lastRenderedSvg = "";
  }
}

// ── Status helpers ────────────────────────────────────────────────────────────

/**
 * Updates the status indicator in the editor panel header.
 * @param {string} message - Text to display next to the dot.
 * @param {boolean} isError - When true the dot turns red.
 */
function setStatus(message, isError) {
  statusText.textContent = message;
  statusDot.classList.toggle("error", isError);
}

/** Shows an error message in the error bar below the preview. */
function showError(message) {
  errorBar.textContent = message;
  errorBar.classList.add("visible");
}

/** Clears and hides the error bar. */
function clearError() {
  errorBar.classList.remove("visible");
  errorBar.textContent = "";
}

// ── Event listeners ───────────────────────────────────────────────────────────

// Live update with 150 ms debounce to avoid parsing on every keystroke.
editorTextarea.addEventListener("input", () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(updatePreview, 150);
});

// Toggle the examples dropdown on button click.
examplesButton.addEventListener("click", (event) => {
  event.stopPropagation();
  examplesMenu.classList.toggle("open");
});

// Close the dropdown when clicking anywhere outside it.
document.addEventListener("click", () => {
  examplesMenu.classList.remove("open");
});

// Load an example when its menu item is clicked.
examplesMenu.querySelectorAll("button[data-example]").forEach((button) => {
  button.addEventListener("click", () => {
    const exampleKey = button.getAttribute("data-example");
    if (exampleKey && EXAMPLE_SOURCES[exampleKey]) {
      editorTextarea.value = EXAMPLE_SOURCES[exampleKey];
      updatePreview();
    }
    examplesMenu.classList.remove("open");
  });
});

// Copy the last rendered SVG to the clipboard.
copySvgButton.addEventListener("click", async () => {
  if (!lastRenderedSvg) return;

  try {
    await navigator.clipboard.writeText(lastRenderedSvg);
  } catch {
    // Clipboard API may be unavailable in non-secure contexts — fall back to
    // the legacy execCommand approach.
    const tempTextarea = document.createElement("textarea");
    tempTextarea.value = lastRenderedSvg;
    document.body.appendChild(tempTextarea);
    tempTextarea.select();
    document.execCommand("copy");
    document.body.removeChild(tempTextarea);
  }

  const originalLabel = copySvgButton.textContent;
  copySvgButton.textContent = "✓ Copied!";
  setTimeout(() => {
    copySvgButton.textContent = originalLabel;
  }, 1500);
});

// ── Initialise with the line chart example ────────────────────────────────────
editorTextarea.value = EXAMPLE_SOURCES.line;
updatePreview();
