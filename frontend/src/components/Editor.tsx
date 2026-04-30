import { useState, useEffect, useRef } from "react";
import {
  FaClipboard,
  FaCheck,
  FaTerminal,
  FaPlay,
  FaExclamationCircle,
  FaCircleNotch,
  FaDownload,
} from "react-icons/fa";
import init, { parse_and_render } from "vizlang";

const EXAMPLES = {
  line: `# Monthly Revenue
chart: line
title: Monthly Revenue
x: month
y: revenue ($k)
data:
Jan, 12
Feb, 19
Mar, 15
Apr, 25
May, 22
Jun, 30
Jul, 28
Aug, 35`,
  bar: `# Quarterly Sales
chart: bar
title: Q4 Regional Sales
x: region
y: units sold
data:
North, 150
South, 85
East, 120
West, 195`,
  scatter: `# Height vs Weight
chart: scatter
title: Player Demographics
x: height (cm)
y: weight (kg)
data:
170, 65
172, 68
175, 74
178, 71
180, 80`,
  pie: `# Server Operating Systems
chart: pie
title: Server Operating Systems
data:
Linux, 72
Windows, 10
MacOS, 2
Other, 6
`,
};

export default function Editor() {
  const [code, setCode] = useState(EXAMPLES.line);
  const [svgOutput, setSvgOutput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isWasmLoaded, setIsWasmLoaded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [fileName, setFileName] = useState("line-chart");
  const previewRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    init({ module_or_path: "/vizlang_bg.wasm" })
      .then(() => setIsWasmLoaded(true))
      .catch((err: unknown) => {
        console.error("Failed to load Wasm:", err);
        setError("Failed to load WebAssembly engine.");
      });
  }, []);

  useEffect(() => {
    if (!isWasmLoaded) return;

    if (code.trim() === "") {
      setTimeout(() => {
        setSvgOutput("");
        setError(null);
      }, 0);
      return;
    }

    try {
      const result = parse_and_render(code);
      setTimeout(() => {
        setSvgOutput(result);
        setError(null);
      }, 0);
    } catch (e: unknown) {
      setTimeout(() => setError(String(e)), 0);
    }
  }, [code, isWasmLoaded]);

  const handleCopy = () => {
    if (svgOutput) {
      navigator.clipboard.writeText(svgOutput);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileName}.vizl`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadSvg = () => {
    if (svgOutput) {
      const blob = new Blob([svgOutput], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${fileName}.svg`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleScroll = () => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  const lineCount = code.split("\n").length;

  return (
    <div className="flex flex-col h-full bg-bg-main text-text-primary overflow-hidden">
      <main className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col border-r border-panel-border bg-panel-bg">
          <div className="h-10 flex items-center justify-between px-4 border-b border-panel-border bg-black/5 dark:bg-black/20">
            <div className="flex items-center gap-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest">
              <FaTerminal size={12} />
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={fileName}
                  onChange={(e) =>
                    setFileName(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ""))
                  }
                  className="bg-transparent border-b border-panel-border/50 hover:border-panel-border focus:border-accent text-[12px] font-mono text-text-secondary focus:text-text-primary px-1 transition-all outline-none w-36 text-right"
                  placeholder="filename"
                />
                <span>.vizl</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <select
                className="bg-bg-main border border-panel-border rounded px-2 py-0.5 text-[10px] outline-none hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                onChange={(e) => {
                  const val = e.target.value as keyof typeof EXAMPLES;
                  setCode(EXAMPLES[val]);
                  setFileName(`${val}-chart`);
                }}
              >
                <option value="line">Line Chart</option>
                <option value="bar">Bar Chart</option>
                <option value="scatter">Scatter Plot</option>
                <option value="pie">Pie Chart</option>
              </select>
              <button
                onClick={handleDownload}
                className="text-text-secondary hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/5 rounded transition-all"
                title="Download .vizl"
              >
                <FaDownload size={14} />
              </button>
            </div>
          </div>

          <div className="flex-1 relative flex overflow-hidden">
            <div
              ref={lineNumbersRef}
              className="w-10 bg-black/5 dark:bg-black/30 text-right pr-3 py-4 font-mono text-xs leading-relaxed text-text-secondary select-none overflow-hidden opacity-50"
            >
              {Array.from({ length: lineCount }).map((_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>
            <textarea
              ref={textareaRef}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onScroll={handleScroll}
              className="flex-1 bg-transparent p-4 font-mono text-xs leading-relaxed text-text-primary outline-none resize-none selection:bg-accent/30 overflow-auto whitespace-pre"
              spellCheck={false}
            />
          </div>
        </div>

        <div className="flex-1 flex flex-col relative bg-bg-main">
          <div className="h-10 flex items-center justify-between px-4 border-b border-panel-border bg-black/5 dark:bg-black/20 text-[10px] font-bold text-text-secondary uppercase tracking-widest">
            <div className="flex items-center gap-2">
              <FaPlay size={12} />
              Preview
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadSvg}
                disabled={!svgOutput}
                className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold transition-all uppercase tracking-wider border border-panel-border hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-30"
              >
                <FaDownload size={10} />
                SVG
              </button>

              <button
                onClick={handleCopy}
                disabled={!svgOutput}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold transition-all uppercase tracking-wider border ${
                  copied
                    ? "text-green-500 border-green-500"
                    : "text-accent border-accent/30 hover:bg-accent/5"
                } disabled:opacity-30`}
              >
                {copied ? <FaCheck size={10} /> : <FaClipboard size={10} />}
                {copied ? "Copied" : "Copy SVG"}
              </button>
            </div>
          </div>

          <div className="flex-1 flex items-center justify-center p-8 overflow-auto bg-white">
            {!isWasmLoaded ? (
              <div className="flex flex-col items-center gap-4 text-text-secondary">
                <FaCircleNotch className="animate-spin" size={24} />
                <p className="text-xs uppercase tracking-widest">
                  Initializing...
                </p>
              </div>
            ) : svgOutput ? (
              <div
                ref={previewRef}
                className="w-full h-full flex items-center justify-center animate-in fade-in duration-300"
                dangerouslySetInnerHTML={{ __html: svgOutput }}
              />
            ) : (
              <div className="text-text-secondary text-[10px] uppercase tracking-widest opacity-30">
                Waiting for input
              </div>
            )}
          </div>

          {error && (
            <div className="absolute bottom-4 left-4 right-4 p-3 rounded border border-red-500/50 bg-red-500/10 text-red-500 backdrop-blur-sm animate-in slide-in-from-bottom-2">
              <div className="flex items-start gap-2">
                <FaExclamationCircle size={14} className="mt-0.5" />
                <div className="flex-1 overflow-hidden">
                  <h3 className="text-[10px] font-bold uppercase tracking-tight mb-1">
                    Error
                  </h3>
                  <p className="text-[10px] font-mono leading-tight wrap-break-word">
                    {error}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
