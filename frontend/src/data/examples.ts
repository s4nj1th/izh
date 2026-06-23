export const EXAMPLES = {
    line: `// Line chart example
chart: line
title: Monthly Revenue

x: month
y: revenue ($k)

data:
"Jan", 12
"Feb", 19
"Mar", 15
"Apr", 22
"May", 28
"Jun", 25
"Jul", 30
"Aug", 34
"Sep", 31
"Oct", 38
"Nov", 42
"Dec", 48`,

    bar: `// Bar chart example
chart: bar
title: Quarterly Sales

x: quarter
y: units sold

data:
"Q1", 340
"Q2", 520
"Q3", 480
"Q4", 610`,

    scatter: `// Scatter plot example
chart: scatter
title: Height vs Weight

x: height (cm)
y: weight (kg)

data:
155, 52
160, 58
165, 62
168, 65
170, 68
172, 70
175, 74
178, 78
180, 80
183, 85
185, 88
190, 92`,

    pie: `// Pie chart example
chart: pie
title: Server Operating Systems

data:
"Linux", 72
"Windows", 10
"MacOS", 2
"Other", 6`,

    variables: `// Variables, Arrays and Nulls example
chart: bar
title: Budget Analysis

// Variable definitions
total_budget = 1000
marketing_pct = 0.3
dev_pct = 0.5
ops_pct = 0.2

// Calculated amounts
marketing_amt = total_budget * marketing_pct
dev_amt = total_budget * dev_pct
ops_amt = total_budget * ops_pct

// Example array-of-pairs with a null contingency value
myData = [["Marketing", marketing_amt], ["Development", dev_amt], ["Operations", ops_amt], ["Contingency", null]]

// Fill nulls with zero (could be mean, prev, next, skip)
null_fill: zero

data: myData`,

    types: `// Typed Variables and Arrays example
chart: line

// Typed variable definitions
string my_title = "Revenue " + "Forecast"
title: my_title

// Typed fixed-size arrays
string[] months = ["Jan", "Feb", "Mar"]
int[] sales = [500, 625, 781]

// Build data as an inline array-of-pairs using the arrays above (expanded manually here)
myData = combine(months, sales)

data: myData`,

    null_zero: `// Nulls filled with zero
chart: line
title: Nulls filled with zero

x: month
y: value

// array-of-pairs with a null entry
myData = [["Jan", 10], ["Feb", null], ["Mar", 20], ["Apr", 25]]
null_fill: zero

data: myData`,

    null_mean: `// Nulls filled with mean
chart: line
title: Nulls filled with mean

x: month
y: value

myData = [["Jan", 10], ["Feb", null], ["Mar", 20], ["Apr", 40]]
null_fill: mean

data: myData`,

    null_prev: `// Nulls filled with previous value
chart: line
title: Nulls filled with previous (prev)

x: month
y: value

myData = [["Jan", 5], ["Feb", null], ["Mar", 15], ["Apr", null], ["May", 25]]
null_fill: prev

data: myData`,

    null_next: `// Nulls filled with next value
chart: line
title: Nulls filled with next (forward)

x: month
y: value

myData = [["Jan", null], ["Feb", 8], ["Mar", null], ["Apr", 20]]
null_fill: next

data: myData`,

    null_skip: `// Nulls skipped (dropped)
chart: line
title: Nulls skipped (skip)

x: month
y: value

myData = [["Jan", 100], ["Feb", null], ["Mar", 120], ["Apr", null], ["May", 130]]
null_fill: skip

data: myData`,

    block_style: `// Block-style data (no inline arrays)
chart: bar
title: Quarterly Revenue (block-style)

x: quarter
y: revenue

data:
"Q1", 120
"Q2", 150
"Q3", 170
"Q4", 200`,

    range_example: `// Range and typed arrays
chart: bar
title: Yearly Counts from Range

// Generate an integer range (inclusive)
years = [2018..2025]
int[] counts = [10, 20, 30, 25, 35, 28, 30, 45]

// Build pairs manually (fixed-size array-of-pairs)
myData = combine(years, counts)

data: myData`,

    combine: `// Combine two arrays into paired data
chart: scatter
title: Temperature vs Humidity

x: temperature (°C)
y: humidity (%)

// Two separate arrays combined into pairs
temps = [15, 18, 20, 22, 25, 28, 30, 32]
humidity = [45, 52, 58, 65, 72, 78, 82, 88]

// Use combine() to pair them: [[15, 45], [18, 52], ..., [32, 88]]
paired_data = combine(temps, humidity)

data: paired_data`,
};
