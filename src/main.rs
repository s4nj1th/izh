use std::env;
use std::fs;
use std::process;
use varaix::{parser, renderer};

fn print_usage() {
    eprintln!("Usage:   cargo run -- <file.vix>");
    eprintln!("Example: cargo run -- examples/line.vix");
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

    match parser::parse(&source_text) {
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
