<div align="center">
    <h1>VizLang</h1>
</div>

A minimal, deterministic, LLM-friendly chart description language that renders to SVG.

## What is VizLang?

VizLang (`.vizl`) is a line-based DSL for describing charts. Write a few lines of plain text, get a clean SVG back. No dependencies, no frameworks. It is written entirely in Rust, setting the foundation for future WebAssembly (Wasm) integration.

## Quick Example

```vizl
chart: line
title: Monthly Revenue

x: month
y: revenue

data:
Jan, 10
Feb, 20
Mar, 15
Apr, 25
```

This produces a complete SVG line chart with axes, labels, title, and gridlines.

## Syntax Rules

| Rule        | Detail                             |
| ----------- | ---------------------------------- |
| Keys        | Always lowercase                   |
| Separator   | Colon (`:`) for key-value pairs    |
| Data        | Comma-separated (`x, y`)           |
| Comments    | Lines starting with `#`            |
| Blank lines | Ignored                            |
| Nesting     | One level max (only `data:` block) |
| File scope  | One chart per `.vizl` file         |

## Supported Charts

| Type      | SVG Element | Description          |
| --------- | ----------- | -------------------- |
| `line`    | `<path>`    | Connected line chart |
| `bar`     | `<rect>`    | Vertical bar chart   |
| `scatter` | `<circle>`  | Scatter plot         |
| `pie`     | `<path>`    | Pie chart            |

## Usage

### Rust API

```rust
use vizlang::{parser, renderer};

let source = "
chart: line
title: Sales

x: quarter
y: units

data:
Q1, 100
Q2, 150
Q3, 130
Q4, 200
";

// Parse the DSL string into an AST
let ast = parser::parse(source).unwrap();

// Render the AST into an SVG string
let svg = renderer::render(&ast);
```

### CLI

You can run the CLI tool directly to parse a `.vizl` file and pipe the resulting SVG.

```bash
cargo run -- examples/line.vizl > output.svg
```

## Defaults

| Property   | Value                  |
| ---------- | ---------------------- |
| Width      | 640px                  |
| Height     | 400px                  |
| Padding    | 40px                   |
| Grid       | Light gray (`#e0e0e0`) |
| Background | White                  |

## Project Structure

```
vizlang/
├── Cargo.toml
├── README.md
├── SPEC.md
├── examples/
│   ├── bar.vizl
│   ├── line.vizl
│   └── scatter.vizl
└── src/
    ├── lib.rs
    ├── main.rs
    ├── parser.rs
    ├── renderer.rs
    └── types.rs
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
