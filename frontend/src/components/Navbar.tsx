"use client";

import Link from "next/link";
import { FaGithub, FaSun, FaMoon } from "react-icons/fa";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import Image from "next/image";

export default function Navbar() {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    return (
        <nav className="h-14 flex items-center justify-between px-6 border-b border-panel-border bg-bg-main/80 backdrop-blur-md sticky top-0 z-50">
            <Link
                href="/"
                className="flex items-center gap-2 text-lg font-bold hover:text-accent transition-all"
            >
                <div className="relative w-6 h-6">
                    <Image
                        src="/favicon-light.svg"
                        alt="Logo"
                        width={24}
                        height={24}
                        className="dark:hidden"
                        priority
                    />
                    <Image
                        src="/favicon-dark.svg"
                        alt="Logo"
                        width={24}
                        height={24}
                        className="hidden dark:block"
                        priority
                    />
                </div>
                VizLang
            </Link>

            <div className="flex items-center gap-2 text-sm font-medium text-text-secondary">
                <Link
                    href="/editor"
                    className="px-3 py-1 hover:text-text-primary transition-colors"
                >
                    Editor
                </Link>
                <Link
                    href="/docs/introduction"
                    className="px-3 py-1 hover:text-text-primary transition-colors"
                >
                    Docs
                </Link>
                <div className="w-px h-4 bg-panel-border mx-1" />
                <button
                    onClick={() =>
                        setTheme(theme === "dark" ? "light" : "dark")
                    }
                    className="p-2 hover:text-text-primary transition-all"
                >
                    {mounted &&
                        (theme === "dark" ? (
                            <FaSun size={16} />
                        ) : (
                            <FaMoon size={16} />
                        ))}
                </button>
                <a
                    href="https://github.com/s4nj1th/vizlang"
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 hover:text-text-primary transition-all"
                >
                    <FaGithub size={18} />
                </a>
            </div>
        </nav>
    );
}
