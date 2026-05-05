"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  FaClipboard,
  FaCheck,
  FaTerminal,
  FaExclamationCircle,
  FaCircleNotch,
  FaDownload,
  FaEye,
  FaFileCode,
} from "react-icons/fa";
import init, { parse_and_render } from "vizlang";
import { EXAMPLES } from "@/data/examples";

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

  useEffect(() => {
    init({ module_or_path: "/vizlang_bg.wasm" })
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
        const containerRect = containerRef.current.getBoundingClientRect();
        const newWidth =
          ((e.clientX - containerRect.left) / containerRect.width) * 100;
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
      className="flex-1 flex overflow-hidden bg-bg-main relative select-none"
    >
      <div
        style={{ width: `${leftWidth}%` }}
        className="flex flex-col border-r border-panel-border bg-panel-bg h-full transition-[width] duration-0"
      >
        <div className="h-10 flex items-center justify-between px-4 border-b border-panel-border bg-black/5 dark:bg-black/20">
          <div className="flex items-center gap-3">
            <FaFileCode size={14} className="text-text-secondary" />
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                className="bg-transparent border-b border-panel-border/50 text-[12px] font-mono outline-none w-32 focus:border-accent transition-colors"
              />
              <span className="text-[10px] font-mono text-text-secondary">
                .vizl
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <select
              className="bg-transparent border-none text-[10px] font-bold uppercase tracking-widest text-text-secondary outline-none cursor-pointer hover:text-accent transition-colors"
              onChange={(e) => {
                const val = e.target.value as keyof typeof EXAMPLES;
                setCode(EXAMPLES[val]);
                setFileName(`${val}-chart`);
              }}
            >
              {Object.keys(EXAMPLES).map((k) => (
                <option key={k} value={k} className="bg-bg-main">
                  {k}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden relative group">
          <div
            ref={lineNumbersRef}
            className="w-12 bg-black/5 text-right pr-3 pt-4 pb-4 font-mono text-xs text-text-secondary opacity-50 select-none overflow-hidden"
          >
            {code.split("\n").map((_, i) => (
              <div key={i} className="h-5 leading-5 text-[10px]">
                {i + 1}
              </div>
            ))}
          </div>

          {/* textarea with wrapping turned off so visual lines match logical lines */}
          <textarea
            ref={textareaRef}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onScroll={() => {
              if (textareaRef.current && lineNumbersRef.current) {
                lineNumbersRef.current.scrollTop =
                  textareaRef.current.scrollTop;
              }
            }}
            wrap="off"
            spellCheck={false}
            className="flex-1 bg-transparent p-4 font-mono text-xs leading-5 outline-none resize-none overflow-auto selection:bg-accent/20 whitespace-pre"
            aria-label="Editor"
          />

          <button
            onClick={() => download(code, "vizl")}
            className="absolute bottom-4 right-6 p-2 rounded-full bg-accent text-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
            title="Download VizL"
          >
            <FaDownload size={14} />
          </button>
        </div>
      </div>

      <div
        onMouseDown={startResizing}
        className={`w-1 cursor-col-resize hover:bg-accent active:bg-accent transition-colors flex items-center justify-center z-10 ${isResizing ? "bg-accent" : "bg-transparent"}`}
      >
        <div className="w-[1px] h-8 bg-panel-border" />
      </div>

      <div
        style={{ width: `${100 - leftWidth}%` }}
        className="flex flex-col bg-bg-main h-full"
      >
        <div className="h-10 flex items-center justify-between px-4 border-b border-panel-border bg-black/5 dark:bg-black/20 text-[10px] font-bold text-text-secondary uppercase tracking-widest">
          <div className="flex items-center gap-2">
            <FaEye size={12} className="text-accent" />
            Preview
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                navigator.clipboard.writeText(svgOutput);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              disabled={!svgOutput}
              className="p-1.5 hover:bg-black/5 dark:hover:bg-white/5 rounded transition-all disabled:opacity-30"
              title="Copy SVG"
            >
              {copied ? (
                <FaCheck size={14} className="text-green-500" />
              ) : (
                <FaClipboard size={14} />
              )}
            </button>
            <button
              onClick={() => download(svgOutput, "svg")}
              disabled={!svgOutput}
              className="p-1.5 hover:bg-black/5 dark:hover:bg-white/5 rounded transition-all disabled:opacity-30"
              title="Download SVG"
            >
              <FaDownload size={14} />
            </button>
          </div>
        </div>

        <div className="flex-1 p-8 flex items-center justify-center relative overflow-auto">
          {error ? (
            <div className="bg-red-500/5 p-6 rounded-2xl border border-red-500/10 max-w-md animate-in fade-in zoom-in duration-300">
              <FaExclamationCircle
                size={32}
                className="text-red-500/50 mb-4 mx-auto"
              />
              <pre className="text-xs font-mono text-red-500 whitespace-pre-wrap">
                {error}
              </pre>
            </div>
          ) : svgOutput ? (
            <div
              className="w-full h-full flex items-center justify-center transition-all duration-700 animate-in fade-in zoom-in-95 bg-white rounded-xl shadow-2xl p-4"
              dangerouslySetInnerHTML={{ __html: svgOutput }}
            />
          ) : (
            <div className="flex flex-col items-center gap-3 text-text-secondary/20">
              {!isWasmLoaded ? (
                <FaCircleNotch size={40} className="animate-spin" />
              ) : (
                <FaTerminal size={40} />
              )}
              <span className="text-[10px] font-bold uppercase tracking-widest">
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
