import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { FaBolt, FaArrowRight, FaExternalLinkAlt } from 'react-icons/fa';
import Layout from './components/Layout';
import Editor from './components/Editor';

function Home() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 max-w-4xl mx-auto text-center space-y-12 py-20">
      <div className="space-y-4"> 
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-text-primary">
          Simple charts. <br />
          <span className="text-text-secondary">Zero friction.</span>
        </h1>
        <p className="text-lg text-text-secondary max-w-2xl mx-auto leading-relaxed">
          VizLang is a minimal chart description language that renders to clean SVGs instantly. 
          Deterministic, LLM-friendly, and blazing fast.
        </p>
      </div>

      <div className="flex items-center gap-4">
        <Link 
          to="/editor" 
          className="px-8 py-3 bg-accent hover:bg-accent-hover text-white rounded-xl font-bold transition-all flex items-center gap-4 group"
        >
          Open Editor
          <FaArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
        </Link>
        <a 
          href="https://github.com/s4nj1th/vizlang" 
          target="_blank"
          className="px-8 py-3 border border-panel-border hover:bg-black/5 dark:hover:bg-white/5 rounded-xl font-bold transition-all flex items-center gap-4 group"
        >
          Documentation
          <FaExternalLinkAlt size={18} />
        </a>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full pt-12 border-t border-panel-border">
        <div className="space-y-2 text-center">
          <h3 className="font-bold text-md uppercase tracking-wider ">Minimal DSL</h3>
          <p className="text-xs text-text-secondary leading-relaxed">
            Human-readable syntax designed for speed and clarity. Perfect for AI generation.
          </p>
        </div>
        <div className="space-y-2 text-center">
          <h3 className="font-bold text-md uppercase tracking-wider ">WASM Performance</h3>
          <p className="text-xs text-text-secondary leading-relaxed">
            Rust-powered rendering engine runs entirely in your browser with no latency.
          </p>
        </div>
        <div className="space-y-2 text-center">
          <h3 className="font-bold text-md uppercase tracking-wider ">Clean SVGs</h3>
          <p className="text-xs text-text-secondary leading-relaxed">
            Lightweight, resolution-independent exports ready for any document or web page.
          </p>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/editor" element={<Editor />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
