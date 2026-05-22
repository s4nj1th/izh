import Prism from "prismjs";

Prism.languages.varaix = {
    comment: [
        {
            pattern: /\/\/.*(?:\n|$)/,
            greedy: true,
            alias: "comment",
        },
        {
            pattern: /\/\*[\s\S]*?\*\//,
            greedy: true,
            alias: "comment",
        },
        {
            pattern: /#.*/,
            greedy: true,
            alias: "comment",
        },
    ],
    string: {
        pattern: /"(?:\\.|[^"\\])*"/,
        greedy: true,
        alias: "string",
    },
    range: {
        pattern: /\b\d+\.\.\d+\b/,
        alias: "number",
    },
    number: /\b\d+(?:\.\d+)?\b/,
    keyword:
        /\b(?:chart|data|null_fill|null|int|float|string|for|in|skip|zero|mean|average|prev|next|None)\b/,
    operator: /[+\-*/%=<>!]+/,
    punctuation: /[\[\]\(\)\{\},:]/,
    identifier: /\b[a-zA-Z_][a-zA-Z0-9_]*\b/,
};
