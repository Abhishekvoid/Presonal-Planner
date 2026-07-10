"use client";

/**
 * Toast system — a lightweight, spring-animated notification layer.
 * `useToast()` anywhere under <ToastProvider>. Premium-subtle: quick spring in
 * from the bottom-right (above the dock), auto-dismiss, tone accents.
 */

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle, Info, WarningCircle } from "@phosphor-icons/react";
import { spring } from "@/lib/motion";

type Tone = "default" | "success" | "warn";
interface Toast {
  id: number;
  title: string;
  desc?: string;
  tone: Tone;
}
interface ToastInput {
  title: string;
  desc?: string;
  tone?: Tone;
}

const ToastCtx = createContext<{ toast: (t: ToastInput) => void }>({ toast: () => {} });
export const useToast = () => useContext(ToastCtx);

let counter = 0;
const ACCENT: Record<Tone, string> = {
  default: "text-coffee",
  success: "text-olive-deep",
  warn: "text-clay-deep",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((t: ToastInput) => {
    const id = ++counter;
    setToasts((cur) => [...cur, { id, title: t.title, desc: t.desc, tone: t.tone ?? "default" }]);
    window.setTimeout(() => setToasts((cur) => cur.filter((x) => x.id !== id)), 3800);
  }, []);

  return (
    <ToastCtx.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed bottom-24 right-4 z-[60] flex w-[min(88vw,320px)] flex-col gap-2">
        <AnimatePresence initial={false}>
          {toasts.map((t) => {
            const Icon = t.tone === "success" ? CheckCircle : t.tone === "warn" ? WarningCircle : Info;
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: 18, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                transition={spring}
                className="pointer-events-auto flex items-start gap-2.5 rounded-lg border border-coffee/20 bg-cream-raised/95 px-3.5 py-2.5 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.35)] backdrop-blur-md"
              >
                <Icon size={16} weight="fill" className={`mt-[1px] shrink-0 ${ACCENT[t.tone]}`} />
                <div className="min-w-0">
                  <div className="text-[12.5px] font-semibold leading-snug text-espresso">{t.title}</div>
                  {t.desc && <div className="mt-0.5 text-[11px] leading-snug text-coffee">{t.desc}</div>}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}
