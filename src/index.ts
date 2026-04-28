/**
 * @file index.ts
 * @description VizLang CLI entry point.
 *
 * Reads a `.vizl` file, parses it into an AST, renders it to SVG, and
 * writes the result to stdout. Errors are written to stderr and the process
 * exits with code 1.
 *
 * @example
 * ```sh
 * npx tsx src/index.ts examples/line.vizl
 * npx tsx src/index.ts examples/bar.vizl > chart.svg
 * ```
 *
 * @module
 */

import { readFileSync } from "fs";
import { parse, VizLangError } from "./parser.js";
import { render } from "./renderer.js";

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

/**
 * CLI entry point.
 *
 * Accepts exactly one positional argument: the path to a `.vizl` file.
 * On success, the SVG is printed to stdout.
 * On failure, a human-readable error message is printed to stderr.
 */
function main(): void {
  const [, , ...args] = process.argv;

  // ── Argument validation ───────────────────────────────────────────────────
  if (args.length === 0) {
    printUsage();
    process.exit(1);
    return;
  }

  const filePath = args[0];

  // ── File reading ──────────────────────────────────────────────────────────
  let sourceText: string;
  try {
    sourceText = readFileSync(filePath, "utf-8");
  } catch (_err) {
    console.error(`Error: Cannot read file "${filePath}"`);
    console.error("Make sure the path is correct and the file is readable.");
    process.exit(1);
    return;
  }

  // ── Parse + render ────────────────────────────────────────────────────────
  try {
    const ast = parse(sourceText);
    const svgOutput = render(ast);
    process.stdout.write(svgOutput + "\n");
  } catch (err) {
    if (err instanceof VizLangError) {
      // Structured parse error — print the message as-is (it already includes
      // line number and the offending source line).
      console.error(err.message);
    } else if (err instanceof Error) {
      console.error(`Unexpected error: ${err.message}`);
    } else {
      console.error("An unknown error occurred.");
    }
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Prints the CLI usage hint to stderr. */
function printUsage(): void {
  console.error("Usage:   npx tsx src/index.ts <file.vizl>");
  console.error("Example: npx tsx src/index.ts examples/line.vizl");
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

main();
