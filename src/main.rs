use izh::{parser, renderer};
use std::env;
use std::fs;
use std::path::Path;
use std::process;

fn print_usage() {
    eprintln!("Usage:   cargo run -- <file.izh>");
    eprintln!("Example: cargo run -- examples/line.izh");
}

fn main() {
    let args: Vec<String> = env::args().collect();

    if args.len() < 2 {
        print_usage();
        process::exit(1);
    }

    let file_path = &args[1];

    let source_text = match fs::read_to_string(file_path) {
        Ok(text) => text,
        Err(_) => {
            eprintln!("Error: Cannot read file \"{}\"", file_path);
            eprintln!("Make sure the path is correct and the file is readable.");
            process::exit(1);
        }
    };

    let base_dir = Path::new(file_path)
        .parent()
        .unwrap_or_else(|| Path::new("."));

    match parser::parse_with_base_dir(&source_text, base_dir) {
        Ok(ast) => {
            let svg_output = renderer::render(&ast);
            println!("{}", svg_output);
        }
        Err(err) => {
            eprintln!("{}", err);
            process::exit(1);
        }
    }
}
