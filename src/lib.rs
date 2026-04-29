pub mod parser;
pub mod renderer;
pub mod types;

use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn parse_and_render(source: &str) -> Result<String, String> {
    match parser::parse(source) {
        Ok(ast) => Ok(renderer::render(&ast)),
        Err(e) => Err(e.to_string()),
    }
}
