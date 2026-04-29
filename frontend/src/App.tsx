import { useState, useEffect, useRef } from 'react';
import { Clipboard, Check, Terminal, Play, AlertCircle, Loader2 } from 'lucide-react';
import init, { parse_and_render } from 'vizlang';

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
Linux, 75
Windows, 15
MacOS, 5
Other, 5`,
};

function App() {
  const [code, setCode] = useState(EXAMPLES.line);
  const [svgOutput, setSvgOutput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isWasmLoaded, setIsWasmLoaded] = useState(false);
  const [copied, setCopied] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    init({ module_or_path: '/vizlang_bg.wasm' })
      .then(() => setIsWasmLoaded(true))
      .catch((err) => {
        console.error('Failed to load Wasm:', err);
        setError('Failed to load WebAssembly engine.');
      });
  }, []);

  useEffect(() => {
    if (!isWasmLoaded) return;
    
    if (code.trim() === '') {
      setSvgOutput('');
      setError(null);
      return;
    }

    try {
      const result = parse_and_render(code);
      setSvgOutput(result);
      setError(null);
    } catch (e: any) {
      setError(e.toString());
    }
  }, [code, isWasmLoaded]);

  const handleCopy = () => {
    if (svgOutput) {
      navigator.clipboard.writeText(svgOutput);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-bg-main text-text-primary overflow-hidden">
      <header className="h-16 flex items-center justify-between px-6 border-b border-panel-border bg-bg-main/80 backdrop-blur-md z-10">
        <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold tracking-tight">
              VizLang <span className="text-text-secondary font-normal">Studio</span>
            </h1>
          
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
            isWasmLoaded ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'
          }`}>
            <div className={`w-1.5 h-1.5 rounded-full ${isWasmLoaded ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
            {isWasmLoaded ? 'Engine Ready' : 'Loading Engine'}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={handleCopy}
            disabled={!svgOutput}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              copied 
                ? 'bg-gray-800 text-white border-gray-600' 
                : 'bg-accent hover:bg-accent-hover text-white disabled:opacity-50 disabled:cursor-not-allowed'
            }`}
          >
            {copied ? <Check size={16} /> : <Clipboard size={16} />}
            {copied ? 'Copied!' : 'Copy SVG'}
          </button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col border-r border-panel-border bg-[#14161a]">
          <div className="flex items-center justify-between px-4 py-2 border-b border-panel-border bg-black/20">
            <div className="flex items-center gap-2 text-xs font-medium text-text-secondary uppercase tracking-widest">
              <Terminal size={14} />
              Editor
            </div>
            <select 
              className="bg-panel-bg border border-panel-border rounded px-2 py-1 text-xs outline-none hover:bg-white/5 transition-colors cursor-pointer"
              onChange={(e) => setCode(EXAMPLES[e.target.value as keyof typeof EXAMPLES])}
            >
              <option value="line">Line Chart</option>
              <option value="bar">Bar Chart</option>
              <option value="scatter">Scatter Plot</option>
              <option value="pie">Pie Chart</option>
            </select>
          </div>
          
          <div className="flex-1 relative">
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full h-full bg-transparent p-6 font-mono text-sm leading-relaxed text-gray-300 outline-none resize-none selection:bg-accent/30"
              spellCheck={false}
            />
          </div>
        </div>

        <div className="flex-1 flex flex-col relative bg-[radial-gradient(circle_at_50%_50%,#1a1c23_0%,#0f1115_100%)]">
          <div className="flex items-center gap-2 px-4 py-2 border-b border-panel-border bg-black/20 text-xs font-medium text-text-secondary uppercase tracking-widest">
            <Play size={14} />
            Live Preview
          </div>

          <div className="flex-1 flex items-center justify-center p-12 overflow-auto">
            {!isWasmLoaded ? (
              <div className="flex flex-col items-center gap-4 text-text-secondary">
                <Loader2 className="animate-spin" size={32} />
                <p className="text-sm">Initializing engine...</p>
              </div>
            ) : svgOutput ? (
              <div 
                ref={previewRef}
                className="w-full h-full flex items-center justify-center transition-all duration-500 animate-in fade-in zoom-in-95"
                dangerouslySetInnerHTML={{ __html: svgOutput }}
              />
            ) : (
              <div className="text-text-secondary text-sm italic opacity-50">
                Start typing to generate a chart
              </div>
            )}
          </div>

          {error && (
            <div className="absolute bottom-6 left-6 right-6 p-4 rounded-xl bg-error-bg border border-error-text backdrop-blur-xl shadow-2xl animate-in slide-in-from-bottom-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="text-error-text mt-0.5" size={18} />
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-error-text mb-1 uppercase tracking-tight">Syntax Error</h3>
                  <p className="text-xs font-mono text-error-text/90 line-clamp-3">{error}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
