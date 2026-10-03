import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { ThemeProvider } from "@/components/ThemeProvider";
import Script from "next/script";
import localFont from "next/font/local";

const inter = localFont({
    src: "../../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2",
    variable: "--font-izh-sans",
    display: "swap",
    weight: "100 900",
});

export const metadata: Metadata = {
    title: "Izh — Charts from text",
    description:
        "Turn a few lines of readable chart code into crisp, deterministic SVG. Explore Izh, a compact Rust and WebAssembly chart description language.",
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
            <head>
                <Script id="theme-init" strategy="beforeInteractive">
                    {`(function(){try{var key='theme';var stored=localStorage.getItem(key);var preferDark=window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;var theme=stored|| (preferDark? 'dark':'light');if(theme==='dark'){document.documentElement.classList.add('dark')}else{document.documentElement.classList.remove('dark')} }catch(e){} })()`}
                </Script>
            </head>
            <body className={`${inter.variable} bg-bg-main text-text-primary min-h-screen flex flex-col`}>
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
