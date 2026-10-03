"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { IoMenu, IoClose } from "react-icons/io5";

interface SidebarItem {
    title: string;
    href: string;
}

export default function MobileSidebar({ items }: { items: SidebarItem[] }) {
    const [isOpen, setIsOpen] = useState(false);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const closeRef = useRef<HTMLButtonElement>(null);
    const sidebarRef = useRef<HTMLDivElement>(null);

    const closeMenu = useCallback(() => {
        setIsOpen(false);
        triggerRef.current?.focus();
    }, []);

    useEffect(() => {
        if (!isOpen) return;
        closeRef.current?.focus();

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                closeMenu();
                return;
            }
            if (event.key !== "Tab" || !sidebarRef.current) return;

            const focusable = sidebarRef.current.querySelectorAll<HTMLElement>(
                'a[href], button:not([disabled])',
            );
            const first = focusable.item(0);
            const last = focusable.item(focusable.length - 1);
            const focusIsOutside = !sidebarRef.current.contains(document.activeElement);

            if (event.shiftKey && (document.activeElement === first || focusIsOutside)) {
                event.preventDefault();
                last?.focus();
            } else if (!event.shiftKey && (document.activeElement === last || focusIsOutside)) {
                event.preventDefault();
                first?.focus();
            }
        };
        document.addEventListener("keydown", onKeyDown);
        return () => document.removeEventListener("keydown", onKeyDown);
    }, [closeMenu, isOpen]);

    return (
        <>
            {/* Mobile Menu Button */}
            <button
                ref={triggerRef}
                className="docs-mobile-menu-btn"
                type="button"
                onClick={() => setIsOpen((open) => !open)}
                aria-label={isOpen ? "Close documentation menu" : "Open documentation menu"}
                aria-expanded={isOpen}
                aria-controls="docs-mobile-sidebar"
            >
                {isOpen ? <IoClose size={20} /> : <IoMenu size={20} />}
            </button>

            {/* Overlay */}
            {isOpen && (
                <div
                    className="docs-mobile-overlay"
                    aria-hidden="true"
                    onClick={closeMenu}
                />
            )}

            {/* Floating Sidebar */}
            <div
                ref={sidebarRef}
                id="docs-mobile-sidebar"
                className={`docs-mobile-sidebar ${
                    isOpen ? "docs-mobile-sidebar-open" : ""
                }`}
                role="dialog"
                aria-modal={isOpen ? true : undefined}
                aria-labelledby="docs-mobile-sidebar-title"
                inert={!isOpen}
            >
                <div className="docs-mobile-sidebar-content">
                    <div className="docs-mobile-sidebar-header">
                        <div id="docs-mobile-sidebar-title" className="docs-mobile-sidebar-title">
                            Documentation
                        </div>
                        <button
                            ref={closeRef}
                            type="button"
                            onClick={closeMenu}
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
                                onClick={closeMenu}
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
