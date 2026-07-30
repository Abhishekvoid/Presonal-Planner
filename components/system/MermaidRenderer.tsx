"use client";

import React, { useEffect, useRef, useState } from "react";
import { Copy, Check, Code, MagnifyingGlassPlus, MagnifyingGlassMinus } from "@phosphor-icons/react";

interface MermaidRendererProps {
  chart: string;
}

export function MermaidRenderer({ chart }: MermaidRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgContent, setSvgContent] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    let isMounted = true;

    async function renderMermaid() {
      try {
        setError(null);
        // Dynamically load mermaid from CDN or window
        if (typeof window !== "undefined") {
          const mermaid = (await import("mermaid")).default;
          mermaid.initialize({
            startOnLoad: false,
            theme: document.documentElement.classList.contains("dark") ? "dark" : "neutral",
            securityLevel: "loose",
            fontFamily: "var(--font-sans, inherit)",
          });

          const id = `mermaid-svg-${Math.random().toString(36).substring(2, 9)}`;
          const { svg } = await mermaid.render(id, chart.trim());
          if (isMounted) {
            setSvgContent(svg);
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || "Failed to render Mermaid diagram.");
        }
      }
    }

    renderMermaid();

    return () => {
      isMounted = false;
    };
  }, [chart]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(chart);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-4 overflow-hidden rounded-2xl border border-hair bg-cream-raised dark:bg-[#12151E] shadow-lg transition-all">
      {/* Top Action Bar */}
      <div className="flex items-center justify-between border-b border-hair bg-cream-deep/60 dark:bg-black/40 px-4 py-2 font-mono text-xs">
        <div className="flex items-center gap-2 text-coffee font-semibold">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Architecture Diagram (Mermaid Vector)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setScale((s) => Math.min(s + 0.15, 1.6))}
            className="rounded-lg p-1.5 text-coffee hover:bg-black/5 dark:hover:bg-white/10 hover:text-espresso transition-all"
            title="Zoom In"
          >
            <MagnifyingGlassPlus size={14} />
          </button>
          <button
            onClick={() => setScale((s) => Math.max(s - 0.15, 0.7))}
            className="rounded-lg p-1.5 text-coffee hover:bg-black/5 dark:hover:bg-white/10 hover:text-espresso transition-all"
            title="Zoom Out"
          >
            <MagnifyingGlassMinus size={14} />
          </button>
          <button
            onClick={() => setShowCode(!showCode)}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-coffee hover:bg-black/5 dark:hover:bg-white/10 hover:text-espresso transition-all"
          >
            <Code size={13} />
            <span>{showCode ? "Diagram" : "Source"}</span>
          </button>
          <button
            onClick={handleCopyCode}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-coffee hover:bg-black/5 dark:hover:bg-white/10 hover:text-espresso transition-all"
          >
            {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>
        </div>
      </div>

      {/* Render Area */}
      <div className="p-4 overflow-x-auto min-h-[140px] flex items-center justify-center">
        {showCode ? (
          <pre className="w-full text-xs font-mono text-espresso bg-cream-deep/40 dark:bg-black/30 p-3 rounded-xl overflow-x-auto">
            {chart}
          </pre>
        ) : error ? (
          <div className="text-xs text-rose-500 font-mono p-3 bg-rose-500/10 rounded-xl w-full">
            ⚠️ Diagram Render Fallback (Raw Mermaid Source):
            <pre className="mt-2 text-[11px] text-coffee whitespace-pre-wrap">{chart}</pre>
          </div>
        ) : (
          <div
            ref={containerRef}
            style={{ transform: `scale(${scale})`, transformOrigin: "center center" }}
            className="transition-transform duration-200 flex justify-center w-full [&_svg]:max-w-full [&_svg]:h-auto"
            dangerouslySetInnerHTML={{ __html: svgContent }}
          />
        )}
      </div>
    </div>
  );
}
