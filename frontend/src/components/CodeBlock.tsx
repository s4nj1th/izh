"use client";

import { useState } from "react";
import { IoCopy, IoCheckmark } from "react-icons/io5";

interface CodeBlockProps {
    children: React.ReactNode;
    className?: string;
}

export default function CodeBlock({ children, className }: CodeBlockProps) {
    const [copied, setCopied] = useState(false);

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

    const handleCopy = async () => {
        const text = extractText(children);
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error("Failed to copy:", err);
        }
    };

    return (
        <div className="mdx-code-block-wrapper">
            <button
                onClick={handleCopy}
                className="mdx-code-copy-btn"
                aria-label="Copy code"
                title={copied ? "Copied!" : "Copy code"}
            >
                {copied ? (
                    <div className="mdx-code-copy-content mdx-code-copied">
                        <IoCheckmark size={12} />
                        <span>Copied!</span>
                    </div>
                ) : (
                    <div className="mdx-code-copy-content">
                        <IoCopy size={12} />
                        <span>Copy</span>
                    </div>
                )}
            </button>
            <pre className={`mdx-code-block ${className || ""}`}>
                <code>{children}</code>
            </pre>
        </div>
    );
}
