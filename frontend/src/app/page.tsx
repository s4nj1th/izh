"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FaArrowDown, FaArrowRight, FaBolt, FaCheck, FaCode, FaCopy, FaFileCode, FaGithub, FaLayerGroup, FaMagic } from "react-icons/fa";
import init, { parse_and_render } from "izh";

const demos = {
    line: {
        label: "Line",
        code: `chart: line\ntitle: Monthly growth\nx: month\ny: active users\n\ndata:\n"Jan", 18\n"Feb", 26\n"Mar", 23\n"Apr", 38\n"May", 34\n"Jun", 52`,
    },
    bar: {
        label: "Bar",
        code: `chart: bar\ntitle: Quarterly signups\nx: quarter\ny: new accounts\n\ndata:\n"Q1", 32\n"Q2", 48\n"Q3", 41\n"Q4", 68`,
    },
    array: {
        label: "Arrays",
        code: `chart: line\ntitle: Weekly activity\nx: day\ny: sessions\n\nint[] sessions = [18, 26, 23, 38, 34, 52]\nstring[] days = ["M", "T", "W", "T", "F", "S"]\ndata: combine(days, sessions)`,
    },
};

type DemoKey = keyof typeof demos;

export default function Home() {
    const [active, setActive] = useState<DemoKey>("line");
    const [copied, setCopied] = useState(false);
    const [engineReady, setEngineReady] = useState(false);
    const [engineError, setEngineError] = useState(false);
    const [previewSvg, setPreviewSvg] = useState("");
    const demo = demos[active];

    useEffect(() => {
        let cancelled = false;
        init({ module_or_path: "/izh_bg.wasm" })
            .then(() => { if (!cancelled) setEngineReady(true); })
            .catch(() => { if (!cancelled) setEngineError(true); });
        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        if (!engineReady) return;
        try {
            setPreviewSvg(parse_and_render(demo.code));
            setEngineError(false);
        } catch {
            setPreviewSvg("");
            setEngineError(true);
        }
    }, [demo.code, engineReady]);

    async function copyCode() {
        try { await navigator.clipboard.writeText(demo.code); setCopied(true); window.setTimeout(() => setCopied(false), 1600); } catch { setCopied(false); }
    }

    return <main className="home-shell">
        <section className="landing-hero">
            <div className="hero-orbit hero-orbit-one" /><div className="hero-orbit hero-orbit-two" />
            <div className="hero-copy">
                <div className="eyebrow"><span className="eyebrow-dot" /> OPEN SOURCE · RUST + WEBASSEMBLY</div>
                <h1>Charts from text.<br /><span>Beautiful by design.</span></h1>
                <p className="hero-lede">Meet Izh: a tiny, expressive language that turns a few lines of data into crisp, deterministic SVG charts. No charting setup. Just describe what you want.</p>
                <div className="hero-actions">
                    <Link href="/editor" className="cta-primary">Try the live editor <FaArrowRight size={15} /></Link>
                    <Link href="/docs/introduction" className="cta-secondary">Explore the language <FaArrowDown size={13} /></Link>
                </div>
                <div className="hero-proof"><span><FaBolt size={13} /> Instant browser preview</span><i /><span><FaCode size={14} /> Plain-text source</span><i /><span><FaCheck size={13} /> Export-ready SVG</span></div>
            </div>
            <div className="showcase-wrap">
                <div className="showcase-glow" />
                <div className="showcase-card">
                    <div className="showcase-top"><div className="window-dots"><i /><i /><i /></div><span className="showcase-label"><span className={engineError ? "engine-status-dot error" : engineReady ? "engine-status-dot" : "engine-status-dot loading"} /> IZH WASM RENDERER</span><span className="wasm-mark">REAL SVG</span></div>
                    <div className="showcase-tabs" role="tablist" aria-label="Choose a chart example">
                        {(Object.keys(demos) as DemoKey[]).map((key) => <button key={key} type="button" role="tab" tabIndex={active === key ? 0 : -1} aria-selected={active === key} className={active === key ? "showcase-tab active" : "showcase-tab"} onClick={() => setActive(key)} onKeyDown={(event) => {
                            if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
                            event.preventDefault();
                            const keys = Object.keys(demos) as DemoKey[];
                            const step = event.key === "ArrowRight" ? 1 : -1;
                            const next = keys[(keys.indexOf(key) + step + keys.length) % keys.length];
                            setActive(next);
                            document.getElementById(`demo-tab-${next}`)?.focus();
                        }} id={`demo-tab-${key}`}>{demos[key].label}</button>)}
                    </div>
                    <div className="showcase-body">
                        <div className="code-pane"><div className="pane-heading"><FaFileCode size={13} /> example.izh <button onClick={copyCode} aria-label="Copy example code">{copied ? <FaCheck size={13} /> : <FaCopy size={13} />}</button></div><pre key={active}>{demo.code.split("\n").map((line, i) => <span className={line.trim().startsWith("//") ? "code-comment" : line.includes(":") ? "code-key" : line.includes("=") ? "code-value" : ""} key={i}><b>{String(i + 1).padStart(2, "0")}</b>{line || " "}{"\n"}</span>)}</pre></div>
                        <div className="preview-pane"><div className="pane-heading"><span className={engineError ? "render-status error" : engineReady ? "render-status" : "render-status loading"} /> SVG FROM THE ENGINE</div><div className="engine-preview" aria-live="polite" key={active}>
                            {previewSvg ? <img className="engine-chart-image" src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(previewSvg)}`} alt={`${demo.label} chart rendered by Izh`} /> : <span className="engine-preview-message">{engineError ? "Preview unavailable. Open the editor to try this example." : "Loading the Izh renderer…"}</span>}
                        </div><div className="preview-caption"><span>{previewSvg ? "Rendered by Izh in your browser" : "Powered by Rust + WebAssembly"}</span><span>SVG · Scales cleanly</span></div></div>
                    </div>
                    <div className="showcase-foot"><span><span className="live-pulse" /> Choose an example to render with Izh</span><span>RUST · WEBASSEMBLY · SVG</span></div>
                </div>
                <div className="float-note"><FaMagic size={14} /> Minimal syntax. Maximum signal.</div>
            </div>
            <a href="#why-izh" className="scroll-cue" aria-label="Scroll to discover"><span /></a>
        </section>

        <section className="intro-strip" id="why-izh"><div className="intro-inner"><div><span className="section-kicker">A DIFFERENT KIND OF CHART TOOL</span><h2>Describe the chart.<br /><span>Skip the machinery.</span></h2></div><p>Most charting starts with a pile of setup. Izh starts with the picture in your head. Write readable, line-by-line instructions, then get precise vector graphics you can use anywhere.</p></div></section>

        <section className="feature-section"><div className="feature-heading"><span className="section-kicker">SMALL LANGUAGE. BIG RANGE.</span><h2>Everything you need to<br />go from data to <span>done.</span></h2></div>
            <div className="feature-grid">
                <article className="feature-card feature-card-spotlight"><div className="feature-icon"><FaCode size={18} /></div><span className="feature-index">01 — THE LANGUAGE</span><h3>Write charts like you think</h3><p>A compact, human-readable DSL keeps chart definitions short, reviewable, and easy to generate with AI or edit by hand.</p><div className="feature-chip-row"><span>Readable</span><span>LLM-friendly</span><span>Commentable</span></div></article>
                <article className="feature-card"><div className="feature-icon"><FaBolt size={18} /></div><span className="feature-index">02 — THE ENGINE</span><h3>Predictable down to the pixel</h3><p>Rust-powered rendering gives you deterministic output. The WebAssembly engine runs locally in the browser, with no server round trip.</p><div className="feature-inline"><span className="engine-pip" /> Rust core <i /> WebAssembly <i /> Browser-native</div></article>
                <article className="feature-card"><div className="feature-icon"><FaLayerGroup size={18} /></div><span className="feature-index">03 — THE DATA</span><h3>Work with data your way</h3><p>Use inline rows or arrays. Shape values with typed arrays, ranges, comprehensions, variables, and null-fill strategies.</p><div className="feature-chip-row"><span>Arrays</span><span>Ranges</span><span>Null handling</span></div></article>
                <article className="feature-card"><div className="feature-icon"><FaCode size={18} /></div><span className="feature-index">04 — THE OUTPUT</span><h3>Take your chart anywhere</h3><p>Clean SVG stays sharp at any size and drops neatly into websites, documentation, reports, and presentations.</p><div className="feature-inline"><span className="svg-badge">SVG</span> Crisp at every scale</div></article>
            </div>
        </section>

        <section className="closing-cta"><div className="closing-spark"><FaMagic size={17} /></div><span className="section-kicker">YOUR FIRST CHART IS A FEW LINES AWAY</span><h2>Curious what a little text<br />can <span>turn into?</span></h2><p>Open the editor. Change a value. Watch it become a chart.</p><Link href="/editor" className="cta-primary">Make your first chart <FaArrowRight size={15} /></Link><div className="closing-links"><Link href="/docs/introduction">Read the getting started guide</Link><span>·</span><a href="https://github.com/s4nj1th/izh" target="_blank" rel="noreferrer"><FaGithub size={13} /> View on GitHub</a></div></section>
        <footer className="landing-footer"><Link href="/" className="footer-brand"><span className="brand-glyph">i</span> izh</Link><span>Small descriptions. Beautiful, deterministic charts.</span><Link href="/docs/introduction">Documentation <FaArrowRight size={11} /></Link></footer>
    </main>;
}
