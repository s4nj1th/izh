"use client";

import { IoCopy, IoCheckmark, IoWarning } from "react-icons/io5";
import { useClipboard } from "@/lib/useClipboard";

interface CodeBlockProps {
    children: React.ReactNode;
    className?: string;
}

export default function CodeBlock({ children, className }: CodeBlockProps) {
    const { copy, status } = useClipboard();

    const extractText = (node: React.ReactNode): string => {
        if (typeof node === "string") {
            return node;
        }
        if (Array.isArray(node)) {
            return node.map(extractText).join("");
        }
        if (node && typeof node === "object" && "props" in node) {
            const props = (node as any).props;
            return extractText(props.children);
        }
        return "";
    };

    const handleCopy = () => {
        const text = extractText(children);
        void copy(text);
    };

    return (
        <div className="mdx-code-block-wrapper">
            <button
                type="button"
                onClick={handleCopy}
                className="mdx-code-copy-btn"
                aria-label={status === "error" ? "Copy failed" : status === "copied" ? "Code copied" : "Copy code"}
                title={status === "error" ? "Clipboard access failed" : status === "copied" ? "Copied!" : "Copy code"}
            >
                {status === "copied" ? (
                    <div className="mdx-code-copy-content mdx-code-copied">
                        <IoCheckmark size={12} />
                        <span>Copied!</span>
                    </div>
                ) : status === "error" ? (
                    <div className="mdx-code-copy-content mdx-code-copy-error">
                        <IoWarning size={12} />
                        <span>Copy failed</span>
                    </div>
                ) : (
                    <div className="mdx-code-copy-content">
                        <IoCopy size={12} />
                        <span>Copy</span>
                    </div>
                )}
            </button>
            <span className="sr-only" role="status" aria-live="polite">
                {status === "error" ? "Could not copy code. Check clipboard permissions." : status === "copied" ? "Code copied to clipboard." : ""}
            </span>
            <pre className={`mdx-code-block ${className || ""}`}>
                <code>{children}</code>
            </pre>
        </div>
    );
}
