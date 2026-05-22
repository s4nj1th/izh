import Link from "next/link";
import { FaBook } from "react-icons/fa";
import Arrow from "@/components/Arrow";

const FEATURES = [
    {
        title: "Line-Based Syntax",
        desc: "Keep charts short, readable, and easy to generate or edit by hand.",
    },
    {
        title: "Arrays & Nulls",
        desc: "Use ranges, comprehensions, typed arrays, and null-fill strategies in one file.",
    },
    {
        title: "Browser SVGs",
        desc: "Render deterministic SVGs with palettes that work in docs, slides, and the browser.",
    },
];

export default function Home() {
    return (
        <div className="flex-1 flex flex-col items-center justify-center px-6 max-w-4xl mx-auto text-center space-y-12 py-20">
            <div className="space-y-4">
                <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
                    Simple charts. <br />
                    <span className="text-text-secondary">Zero friction.</span>
                </h1>
                <p className="text-lg text-text-secondary max-w-2xl mx-auto leading-relaxed">
                    VizLang is a compact chart description language that renders
                    deterministic SVGs in the browser. The docs cover syntax,
                    variables, arrays, null handling, and colors.
                </p>
            </div>

            <div className="flex gap-4">
                <Link
                    href="/docs/introduction"
                    className="px-8 py-3 border border-panel-border hover:bg-black/5 rounded-xl font-bold transition-all flex items-center gap-4 group"
                >
                    Documentation <FaBook size={18} />
                </Link>
                <Link
                    href="/editor"
                    className="px-8 py-3 bg-accent hover:bg-accent-hover text-white rounded-xl font-bold transition-all flex items-center gap-4 group"
                >
                    Open Editor <Arrow />
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full pt-12 border-t border-panel-border">
                {FEATURES.map((f) => (
                    <div key={f.title} className="space-y-2 text-center">
                        <h3 className="font-bold text-md uppercase tracking-wider">
                            {f.title}
                        </h3>
                        <p className="text-xs text-text-secondary leading-relaxed">
                            {f.desc}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}
