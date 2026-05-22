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
        <div className="home-container">
            <div className="home-hero">
                <h1 className="home-title">
                    Simple charts. <br />
                    <span className="home-title-secondary">Zero friction.</span>
                </h1>
                <p className="home-description">
                    VaraiX is a compact chart description language that renders
                    deterministic SVGs in the browser. The docs cover syntax,
                    variables, arrays, null handling, and colors.
                </p>
            </div>

            <div className="home-button-group">
                <Link
                    href="/docs/introduction"
                    className="home-button-secondary group"
                >
                    Documentation <FaBook size={18} />
                </Link>
                <Link href="/editor" className="home-button-primary group">
                    Open Editor <Arrow />
                </Link>
            </div>

            <div className="home-features">
                {FEATURES.map((f) => (
                    <div key={f.title} className="home-feature-item">
                        <h3 className="home-feature-title">{f.title}</h3>
                        <p className="home-feature-desc">{f.desc}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
