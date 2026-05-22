"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IoArrowBack, IoArrowForward } from "react-icons/io5";

interface SidebarItem {
    title: string;
    href: string;
}

export default function DocsNavigation({ items }: { items: SidebarItem[] }) {
    const pathname = usePathname();
    const currentIndex = items.findIndex((item) => item.href === pathname);

    const prevItem = currentIndex > 0 ? items[currentIndex - 1] : null;
    const nextItem =
        currentIndex !== -1 && currentIndex < items.length - 1
            ? items[currentIndex + 1]
            : null;

    if (!prevItem && !nextItem) {
        return null;
    }

    return (
        <div className="docs-navigation">
            {prevItem ? (
                <Link
                    href={prevItem.href}
                    className="docs-nav-button docs-nav-prev"
                >
                    <IoArrowBack size={18} />
                    <div className="docs-nav-button-content">
                        <div className="docs-nav-button-label">Previous</div>
                        <div className="docs-nav-button-title">
                            {prevItem.title}
                        </div>
                    </div>
                </Link>
            ) : (
                <div />
            )}

            {nextItem ? (
                <Link
                    href={nextItem.href}
                    className="docs-nav-button docs-nav-next"
                >
                    <div className="docs-nav-button-content">
                        <div className="docs-nav-button-label">Next</div>
                        <div className="docs-nav-button-title">
                            {nextItem.title}
                        </div>
                    </div>
                    <IoArrowForward size={18} />
                </Link>
            ) : (
                <div />
            )}
        </div>
    );
}
