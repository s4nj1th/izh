"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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

export default function Editor() {
    const [code, setCode] = useState(EXAMPLES.line);
    const [svgOutput, setSvgOutput] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isWasmLoaded, setIsWasmLoaded] = useState(false);
    const [fileName, setFileName] = useState("my-chart");
    const [copied, setCopied] = useState(false);
    const [leftWidth, setLeftWidth] = useState(50); // percentage
    const [isResizing, setIsResizing] = useState(false);

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const lineNumbersRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [selectedExample, setSelectedExample] = useState<string>(
        Object.keys(EXAMPLES)[0],
    );
    const [examplesOpen, setExamplesOpen] = useState(false);
    const examplesRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        init({ module_or_path: "/izh_bg.wasm" })
            .then(() => setIsWasmLoaded(true))
            .catch((err) => {
                console.error(err);
                setError("Engine failed to load.");
            });
    }, []);

    useEffect(() => {
        if (!isWasmLoaded || !code.trim()) return setSvgOutput("");
        try {
            setSvgOutput(parse_and_render(code));
            setError(null);
        } catch (e) {
            setError(String(e));
        }
    }, [code, isWasmLoaded]);

    const startResizing = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizing(true);
    }, []);

    const stopResizing = useCallback(() => {
        setIsResizing(false);
    }, []);

    const resize = useCallback(
        (e: MouseEvent) => {
            if (isResizing && containerRef.current) {
                const containerRect =
                    containerRef.current.getBoundingClientRect();
                const newWidth =
                    ((e.clientX - containerRect.left) / containerRect.width) *
                    100;
                if (newWidth > 20 && newWidth < 80) {
                    setLeftWidth(newWidth);
                }
            }
        },
        [isResizing],
    );

    useEffect(() => {
        window.addEventListener("mousemove", resize);
        window.addEventListener("mouseup", stopResizing);
        return () => {
            window.removeEventListener("mousemove", resize);
            window.removeEventListener("mouseup", stopResizing);
        };
    }, [resize, stopResizing]);

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
                                                setSelectedExample(k);
                                                setCode(
                                                    EXAMPLES[
                                                        k as keyof typeof EXAMPLES
                                                    ],
                                                );
                                                setFileName(`${k}-chart`);
                                                setExamplesOpen(false);
                                            }}
                                            onKeyDown={(e) => {
                                                if (
                                                    e.key === "Enter" ||
                                                    e.key === " "
                                                ) {
                                                    setSelectedExample(k);
                                                    setCode(
                                                        EXAMPLES[
                                                            k as keyof typeof EXAMPLES
                                                        ],
                                                    );
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
                    <EditorInput
                        value={code}
                        onValueChange={(val) => setCode(val)}
                        highlight={(code) =>
                            Prism.highlight(code, Prism.languages.izh, "izh")
                        }
                        padding={16}
                        textareaId="izh-editor"
                        preClassName="code-editor-layer"
                        textareaClassName="code-editor-layer code-editor-textarea"
                        className="editor-input"
                    />

                    <button
                        onClick={() => download(code, "vizl")}
                        className="editor-download-button"
                        title="Download VizL"
                    >
                        <FaDownload size={14} />
                    </button>
                </div>
            </div>

            <div
                onMouseDown={startResizing}
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
                            onClick={() => {
                                navigator.clipboard.writeText(svgOutput);
                                setCopied(true);
                                setTimeout(() => setCopied(false), 2000);
                            }}
                            disabled={!svgOutput}
                            className="preview-button"
                            title="Copy SVG"
                        >
                            {copied ? (
                                <FaCheck
                                    size={14}
                                    className="preview-button-check"
                                />
                            ) : (
                                <FaClipboard size={14} />
                            )}
                        </button>

                        <button
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
                            disabled={!svgOutput}
                            className="preview-button"
                            title="Open SVG in new tab"
                        >
                            <FaExternalLinkAlt size={14} />
                        </button>

                        <button
                            onClick={() => download(svgOutput, "svg")}
                            disabled={!svgOutput}
                            className="preview-button"
                            title="Download SVG"
                        >
                            <FaDownload size={14} />
                        </button>
                    </div>
                </div>

                <div className="preview-content">
                    {error ? (
                        <div className="preview-error">
                            <FaExclamationCircle
                                size={32}
                                className="preview-error-icon"
                            />
                            <pre className="preview-error-text">{error}</pre>
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
