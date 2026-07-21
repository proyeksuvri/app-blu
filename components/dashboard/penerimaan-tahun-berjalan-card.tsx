"use client"

import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { type PenerimaanFilteredResult } from "@/app/actions/penerimaan-filtered"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import Link from "next/link"

const rupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n)

interface PenerimaanTahunBerjalanCardProps {
  data: PenerimaanFilteredResult | null
  isPending: boolean
  className?: string
}

const BackgroundConfetti = () => (
  <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" preserveAspectRatio="none" viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg">
    <g opacity="1">
      {/* Stars matching reference colors */}
      <path d="M 30 40 Q 35 40 35 35 Q 35 40 40 40 Q 35 40 35 45 Q 35 40 30 40 Z" fill="#4285F4" />
      <path d="M 120 20 Q 124 20 124 16 Q 124 20 128 20 Q 124 20 124 24 Q 124 20 120 20 Z" fill="#9C27B0" />
      <path d="M 270 25 Q 275 25 275 20 Q 275 25 280 25 Q 275 25 275 30 Q 275 25 270 25 Z" fill="#F29900" />
      <path d="M 370 45 Q 374 45 374 41 Q 374 45 378 45 Q 374 45 374 49 Q 374 45 370 45 Z" fill="#34A853" />
      <path d="M 50 140 Q 55 140 55 135 Q 55 140 60 140 Q 55 140 55 145 Q 55 140 50 140 Z" fill="#EA4335" />
      <path d="M 200 180 Q 204 180 204 176 Q 204 180 208 180 Q 204 180 204 184 Q 204 180 200 180 Z" fill="#4285F4" />
      <path d="M 310 160 Q 316 160 316 154 Q 316 160 322 160 Q 316 160 316 166 Q 316 160 310 160 Z" fill="#E91E63" />
      <path d="M 390 130 Q 394 130 394 126 Q 394 130 398 130 Q 394 130 394 134 Q 394 130 390 130 Z" fill="#FBBC05" />
      
      {/* Small dots */}
      <circle cx="80" cy="50" r="2" fill="#E91E63" />
      <circle cx="210" cy="60" r="2" fill="#34A853" />
      <circle cx="330" cy="70" r="1.5" fill="#4285F4" />
      <circle cx="100" cy="170" r="2" fill="#F29900" />
      <circle cx="250" cy="140" r="1.5" fill="#9C27B0" />
      <circle cx="160" cy="110" r="2" fill="#EA4335" />
      <circle cx="20" cy="90" r="1.5" fill="#34A853" />
    </g>
  </svg>
)

export function PenerimaanTahunBerjalanCard({ data, isPending, className }: PenerimaanTahunBerjalanCardProps) {
  const growth = data?.prevTotal ? Math.round(((data.total - data.prevTotal) / data.prevTotal) * 100) : null
  const isPositive = growth !== null && growth > 0
  const isNegative = growth !== null && growth < 0

  const growthYear = data?.prevYearTotal ? Math.round(((data.total - data.prevYearTotal) / data.prevYearTotal) * 100) : null
  const isPositiveYear = growthYear !== null && growthYear > 0
  const isNegativeYear = growthYear !== null && growthYear < 0

  return (
    <Card className={cn("flex flex-col h-full relative overflow-hidden bg-[#1a1a1c] text-white border-0 shadow-md", className)}>
      <BackgroundConfetti />
      <div className="relative z-10 flex flex-col h-full">
        <CardHeader className="pb-2">
          <div className="flex flex-col justify-between gap-2">
            <div>
              <CardTitle className="text-xl font-bold flex items-center gap-2 text-white">
                Penerimaan Berjalan <span className="text-xl">🎉</span>
              </CardTitle>
              <CardDescription className="text-zinc-400 text-sm mt-1">
                Filter penerimaan berdasarkan periode
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col justify-end">
          {isPending || !data ? (
            <div className="flex flex-col gap-2 py-4">
              <Skeleton className="h-10 w-[200px] bg-zinc-800" />
              <Skeleton className="h-4 w-[150px] bg-zinc-800" />
            </div>
          ) : (
            <div className="flex flex-col gap-1.5 pt-4">
              <div className="flex items-end justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-3xl font-bold tracking-tight text-white mb-2 truncate">
                    {rupiah(data.total)}
                  </p>
                  <div className="flex flex-col text-sm text-zinc-400 gap-1 mt-1">
                    <div className="flex items-center gap-1.5">
                      {growth !== null ? (
                        <>
                          <span className={`flex items-center font-medium ${isPositive ? 'text-emerald-400' : isNegative ? 'text-rose-400' : 'text-zinc-300'}`}>
                            {isPositive ? '+' : ''}{growth}%
                          </span>
                          <span className="truncate">vs periode sebelumnya</span>
                        </>
                      ) : (
                        <span className="truncate">Periode sebelumnya {rupiah(data.prevTotal)}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {growthYear !== null ? (
                        <>
                          <span className={`flex items-center font-medium ${isPositiveYear ? 'text-emerald-400' : isNegativeYear ? 'text-rose-400' : 'text-zinc-300'}`}>
                            {isPositiveYear ? '+' : ''}{growthYear}%
                          </span>
                          <span className="truncate">vs tahun lalu</span>
                        </>
                      ) : (
                        <span className="truncate">Tahun lalu {rupiah(data.prevYearTotal)}</span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="shrink-0 hidden sm:block">
                  <Button render={<Link href="/penerimaan" />} variant="outline" className="bg-transparent border-zinc-700 text-white hover:bg-zinc-800 hover:text-white rounded-lg h-9 px-4 text-sm font-medium transition-colors">
                    Lihat Detail
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </div>
    </Card>
  )
}
