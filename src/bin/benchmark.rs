use std::env;
use std::fs;
use std::path::{Path, PathBuf};
use std::process;
use std::time::Instant;

use varaix::{parser, renderer};

struct BenchmarkCase {
    name: &'static str,
    path: &'static str,
}

struct BenchmarkResult {
    name: String,
    source_bytes: usize,
    source_tokens: usize,
    source_lines: usize,
    parse_ms_avg: f64,
    render_ms_avg: f64,
    svg_bytes: usize,
}

fn default_cases() -> Vec<BenchmarkCase> {
    vec![
        BenchmarkCase {
            name: "line",
            path: "benchmarks/line.vix",
        },
        BenchmarkCase {
            name: "scatter",
            path: "benchmarks/scatter.vix",
        },
        BenchmarkCase {
            name: "pie",
            path: "benchmarks/pie.vix",
        },
    ]
}

fn count_tokens(source: &str) -> usize {
    source
        .split(|c: char| c.is_whitespace() || matches!(c, ',' | ':' | '=' | '[' | ']' | '(' | ')' | '"'))
        .filter(|part| !part.is_empty())
        .count()
}

fn load_source(path: &Path) -> Result<(String, PathBuf), String> {
    let source = fs::read_to_string(path)
        .map_err(|_| format!("Could not read benchmark case: {}", path.display()))?;
    let base_dir = path.parent().unwrap_or_else(|| Path::new(".")).to_path_buf();
    Ok((source, base_dir))
}

fn run_case(case: &BenchmarkCase, iterations: usize) -> Result<BenchmarkResult, String> {
    let case_path = Path::new(case.path);
    let (source, base_dir) = load_source(case_path)?;

    let source_bytes = source.len();
    let source_tokens = count_tokens(&source);
    let source_lines = source.lines().count();

    let mut parse_total = 0.0;
    let mut render_total = 0.0;
    let mut last_svg = String::new();

    for _ in 0..iterations {
        let parse_start = Instant::now();
        let ast = parser::parse_with_base_dir(&source, &base_dir)
            .map_err(|err| err.to_string())?;
        parse_total += parse_start.elapsed().as_secs_f64() * 1000.0;

        let render_start = Instant::now();
        last_svg = renderer::render(&ast);
        render_total += render_start.elapsed().as_secs_f64() * 1000.0;
    }

    Ok(BenchmarkResult {
        name: case.name.to_string(),
        source_bytes,
        source_tokens,
        source_lines,
        parse_ms_avg: parse_total / iterations as f64,
        render_ms_avg: render_total / iterations as f64,
        svg_bytes: last_svg.len(),
    })
}

fn print_json(results: &[BenchmarkResult], iterations: usize) {
    println!("{{");
    println!("  \"iterations\": {},", iterations);
    println!("  \"cases\": [");
    for (index, result) in results.iter().enumerate() {
        println!("    {{");
        println!("      \"name\": \"{}\",", result.name);
        println!("      \"source_bytes\": {},", result.source_bytes);
        println!("      \"source_tokens\": {},", result.source_tokens);
        println!("      \"source_lines\": {},", result.source_lines);
        println!("      \"parse_ms_avg\": {:.4},", result.parse_ms_avg);
        println!("      \"render_ms_avg\": {:.4},", result.render_ms_avg);
        println!("      \"svg_bytes\": {}", result.svg_bytes);
        if index + 1 == results.len() {
            println!("    }}");
        } else {
            println!("    }},");
        }
    }
    println!("  ]");
    println!("}}");
}

fn main() {
    let iterations = env::args()
        .nth(1)
        .and_then(|value| value.parse::<usize>().ok())
        .filter(|value| *value > 0)
        .unwrap_or(25);

    let results = match default_cases()
        .iter()
        .map(|case| run_case(case, iterations))
        .collect::<Result<Vec<_>, _>>()
    {
        Ok(results) => results,
        Err(err) => {
            eprintln!("{}", err);
            process::exit(1);
        }
    };

    print_json(&results, iterations);
}