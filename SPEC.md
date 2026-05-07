# VizLang Specification

## Overview

VizLang is a minimal, line-based, deterministic chart description language. A single `.vizl` file describes exactly one chart and compiles to an SVG string. The language is designed to be simple to author and parse, and to work well both for human authors and programmatic generation.

## File Extension

`.vizl`

## Encoding

UTF-8

## High-level syntax

A VizLang file is processed as a sequence of lines. The parser first strips comments (see below) while preserving line numbers, then parses lines as key-value pairs, variable assignments, block-style data rows, or inline array literals.

Supported comment forms (all preserved in diagnostics):
- Line comments: `// this is a comment`
- Block comments: `/* multi-line\n comment */` (internal newlines preserved)
- Legacy hash comments: `# comment` (still supported)

## Primary line forms

- Blank line — ignored
- Comment — `//`, `/* */`, or `#` (removed before parsing)
- Key-value pair — `key: value` (keys are lowercase)
- Variable assignment — `[type] NAME = EXPRESSION` or `NAME = EXPRESSION`
- Data block start — `data:` begins a block where each following non-blank non-key line is a data row `x, y` until another key or EOF
- Inline array literal as a value — arrays may be used for variables or directly as `data:` values

## Arrays (fixed-size)

VizLang supports fixed-size arrays that are created at parse time and are not growable at runtime. These are intentionally deterministic and memory-stable.

Forms:

1) Explicit list:

```
arr = [1, 2, 3, 4]
arr2 = ["Jan", "Feb", "Mar"]
```

2) Range (inclusive):

```
nums = [1..5]   # yields [1,2,3,4,5]
years = [2018..2022]
```

3) Comprehension (simple form):

```
ev = [i*2 for i in 1..5]  # yields [2,4,6,8,10]
```

- Comprehensions evaluate the expression for each integer in the inclusive range start..end and produce a fixed-size array.
- Comprehension expressions are evaluated at parse time (not lazily). Because arrays are fixed-size, the result is a concrete array value in the AST.

4) Nested arrays (array-of-pairs):

```
myData = [["Jan", 12], ["Feb", 19], ["Mar", null]]
```

These are commonly used as input to `data:` (see Data section).

## Types and typed arrays

You may annotate variable declarations with simple type hints:
- `int NAME = EXPR`
- `float NAME = EXPR`
- `string NAME = EXPR`

Typed array syntax (fixed-size arrays with element type coercion):
- `int[] NAME = [ ... ]`
- `float[] NAME = [ ... ]`
- `string[] NAME = [ ... ]`

When a typed array is declared, the parser coerces each element to the declared element type at parse time. Coercion uses numeric conversion for int/float and `to_string()` for strings; you can opt for stricter behavior (error on coercion failure) by changing configuration later.

## Null / missing values

VizLang recognizes `null` and `None` in expressions and array literals. When `y` values are missing (null) in data, the AST stores them as `None` and the renderer applies a `null_fill` strategy before plotting.

The `null_fill` key controls how null `y` values are handled (default: `zero`):
- `zero` — replace nulls with `0`
- `mean` / `average` — replace with mean of non-null values
- `prev` / `previous` — replace with the previous non-null value (or `0` if none)
- `next` / `forward` — replace with the next non-null value (or `0` if none)
- `skip` — drop points whose `y` is null (may affect axis and indexing)

Example:

```
null_fill: mean
myData = [["Jan", 10], ["Feb", null], ["Mar", 20]]
data: myData
```

## Keys (summary)

| Key     | Required | Description                            |
| ------- | -------- | -------------------------------------- |
| `chart` | **yes**  | Chart type (`line`, `bar`, `scatter`, `pie`) |
| `title` | no       | Chart title                            |
| `x`     | no       | X-axis label                           |
| `y`     | no       | Y-axis label                           |
| `data`  | **yes**  | Begins the data block (value is empty) or can take an array variable or inline array |
| `null`/`null_fill` | no | Null fill strategy (see above)       |

Unknown keys are ignored.

## Data formats

1) Block-style data (unchanged):

```
data:
Jan, 12
Feb, 19
Mar, 15
```

Each non-empty line in the data block is parsed as `xvalue, yvalue`.

2) Inline array data (preferred for compactness):

```
myData = [["Q1", 340], ["Q2", 520]]
data: myData
```

The `data:` key may also be given an inline array literal directly:

```
data: [["Jan", 10], ["Feb", null], ["Mar", 20]]
```

## Parsing rules (updated)

1. Preprocess the input to remove comments (`//`, `/* */`, `#`), preserving newlines so line numbers remain stable.
2. Split into lines by `\n`.
3. For each line (1-indexed):
   - Trim leading/trailing whitespace.
   - If empty → skip.
   - If line contains `=` outside data block → parse as assignment (type-hinted or not). RHS may be an expression or an array literal (range/comprehension/list).
   - If line contains `:` and not in data mode → parse a key-value pair. For `data:`, if the value is empty, enter data block; if value is an array literal or variable name, expand it into data rows.
   - If in data mode and line contains `,` → parse as data row `x, y`.
   - Otherwise → throw a parse error with line number.
4. After parsing:
   - `chart` key must exist.
   - `data` must yield at least one point (after applying `null_fill` unless strategy is `skip`).
   - `chart` must be one of `line`, `bar`, `scatter`, `pie`.

## Error format

Errors include:
- Line number (1-indexed)
- Message
- Offending line

Example:

```
VizLang Error [line 5]: Invalid y-value "abc" — expected a number.
  → Feb, abc
```

## Rendering & semantics

- Arrays are fixed-size values evaluated at parse time (no runtime growth).
- Comprehensions and ranges create concrete arrays at parse time (deterministic).
- Renderer applies the `null_fill` strategy to produce concrete numeric `y` values before plotting.

## Determinism

Given the same input, VizLang produces identical SVG output.

## Version

Specification version: `0.2` (adds arrays, typed arrays, ranges, comprehensions, C-style comments, and null handling).
