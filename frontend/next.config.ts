import type { NextConfig } from "next";
import createMDX from "@next/mdx";

const nextConfig: NextConfig = {
    pageExtensions: ["js", "jsx", "md", "mdx", "ts", "tsx"],
};

const withMDX = createMDX({
    options: {
        // Do not pass function plugins here; Turbopack requires loader options to be serializable.
        remarkPlugins: ["remark-gfm"],
        rehypePlugins: [],
    },
});

export default withMDX(nextConfig);
