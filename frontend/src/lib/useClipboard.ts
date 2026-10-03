"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type ClipboardStatus = "idle" | "copied" | "error";

export function useClipboard() {
    const [status, setStatus] = useState<ClipboardStatus>("idle");
    const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const copy = useCallback(async (text: string) => {
        if (resetTimer.current) clearTimeout(resetTimer.current);

        try {
            if (!navigator.clipboard?.writeText) {
                throw new Error("Clipboard access is unavailable");
            }
            await navigator.clipboard.writeText(text);
            setStatus("copied");
        } catch {
            setStatus("error");
        }

        resetTimer.current = setTimeout(() => setStatus("idle"), 2200);
    }, []);

    useEffect(() => () => {
        if (resetTimer.current) clearTimeout(resetTimer.current);
    }, []);

    return { copy, status };
}
