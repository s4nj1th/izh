import type { MDXComponents } from "mdx/types";

export function useMDXComponents(components: MDXComponents): MDXComponents {
    return {
        h1: ({ children }) => (
            <h1 className="text-3xl font-bold mb-6 text-text-primary">
                {children}
            </h1>
        ),
        h2: ({ children }) => (
            <h2 className="text-xl font-bold mt-10 mb-4 text-text-primary">
                {children}
            </h2>
        ),
        h3: ({ children }) => (
            <h3 className="text-lg font-bold mt-8 mb-2 text-text-primary">
                {children}
            </h3>
        ),
        p: ({ children }) => (
            <p className="mb-4 text-text-secondary leading-relaxed">
                {children}
            </p>
        ),
        ul: ({ children }) => (
            <ul className="mb-6 ml-6 list-disc space-y-2 text-text-secondary leading-relaxed">
                {children}
            </ul>
        ),
        ol: ({ children }) => (
            <ol className="mb-6 ml-6 list-decimal space-y-2 text-text-secondary leading-relaxed">
                {children}
            </ol>
        ),
        li: ({ children }) => <li className="pl-1">{children}</li>,
        code: ({ inline, className, children, ...props }) =>
            inline ? (
                <code
                    className="bg-panel-border/30 px-1.5 py-0.5 rounded-md text-text-primary font-mono text-[0.9em]"
                    {...props}
                >
                    {children}
                </code>
            ) : (
                <code className={className} {...props}>
                    {children}
                </code>
            ),
        pre: ({ children }) => (
            <pre className="text-text-primary bg-panel-bg border border-panel-border p-4 rounded-xl mb-6 overflow-x-auto font-mono text-sm shadow-sm">
                {children}
            </pre>
        ),
        table: ({ children }) => (
            <div className="overflow-x-auto mb-8 border border-panel-border rounded-xl">
                <table className="w-full text-left border-collapse">
                    {children}
                </table>
            </div>
        ),
        thead: ({ children }) => (
            <thead className="bg-panel-bg border-b border-panel-border">
                {children}
            </thead>
        ),
        th: ({ children }) => (
            <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-text-secondary">
                {children}
            </th>
        ),
        td: ({ children }) => (
            <td className="px-4 py-3 text-sm border-t border-panel-border text-text-secondary">
                {children}
            </td>
        ),
        blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-accent pl-4 italic text-text-secondary my-6">
                {children}
            </blockquote>
        ),
        ...components,
    };
}
