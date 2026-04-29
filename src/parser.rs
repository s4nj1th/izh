use crate::types::{ChartType, DataPoint, VizAST, XValue};
use std::fmt;

#[derive(Debug, Clone)]
pub struct VizLangError {
    pub line_number: usize,
    pub message: String,
    pub source_line: String,
}

impl fmt::Display for VizLangError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let prefix = if self.line_number > 0 {
            format!("VizLang Error [line {}]", self.line_number)
        } else {
            "VizLang Error".to_string()
        };

        if self.source_line.trim().is_empty() {
            write!(f, "{}: {}", prefix, self.message)
        } else {
            write!(f, "{}: {}\n  → {}", prefix, self.message, self.source_line.trim())
        }
    }
}

impl std::error::Error for VizLangError {}

fn is_numeric_string(s: &str) -> bool {
    s.parse::<f64>().is_ok()
}

pub fn parse(source: &str) -> Result<VizAST, VizLangError> {
    let mut chart_type = None;
    let mut title = None;
    let mut x_label = None;
    let mut y_label = None;
    let mut data_points = Vec::new();
    let mut in_data_block = false;

    for (line_index, raw_line) in source.lines().enumerate() {
        let line_number = line_index + 1;
        let trimmed_line = raw_line.trim();

        if trimmed_line.is_empty() || trimmed_line.starts_with('#') {
            continue;
        }

        if in_data_block {
            let comma_index = trimmed_line.find(',').ok_or_else(|| VizLangError {
                line_number,
                message: "Expected a data row in the format \"x, y\" but found no comma".to_string(),
                source_line: raw_line.to_string(),
            })?;

            let raw_x = trimmed_line[..comma_index].trim();
            let raw_y = trimmed_line[comma_index + 1..].trim();

            if raw_x.is_empty() {
                return Err(VizLangError {
                    line_number,
                    message: "x-value is empty in data row".to_string(),
                    source_line: raw_line.to_string(),
                });
            }

            let parsed_y = raw_y.parse::<f64>().map_err(|_| VizLangError {
                line_number,
                message: format!("y-value \"{}\" is not a number", raw_y),
                source_line: raw_line.to_string(),
            })?;

            let parsed_x = if is_numeric_string(raw_x) {
                XValue::Number(raw_x.parse::<f64>().unwrap())
            } else {
                XValue::String(raw_x.to_string())
            };

            data_points.push(DataPoint { x: parsed_x, y: parsed_y });
            continue;
        }

        let colon_index = trimmed_line.find(':').ok_or_else(|| VizLangError {
            line_number,
            message: "Expected a \"key: value\" pair but found no colon".to_string(),
            source_line: raw_line.to_string(),
        })?;

        let key = trimmed_line[..colon_index].trim().to_lowercase();
        let value = trimmed_line[colon_index + 1..].trim();

        match key.as_str() {
            "chart" => {
                chart_type = Some(match value {
                    "line" => ChartType::Line,
                    "bar" => ChartType::Bar,
                    "scatter" => ChartType::Scatter,
                    _ => return Err(VizLangError {
                        line_number,
                        message: format!("Unknown chart type \"{}\" — valid options are: line, bar, scatter", value),
                        source_line: raw_line.to_string(),
                    })
                });
            }
            "title" => title = Some(value.to_string()),
            "x" => x_label = Some(value.to_string()),
            "y" => y_label = Some(value.to_string()),
            "data" => in_data_block = true,
            _ => {} // Ignore unknown keys
        }
    }

    let chart_type = chart_type.ok_or_else(|| VizLangError {
        line_number: 0,
        message: "Missing required \"chart:\" declaration".to_string(),
        source_line: "".to_string(),
    })?;

    if data_points.is_empty() {
        return Err(VizLangError {
            line_number: 0,
            message: "No data rows found — add a \"data:\" section with at least one row".to_string(),
            source_line: "".to_string(),
        });
    }

    Ok(VizAST {
        chart_type,
        title,
        x_label,
        y_label,
        data: data_points,
    })
}
