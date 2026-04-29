use crate::types::{ChartType, VizAST, XValue};

const CANVAS_WIDTH: f64 = 640.0;
const CANVAS_HEIGHT: f64 = 400.0;
const PADDING: f64 = 40.0;
const FONT_FAMILY: &str = "sans-serif";
const TITLE_FONT_SIZE: f64 = 16.0;
const AXIS_LABEL_FONT_SIZE: f64 = 12.0;
const TICK_LABEL_FONT_SIZE: f64 = 10.0;
const BACKGROUND_COLOR: &str = "#ffffff";
const GRID_LINE_COLOR: &str = "#e0e0e0";
const AXIS_COLOR: &str = "#333333";
const DATA_COLOR: &str = "#4a90d9";
const LINE_STROKE_WIDTH: f64 = 2.0;
const LINE_DOT_RADIUS: f64 = 3.0;
const BAR_GAP_RATIO: f64 = 0.2;
const SCATTER_DOT_RADIUS: f64 = 4.0;
const GRID_LINE_COUNT: usize = 5;

fn compute_nice_max(raw_max: f64) -> f64 {
    if raw_max <= 0.0 {
        return 10.0;
    }
    let magnitude = 10.0_f64.powf(raw_max.log10().floor());
    let normalized = raw_max / magnitude;
    let nice_factor = if normalized <= 1.0 {
        1.0
    } else if normalized <= 1.5 {
        1.5
    } else if normalized <= 2.0 {
        2.0
    } else if normalized <= 3.0 {
        3.0
    } else if normalized <= 5.0 {
        5.0
    } else if normalized <= 7.0 {
        7.0
    } else {
        10.0
    };
    nice_factor * magnitude
}

fn format_tick_label(value: f64) -> String {
    if value.fract() == 0.0 {
        format!("{:.0}", value)
    } else {
        format!("{:.1}", value)
    }
}

fn round(value: f64) -> f64 {
    (value * 100.0).round() / 100.0
}

fn escape_xml(raw: &str) -> String {
    raw.replace("&", "&amp;")
       .replace("<", "&lt;")
       .replace(">", "&gt;")
       .replace("\"", "&quot;")
       .replace("'", "&apos;")
}

pub fn render(ast: &VizAST) -> String {
    let chart_width = CANVAS_WIDTH - PADDING * 2.0;
    let chart_height = CANVAS_HEIGHT - PADDING * 2.0;

    let y_data_min = 0.0;
    let max_y = ast.data.iter().map(|d| d.y).fold(f64::NEG_INFINITY, f64::max);
    let y_data_max = compute_nice_max(if max_y.is_finite() { max_y } else { 0.0 });

    let all_x_numeric = ast.data.iter().all(|d| matches!(d.x, XValue::Number(_)));
    
    let mut x_data_min = 0.0;
    let mut x_data_max = 0.0;
    if all_x_numeric {
        x_data_min = ast.data.iter().map(|d| if let XValue::Number(n) = &d.x { *n } else { 0.0 }).fold(f64::INFINITY, f64::min);
        x_data_max = ast.data.iter().map(|d| if let XValue::Number(n) = &d.x { *n } else { 0.0 }).fold(f64::NEG_INFINITY, f64::max);
    }

    let to_pixel_x = |data_index: usize| -> f64 {
        if all_x_numeric {
            if x_data_max == x_data_min {
                return PADDING + chart_width / 2.0;
            }
            let val = if let XValue::Number(n) = &ast.data[data_index].x { *n } else { 0.0 };
            let ratio = (val - x_data_min) / (x_data_max - x_data_min);
            round(PADDING + ratio * chart_width)
        } else {
            if ast.data.len() <= 1 {
                return PADDING + chart_width / 2.0;
            }
            round(PADDING + (data_index as f64 / (ast.data.len() - 1) as f64) * chart_width)
        }
    };

    let to_pixel_y = |value: f64| -> f64 {
        if y_data_max == y_data_min {
            return PADDING + chart_height / 2.0;
        }
        let ratio = (value - y_data_min) / (y_data_max - y_data_min);
        round(PADDING + chart_height - ratio * chart_height)
    };

    let bar_left_edge = |data_index: usize| -> f64 {
        let slot_width = chart_width / (ast.data.len() as f64);
        round(PADDING + (data_index as f64) * slot_width + (slot_width * BAR_GAP_RATIO) / 2.0)
    };

    let bar_pixel_width = || -> f64 {
        round((chart_width / (ast.data.len() as f64)) * (1.0 - BAR_GAP_RATIO))
    };

    let mut elements = Vec::new();

    elements.push(format!(
        "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"{}\" height=\"{}\" viewBox=\"0 0 {} {}\">",
        CANVAS_WIDTH, CANVAS_HEIGHT, CANVAS_WIDTH, CANVAS_HEIGHT
    ));

    elements.push(format!(
        "  <rect width=\"{}\" height=\"{}\" fill=\"{}\" />",
        CANVAS_WIDTH, CANVAS_HEIGHT, BACKGROUND_COLOR
    ));

    for grid_index in 0..=GRID_LINE_COUNT {
        let ratio = (grid_index as f64) / (GRID_LINE_COUNT as f64);
        let grid_y = round(PADDING + chart_height - ratio * chart_height);
        let tick_value = y_data_min + ratio * (y_data_max - y_data_min);
        let tick_label = format_tick_label(tick_value);

        elements.push(format!(
            "  <line x1=\"{}\" y1=\"{}\" x2=\"{}\" y2=\"{}\" stroke=\"{}\" stroke-width=\"0.5\" />",
            PADDING, grid_y, PADDING + chart_width, grid_y, GRID_LINE_COLOR
        ));
        elements.push(format!(
            "  <text x=\"{}\" y=\"{}\" text-anchor=\"end\" font-family=\"{}\" font-size=\"{}\" fill=\"{}\">{}</text>",
            PADDING - 6.0, grid_y + 4.0, FONT_FAMILY, TICK_LABEL_FONT_SIZE, AXIS_COLOR, tick_label
        ));
    }

    elements.push(format!(
        "  <line x1=\"{}\" y1=\"{}\" x2=\"{}\" y2=\"{}\" stroke=\"{}\" stroke-width=\"1\" />",
        PADDING, PADDING + chart_height, PADDING + chart_width, PADDING + chart_height, AXIS_COLOR
    ));

    elements.push(format!(
        "  <line x1=\"{}\" y1=\"{}\" x2=\"{}\" y2=\"{}\" stroke=\"{}\" stroke-width=\"1\" />",
        PADDING, PADDING, PADDING, PADDING + chart_height, AXIS_COLOR
    ));

    match ast.chart_type {
        ChartType::Line => {
            if !ast.data.is_empty() {
                let path_commands: Vec<String> = ast.data.iter().enumerate().map(|(i, point)| {
                    let px = to_pixel_x(i);
                    let py = to_pixel_y(point.y);
                    if i == 0 {
                        format!("M {} {}", px, py)
                    } else {
                        format!("L {} {}", px, py)
                    }
                }).collect();

                elements.push(format!(
                    "  <path d=\"{}\" fill=\"none\" stroke=\"{}\" stroke-width=\"{}\" stroke-linecap=\"round\" stroke-linejoin=\"round\" />",
                    path_commands.join(" "), DATA_COLOR, LINE_STROKE_WIDTH
                ));

                for i in 0..ast.data.len() {
                    elements.push(format!(
                        "  <circle cx=\"{}\" cy=\"{}\" r=\"{}\" fill=\"{}\" />",
                        to_pixel_x(i), to_pixel_y(ast.data[i].y), LINE_DOT_RADIUS, DATA_COLOR
                    ));
                }
            }
        }
        ChartType::Bar => {
            let bar_width = bar_pixel_width();
            let baseline_y = to_pixel_y(0.0);

            for i in 0..ast.data.len() {
                let bar_x = bar_left_edge(i);
                let bar_top = to_pixel_y(ast.data[i].y);
                let bar_height = baseline_y - bar_top;

                elements.push(format!(
                    "  <rect x=\"{}\" y=\"{}\" width=\"{}\" height=\"{}\" fill=\"{}\" rx=\"2\" />",
                    bar_x, bar_top, bar_width, bar_height, DATA_COLOR
                ));
            }
        }
        ChartType::Scatter => {
            for i in 0..ast.data.len() {
                elements.push(format!(
                    "  <circle cx=\"{}\" cy=\"{}\" r=\"{}\" fill=\"{}\" opacity=\"0.8\" />",
                    to_pixel_x(i), to_pixel_y(ast.data[i].y), SCATTER_DOT_RADIUS, DATA_COLOR
                ));
            }
        }
    }

    let x_tick_y = PADDING + chart_height + 16.0;
    for i in 0..ast.data.len() {
        let tick_x = match ast.chart_type {
            ChartType::Bar => bar_left_edge(i) + bar_pixel_width() / 2.0,
            _ => to_pixel_x(i),
        };

        let label = match &ast.data[i].x {
            XValue::String(s) => escape_xml(s),
            XValue::Number(n) => escape_xml(&n.to_string()),
        };

        elements.push(format!(
            "  <text x=\"{}\" y=\"{}\" text-anchor=\"middle\" font-family=\"{}\" font-size=\"{}\" fill=\"{}\">{}</text>",
            tick_x, x_tick_y, FONT_FAMILY, TICK_LABEL_FONT_SIZE, AXIS_COLOR, label
        ));
    }

    if let Some(title) = &ast.title {
        elements.push(format!(
            "  <text x=\"{}\" y=\"{}\" text-anchor=\"middle\" font-family=\"{}\" font-size=\"{}\" font-weight=\"bold\" fill=\"{}\">{}</text>",
            CANVAS_WIDTH / 2.0, PADDING / 2.0 + 4.0, FONT_FAMILY, TITLE_FONT_SIZE, AXIS_COLOR, escape_xml(title)
        ));
    }

    if let Some(x_label) = &ast.x_label {
        elements.push(format!(
            "  <text x=\"{}\" y=\"{}\" text-anchor=\"middle\" font-family=\"{}\" font-size=\"{}\" fill=\"{}\">{}</text>",
            PADDING + chart_width / 2.0, CANVAS_HEIGHT - 6.0, FONT_FAMILY, AXIS_LABEL_FONT_SIZE, AXIS_COLOR, escape_xml(x_label)
        ));
    }

    if let Some(y_label) = &ast.y_label {
        let y_label_x = 14.0;
        let y_label_y = PADDING + chart_height / 2.0;
        elements.push(format!(
            "  <text x=\"{}\" y=\"{}\" text-anchor=\"middle\" font-family=\"{}\" font-size=\"{}\" fill=\"{}\" transform=\"rotate(-90, {}, {})\">{}</text>",
            y_label_x, y_label_y, FONT_FAMILY, AXIS_LABEL_FONT_SIZE, AXIS_COLOR, y_label_x, y_label_y, escape_xml(y_label)
        ));
    }

    elements.push("</svg>".to_string());
    elements.join("\n")
}
