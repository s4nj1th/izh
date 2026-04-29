#[derive(Debug, Clone, PartialEq)]
pub enum ChartType {
    Line,
    Bar,
    Scatter,
    Pie,
}

#[derive(Debug, Clone, PartialEq)]
pub enum XValue {
    String(String),
    Number(f64),
}

impl std::fmt::Display for XValue {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            XValue::String(s) => write!(f, "{}", s),
            XValue::Number(n) => write!(f, "{}", n),
        }
    }
}

#[derive(Debug, Clone, PartialEq)]
pub struct DataPoint {
    pub x: XValue,
    pub y: f64,
}

#[derive(Debug, Clone, PartialEq)]
pub struct VizAST {
    pub chart_type: ChartType,
    pub title: Option<String>,
    pub x_label: Option<String>,
    pub y_label: Option<String>,
    pub data: Vec<DataPoint>,
}
