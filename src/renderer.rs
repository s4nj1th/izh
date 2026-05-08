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
const PIE_COLORS: &[&str] = &[
    "#4a90d9", "#f06292", "#4db6ac", "#ffb74d", "#9575cd", "#81c784", "#ff8a65", "#a1887f",
    "#ee9cb6", "#4fc3f7", "#4db6ac", "#80cbc4",
];
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

    let null_fill = ast.null_fill.as_deref().unwrap_or("zero");
    let non_null_vals: Vec<f64> = ast.data.iter().filter_map(|d| d.y).collect();
    let mean_value = if non_null_vals.is_empty() {
        0.0
    } else {
        non_null_vals.iter().copied().sum::<f64>() / (non_null_vals.len() as f64)
    };

    let default_palette: Vec<String> = PIE_COLORS.iter().map(|s| s.to_string()).collect();
    let palette: Vec<String> = match &ast.colors {
        Some(v) if !v.is_empty() => v.clone(),
        _ => default_palette,
    };

    let mut filled_data: Vec<(XValue, f64)> = Vec::new();
    for (i, d) in ast.data.iter().enumerate() {
        match d.y {
            Some(v) => filled_data.push((d.x.clone(), v)),
            None => match null_fill {
                "zero" => filled_data.push((d.x.clone(), 0.0)),
                "mean" | "average" => filled_data.push((d.x.clone(), mean_value)),
                "prev" | "previous" => {
                    if let Some((_, prev_v)) = filled_data.last() {
                        filled_data.push((d.x.clone(), *prev_v));
                    } else {
                        filled_data.push((d.x.clone(), 0.0));
                    }
                }
                "next" | "forward" => {
                    let mut found = None;
                    for j in (i + 1)..ast.data.len() {
                        if let Some(nv) = ast.data[j].y {
                            found = Some(nv);
                            break;
                        }
                    }
                    if let Some(nv) = found {
                        filled_data.push((d.x.clone(), nv));
                    } else {
                        filled_data.push((d.x.clone(), 0.0));
                    }
                }
                "skip" => {}
                _ => {
                    filled_data.push((d.x.clone(), 0.0));
                }
            },
        }
    }

    if filled_data.is_empty() {
        return format!(
            "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"{}\" height=\"{}\" viewBox=\"0 0 {} {}\"></svg>",
            CANVAS_WIDTH, CANVAS_HEIGHT, CANVAS_WIDTH, CANVAS_HEIGHT
        );
    }

    let y_data_min = 0.0;
    let max_y = filled_data
        .iter()
        .map(|(_, y)| *y)
        .fold(f64::NEG_INFINITY, f64::max);
    let y_data_max = compute_nice_max(if max_y.is_finite() { max_y } else { 0.0 });

    let all_x_numeric = filled_data
        .iter()
        .all(|(x, _)| matches!(x, XValue::Number(_)));

    let mut x_data_min = 0.0;
    let mut x_data_max = 0.0;
    if all_x_numeric {
        x_data_min = filled_data
            .iter()
            .map(|(x, _)| if let XValue::Number(n) = x { *n } else { 0.0 })
            .fold(f64::INFINITY, f64::min);
        x_data_max = filled_data
            .iter()
            .map(|(x, _)| if let XValue::Number(n) = x { *n } else { 0.0 })
            .fold(f64::NEG_INFINITY, f64::max);
    }

    let to_pixel_x = |data_index: usize| -> f64 {
        if all_x_numeric {
            if x_data_max == x_data_min {
                return PADDING + chart_width / 2.0;
            }
            let val = if let XValue::Number(n) = &filled_data[data_index].0 {
                *n
            } else {
                0.0
            };
            let ratio = (val - x_data_min) / (x_data_max - x_data_min);
            round(PADDING + ratio * chart_width)
        } else {
            if filled_data.len() <= 1 {
                return PADDING + chart_width / 2.0;
            }
            round(PADDING + (data_index as f64 / (filled_data.len() - 1) as f64) * chart_width)
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
        let slot_width = chart_width / (filled_data.len() as f64);
        round(PADDING + (data_index as f64) * slot_width + (slot_width * BAR_GAP_RATIO) / 2.0)
    };

    let bar_pixel_width =
        || -> f64 { round((chart_width / (filled_data.len() as f64)) * (1.0 - BAR_GAP_RATIO)) };

    let mut elements = Vec::new();

    elements.push(format!(
        "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"{}\" height=\"{}\" viewBox=\"0 0 {} {}\">",
        CANVAS_WIDTH, CANVAS_HEIGHT, CANVAS_WIDTH, CANVAS_HEIGHT
    ));

    elements.push(format!(
        "  <rect width=\"{}\" height=\"{}\" fill=\"{}\" />",
        CANVAS_WIDTH, CANVAS_HEIGHT, BACKGROUND_COLOR
    ));

    if ast.chart_type != ChartType::Pie && ast.chart_type != ChartType::Heatmap {
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
            PADDING,
            PADDING + chart_height,
            PADDING + chart_width,
            PADDING + chart_height,
            AXIS_COLOR
        ));

        elements.push(format!(
            "  <line x1=\"{}\" y1=\"{}\" x2=\"{}\" y2=\"{}\" stroke=\"{}\" stroke-width=\"1\" />",
            PADDING,
            PADDING,
            PADDING,
            PADDING + chart_height,
            AXIS_COLOR
        ));
    }

    match ast.chart_type {
        ChartType::Line => {
            if !filled_data.is_empty() {
                let path_commands: Vec<String> = filled_data
                    .iter()
                    .enumerate()
                    .map(|(i, (_x, y))| {
                        let px = to_pixel_x(i);
                        let py = to_pixel_y(*y);
                        if i == 0 {
                            format!("M {} {}", px, py)
                        } else {
                            format!("L {} {}", px, py)
                        }
                    })
                    .collect();

                let stroke_color = palette
                    .get(0)
                    .cloned()
                    .unwrap_or_else(|| DATA_COLOR.to_string());
                elements.push(format!(
                    "  <path d=\"{}\" fill=\"none\" stroke=\"{}\" stroke-width=\"{}\" stroke-linecap=\"round\" stroke-linejoin=\"round\" />",
                    path_commands.join(" "), stroke_color, LINE_STROKE_WIDTH
                ));

                for i in 0..filled_data.len() {
                    let dot_color = palette
                        .get(i % palette.len())
                        .cloned()
                        .unwrap_or_else(|| DATA_COLOR.to_string());
                    elements.push(format!(
                        "  <circle cx=\"{}\" cy=\"{}\" r=\"{}\" fill=\"{}\" />",
                        to_pixel_x(i),
                        to_pixel_y(filled_data[i].1),
                        LINE_DOT_RADIUS,
                        dot_color
                    ));
                }
            }
        }
        ChartType::Bar => {
            let bar_width = bar_pixel_width();
            let baseline_y = to_pixel_y(0.0);

            for i in 0..filled_data.len() {
                let bar_x = bar_left_edge(i);
                let bar_top = to_pixel_y(filled_data[i].1);
                let bar_height = baseline_y - bar_top;
                let bar_color = palette
                    .get(i % palette.len())
                    .cloned()
                    .unwrap_or_else(|| DATA_COLOR.to_string());

                elements.push(format!(
                    "  <rect x=\"{}\" y=\"{}\" width=\"{}\" height=\"{}\" fill=\"{}\" rx=\"2\" />",
                    bar_x, bar_top, bar_width, bar_height, bar_color
                ));
            }
        }
        ChartType::Scatter => {
            for i in 0..filled_data.len() {
                elements.push(format!(
                    "  <circle cx=\"{}\" cy=\"{}\" r=\"{}\" fill=\"{}\" opacity=\"0.8\" />",
                    to_pixel_x(i),
                    to_pixel_y(filled_data[i].1),
                    SCATTER_DOT_RADIUS,
                    DATA_COLOR
                ));
            }
        }
        ChartType::Pie => {
            let legend_width = 120.0;
            let pie_area_width = chart_width - legend_width;
            let cx = PADDING + pie_area_width / 2.0;
            let cy = PADDING + chart_height / 2.0;
            let r = f64::min(pie_area_width, chart_height) / 2.0;

            let total: f64 = filled_data.iter().map(|(_, y)| *y).sum();
            let mut current_angle: f64 = -std::f64::consts::FRAC_PI_2;

            for (i, (_x, y)) in filled_data.iter().enumerate() {
                let color = palette
                    .get(i % palette.len())
                    .cloned()
                    .unwrap_or_else(|| PIE_COLORS[i % PIE_COLORS.len()].to_string());

                if *y == total {
                    elements.push(format!(
                        "  <circle cx=\"{:.2}\" cy=\"{:.2}\" r=\"{:.2}\" fill=\"{}\" />",
                        cx, cy, r, color
                    ));
                    continue;
                }

                let slice_angle = (*y / total) * 2.0 * std::f64::consts::PI;
                let end_angle = current_angle + slice_angle;

                let x1 = cx + r * current_angle.cos();
                let y1 = cy + r * current_angle.sin();
                let x2 = cx + r * end_angle.cos();
                let y2 = cy + r * end_angle.sin();

                let large_arc_flag = if slice_angle > std::f64::consts::PI {
                    1
                } else {
                    0
                };

                elements.push(format!(
                    "  <path d=\"M {:.2} {:.2} L {:.2} {:.2} A {:.2} {:.2} 0 {} 1 {:.2} {:.2} Z\" fill=\"{}\" stroke=\"#ffffff\" stroke-width=\"1\" />",
                    cx, cy, x1, y1, r, r, large_arc_flag, x2, y2, color
                ));

                current_angle = end_angle;
            }

            let legend_x = PADDING + pie_area_width + 20.0;
            let mut legend_y = PADDING + 20.0;
            for (i, (x, y)) in filled_data.iter().enumerate() {
                let color = palette
                    .get(i % palette.len())
                    .cloned()
                    .unwrap_or_else(|| PIE_COLORS[i % PIE_COLORS.len()].to_string());
                let label = match x {
                    XValue::String(s) => escape_xml(s),
                    XValue::Number(n) => escape_xml(&n.to_string()),
                };

                elements.push(format!(
                    "  <rect x=\"{:.2}\" y=\"{:.2}\" width=\"12\" height=\"12\" fill=\"{}\" />",
                    legend_x,
                    legend_y - 10.0,
                    color
                ));
                elements.push(format!(
                    "  <text x=\"{:.2}\" y=\"{:.2}\" text-anchor=\"start\" font-family=\"{}\" font-size=\"{}\" fill=\"{}\">{}: {} ({:.2}%)</text>",
                    legend_x + 20.0, legend_y, FONT_FAMILY, TICK_LABEL_FONT_SIZE, AXIS_COLOR, label, y, (y / total) * 100.0
                ));
                legend_y += 20.0;
            }
        }
        ChartType::Histogram => {
            // Extract y-values for histogramming
            let values: Vec<f64> = filled_data.iter().map(|(_, y)| *y).collect();
            if values.is_empty() {
                // No data to histogram
            } else {
                let min_val = values.iter().cloned().fold(f64::INFINITY, f64::min);
                let max_val = values.iter().cloned().fold(f64::NEG_INFINITY, f64::max);
                
                let num_bins = ast.histogram_bins.unwrap_or(10);
                let bin_width = if max_val > min_val {
                    (max_val - min_val) / (num_bins as f64)
                } else {
                    1.0
                };
                
                // Create bins
                let mut bins: Vec<usize> = vec![0; num_bins];
                for &val in &values {
                    if max_val > min_val {
                        let bin_idx = ((val - min_val) / bin_width) as usize;
                        let bin_idx = if bin_idx >= num_bins { num_bins - 1 } else { bin_idx };
                        bins[bin_idx] += 1;
                    }
                }
                
                let max_freq = bins.iter().cloned().fold(0, usize::max) as f64;
                let nice_max_freq = compute_nice_max(max_freq);
                
                // Draw histogram bars
                let bar_width = CANVAS_WIDTH - PADDING * 2.0;
                let bar_width_unit = bar_width / (num_bins as f64);
                let baseline_y = to_pixel_y(0.0);
                
                for (i, &freq) in bins.iter().enumerate() {
                    let bar_x = PADDING + (i as f64) * bar_width_unit;
                    let bar_height_data = (freq as f64) / nice_max_freq * (y_data_max - y_data_min);
                    let bar_top = to_pixel_y(bar_height_data);
                    let bar_h = baseline_y - bar_top;
                    
                    elements.push(format!(
                        "  <rect x=\"{}\" y=\"{}\" width=\"{}\" height=\"{}\" fill=\"{}\" rx=\"1\" />",
                        bar_x, bar_top, bar_width_unit * 0.9, bar_h, DATA_COLOR
                    ));
                }
            }
        }
        ChartType::Heatmap => {
            // Treat data as intensity map: x-axis categories, y-values as intensity
            // Create a gradient-based visualization
            let max_val = filled_data
                .iter()
                .map(|(_, y)| *y)
                .fold(f64::NEG_INFINITY, f64::max);
            let min_val = filled_data
                .iter()
                .map(|(_, y)| *y)
                .fold(f64::INFINITY, f64::min);
            
            let bar_width = chart_width / (filled_data.len() as f64);
            let cell_height = chart_height / 5.0; // Create multiple rows
            
            for (i, (_x, y)) in filled_data.iter().enumerate() {
                // Normalize value to 0-1 range for color intensity
                let intensity = if max_val > min_val {
                    (y - min_val) / (max_val - min_val)
                } else {
                    0.5
                };
                
                // Create color gradient (blue to red)
                let (r, g, b) = if intensity < 0.5 {
                    let t = intensity * 2.0; // 0 to 1
                    let blue = (1.0 - t) * 255.0;
                    let green = t * 255.0;
                    (0, green as u8, blue as u8)
                } else {
                    let t = (intensity - 0.5) * 2.0; // 0 to 1
                    let green = (1.0 - t) * 255.0;
                    let red = 255;
                    (red, green as u8, 0)
                };
                
                let color = format!("#{:02x}{:02x}{:02x}", r, g, b);
                
                // Draw cells for this data point
                for row in 0..5 {
                    let cell_x = PADDING + (i as f64) * bar_width;
                    let cell_y = PADDING + (row as f64) * cell_height;
                    
                    elements.push(format!(
                        "  <rect x=\"{}\" y=\"{}\" width=\"{}\" height=\"{}\" fill=\"{}\" stroke=\"#cccccc\" stroke-width=\"0.5\" />",
                        cell_x, cell_y, bar_width * 0.95, cell_height, color
                    ));
                }
            }
        }
    }

    if ast.chart_type != ChartType::Pie && ast.chart_type != ChartType::Heatmap {
        let x_tick_y = PADDING + chart_height + 16.0;
        for i in 0..filled_data.len() {
            let tick_x = match ast.chart_type {
                ChartType::Bar => bar_left_edge(i) + bar_pixel_width() / 2.0,
                _ => to_pixel_x(i),
            };

            let label = match &filled_data[i].0 {
                XValue::String(s) => escape_xml(s),
                XValue::Number(n) => escape_xml(&n.to_string()),
            };

            elements.push(format!(
                "  <text x=\"{}\" y=\"{}\" text-anchor=\"middle\" font-family=\"{}\" font-size=\"{}\" fill=\"{}\">{}</text>",
                tick_x, x_tick_y, FONT_FAMILY, TICK_LABEL_FONT_SIZE, AXIS_COLOR, label
            ));
        }
    }

    if let Some(title) = &ast.title {
        elements.push(format!(
            "  <text x=\"{}\" y=\"{}\" text-anchor=\"middle\" font-family=\"{}\" font-size=\"{}\" font-weight=\"bold\" fill=\"{}\">{}</text>",
            CANVAS_WIDTH / 2.0, PADDING / 2.0 + 4.0, FONT_FAMILY, TITLE_FONT_SIZE, AXIS_COLOR, escape_xml(title)
        ));
    }

    if ast.chart_type != ChartType::Pie && ast.chart_type != ChartType::Heatmap {
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
    }

    elements.push("</svg>".to_string());
    elements.join("\n")
}
