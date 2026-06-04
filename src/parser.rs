use crate::types::{ChartType, DataPoint, VizAST, XValue};
use std::collections::HashMap;
use std::fs;
use std::fmt;
use std::path::Path;

#[derive(Debug, Clone)]
pub struct VaraiXError {
    pub line_number: usize,
    pub message: String,
    pub source_line: String,
}

impl fmt::Display for VaraiXError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let prefix = if self.line_number > 0 {
            format!("VaraiX Error [line {}]", self.line_number)
        } else {
            "VaraiX Error".to_string()
        };

        if self.source_line.trim().is_empty() {
            write!(f, "{}: {}", prefix, self.message)
        } else {
            write!(
                f,
                "{}: {}\n  → {}",
                prefix,
                self.message,
                self.source_line.trim()
            )
        }
    }
}

impl std::error::Error for VaraiXError {}

#[derive(Debug, PartialEq, Clone)]
enum Token {
    Number(f64),
    StringLiteral(String),
    Ident(String),
    Plus,
    Minus,
    Star,
    Slash,
    Comma,
    LParen,
    RParen,
    IntKeyword,
    FloatKeyword,
    StringKeyword,
    EOF,
}

#[derive(Debug, Clone, PartialEq)]
enum Value {
    Int(i64),
    Float(f64),
    String(String),
    Null,
    Array(Vec<Value>),
}

impl Value {
    fn to_f64(&self) -> f64 {
        match self {
            Value::Int(i) => *i as f64,
            Value::Float(f) => *f,
            Value::String(s) => s.parse::<f64>().unwrap_or(0.0),
            Value::Null => 0.0,
            Value::Array(_) => 0.0,
        }
    }

    fn to_string(&self) -> String {
        match self {
            Value::Int(i) => i.to_string(),
            Value::Float(f) => f.to_string(),
            Value::String(s) => s.clone(),
            Value::Null => "null".to_string(),
            Value::Array(arr) => {
                let parts: Vec<String> = arr.iter().map(|v| v.to_string()).collect();
                format!("[{}]", parts.join(", "))
            }
        }
    }
}

fn strip_comments_preserve_lines(src: &str) -> String {
    let mut out = String::with_capacity(src.len());
    let mut chars = src.chars().peekable();
    let mut in_string = false;
    while let Some(c) = chars.next() {
        if in_string {
            out.push(c);
            if c == '"' {
                in_string = false;
            }
            continue;
        }

        if c == '"' {
            in_string = true;
            out.push(c);
            continue;
        }

        if c == '/' {
            if let Some(&n) = chars.peek() {
                if n == '/' {
                    chars.next();
                    while let Some(nc) = chars.next() {
                        if nc == '\n' {
                            out.push('\n');
                            break;
                        }
                    }
                    continue;
                } else if n == '*' {
                    chars.next();
                    let mut nl_count = 0usize;
                    while let Some(nc) = chars.next() {
                        if nc == '*' {
                            if let Some(&p) = chars.peek() {
                                if p == '/' {
                                    chars.next();
                                    break;
                                }
                            }
                        }
                        if nc == '\n' {
                            nl_count += 1;
                        }
                    }
                    for _ in 0..nl_count {
                        out.push('\n');
                    }
                    continue;
                }
            }
        }
        out.push(c);
    }
    out
}

struct Tokenizer<'a> {
    input: std::iter::Peekable<std::str::Chars<'a>>,
}

impl<'a> Tokenizer<'a> {
    fn new(input: &'a str) -> Self {
        Self {
            input: input.chars().peekable(),
        }
    }

    fn next_token(&mut self) -> Result<Token, String> {
        while let Some(&c) = self.input.peek() {
            if c.is_whitespace() {
                self.input.next();
            } else {
                break;
            }
        }

        let c = match self.input.next() {
            Some(c) => c,
            None => return Ok(Token::EOF),
        };

        match c {
            '+' => Ok(Token::Plus),
            '-' => Ok(Token::Minus),
            '*' => Ok(Token::Star),
            '/' => Ok(Token::Slash),
            ',' => Ok(Token::Comma),
            '(' => Ok(Token::LParen),
            ')' => Ok(Token::RParen),
            '"' => {
                let mut s = String::new();
                while let Some(next) = self.input.next() {
                    if next == '"' {
                        return Ok(Token::StringLiteral(s));
                    }
                    s.push(next);
                }
                Err("Unterminated string literal".to_string())
            }
            '0'..='9' | '.' => {
                let mut s = String::new();
                s.push(c);
                while let Some(&next) = self.input.peek() {
                    if next.is_ascii_digit() || next == '.' {
                        s.push(self.input.next().unwrap());
                    } else {
                        break;
                    }
                }
                s.parse::<f64>()
                    .map(Token::Number)
                    .map_err(|_| format!("Invalid number: {}", s))
            }
            'a'..='z' | 'A'..='Z' | '_' => {
                let mut s = String::new();
                s.push(c);
                while let Some(&next) = self.input.peek() {
                    if next.is_alphanumeric() || next == '_' {
                        s.push(self.input.next().unwrap());
                    } else {
                        break;
                    }
                }
                match s.as_str() {
                    "int" => Ok(Token::IntKeyword),
                    "float" => Ok(Token::FloatKeyword),
                    "string" => Ok(Token::StringKeyword),
                    _ => Ok(Token::Ident(s)),
                }
            }
            _ => Err(format!("Unexpected character: {}", c)),
        }
    }

    fn tokenize(mut self) -> Result<Vec<Token>, String> {
        let mut tokens = Vec::new();
        loop {
            let token = self.next_token()?;
            let is_eof = token == Token::EOF;
            tokens.push(token);
            if is_eof {
                break;
            }
        }
        Ok(tokens)
    }
}

struct ExprParser<'a> {
    tokens: Vec<Token>,
    pos: usize,
    vars: &'a HashMap<String, Value>,
    base_dir: &'a Path,
}

impl<'a> ExprParser<'a> {
    fn new(tokens: Vec<Token>, vars: &'a HashMap<String, Value>, base_dir: &'a Path) -> Self {
        Self {
            tokens,
            pos: 0,
            vars,
            base_dir,
        }
    }

    fn peek(&self) -> &Token {
        &self.tokens[self.pos]
    }

    fn consume(&mut self) -> &Token {
        let t = &self.tokens[self.pos];
        if t != &Token::EOF {
            self.pos += 1;
        }
        t
    }

    fn parse_expression(&mut self) -> Result<Value, String> {
        let mut left = self.parse_term()?;
        while let Token::Plus | Token::Minus = self.peek() {
            let op = self.consume().clone();
            let right = self.parse_term()?;
            match (&left, &right, op.clone()) {
                (Value::String(s1), _, Token::Plus) => {
                    left = Value::String(format!("{}{}", s1, right.to_string()));
                }
                (_, Value::String(s2), Token::Plus) => {
                    left = Value::String(format!("{}{}", left.to_string(), s2));
                }
                (Value::Int(i1), Value::Int(i2), Token::Plus) => left = Value::Int(i1 + i2),
                (Value::Int(i1), Value::Int(i2), Token::Minus) => left = Value::Int(i1 - i2),
                _ => {
                    let f1 = left.to_f64();
                    let f2 = right.to_f64();
                    left = if let Token::Plus = op {
                        Value::Float(f1 + f2)
                    } else {
                        Value::Float(f1 - f2)
                    };
                }
            }
        }
        Ok(left)
    }

    fn parse_term(&mut self) -> Result<Value, String> {
        let mut left = self.parse_unary()?;
        while let Token::Star | Token::Slash = self.peek() {
            let op = self.consume().clone();
            let right = self.parse_unary()?;
            match (&left, &right, op.clone()) {
                (Value::Int(i1), Value::Int(i2), Token::Star) => left = Value::Int(i1 * i2),
                (Value::Int(i1), Value::Int(i2), Token::Slash) => {
                    if *i2 == 0 {
                        return Err("Division by zero".to_string());
                    }
                    left = Value::Int(i1 / i2);
                }
                _ => {
                    let f1 = left.to_f64();
                    let f2 = right.to_f64();
                    if op == Token::Slash && f2 == 0.0 {
                        return Err("Division by zero".to_string());
                    }
                    left = if let Token::Star = op {
                        Value::Float(f1 * f2)
                    } else {
                        Value::Float(f1 / f2)
                    };
                }
            }
        }
        Ok(left)
    }

    fn parse_unary(&mut self) -> Result<Value, String> {
        if let Token::Minus = self.peek() {
            self.consume();
            let val = self.parse_primary()?;
            match val {
                Value::Int(i) => Ok(Value::Int(-i)),
                Value::Float(f) => Ok(Value::Float(-f)),
                _ => Err("Cannot negate a string".to_string()),
            }
        } else {
            self.parse_primary()
        }
    }

    fn parse_primary(&mut self) -> Result<Value, String> {
        match self.consume().clone() {
            Token::Number(n) => {
                if n.fract() == 0.0 {
                    Ok(Value::Int(n as i64))
                } else {
                    Ok(Value::Float(n))
                }
            }
            Token::StringLiteral(s) => Ok(Value::String(s)),
            Token::Ident(s) => {
                // Check for function call
                if self.peek() == &Token::LParen {
                    self.consume(); // consume the '('
                    let mut args = Vec::new();
                    
                    // Parse arguments separated by commas
                    if self.peek() != &Token::RParen {
                        loop {
                            args.push(self.parse_expression()?);
                            match self.peek() {
                                Token::Comma => {
                                    self.consume();
                                }
                                Token::RParen => break,
                                _ => return Err("Expected ',' or ')' in function call".to_string()),
                            }
                        }
                    }
                    
                    if self.consume() != &Token::RParen {
                        return Err("Expected ')' after function arguments".to_string());
                    }
                    
                    // Handle function calls
                    match s.to_lowercase().as_str() {
                        "combine" => {
                            if args.len() != 2 {
                                return Err(format!("combine expects 2 arguments, got {}", args.len()));
                            }
                            match (&args[0], &args[1]) {
                                (Value::Array(arr1), Value::Array(arr2)) => {
                                    let max_len = arr1.len().max(arr2.len());
                                    let mut result = Vec::new();
                                    for i in 0..max_len {
                                        let mut pair = Vec::new();
                                        if i < arr1.len() {
                                            pair.push(arr1[i].clone());
                                        }
                                        if i < arr2.len() {
                                            pair.push(arr2[i].clone());
                                        }
                                        result.push(Value::Array(pair));
                                    }
                                    Ok(Value::Array(result))
                                }
                                _ => Err("combine expects two array arguments".to_string()),
                            }
                        }
                        "csv" => {
                            if args.len() != 1 {
                                return Err(format!("csv expects 1 argument, got {}", args.len()));
                            }
                            match &args[0] {
                                Value::String(path) => {
                                    load_csv_file(path, self.base_dir).map_err(|e| e.message)
                                }
                                _ => Err("csv expects a string file path".to_string()),
                            }
                        }
                        _ => Err(format!("Unknown function: {}", s)),
                    }
                } else if s.to_lowercase() == "null" || s == "None" {
                    Ok(Value::Null)
                } else {
                    self.vars
                        .get(&s)
                        .cloned()
                        .ok_or_else(|| format!("Undefined variable: {}", s))
                }
            }
            Token::LParen => {
                let val = self.parse_expression()?;
                if self.consume() != &Token::RParen {
                    return Err("Expected ')'".to_string());
                }
                Ok(val)
            }
            _ => Err("Expected number, string, variable, or '('".to_string()),
        }
    }
}

fn evaluate(expr: &str, vars: &HashMap<String, Value>) -> Result<Value, String> {
    evaluate_with_base_dir(expr, vars, Path::new("."))
}

fn evaluate_with_base_dir(
    expr: &str,
    vars: &HashMap<String, Value>,
    base_dir: &Path,
) -> Result<Value, String> {
    let tokens = Tokenizer::new(expr).tokenize()?;
    let mut parser = ExprParser::new(tokens, vars, base_dir);
    let val = parser.parse_expression()?;
    if parser.peek() != &Token::EOF {
        return Err("Unexpected tokens after expression".to_string());
    }
    Ok(val)
}

fn parse_csv_scalar(cell: &str) -> Value {
    let trimmed = cell.trim();
    if trimmed.is_empty() {
        return Value::Null;
    }
    if trimmed.eq_ignore_ascii_case("null") || trimmed == "None" {
        return Value::Null;
    }
    if let Ok(n) = trimmed.parse::<f64>() {
        if n.fract() == 0.0 {
            return Value::Int(n as i64);
        }
        return Value::Float(n);
    }
    Value::String(trimmed.to_string())
}

fn load_csv_file(path: &str, base_dir: &Path) -> Result<Value, VaraiXError> {
    let resolved_path = {
        let candidate = Path::new(path);
        if candidate.is_absolute() {
            candidate.to_path_buf()
        } else {
            base_dir.join(candidate)
        }
    };

    let csv_text = fs::read_to_string(&resolved_path).map_err(|err| VaraiXError {
        line_number: 0,
        message: format!(
            "Unable to read CSV file \"{}\": {}",
            resolved_path.display(),
            err
        ),
        source_line: String::new(),
    })?;

    let mut reader = csv::ReaderBuilder::new()
        .has_headers(false)
        .from_reader(csv_text.as_bytes());

    let mut rows: Vec<Value> = Vec::new();
    for result in reader.records() {
        let record = result.map_err(|err| VaraiXError {
            line_number: 0,
            message: format!(
                "Unable to parse CSV file \"{}\": {}",
                resolved_path.display(),
                err
            ),
            source_line: String::new(),
        })?;

        let row = record.iter().map(parse_csv_scalar).collect::<Vec<Value>>();
        rows.push(Value::Array(row));
    }

    Ok(Value::Array(rows))
}

fn parse_general_array(
    raw: &str,
    vars: &HashMap<String, Value>,
    line_number: usize,
    source_line: &str,
) -> Result<Value, VaraiXError> {
    let s = raw.trim();
    if !s.starts_with('[') {
        return Err(VaraiXError {
            line_number,
            message: "Array must start with '['".to_string(),
            source_line: source_line.to_string(),
        });
    }
    let inner = s.trim();
    let inner = inner.strip_prefix('[').unwrap_or(inner);
    let inner = inner.strip_suffix(']').unwrap_or(inner).trim();

    if inner.is_empty() {
        return Ok(Value::Array(Vec::new()));
    }

    if inner.contains(" for ") && inner.contains(" in ") && inner.contains("..") {
        if let Some(for_idx) = inner.find(" for ") {
            let expr_part = inner[..for_idx].trim();
            let rest = inner[for_idx + 5..].trim();
            if let Some(in_idx) = rest.find(" in ") {
                let var_name = rest[..in_idx].trim();
                let range_part = rest[in_idx + 4..].trim();
                if let Some(dd) = range_part.find("..") {
                    let start_s = range_part[..dd].trim();
                    let end_s = range_part[dd + 2..].trim();
                    let start_val = evaluate(start_s, vars).map_err(|e| VaraiXError {
                        line_number,
                        message: format!("Invalid start expression in range: {}", e),
                        source_line: source_line.to_string(),
                    })?;
                    let end_val = evaluate(end_s, vars).map_err(|e| VaraiXError {
                        line_number,
                        message: format!("Invalid end expression in range: {}", e),
                        source_line: source_line.to_string(),
                    })?;
                    let start_i = match start_val {
                        Value::Int(i) => i,
                        Value::Float(f) => f as i64,
                        _ => {
                            return Err(VaraiXError {
                                line_number,
                                message: "Range bounds must be numeric".to_string(),
                                source_line: source_line.to_string(),
                            });
                        }
                    };
                    let end_i = match end_val {
                        Value::Int(i) => i,
                        Value::Float(f) => f as i64,
                        _ => {
                            return Err(VaraiXError {
                                line_number,
                                message: "Range bounds must be numeric".to_string(),
                                source_line: source_line.to_string(),
                            });
                        }
                    };
                    let mut results: Vec<Value> = Vec::new();
                    for i in start_i..=end_i {
                        let mut local_vars = vars.clone();
                        local_vars.insert(var_name.to_string(), Value::Int(i));
                        match evaluate(expr_part, &local_vars) {
                            Ok(v) => results.push(v),
                            Err(e) => {
                                return Err(VaraiXError {
                                    line_number,
                                    message: format!("Invalid expression in comprehension: {}", e),
                                    source_line: source_line.to_string(),
                                });
                            }
                        }
                    }
                    return Ok(Value::Array(results));
                }
            }
        }
    }

    if inner.contains("..") && !inner.contains(',') {
        if let Some(dd) = inner.find("..") {
            let start_s = inner[..dd].trim();
            let end_s = inner[dd + 2..].trim();
            let start_val = evaluate(start_s, vars).map_err(|e| VaraiXError {
                line_number,
                message: format!("Invalid start expression in range: {}", e),
                source_line: source_line.to_string(),
            })?;
            let end_val = evaluate(end_s, vars).map_err(|e| VaraiXError {
                line_number,
                message: format!("Invalid end expression in range: {}", e),
                source_line: source_line.to_string(),
            })?;
            let start_i = match start_val {
                Value::Int(i) => i,
                Value::Float(f) => f as i64,
                _ => {
                    return Err(VaraiXError {
                        line_number,
                        message: "Range bounds must be numeric".to_string(),
                        source_line: source_line.to_string(),
                    });
                }
            };
            let end_i = match end_val {
                Value::Int(i) => i,
                Value::Float(f) => f as i64,
                _ => {
                    return Err(VaraiXError {
                        line_number,
                        message: "Range bounds must be numeric".to_string(),
                        source_line: source_line.to_string(),
                    });
                }
            };
            let mut results: Vec<Value> = Vec::new();
            for i in start_i..=end_i {
                results.push(Value::Int(i));
            }
            return Ok(Value::Array(results));
        }
    }

    let mut results: Vec<Value> = Vec::new();
    let mut current = String::new();
    let mut depth = 0usize;
    let mut in_quotes = false;
    let mut chars = inner.chars().peekable();
    while let Some(c) = chars.next() {
        match c {
            '"' => {
                current.push(c);
                in_quotes = !in_quotes;
            }
            '[' if !in_quotes => {
                depth += 1;
                current.push(c);
            }
            ']' if !in_quotes => {
                if depth > 0 {
                    depth -= 1;
                }
                current.push(c);
            }
            ',' if !in_quotes && depth == 0 => {
                let token = current.trim();
                if !token.is_empty() {
                    if token.starts_with('[') {
                        match parse_general_array(token, vars, line_number, source_line) {
                            Ok(Value::Array(v)) => results.push(Value::Array(v)),
                            Ok(_) => {}
                            Err(e) => return Err(e),
                        }
                    } else if token.eq_ignore_ascii_case("null") || token == "None" {
                        results.push(Value::Null);
                    } else if token.starts_with('"') && token.ends_with('"') {
                        let inner_s = token[1..token.len() - 1].to_string();
                        results.push(Value::String(inner_s));
                    } else if let Ok(val) = evaluate(token, vars) {
                        results.push(val);
                    } else if let Ok(n) = token.parse::<f64>() {
                        if n.fract() == 0.0 {
                            results.push(Value::Int(n as i64));
                        } else {
                            results.push(Value::Float(n));
                        }
                    } else {
                        results.push(Value::String(token.to_string()));
                    }
                }
                current.clear();
            }
            _ => {
                current.push(c);
            }
        }
    }
    if !current.trim().is_empty() {
        let token = current.trim();
        if token.starts_with('[') {
            match parse_general_array(token, vars, line_number, source_line) {
                Ok(Value::Array(v)) => results.push(Value::Array(v)),
                Ok(_) => {}
                Err(e) => return Err(e),
            }
        } else if token.eq_ignore_ascii_case("null") || token == "None" {
            results.push(Value::Null);
        } else if token.starts_with('"') && token.ends_with('"') {
            let inner_s = token[1..token.len() - 1].to_string();
            results.push(Value::String(inner_s));
        } else if let Ok(val) = evaluate(token, vars) {
            results.push(val);
        } else if let Ok(n) = token.parse::<f64>() {
            if n.fract() == 0.0 {
                results.push(Value::Int(n as i64));
            } else {
                results.push(Value::Float(n));
            }
        } else {
            results.push(Value::String(token.to_string()));
        }
    }

    Ok(Value::Array(results))
}

fn parse_array_literal(
    raw: &str,
    vars: &HashMap<String, Value>,
    line_number: usize,
    source_line: &str,
) -> Result<Vec<DataPoint>, VaraiXError> {
    let s = raw.trim();
    if !s.starts_with('[') {
        return Err(VaraiXError {
            line_number,
            message: "Array literal must start with '['".to_string(),
            source_line: source_line.to_string(),
        });
    }
    let mut chars = s.chars().peekable();
    chars.next();

    let mut items: Vec<DataPoint> = Vec::new();
    loop {
        while let Some(&c) = chars.peek() {
            if c.is_whitespace() {
                chars.next();
            } else {
                break;
            }
        }
        match chars.peek() {
            Some('[') => {
                chars.next();
                let mut item = String::new();
                let mut depth = 0;
                while let Some(c) = chars.next() {
                    if c == ']' && depth == 0 {
                        break;
                    }
                    if c == '[' {
                        depth += 1;
                    }
                    if c == ']' {
                        depth -= 1;
                    }
                    item.push(c);
                }
                let parts: Vec<&str> = item.split(',').map(|p| p.trim()).collect();
                if parts.len() < 2 {
                    return Err(VaraiXError {
                        line_number,
                        message: "Array item must have two elements [x, y]".to_string(),
                        source_line: source_line.to_string(),
                    });
                }
                let raw_x = parts[0];
                let raw_y = parts[1];

                let parsed_x = if (raw_x.starts_with('"') && raw_x.ends_with('"'))
                    || raw_x
                        .chars()
                        .next()
                        .map_or(false, |c| c.is_alphabetic() || c == '_')
                {
                    match evaluate(raw_x, vars) {
                        Ok(Value::String(s)) => XValue::String(s),
                        Ok(Value::Int(i)) => XValue::Number(i as f64),
                        Ok(Value::Float(f)) => XValue::Number(f),
                        Ok(Value::Array(_)) => XValue::String("[array]".to_string()),
                        _ => XValue::String(raw_x.to_string()),
                    }
                } else if let Ok(val) = evaluate(raw_x, vars) {
                    match val {
                        Value::String(s) => XValue::String(s),
                        Value::Int(i) => XValue::Number(i as f64),
                        Value::Float(f) => XValue::Number(f),
                        Value::Null => XValue::String("null".to_string()),
                        Value::Array(_) => XValue::String("[array]".to_string()),
                    }
                } else {
                    XValue::String(raw_x.to_string())
                };

                let parsed_y = if raw_y.eq_ignore_ascii_case("null") || raw_y == "None" {
                    None
                } else if let Ok(val) = evaluate(raw_y, vars) {
                    Some(val.to_f64())
                } else {
                    match raw_y.parse::<f64>() {
                        Ok(n) => Some(n),
                        Err(_) => None,
                    }
                };

                items.push(DataPoint {
                    x: parsed_x,
                    y: parsed_y,
                });

                while let Some(&c) = chars.peek() {
                    if c.is_whitespace() {
                        chars.next();
                    } else {
                        break;
                    }
                }
                if let Some(',') = chars.peek() {
                    chars.next();
                }
            }
            Some(']') => {
                break;
            }
            Some(_) => {
                chars.next();
            }
            None => break,
        }
    }

    Ok(items)
}

pub fn parse(source: &str) -> Result<VizAST, VaraiXError> {
    parse_with_base_dir(source, Path::new("."))
}

pub fn parse_with_base_dir(source: &str, base_dir: &Path) -> Result<VizAST, VaraiXError> {
    let source = strip_comments_preserve_lines(source);

    let mut chart_type = None;
    let mut title = None;
    let mut x_label = None;
    let mut y_label = None;
    let mut data_points: Vec<DataPoint> = Vec::new();
    let mut in_data_block = false;
    let mut vars: HashMap<String, Value> = HashMap::new();
    let mut null_fill: Option<String> = None;
    let mut colors: Option<Vec<String>> = None;
    let mut histogram_bins: Option<usize> = None;

    for (line_index, raw_line) in source.lines().enumerate() {
        let line_number = line_index + 1;
        let trimmed_line = raw_line.trim();

        if trimmed_line.is_empty() {
            continue;
        }

        if in_data_block {
            if !trimmed_line.contains(',') {
                in_data_block = false;
            }
        }

        if in_data_block {
            let comma_index = trimmed_line.find(',').ok_or_else(|| VaraiXError {
                line_number,
                message: "Expected a data row in the format \"x, y\" but found no comma"
                    .to_string(),
                source_line: raw_line.to_string(),
            })?;

            let raw_x = trimmed_line[..comma_index].trim();
            let raw_y = trimmed_line[comma_index + 1..].trim();

            if raw_x.is_empty() {
                return Err(VaraiXError {
                    line_number,
                    message: "x-value is empty in data row".to_string(),
                    source_line: raw_line.to_string(),
                });
            }

            let val_y = evaluate(raw_y, &vars).map_err(|e| VaraiXError {
                line_number,
                message: format!("Invalid y-value expression \"{}\": {}", raw_y, e),
                source_line: raw_line.to_string(),
            })?;
            let parsed_y = Some(val_y.to_f64());

            let parsed_x = if (raw_x.starts_with('"') && raw_x.ends_with('"'))
                || raw_x
                    .chars()
                    .next()
                    .map_or(false, |c| c.is_alphabetic() || c == '_')
            {
                match evaluate(raw_x, &vars) {
                    Ok(Value::String(s)) => XValue::String(s),
                    Ok(Value::Int(i)) => XValue::Number(i as f64),
                    Ok(Value::Float(f)) => XValue::Number(f),
                    Ok(Value::Array(_)) => XValue::String("[array]".to_string()),
                    _ => XValue::String(raw_x.to_string()),
                }
            } else if let Ok(val) = evaluate(raw_x, &vars) {
                match val {
                    Value::String(s) => XValue::String(s),
                    Value::Int(i) => XValue::Number(i as f64),
                    Value::Float(f) => XValue::Number(f),
                    Value::Null => XValue::String("null".to_string()),
                    Value::Array(_) => XValue::String("[array]".to_string()),
                }
            } else {
                XValue::String(raw_x.to_string())
            };

            data_points.push(DataPoint {
                x: parsed_x,
                y: parsed_y,
            });
            continue;
        }

        if let Some(equal_index) = trimmed_line.find('=') {
            let left_part = trimmed_line[..equal_index].trim();
            let raw_expr = trimmed_line[equal_index + 1..].trim();

            let mut type_hint = None;
            let mut name = left_part;

            let mut is_array_hint = false;
            if left_part.starts_with("int[] ")
                || left_part.starts_with("int[]")
                    && left_part.len() > 4
                    && left_part.chars().nth(4).map_or(true, |c| c == ' ')
            {
                type_hint = Some(Token::IntKeyword);
                is_array_hint = true;
                name = left_part[left_part.find(' ').unwrap_or(5)..].trim();
            } else if left_part.starts_with("float[] ")
                || left_part.starts_with("float[]")
                    && left_part.len() > 6
                    && left_part.chars().nth(6).map_or(true, |c| c == ' ')
            {
                type_hint = Some(Token::FloatKeyword);
                is_array_hint = true;
                name = left_part[left_part.find(' ').unwrap_or(7)..].trim();
            } else if left_part.starts_with("string[] ")
                || left_part.starts_with("string[]")
                    && left_part.len() > 7
                    && left_part.chars().nth(7).map_or(true, |c| c == ' ')
            {
                type_hint = Some(Token::StringKeyword);
                is_array_hint = true;
                name = left_part[left_part.find(' ').unwrap_or(8)..].trim();
            } else if left_part.starts_with("int ") {
                type_hint = Some(Token::IntKeyword);
                name = left_part[4..].trim();
            } else if left_part.starts_with("float ") {
                type_hint = Some(Token::FloatKeyword);
                name = left_part[6..].trim();
            } else if left_part.starts_with("string ") {
                type_hint = Some(Token::StringKeyword);
                name = left_part[7..].trim();
            }

            if !name.is_empty()
                && name
                    .chars()
                    .next()
                    .map_or(false, |c| c.is_alphabetic() || c == '_')
                && name.chars().all(|c| c.is_alphanumeric() || c == '_')
            {
                let val = if raw_expr.trim_start().starts_with('[') {
                    parse_general_array(raw_expr, &vars, line_number, raw_line)?
                } else {
                    match evaluate(raw_expr, &vars) {
                        Ok(v) => v,
                        Err(e) => {
                            return Err(VaraiXError {
                                line_number,
                                message: format!(
                                    "Invalid variable assignment \"{} = {}\": {}",
                                    name, raw_expr, e
                                ),
                                source_line: raw_line.to_string(),
                            });
                        }
                    }
                };

                let final_val = match val {
                    Value::Array(arr) => {
                        if is_array_hint {
                            let coerced: Vec<Value> = arr
                                .into_iter()
                                .map(|elem| match type_hint {
                                    Some(Token::IntKeyword) => Value::Int(elem.to_f64() as i64),
                                    Some(Token::FloatKeyword) => Value::Float(elem.to_f64()),
                                    Some(Token::StringKeyword) => Value::String(elem.to_string()),
                                    _ => elem,
                                })
                                .collect();
                            Value::Array(coerced)
                        } else {
                            Value::Array(arr)
                        }
                    }
                    other => match type_hint {
                        Some(Token::IntKeyword) => Value::Int(other.to_f64() as i64),
                        Some(Token::FloatKeyword) => Value::Float(other.to_f64()),
                        Some(Token::StringKeyword) => Value::String(other.to_string()),
                        _ => other,
                    },
                };

                vars.insert(name.to_string(), final_val);
                continue;
            }
        }

        let colon_index = trimmed_line.find(':').ok_or_else(|| VaraiXError {
            line_number,
            message: "Expected a \"key: value\" pair, an assignment \"[type] var = val\", or found no separator".to_string(),
            source_line: raw_line.to_string(),
        })?;

        let key = trimmed_line[..colon_index].trim().to_lowercase();
        let mut value = trimmed_line[colon_index + 1..].trim().to_string();

        if (value.starts_with('"') && value.ends_with('"')) || vars.contains_key(&value) {
            if let Ok(v) = evaluate(&value, &vars) {
                value = v.to_string();
            }
        }

        match key.as_str() {
            "chart" => {
                chart_type = Some(match value.as_str() {
                    "line" => ChartType::Line,
                    "bar" => ChartType::Bar,
                    "scatter" => ChartType::Scatter,
                    "pie" => ChartType::Pie,
                    "histogram" => ChartType::Histogram,
                    "heatmap" => ChartType::Heatmap,
                    _ => {
                        return Err(VaraiXError {
                            line_number,
                            message: format!(
                                "Unknown chart type \"{}\" — valid options are: line, bar, scatter, pie, histogram, heatmap",
                                value
                            ),
                            source_line: raw_line.to_string(),
                        });
                    }
                });
            }
            "title" => title = Some(value),
            "x" => x_label = Some(value),
            "y" => y_label = Some(value),
            "null" | "null_fill" => {
                null_fill = Some(value.to_lowercase());
            }
            "colors" | "color" => {
                let mut palette: Option<Vec<String>> = None;
                if value.trim_start().starts_with('[') {
                    match parse_general_array(&value, &vars, line_number, raw_line) {
                        Ok(Value::Array(items)) => {
                            let mut colors = Vec::new();
                            for it in items {
                                match it {
                                    Value::String(s) => colors.push(s),
                                    Value::Int(i) => colors.push(i.to_string()),
                                    Value::Float(f) => colors.push(f.to_string()),
                                    Value::Null => colors.push("null".to_string()),
                                    Value::Array(_) => colors.push("[array]".to_string()),
                                }
                            }
                            palette = Some(colors);
                        }
                        Ok(_) => {}
                        Err(e) => return Err(e),
                    }
                } else if let Some(v) = vars.get(&value) {
                    if let Value::Array(items) = v {
                        let mut colors = Vec::new();
                        for it in items {
                            match it {
                                Value::String(s) => colors.push(s.clone()),
                                Value::Int(i) => colors.push(i.to_string()),
                                Value::Float(f) => colors.push(f.to_string()),
                                _ => {}
                            }
                        }
                        palette = Some(colors);
                    }
                }
                if let Some(p) = palette {
                    colors = Some(p);
                }
            }
            "histogram_bins" | "bins" => {
                if let Ok(n) = value.parse::<usize>() {
                    histogram_bins = Some(n);
                }
            }
            "data" => {
                if value.trim_start().starts_with('[') {
                    match parse_array_literal(&value, &vars, line_number, raw_line) {
                        Ok(mut pts) => {
                            data_points.append(&mut pts);
                        }
                        Err(e) => return Err(e),
                    }
                } else if vars.contains_key(&value) {
                    if let Some(v) = vars.get(&value) {
                        match v {
                            Value::Array(items) => {
                                for item in items {
                                    if let Value::Array(inner) = item {
                                        if inner.len() >= 2 {
                                            let raw_x_val = &inner[0];
                                            let raw_y_val = &inner[1];
                                            let parsed_x = match raw_x_val {
                                                Value::String(s) => XValue::String(s.clone()),
                                                Value::Int(i) => XValue::Number(*i as f64),
                                                Value::Float(f) => XValue::Number(*f),
                                                Value::Null => XValue::String("null".to_string()),
                                                _ => XValue::String("[array]".to_string()),
                                            };
                                            let parsed_y = match raw_y_val {
                                                Value::Null => None,
                                                Value::Int(i) => Some(*i as f64),
                                                Value::Float(f) => Some(*f),
                                                Value::String(s) => match evaluate(s, &vars) {
                                                    Ok(v) => Some(v.to_f64()),
                                                    Err(_) => None,
                                                },
                                                _ => None,
                                            };
                                            data_points.push(DataPoint {
                                                x: parsed_x,
                                                y: parsed_y,
                                            });
                                        }
                                    }
                                }
                            }
                            _ => {
                                in_data_block = true;
                            }
                        }
                    } else {
                        in_data_block = true;
                    }
                } else if let Ok(Value::Array(items)) = evaluate_with_base_dir(&value, &vars, base_dir) {
                    for item in items {
                        if let Value::Array(inner) = item {
                            if inner.len() >= 2 {
                                let raw_x_val = &inner[0];
                                let raw_y_val = &inner[1];
                                let parsed_x = match raw_x_val {
                                    Value::String(s) => XValue::String(s.clone()),
                                    Value::Int(i) => XValue::Number(*i as f64),
                                    Value::Float(f) => XValue::Number(*f),
                                    Value::Null => XValue::String("null".to_string()),
                                    _ => XValue::String("[array]".to_string()),
                                };
                                let parsed_y = match raw_y_val {
                                    Value::Null => None,
                                    Value::Int(i) => Some(*i as f64),
                                    Value::Float(f) => Some(*f),
                                    Value::String(s) => match evaluate(s, &vars) {
                                        Ok(v) => Some(v.to_f64()),
                                        Err(_) => None,
                                    },
                                    _ => None,
                                };
                                data_points.push(DataPoint {
                                    x: parsed_x,
                                    y: parsed_y,
                                });
                            }
                        }
                    }
                } else {
                    in_data_block = true;
                }
            }
            _ => {}
        }
    }

    let chart_type = chart_type.ok_or_else(|| VaraiXError {
        line_number: 0,
        message: "Missing required \"chart:\" declaration".to_string(),
        source_line: "".to_string(),
    })?;

    if data_points.is_empty() {
        return Err(VaraiXError {
            line_number: 0,
            message: "No data rows found — add a \"data:\" section with at least one row"
                .to_string(),
            source_line: "".to_string(),
        });
    }

    Ok(VizAST {
        chart_type,
        title,
        x_label,
        y_label,
        data: data_points,
        null_fill,
        colors,
        histogram_bins,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn parses_csv_file_as_data() {
        let temp_root = std::env::temp_dir().join(format!("varaix-csv-test-{}", std::process::id()));
        fs::create_dir_all(&temp_root).unwrap();

        let csv_path = temp_root.join("sample.csv");
        fs::write(&csv_path, "Jan,12\nFeb,19\nMar,15\n").unwrap();

        let source = "chart: line\ndata: csv(\"sample.csv\")\n";
        let ast = parse_with_base_dir(source, &temp_root).unwrap();

        assert_eq!(ast.data.len(), 3);
        assert_eq!(ast.data[0].x.to_string(), "Jan");
        assert_eq!(ast.data[0].y, Some(12.0));
        assert_eq!(ast.data[2].x.to_string(), "Mar");
        assert_eq!(ast.data[2].y, Some(15.0));

        let _ = fs::remove_file(csv_path);
        let _ = fs::remove_dir_all(temp_root);
    }
}
