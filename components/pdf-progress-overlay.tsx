"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { CheckCircle2, Loader2, Printer } from "lucide-react"

export const PDF_STEPS = [
  { key: "fetch",   label: "Mengambil data transaksi",    pct: 30 },
  { key: "render",  label: "Merender dokumen PDF",         pct: 65 },
  { key: "compile", label: "Mengompilasi file PDF",        pct: 90 },
  { key: "done",    label: "Dokumen siap diunduh",         pct: 100 },
] as const

export type PdfStepKey = (typeof PDF_STEPS)[number]["key"]

export function usePdfProgress() {
  const [state, setState] = useState<PdfStepKey | null>(null)
  
  const start = useCallback(() => setState(null), [])
  const setPhase = useCallback((phase: PdfStepKey | null) => setState(phase), [])
  const stop = useCallback(() => setState(null), [])

  return { state, start, setPhase, stop }
}

export function PdfProgressOverlay({ state: step }: { state: PdfStepKey | null }) {
  const [displayed, setDisplayed] = useState(0)
  const target = PDF_STEPS.find((s) => s.key === step)?.pct ?? 0
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    if (target === 0) { setDisplayed(0); return }
    const animate = () => {
      setDisplayed((prev) => {
        if (prev >= target) return target
        const delta = Math.max(0.4, (target - prev) * 0.06)
        const next = Math.min(prev + delta, target)
        if (next < target) rafRef.current = requestAnimationFrame(animate)
        return next
      })
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [target])

  if (!step) return null

  const isDone = step === "done"
  const currentStepIdx = PDF_STEPS.findIndex((s) => s.key === step)

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ backdropFilter: "blur(6px)", backgroundColor: "rgba(0,0,0,0.55)" }}
    >
      <div
        className="relative w-[420px] max-w-[90vw] rounded-2xl overflow-hidden shadow-2xl"
        style={{
          background: "linear-gradient(145deg, #0f172a 0%, #1e293b 60%, #0f2027 100%)",
          border: "1px solid rgba(99,102,241,0.25)",
        }}
      >
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{
            background: "linear-gradient(90deg, transparent, rgba(99,102,241,0.8), rgba(168,85,247,0.8), transparent)",
          }}
        />

        <div className="px-7 pt-8 pb-7 space-y-6">
          <div className="flex items-center gap-3">
            <div
              className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
            >
              {isDone ? (
                <CheckCircle2 className="h-5 w-5 text-white" />
              ) : (
                <Printer className="h-5 w-5 text-white animate-pulse" />
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-white leading-tight">
                {isDone ? "PDF Berhasil Dibuat" : "Menyiapkan Dokumen PDF"}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                Proses berjalan...
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-300 font-medium">
                {PDF_STEPS.find((s) => s.key === step)?.label}
              </span>
              <span
                className="text-xs font-bold tabular-nums"
                style={{ color: isDone ? "#34d399" : "#a5b4fc" }}
              >
                {Math.round(displayed)}%
              </span>
            </div>

            <div
              className="relative h-2.5 w-full rounded-full overflow-hidden"
              style={{ background: "rgba(255,255,255,0.07)" }}
            >
              <div
                className="absolute inset-y-0 left-0 rounded-full transition-none"
                style={{
                  width: `${displayed}%`,
                  background: isDone
                    ? "linear-gradient(90deg, #10b981, #34d399)"
                    : "linear-gradient(90deg, #6366f1, #8b5cf6, #a855f7)",
                  boxShadow: isDone
                    ? "0 0 12px rgba(52,211,153,0.7)"
                    : "0 0 14px rgba(139,92,246,0.75)",
                  transition: "width 0.05s linear",
                }}
              />
              {!isDone && (
                <div
                  className="absolute inset-y-0 rounded-full"
                  style={{
                    width: "40%",
                    left: `${Math.max(0, displayed - 20)}%`,
                    background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)",
                    transition: "left 0.05s linear",
                  }}
                />
              )}
            </div>
          </div>

          <div className="flex items-center justify-between gap-1">
            {PDF_STEPS.map((s, i) => {
              const done = i <= currentStepIdx
              const active = i === currentStepIdx
              return (
                <div key={s.key} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-300"
                    style={{
                      background: done
                        ? isDone
                          ? "linear-gradient(135deg, #10b981, #34d399)"
                          : "linear-gradient(135deg, #6366f1, #8b5cf6)"
                        : "rgba(255,255,255,0.08)",
                      border: active && !isDone ? "1.5px solid rgba(139,92,246,0.8)" : "none",
                      boxShadow: active && !isDone ? "0 0 8px rgba(139,92,246,0.6)" : "none",
                      color: done ? "white" : "rgba(255,255,255,0.35)",
                    }}
                  >
                    {done && !active ? (
                      <CheckCircle2 className="h-3 w-3" />
                    ) : active && !isDone ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      i + 1
                    )}
                  </div>
                  <span
                    className="text-[9px] text-center leading-tight"
                    style={{ color: done ? "#94a3b8" : "rgba(255,255,255,0.2)" }}
                  >
                    {i === 0 ? "Fetch" : i === 1 ? "Render" : i === 2 ? "Compile" : "Selesai"}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
