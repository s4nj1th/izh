# varaiX Specification (v0.2)

## Overview

varaiX is a minimal, line-based, deterministic chart description language. A single `.vizl` file describes exactly one chart and compiles to an SVG string. The language favors simplicity and predictability and is suitable for both human authors and programmatic generation. Version 0.2 adds arrays, typed arrays, ranges, comprehensions, richer comment syntax, null handling, fill strategies, and palette controls.

## File extension

`.vizl` (UTF-8 encoded)

## New and notable features (summary)

- Fixed-size arrays: `[a, b, c]`, ranges `[1..5]`, comprehensions `[expr for i in s..e]`
- Typed arrays: `int[]`, `float[]`, `string[]` (elements coerced at parse time)
- Nulls: `null` / `None` supported in expressions and arrays
- Null-fill strategies: `null_fill: zero|mean|prev|next|skip` (controls how missing y-values are handled)
- Color palettes: `colors: [...]` or `colors: paletteVar` to customize series/slice/bar colors
- Comments: `// single-line`, `/* block */`, and legacy `#`

## Lexical rules / comments

- Strings are double-quoted: `"some text"`.
- Line comments:
  - `// this is a comment`
  - `# legacy comment` (still supported)
- Block comments: `/* multi-line\n comment */` — internal newlines are preserved for accurate diagnostic line numbers.

Comments are stripped in a preprocessing step before parsing while preserving line count.

## Primary line forms

A line may be one of:
- Blank line — ignored
- Key-value pair — `key: value`
- Variable assignment — `[type] NAME = EXPRESSION` or `NAME = EXPRESSION`
- Data block start — `data:` begins a block of `x, y` rows
- Inline array literal — used as RHS of assignments or directly as a `data:` value

Keys are case-insensitive but conventionally lowercase.

## Arrays (fixed-size)

Arrays are concrete, fixed-size sequences constructed at parse time. They are not growable vectors.

Forms:

1) Explicit list

```
arr = [1, 2, 3]
labels = ["A", "B", "C"]
```

2) Inclusive range

```
nums = [1..5]   # => [1,2,3,4,5]
years = [2018..2022]
```

3) Simple comprehension

```
ev = [i*2 for i in 1..5]  # => [2,4,6,8,10]
```

Comprehensions evaluate the expression for each integer in the inclusive `start..end` range.

4) Nested arrays / array-of-pairs

```
myData = [["Jan", 10], ["Feb", null], ["Mar", 20]]
```

Nested arrays are useful to represent data tables (x,y pairs) inline.

## Types and typed arrays

You can annotate scalar assignments (and array element types) with `int`, `float`, or `string`:

```
int count = 5
float rate = 1.25
string label = "Hello"
```

You can also declare typed fixed-size arrays; parser will coerce elements to the declared type at parse time:

```
int[] years = [2018, 2019, 2020]
float[] measurements = [1.0, 2.5, 3.75]
string[] names = ["A", "B", "C"]
```

If coercion is not possible some conversions fall back to numeric `to_f64()` or `to_string()` behavior. You can change this to stricter validation later.

## Nulls and null_fill strategies

varaiX accepts `null` and `None` as missing values. For chart data, missing `y` values are represented in the AST and handled by the renderer according to `null_fill`.

Supported strategies (set with `null_fill:`):
- `zero` — replace nulls with `0` (default)
- `mean` / `average` — fill with mean of non-null values
- `prev` / `previous` — repeat previous non-null value (or `0` if none)
- `next` / `forward` — use next non-null value (or `0` if none)
- `skip` — exclude points with null y entirely

Example:

```
null_fill: mean
myData = [["Jan", 10], ["Feb", null], ["Mar", 20]]
data: myData
```

Notes:
- `skip` may change X-axis labeling and spacing because points are removed from the dataset passed to the renderer.

## Colors / palettes

You can specify a color palette to control the colors used for charts.

Syntax:

- Inline palette:

```
colors: ["red", "#ff0000", "rgb(0,128,255)"]
```

- Named palette variable:

```
palette = ["#111111", "#222222", "#333333"]
colors: palette
```

Behavior in renderer:
- If `colors:` is provided (non-empty), the renderer uses the palette in preference to the default palette.
- Color strings are used directly as CSS color values (`fill`/`stroke` attributes): named colors (`red`), hex (`#rrggbb`), `rgb()` / `rgba()` / `hsl()` are supported by the browser.
- Chart mapping:
  - `line` — path stroke uses `palette[0]` (if present); dot markers cycle through the palette per point.
  - `bar` — bars cycle through the palette per bar.
  - `scatter` — points cycle through the palette per point.
  - `pie` — slices and legend entries use palette entries per slice (fallback to default slice colors if the palette is shorter).

Recommendation: provide at least as many colors as there are data points for bar/pie/scatter for predictable coloring, or provide 1 color for a single-series style line chart.

## Data formats

1) Block-style data (original)

```
data:
Jan, 10
Feb, 20
Mar, 15
```

2) Inline array data (preferred for compact examples)

```
myData = [["Q1", 340], ["Q2", 520]]
data: myData
```

3) `data:` can accept an inline array literal directly:

```
data: [["Jan", 10], ["Feb", null], ["Mar", 20]]
```

## Keys

| Key | Required | Purpose |
|---|---:|---|
| `chart` | Yes | `line`, `bar`, `scatter`, `pie` |
| `title` | No | Chart title |
| `x` | No | X-axis label |
| `y` | No | Y-axis label |
| `data` | Yes | Start block or inline data |
| `null` / `null_fill` | No | Null-filling strategy |
| `colors` / `color` | No | Palette for chart colors |

Unknown keys are ignored.

## Parsing steps (updated)

1. Strip comments (`//`, `/* */`, `#`) while preserving newlines.
2. Split into lines and iterate with 1-based line numbers.
3. Recognize assignments `NAME = EXPR` or `[type] NAME = EXPR`.
   - RHS may be expression, array literal, range, or comprehension.
4. Recognize `key: value` pairs. For `data:` with empty value, enter data block. For `data: <array>` or `data: varName`, expand into data rows.
5. In data block, parse `x, y` rows until another key or EOF.
6. After parsing, validate required keys and build AST; renderer will apply `null_fill` and colors.

## Error format

Errors include line number, message and offending source line. Example:

```
varaiX Error [line 5]: Invalid y-value "abc" — expected a number.
  → Feb, abc
```

## Examples

Inline array + colors + null-fill:

```
chart: pie
title: OS Share
colors: ["#4a90d9", "#f06292", "grey", "#a1887f"]
myData = [["Linux", 72], ["Windows", 15], ["MacOS", 8], ["Other", null]]
null_fill: zero

data: myData
```

Range + typed array example:

```
chart: bar
years = [2018..2022]
int[] counts = [10, 20, 30, 25, 35]
myData = [[2018, 10], [2019, 20], [2020, 30], [2021, 25], [2022, 35]]
colors: ["red", "blue", "#80cbc4", "#9575cd", "#ffb74d"]

data: myData
```

Comprehension example:

```
chart: line
values = [i * 3 for i in 1..8]
# build pairs manually from values (or extend parser for zip semantics later)
myData = [[1, values[0]], [2, values[1]], [3, values[2]]]

null_fill: zero

data: myData
```

## Rendering notes

- Renderer converts the AST data into a `filled_data` vector (applying `null_fill`).
- Colors are used verbatim in SVG attributes. Browser color parsing rules apply.

## Version

Spec version: `0.2` — adds arrays, typed arrays, ranges, comprehensions, C-style comments, color palettes and null-fill strategies.
