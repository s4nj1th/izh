"use client";

import { useState } from "react";
import Link from "next/link";
import { IoMenu, IoClose } from "react-icons/io5";

interface SidebarItem {
    title: string;
    href: string;
}

export default function MobileSidebar({ items }: { items: SidebarItem[] }) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            {/* Mobile Menu Button */}
            <button
                className="docs-mobile-menu-btn"
                onClick={() => setIsOpen(!isOpen)}
                aria-label="Toggle menu"
            >
                {isOpen ? <IoClose size={20} /> : <IoMenu size={20} />}
            </button>

            {/* Overlay */}
            {isOpen && (
                <div
                    className="docs-mobile-overlay"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Floating Sidebar */}
            <div
                className={`docs-mobile-sidebar ${
                    isOpen ? "docs-mobile-sidebar-open" : ""
                }`}
            >
                <div className="docs-mobile-sidebar-content">
                    <div className="docs-mobile-sidebar-header">
                        <div className="docs-mobile-sidebar-title">
                            Documentation
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="docs-mobile-close-btn"
                            aria-label="Close menu"
                        >
                            <IoClose size={20} />
                        </button>
                    </div>
                    <nav className="docs-mobile-sidebar-nav">
                        {items.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className="docs-mobile-sidebar-link"
                                onClick={() => setIsOpen(false)}
                            >
                                {item.title}
                            </Link>
                        ))}
                    </nav>
                </div>
            </div>
        </>
    );
}
