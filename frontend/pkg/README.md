<div align="center">
    <picture>
        <source media="(prefers-color-scheme: dark)" srcset="frontend/public/favicon-dark.svg">
        <source media="(prefers-color-scheme: light)" srcset="frontend/public/favicon-light.svg">
        <img src="frontend/public/favicon-light.svg" width="384" alt="Izh" />
    </picture>
    <h1>Izh</h1>
    <p>A minimal, deterministic, LLM-friendly chart description language that renders to SVG.</p>
</div>

## What is Izh?

Izh (`.izh`) is a compact, line-oriented DSL for describing charts. Write a few lines of plain text and get a clean SVG back. The language is implemented in Rust and designed for predictable, deterministic rendering. Recent language additions include fixed-size arrays, ranges, comprehensions, typed arrays, C-style comments, and explicit null handling.

Full documentation for the language (detailed specification, examples, and recipes) is published at: https://izh.vercel.app/docs — please consult the online docs for the authoritative, versioned reference and extended examples.

## Quick Example (array style)

```vix
chart: line
title: Monthly Revenue

x: month
y: revenue ($k)

myData = [["Jan", 12], ["Feb", 19], ["Mar", 15]]

data: myData
```

You can still use the original block-style data form:

```vix
chart: bar
x: quarter
y: revenue

data:
"Q1", 120
"Q2", 150
"Q3", 170
"Q4", 200
```

## Notable language features (summary)

- Comments: `// single-line`, `/* block */`, and `#` (legacy). Block comments preserve newlines so diagnostics keep correct line numbers.
- Arrays: fixed-size arrays created at parse time. Forms: explicit lists (`[a, b, c]`), ranges (`[1..5]`), comprehensions (`[expr for i in start..end]`).
- Typed arrays: `int[]`, `float[]`, `string[]` — elements coerced at parse time.
- Nulls: `null` or `None` allowed in array literals and data; use `null_fill` to control handling.
- Data: `data:` accepts block-style rows or an array-of-pairs variable / inline array.

## Null fill strategies

Set `null_fill:` to one of:

- `zero` — replace nulls with 0 (default)
- `mean` / `average` — replace with mean of non-null values
- `prev` / `previous` — replace with previous non-null value (or 0 if none)
- `next` / `forward` — replace with next non-null value (or 0 if none)
- `skip` — drop points with null y (affects indexing and axes)

Example:

```vix
null_fill: mean
myData = [["Jan", 10], ["Feb", null], ["Mar", 20]]
data: myData
```

let source = r#"
chart: line
x: month
y: value
myData = [["Jan", 10], ["Feb", null], ["Mar", 20]]
null_fill: mean
data: myData
"#;
let ast = parser::parse(source).unwrap();
let svg = renderer::render(&ast);

```bash
cargo run -- examples/line.izh > out.svg
```

## Running the frontend (dev)

If you want to run the Next.js frontend locally and use the Wasm bindings:

1. Build the wasm package from the Rust crate (requires `wasm-pack`):

```bash
cd /path/to/izh/frontend
npm run build:wasm:release
```

2. Start the frontend:

```bash
npm ci
npm run dev
```

(There are helper npm scripts in `frontend/package.json` to build wasm and run the app, but running `wasm-pack` manually is explicit and predictable.)

## Examples

See the `examples/` directory for many examples:

- array-of-pairs, block-style data
- null-handling (zero/mean/prev/next/skip)
- typed arrays and ranges

## Validation

The repository includes a benchmark harness that validates the parser and renderer on representative sample charts.

Izh is a better fit than Python Matplotlib or JavaScript Chart.js when the goal is compact, deterministic SVG chart generation rather than general-purpose plotting or interactive dashboards.

### What is validated

- docs build successfully in the frontend
- the benchmark binary runs on real `.izh` inputs
- parse and render times are measured directly from the Rust code path
- source size, token count, line count, and SVG size are recorded in JSON
- repeated runs can be compared over time to catch regressions
- equivalent chart source comparison shows Izh uses fewer tokens, bytes, and lines than matching Matplotlib and Chart.js examples

## Source Size Comparison

| Library      | Avg. Tokens | Avg. Bytes | Avg. Lines |
|--------------|------------:|-----------:|-----------:|
| Izh          | 33.0        | 175.3      | 17.3       |
| Matplotlib    | 117.7       | 345.7      | 12.3       |
| Chart.js      | 202.7       | 571.7      | 27.0       |

## Current Measured Baseline

| Chart Type | Source Size (Bytes) | Tokens | Lines | Parse Time (ms) | Render Time (ms) | SVG Size (Bytes) |
|------------|--------------------:|--------:|-------:|----------------:|-----------------:|-----------------:|
| Line       | 210                 | 39      | 21     | 0.1719          | 0.0859           | 4133             |
| Scatter    | 197                 | 41      | 21     | 0.1477          | 0.0754           | 3975             |
| Pie        | 119                 | 19      | 10     | 0.0611          | 0.0387           | 1626             |

### How to run it

From the repository root:

```bash
cargo run --bin izh-benchmark -- 10
```

The current baseline is stored at [benchmarks/results/latest.json](benchmarks/results/latest.json).



## Project structure

```
izh/
├── Cargo.toml
├── README.md
├── examples/
└── src/
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
