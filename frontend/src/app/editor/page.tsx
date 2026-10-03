"use client";

import { Fragment, useState, useEffect, useRef, useCallback } from "react";
import {
    FaClipboard,
    FaCheck,
    FaTerminal,
    FaExclamationCircle,
    FaCircleNotch,
    FaDownload,
    FaFileCode,
    FaExternalLinkAlt,
    FaEye,
} from "react-icons/fa";
import init, { parse_and_render } from "izh";
import { EXAMPLES } from "@/data/examples";
import EditorInput from "react-simple-code-editor";
import Prism from "prismjs";
import "prismjs/components/prism-clike";
import "@/lib/prism-izh";
import { useClipboard } from "@/lib/useClipboard";

function getDiagnostic(error: string | null) {
    if (!error) return { line: null as number | null, message: "", details: "" };

    const normalized = error.replace(/^Error:\s*/, "");
    const match = normalized.match(/Izh Error(?: \[line (\d+)\])?:\s*([\s\S]*)/);
    if (!match) return { line: null, message: normalized, details: normalized };

    const line = match[1] ? Number(match[1]) : null;
    const details = match[2].trim();
    const message = details.split(/\r?\n\s*→/)[0].trim();
    return { line: line && line > 0 ? line : null, message, details: normalized };
}

function renderHighlightedLines(stream: Prism.TokenStream): React.ReactNode[][] {
    const lines: React.ReactNode[][] = [[]];
    const tokens = Array.isArray(stream) ? stream : [stream];

    for (const [tokenIndex, token] of tokens.entries()) {
        if (typeof token === "string") {
            const parts = token.split("\n");
            lines[lines.length - 1].push(parts[0]);
            for (const part of parts.slice(1)) {
                lines.push([part]);
            }
            continue;
        }

        const tokenLines = renderHighlightedLines(token.content);
        const aliases = Array.isArray(token.alias) ? token.alias.join(" ") : token.alias;
        const className = ["token", token.type, aliases].filter(Boolean).join(" ");

        tokenLines.forEach((children, lineIndex) => {
            lines[lines.length - 1].push(
                <span key={`${tokenIndex}-${lineIndex}`} className={className}>
                    {children}
                </span>,
            );
            if (lineIndex < tokenLines.length - 1) lines.push([]);
        });
    }

    return lines;
}

export default function Editor() {
    const [code, setCode] = useState(EXAMPLES.line);
    const [svgOutput, setSvgOutput] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isWasmLoaded, setIsWasmLoaded] = useState(false);
    const [isRendering, setIsRendering] = useState(false);
    const [fileName, setFileName] = useState("my-chart");
    const [leftWidth, setLeftWidth] = useState(50); // percentage
    const [isResizing, setIsResizing] = useState(false);
    const { copy: copyToClipboard, status: clipboardStatus } = useClipboard();

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const lineNumbersRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [examplesOpen, setExamplesOpen] = useState(false);
    const examplesRef = useRef<HTMLDivElement | null>(null);
    const diagnostic = getDiagnostic(error);

    useEffect(() => {
        init({ module_or_path: "/izh_bg.wasm" })
            .then(() => setIsWasmLoaded(true))
            .catch((err) => {
                console.error(err);
                setError("Engine failed to load.");
            });
    }, []);

    useEffect(() => {
        if (!isWasmLoaded) return;

        setIsRendering(true);
        const timeout = window.setTimeout(() => {
            if (!code.trim()) {
                setSvgOutput("");
                setError(null);
                setIsRendering(false);
                return;
            }

            try {
                setSvgOutput(parse_and_render(code));
                setError(null);
            } catch (e) {
                setSvgOutput("");
                setError(String(e));
            } finally {
                setIsRendering(false);
            }
        }, 140);

        return () => window.clearTimeout(timeout);
    }, [code, isWasmLoaded]);

    const startResizing = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        setIsResizing(true);
    }, []);

    const stopResizing = useCallback(() => {
        setIsResizing(false);
    }, []);

    const resize = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        if (!isResizing || !containerRef.current) return;
        const containerRect = containerRef.current.getBoundingClientRect();
        const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
        setLeftWidth(Math.min(80, Math.max(20, newWidth)));
    }, [isResizing]);

    const handleResizeKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        const step = e.shiftKey ? 5 : 1;
        if (e.key === "ArrowLeft") setLeftWidth((width) => Math.max(20, width - step));
        else if (e.key === "ArrowRight") setLeftWidth((width) => Math.min(80, width + step));
        else if (e.key === "Home") setLeftWidth(20);
        else if (e.key === "End") setLeftWidth(80);
        else return;
        e.preventDefault();
    };

    useEffect(() => {
        const ta = document.getElementById(
            "izh-editor",
        ) as HTMLTextAreaElement | null;
        if (!ta) return;
        textareaRef.current = ta;
        const handler = () => {
            if (textareaRef.current && lineNumbersRef.current) {
                lineNumbersRef.current.scrollTop =
                    textareaRef.current.scrollTop;
            }
        };
        ta.addEventListener("scroll", handler);
        return () => ta.removeEventListener("scroll", handler);
    }, []);

    // Close examples dropdown when clicking outside
    useEffect(() => {
        const onClick = (e: MouseEvent) => {
            if (
                examplesRef.current &&
                !examplesRef.current.contains(e.target as Node)
            ) {
                setExamplesOpen(false);
            }
        };
        document.addEventListener("click", onClick);
        return () => document.removeEventListener("click", onClick);
    }, []);

    const download = (content: string, ext: string) => {
        const blob = new Blob([content], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${fileName}.${ext}`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div
            ref={containerRef}
            style={{ "--editor-width": `${leftWidth}%` } as React.CSSProperties}
            className="editor-container"
        >
            <div className="editor-left-panel editor-left-panel-responsive">
                <div className="editor-header">
                    <div className="editor-header-left">
                        <FaFileCode size={14} className="editor-file-icon" />
                        <div className="editor-filename-group">
                            <input
                                type="text"
                                aria-label="Chart file name"
                                value={fileName}
                                onChange={(e) => setFileName(e.target.value)}
                                className="editor-filename-input"
                            />
                            <span className="editor-filename-ext">.izh</span>
                        </div>
                    </div>
                    <div className="editor-header-right">
                        <div ref={examplesRef} className="example-dropdown">
                            <button
                                type="button"
                                className="example-dropdown-btn"
                                aria-label="Choose an example chart"
                                onClick={() => setExamplesOpen((s) => !s)}
                                aria-haspopup="listbox"
                                aria-expanded={examplesOpen}
                            >
                                Examples
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth={2}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <polyline points="6 9 12 15 18 9" />
                                </svg>
                            </button>

                            {examplesOpen && (
                                <div
                                    className="example-dropdown-list"
                                    role="listbox"
                                >
                                    {Object.keys(EXAMPLES).map((k) => (
                                        <div
                                            key={k}
                                            role="option"
                                            tabIndex={0}
                                            className="example-dropdown-item"
                                            onClick={() => {
                                                setCode(
                                                    EXAMPLES[
                                                        k as keyof typeof EXAMPLES
                                                    ],
                                                );
                                                setError(null);
                                                setFileName(`${k}-chart`);
                                                setExamplesOpen(false);
                                            }}
                                            onKeyDown={(e) => {
                                                if (
                                                    e.key === "Enter" ||
                                                    e.key === " "
                                                ) {
                                                    setCode(
                                                        EXAMPLES[
                                                            k as keyof typeof EXAMPLES
                                                        ],
                                                    );
                                                    setError(null);
                                                    setFileName(`${k}-chart`);
                                                    setExamplesOpen(false);
                                                }
                                            }}
                                        >
                                            {k}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="editor-input-wrapper group">
                    <label className="sr-only" htmlFor="izh-editor">Izh chart source</label>
                    <EditorInput
                        value={code}
                        onValueChange={(val) => {
                            setCode(val);
                            setError(null);
                        }}
                        highlight={(source) => renderHighlightedLines(
                            Prism.tokenize(source, Prism.languages.izh),
                        ).map((line, index, lines) => (
                            <Fragment key={index}>
                                <span className={diagnostic.line === index + 1 ? "editor-error-line" : undefined}>
                                    {line.length ? line : " "}
                                </span>
                                {index < lines.length - 1 ? "\n" : ""}
                            </Fragment>
                        ))}
                        padding={16}
                        textareaId="izh-editor"
                        preClassName="code-editor-layer"
                        textareaClassName="code-editor-layer code-editor-textarea"
                        className="editor-input"
                    />

                    <button
                        type="button"
                        onClick={() => download(code, "izh")}
                        className="editor-download-button"
                        aria-label="Download .izh source"
                        title="Download .izh source"
                    >
                        <FaDownload size={14} />
                    </button>
                </div>
            </div>

            <div
                role="separator"
                aria-orientation="vertical"
                aria-label="Resize code and preview panels"
                aria-valuemin={20}
                aria-valuemax={80}
                aria-valuenow={Math.round(leftWidth)}
                aria-valuetext={`Editor ${Math.round(leftWidth)} percent, preview ${100 - Math.round(leftWidth)} percent`}
                tabIndex={0}
                onPointerDown={startResizing}
                onPointerMove={resize}
                onPointerUp={stopResizing}
                onPointerCancel={stopResizing}
                onKeyDown={handleResizeKeyDown}
                className={`editor-resizer ${isResizing ? "editor-resizer-bg-active" : "editor-resizer-bg-inactive"}`}
            >
                <div className="editor-resizer-handle" />
            </div>

            <div className="editor-right-panel editor-right-panel-responsive">
                <div className="preview-header">
                    <div className="preview-header-left">
                        <FaEye size={12} className="preview-icon" />
                        Preview
                    </div>
                    <div className="preview-header-right">
                        <button
                            type="button"
                            onClick={() => void copyToClipboard(svgOutput)}
                            disabled={!svgOutput || isRendering}
                            className="preview-button"
                            title={clipboardStatus === "error" ? "Clipboard access failed" : clipboardStatus === "copied" ? "SVG copied" : "Copy SVG"}
                            aria-label={clipboardStatus === "error" ? "Copy SVG failed" : clipboardStatus === "copied" ? "SVG copied" : "Copy SVG"}
                        >
                            {clipboardStatus === "error" ? (
                                <FaExclamationCircle size={14} className="preview-button-error" />
                            ) : clipboardStatus === "copied" ? (
                                <FaCheck
                                    size={14}
                                    className="preview-button-check"
                                />
                            ) : (
                                <FaClipboard size={14} />
                            )}
                        </button>
                        <span className="sr-only" role="status" aria-live="polite">
                            {clipboardStatus === "error" ? "Could not copy SVG. Check clipboard permissions." : clipboardStatus === "copied" ? "SVG copied to clipboard." : ""}
                        </span>

                        <button
                            type="button"
                            onClick={() => {
                                if (!svgOutput) return;
                                const blob = new Blob([svgOutput], {
                                    type: "image/svg+xml",
                                });
                                const url = URL.createObjectURL(blob);
                                window.open(url, "_blank");
                                setTimeout(
                                    () => URL.revokeObjectURL(url),
                                    2000,
                                );
                            }}
                            disabled={!svgOutput || isRendering}
                            className="preview-button"
                            title="Open SVG in new tab"
                            aria-label="Open SVG in a new tab"
                        >
                            <FaExternalLinkAlt size={14} />
                        </button>

                        <button
                            type="button"
                            onClick={() => download(svgOutput, "svg")}
                            disabled={!svgOutput || isRendering}
                            className="preview-button"
                            title="Download SVG"
                            aria-label="Download SVG"
                        >
                            <FaDownload size={14} />
                        </button>
                    </div>
                </div>

                <div className="preview-content">
                    {error ? (
                        <div className="preview-error" role="alert">
                            <FaExclamationCircle size={28} className="preview-error-icon" aria-hidden="true" />
                            <div className="preview-error-content">
                                <p className="preview-error-location">
                                    {diagnostic.line ? `Problem on line ${diagnostic.line}` : "Chart could not be rendered"}
                                </p>
                                <p className="preview-error-text">{diagnostic.message}</p>
                                <details className="preview-error-details">
                                    <summary>Show parser details</summary>
                                    <pre>{diagnostic.details}</pre>
                                </details>
                            </div>
                        </div>
                    ) : isRendering ? (
                        <div className="preview-loading" role="status" aria-live="polite">
                            <FaCircleNotch size={32} className="animate-spin" />
                            <span className="preview-loading-text">Updating preview...</span>
                        </div>
                    ) : svgOutput ? (
                        <div
                            className="preview-svg-output"
                            dangerouslySetInnerHTML={{ __html: svgOutput }}
                        />
                    ) : (
                        <div className="preview-loading">
                            {!isWasmLoaded ? (
                                <FaCircleNotch
                                    size={40}
                                    className="animate-spin"
                                />
                            ) : (
                                <FaTerminal size={40} />
                            )}
                            <span className="preview-loading-text">
                                {!isWasmLoaded
                                    ? "Initializing Engine..."
                                    : "Waiting for code..."}
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
