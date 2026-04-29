# VizLang Specification

## Overview

VizLang is a minimal, line-based, deterministic chart description language. A single `.vizl` file describes exactly one chart and compiles to an SVG string.

## File Extension

`.vizl`

## Encoding

UTF-8

## Grammar

A VizLang file consists of **lines**. Each line is one of:

1. **Blank line** — ignored
2. **Comment** — starts with `#`, ignored
3. **Key-value pair** — `key: value`
4. **Data row** — `xvalue, yvalue` (only valid inside the `data:` block)

### Formal Grammar (PEG-like)

```
File        ← Line*
Line        ← BlankLine / Comment / KeyValue / DataRow
BlankLine   ← WS* EOL
Comment     ← WS* '#' [^\n]* EOL
KeyValue    ← WS* Key WS* ':' WS* Value? WS* EOL
DataRow     ← WS* XValue WS* ',' WS* YValue WS* EOL
Key         ← [a-z][a-z0-9_]*
Value       ← [^\n]+
XValue      ← [^\n,]+
YValue      ← [^\n,]+
WS          ← [ \t]
EOL         ← '\n' / EOF
```

## Keys

| Key     | Required | Description                            | Example          |
| ------- | -------- | -------------------------------------- | ---------------- |
| `chart` | **yes**  | Chart type                             | `chart: line`    |
| `title` | no       | Chart title                            | `title: Revenue` |
| `x`     | no       | X-axis label                           | `x: month`       |
| `y`     | no       | Y-axis label                           | `y: revenue`     |
| `data`  | **yes**  | Begins the data block (value is empty) | `data:`          |

Keys are always lowercase. Unknown keys are ignored with a warning.

## Chart Types

| Type      | SVG Rendering | Description                                |
| --------- | ------------- | ------------------------------------------ |
| `line`    | `<path>`      | Points connected by straight line segments |
| `bar`     | `<rect>`      | Vertical bars, one per data point          |
| `scatter` | `<circle>`    | Individual dots at each data point         |
| `pie`     | `<path>`      | Circular pie slices                        |

## Data Block

The `data:` key starts the data block. All subsequent non-blank, non-comment lines are parsed as data rows until EOF.

### Data Row Format

```
xvalue, yvalue
```

- `xvalue` — string or numeric. Trimmed of whitespace.
- `yvalue` — must be numeric. Trimmed of whitespace.
- Separated by a single comma.

### Numeric Coercion

- `yvalue` is always parsed as a floating-point number.
- `xvalue` is stored as-is (string). If all x-values are numeric, they may be treated as numbers for axis scaling.

## Defaults

| Property             | Default Value            |
| -------------------- | ------------------------ |
| `width`              | `640`                    |
| `height`             | `400`                    |
| `padding`            | `40`                     |
| `font-family`        | `sans-serif`             |
| `font-size` (title)  | `16`                     |
| `font-size` (labels) | `12`                     |
| `grid-color`         | `#e0e0e0`                |
| `axis-color`         | `#333333`                |
| `data-color`         | `#4a90d9`                |
| `background`         | `#ffffff`                |
| `stroke-width`       | `2`                      |
| `bar-gap`            | `0.2` (20% of bar width) |
| `circle-radius`      | `4`                      |

## Parsing Rules

1. Read the entire input as a string.
2. Split into lines by `\n`.
3. For each line:
   - Trim leading/trailing whitespace.
   - If empty → skip.
   - If starts with `#` → skip.
   - If contains `:` and not in data mode → parse as key-value.
   - If in data mode and contains `,` → parse as data row.
   - Otherwise → throw a parse error with line number.
4. After parsing:
   - `chart` key must exist → error if missing.
   - `chart` value must be one of: `line`, `bar`, `scatter`, `pie` → error if invalid.
   - `data` block must contain at least one row → error if empty.
   - All `yvalue` entries must be valid numbers → error if not.

## Error Format

Errors must include:

- Line number (1-indexed)
- Description of the problem
- The offending line content

Example:

```
VizLang Error [line 5]: Invalid y-value "abc" — expected a number.
  → Feb, abc
```

## SVG Output

The output is a self-contained SVG string. No external resources.

### Structure

```xml
<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400">
  <!-- background -->
  <rect width="640" height="400" fill="#ffffff" />

  <!-- grid lines -->
  ...

  <!-- axes -->
  ...

  <!-- data elements (path/rect/circle) -->
  ...

  <!-- labels -->
  ...

  <!-- title -->
  ...
</svg>
```

### Coordinate System

- Origin is top-left (standard SVG).
- Chart area is inset by `padding` on all sides.
- X-axis runs left to right.
- Y-axis runs bottom to top (values are inverted for SVG).

### Axis Rendering

- X-axis: horizontal line at the bottom of the chart area.
- Y-axis: vertical line at the left of the chart area.
- Tick marks: small lines at each data point (x) and at y-grid intervals.

### Grid Rendering

- Horizontal grid lines at regular y-intervals.
- Color: `#e0e0e0`, stroke-width: `0.5`.
- Number of grid lines: 5 (dividing y-range into 5 equal parts).

## Determinism

Given the same input, VizLang must always produce the exact same SVG output. There is no randomness, no timestamps, no environment-dependent behavior.

## Versioning

This is version `0.1` of the VizLang specification. Future versions will maintain backward compatibility where possible.
