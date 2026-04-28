/**
 * @file parser.ts
 * @description VizLang source parser — converts a `.vizl` string into a {@link VizAST}.
 *
 * ## Parsing strategy
 *
 * The file is processed line-by-line in a single pass:
 *
 * 1. Blank lines and comment lines (starting with `#`) are skipped.
 * 2. Before the `data:` key is encountered, every non-blank line is treated as
 *    a `key: value` pair.
 * 3. Once `data:` is seen, all subsequent non-blank lines are treated as
 *    comma-separated data rows (`xValue, yValue`).
 *
 * The parser is intentionally strict: it throws a {@link VizLangError} with a
 * descriptive message and the 1-indexed source line number on any invalid input.
 *
 * @module
 */

import { ChartType, DataPoint, VizAST } from "./types.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** All chart types accepted by the `chart:` key. */
const VALID_CHART_TYPES: readonly ChartType[] = ["line", "bar", "scatter"] as const;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parse a VizLang source string into an AST.
 *
 * @param source - Raw contents of a `.vizl` file (UTF-8 string).
 * @returns A fully-validated {@link VizAST} ready for rendering.
 *
 * @throws {@link VizLangError} when the source is structurally invalid —
 *   e.g. missing `chart:`, unknown chart type, non-numeric y-value, or an
 *   empty `data:` block.
 *
 * @example
 * ```ts
 * import { parse } from "./parser.js";
 *
 * const ast = parse(`
 *   chart: line
 *   title: Revenue
 *   data:
 *   Jan, 10
 *   Feb, 20
 * `);
 * ```
 */
export function parse(source: string): VizAST {
  const lines = source.split("\n");

  let chartType: ChartType | undefined;
  let title: string | undefined;
  let xAxisLabel: string | undefined;
  let yAxisLabel: string | undefined;
  const dataPoints: DataPoint[] = [];
  let inDataBlock = false;

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const lineNumber = lineIndex + 1; // 1-indexed for error messages
    const rawLine = lines[lineIndex];
    const trimmedLine = rawLine.trim();

    // ── Skip blank lines ────────────────────────────────────────────────────
    if (trimmedLine === "") continue;

    // ── Skip comment lines ──────────────────────────────────────────────────
    if (trimmedLine.startsWith("#")) continue;

    // ── Data block: parse comma-separated rows ──────────────────────────────
    if (inDataBlock) {
      const commaIndex = trimmedLine.indexOf(",");

      if (commaIndex === -1) {
        throw new VizLangError(
          lineNumber,
          `Expected a data row in the format "x, y" but found no comma`,
          rawLine,
        );
      }

      const rawXValue = trimmedLine.substring(0, commaIndex).trim();
      const rawYValue = trimmedLine.substring(commaIndex + 1).trim();

      if (rawXValue === "") {
        throw new VizLangError(lineNumber, `x-value is empty in data row`, rawLine);
      }

      const parsedYValue = Number(rawYValue);
      if (isNaN(parsedYValue)) {
        throw new VizLangError(
          lineNumber,
          `y-value "${rawYValue}" is not a number`,
          rawLine,
        );
      }

      // Coerce x to a number if it is fully numeric, otherwise keep as string.
      const parsedXValue: string | number = isNumericString(rawXValue)
        ? Number(rawXValue)
        : rawXValue;

      dataPoints.push({ x: parsedXValue, y: parsedYValue });
      continue;
    }

    // ── Key-value pair ──────────────────────────────────────────────────────
    const colonIndex = trimmedLine.indexOf(":");

    if (colonIndex === -1) {
      throw new VizLangError(
        lineNumber,
        `Expected a "key: value" pair but found no colon`,
        rawLine,
      );
    }

    const key = trimmedLine.substring(0, colonIndex).trim().toLowerCase();
    const value = trimmedLine.substring(colonIndex + 1).trim();

    switch (key) {
      case "chart": {
        if (!isValidChartType(value)) {
          throw new VizLangError(
            lineNumber,
            `Unknown chart type "${value}" — valid options are: ${VALID_CHART_TYPES.join(", ")}`,
            rawLine,
          );
        }
        chartType = value;
        break;
      }

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
        // The value after "data:" is intentionally ignored — it starts the block.
        inDataBlock = true;
        break;

      default:
        // Unknown keys are silently ignored to allow forward-compatibility.
        break;
    }
  }

  // ── Post-parse validation ─────────────────────────────────────────────────

  if (!chartType) {
    throw new VizLangError(0, `Missing required "chart:" declaration`, "");
  }

  if (dataPoints.length === 0) {
    throw new VizLangError(
      0,
      `No data rows found — add a "data:" section with at least one row`,
      "",
    );
  }

  // Build and return the AST, omitting optional fields if not set.
  const ast: VizAST = { type: chartType, data: dataPoints };
  if (title !== undefined) ast.title = title;
  if (xAxisLabel !== undefined) ast.x = xAxisLabel;
  if (yAxisLabel !== undefined) ast.y = yAxisLabel;

  return ast;
}

// ---------------------------------------------------------------------------
// Error class
// ---------------------------------------------------------------------------

/**
 * A structured parse error thrown by {@link parse}.
 *
 * The `message` property contains a human-readable, multi-line description
 * including the line number and the offending source line — suitable for
 * display in a terminal or a browser error panel.
 *
 * @example
 * ```
 * VizLang Error [line 5]: y-value "abc" is not a number
 *   → Feb, abc
 * ```
 */
export class VizLangError extends Error {
  /** 1-indexed source line number, or `0` for file-level errors. */
  readonly lineNumber: number;

  /** The raw source line that triggered the error (trimmed). */
  readonly sourceLine: string;

  constructor(lineNumber: number, message: string, sourceLine: string) {
    const locationPrefix =
      lineNumber > 0 ? `VizLang Error [line ${lineNumber}]` : "VizLang Error";

    const fullMessage = sourceLine.trim()
      ? `${locationPrefix}: ${message}\n  → ${sourceLine.trim()}`
      : `${locationPrefix}: ${message}`;

    super(fullMessage);

    this.name = "VizLangError";
    this.lineNumber = lineNumber;
    this.sourceLine = sourceLine;
  }
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Returns `true` if `value` is a string that represents a finite number.
 *
 * @example
 * isNumericString("42")    // true
 * isNumericString("3.14")  // true
 * isNumericString("Jan")   // false
 * isNumericString("")      // false
 */
function isNumericString(value: string): boolean {
  return value !== "" && isFinite(Number(value)) && !isNaN(Number(value));
}

/**
 * Type-guard that checks whether a string is a valid {@link ChartType}.
 */
function isValidChartType(value: string): value is ChartType {
  return (VALID_CHART_TYPES as readonly string[]).includes(value);
}
