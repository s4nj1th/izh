/**
 * @file types.ts
 * @description Core type definitions for the VizLang AST.
 *
 * VizLang parses a `.vizl` source file into a {@link VizAST}, which the
 * renderer then consumes to produce an SVG string.
 */

// ---------------------------------------------------------------------------
// Chart type
// ---------------------------------------------------------------------------

/**
 * The set of chart variants that VizLang supports in v0.0.1.
 *
 * | Value     | SVG element | Description                              |
 * |-----------|-------------|------------------------------------------|
 * | `line`    | `<path>`    | Points connected by straight line segments |
 * | `bar`     | `<rect>`    | Vertical bar per data point              |
 * | `scatter` | `<circle>`  | Individual dot per data point            |
 */
export type ChartType = "line" | "bar" | "scatter";

// ---------------------------------------------------------------------------
// Data point
// ---------------------------------------------------------------------------

/**
 * A single (x, y) observation in a VizLang chart.
 *
 * - `x` is kept as a `string` when the label is categorical (e.g. `"Jan"`),
 *   or coerced to a `number` when the value is fully numeric (e.g. `155`).
 * - `y` is always numeric.
 */
export interface DataPoint {
  /** Horizontal category label or numeric value. */
  x: string | number;
  /** Vertical numeric value. */
  y: number;
}

// ---------------------------------------------------------------------------
// Abstract syntax tree
// ---------------------------------------------------------------------------

/**
 * The root node of the VizLang Abstract Syntax Tree.
 *
 * Produced by {@link parse} from a raw `.vizl` source string and consumed
 * by {@link render} to generate an SVG string.
 *
 * @example
 * ```ts
 * const ast: VizAST = {
 *   type: "line",
 *   title: "Monthly Revenue",
 *   x: "month",
 *   y: "revenue ($k)",
 *   data: [
 *     { x: "Jan", y: 12 },
 *     { x: "Feb", y: 19 },
 *   ],
 * };
 * ```
 */
export interface VizAST {
  /** Chart variant to render. */
  type: ChartType;

  /** Optional display title drawn at the top of the chart. */
  title?: string;

  /** Optional label for the horizontal axis. */
  x?: string;

  /** Optional label for the vertical axis. */
  y?: string;

  /**
   * Ordered list of data points.
   * Must contain at least one entry — the parser enforces this.
   */
  data: DataPoint[];
}
