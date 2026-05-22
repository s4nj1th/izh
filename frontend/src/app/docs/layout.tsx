import Link from "next/link";

const sidebarItems = [
    { title: "Introduction", href: "/docs/introduction" },
    { title: "Basic Syntax", href: "/docs/syntax" },
    { title: "Variables & Math", href: "/docs/variables" },
    { title: "Chart Types", href: "/docs/charts" },
    { title: "Arrays", href: "/docs/arrays" },
    { title: "Nulls", href: "/docs/nulls" },
    { title: "Colors", href: "/docs/colors" },
    { title: "Recipes", href: "/docs/recipes" },
];

export default function DocsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="docs-layout">
            {/* Sidebar */}
            <aside className="docs-sidebar">
                <div className="docs-sidebar-header">
                    <div className="docs-sidebar-title">Documentation</div>
                    <nav className="docs-sidebar-nav">
                        {sidebarItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className="docs-sidebar-link"
                            >
                                {item.title}
                            </Link>
                        ))}
                    </nav>
                </div>
            </aside>

            {/* Content */}
            <main className="docs-main">
                <div className="docs-content">{children}</div>
            </main>
        </div>
    );
}
