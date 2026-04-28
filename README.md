<div align="center">
    <h1>VizLang</h1>
</div>

A minimal, deterministic, LLM-friendly chart description language that renders to SVG.

## What is VizLang?

VizLang (`.vizl`) is a line-based DSL for describing charts. Write a few lines of plain text, get a clean SVG back. No dependencies, no build tools, no frameworks.

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

## Usage

### TypeScript API

```ts
import { parse } from "./src/parser";
import { render } from "./src/renderer";

const source = `
chart: line
title: Sales

x: quarter
y: units

data:
Q1, 100
Q2, 150
Q3, 130
Q4, 200
`;

const ast = parse(source);
const svg = render(ast);
// svg is a complete SVG string
```

### CLI

```bash
npx tsx src/index.ts examples/line.vizl
```

### Playground

Open `playground/index.html` in a browser for a live editor with instant SVG preview.

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
├── README.md
├── SPEC.md
├── examples/
│   ├── line.vizl
│   ├── bar.vizl
│   └── scatter.vizl
├── src/
│   ├── types.ts
│   ├── parser.ts
│   ├── renderer.ts
│   └── index.ts
└── playground/
    ├── index.html
    └── app.js
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
