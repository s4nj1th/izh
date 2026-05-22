import type { MDXComponents } from "mdx/types";

export function useMDXComponents(components: MDXComponents): MDXComponents {
    return {
        h1: ({ children }) => <h1 className="mdx-h1">{children}</h1>,
        h2: ({ children }) => <h2 className="mdx-h2">{children}</h2>,
        h3: ({ children }) => <h3 className="mdx-h3">{children}</h3>,
        p: ({ children }) => <p className="mdx-paragraph">{children}</p>,
        ul: ({ children }) => (
            <ul className="mdx-unordered-list">{children}</ul>
        ),
        ol: ({ children }) => <ol className="mdx-ordered-list">{children}</ol>,
        li: ({ children }) => <li className="mdx-list-item">{children}</li>,
        code: ({ inline, className, children, ...props }) =>
            inline ? (
                <code className="mdx-inline-code" {...props}>
                    {children}
                </code>
            ) : (
                <code className={className} {...props}>
                    {children}
                </code>
            ),
        pre: ({ children }) => <pre className="mdx-code-block">{children}</pre>,
        table: ({ children }) => (
            <div className="mdx-table-wrapper">
                <table className="mdx-table">{children}</table>
            </div>
        ),
        thead: ({ children }) => (
            <thead className="mdx-table-head">{children}</thead>
        ),
        th: ({ children }) => <th className="mdx-table-header">{children}</th>,
        td: ({ children }) => <td className="mdx-table-data">{children}</td>,
        blockquote: ({ children }) => (
            <blockquote className="mdx-blockquote">{children}</blockquote>
        ),
        ...components,
    };
}
