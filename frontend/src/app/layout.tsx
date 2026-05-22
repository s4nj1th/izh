import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { ThemeProvider } from "@/components/ThemeProvider";

export const metadata: Metadata = {
    title: "VaraiX",
    description:
        "VaraiX is a compact chart description language for deterministic SVG output, with arrays, null handling, and color palettes.",
    icons: {
        icon: [
            {
                url: "/favicon-light.svg",
                media: "(prefers-color-scheme: light)",
            },
            { url: "/favicon-dark.svg", media: "(prefers-color-scheme: dark)" },
        ],
    },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className="bg-bg-main text-text-primary min-h-screen flex flex-col">
                <ThemeProvider
                    attribute="class"
                    defaultTheme="system"
                    enableSystem
                >
                    <Navbar />
                    {children}
                </ThemeProvider>
            </body>
        </html>
    );
}
