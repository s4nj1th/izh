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
    const activeTheme = mounted ? theme : "light";

    return (
        <nav className="navbar">
            <Link href="/" className="navbar-logo">
                <div className="navbar-logo-image">
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
                Izh
            </Link>

            <div className="navbar-links">
                <Link href="/editor" className="navbar-link">
                    Editor
                </Link>
                <Link href="/docs/introduction" className="navbar-link">
                    Docs
                </Link>
                <div className="navbar-divider" />
                <button
                    type="button"
                    aria-label={activeTheme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
                    title={activeTheme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
                    onClick={() =>
                        setTheme(activeTheme === "dark" ? "light" : "dark")
                    }
                    className="navbar-button"
                >
                    {mounted &&
                        (activeTheme === "dark" ? (
                            <FaSun size={16} />
                        ) : (
                            <FaMoon size={16} />
                        ))}
                </button>
                <a
                    href="https://github.com/s4nj1th/izh"
                    target="_blank"
                    rel="noreferrer"
                    className="navbar-button"
                    aria-label="Open Izh on GitHub"
                    title="GitHub"
                >
                    <FaGithub size={18} />
                </a>
            </div>
        </nav>
    );
}
