export const EXAMPLES = {
  line: `# Monthly Revenue\nchart: line\ntitle: Monthly Revenue\nx: month\ny: revenue ($k)\ndata:\n"Jan", 12\n"Feb", 19\n"Mar", 15\n"Apr", 25\n"May", 22\n"Jun", 30\n"Jul", 28\n"Aug", 35`,
  bar: `# Quarterly Sales\nchart: bar\ntitle: Q4 Regional Sales\nx: region\ny: units sold\ndata:\n"North", 150\n"South", 85\n"East", 120\n"West", 195`,
  scatter: `# Height vs Weight\nchart: scatter\ntitle: Player Demographics\nx: height (cm)\ny: weight (kg)\ndata:\n170, 65\n172, 68\n175, 74\n178, 71\n180, 80`,
  pie: `# Server Operating Systems\nchart: pie\ntitle: Server Operating Systems\ndata:\n"Linux", 72\n"Windows", 10\n"MacOS", 2\n"Other", 6`,
  variables: `# Budget Analysis\nchart: bar\ntitle: Budget Analysis\n\ntotal_budget = 1000\nmarketing_pct = 0.3\ndev_pct = 0.5\nops_pct = 0.2\n\nmarketing_amt = total_budget * marketing_pct\ndev_amt = total_budget * dev_pct\nops_amt = total_budget * ops_pct\n\ndata:\n"Marketing", marketing_amt\n"Development", dev_amt\n"Operations", ops_amt\n"Contingency", total_budget - (marketing_amt + dev_amt + ops_amt) + 50`,
  types: `# Typed Variables\nchart: line\nstring my_title = "Revenue " + "Forecast"\ntitle: my_title\n\nint base = 500\nfloat rate = 1.25\n\ndata:\n"Jan", base\n"Feb", base * rate\n"Mar", base * rate * rate`,
};
