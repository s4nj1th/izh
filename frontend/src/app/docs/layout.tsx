import Link from "next/link";

const sidebarItems = [
    { title: "Introduction", href: "/docs/introduction" },
    { title: "Basic Syntax", href: "/docs/syntax" },
    { title: "Variables & Math", href: "/docs/variables" },
    { title: "Chart Types", href: "/docs/charts" },
    { title: "Arrays", href: "/docs/arrays" },
    { title: "Nulls", href: "/docs/nulls" },
    { title: "Colors", href: "/docs/colors" },
];

export default function DocsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex-1 flex overflow-hidden">
            {/* Sidebar */}
            <aside className="w-64 border-r border-panel-border bg-panel-bg hidden md:flex flex-col">
                <div className="p-6">
                    <div className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-4">
                        Documentation
                    </div>
                    <nav className="space-y-1">
                        {sidebarItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className="block px-3 py-2 rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/5 transition-all"
                            >
                                {item.title}
                            </Link>
                        ))}
                    </nav>
                </div>
            </aside>

            {/* Content */}
            <main className="flex-1 overflow-auto bg-bg-main">
                <div className="max-w-3xl mx-auto px-6 py-12 md:py-20">
                    {children}
                </div>
            </main>
        </div>
    );
}
