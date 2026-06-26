"use client"

import { useState, useTransition, useEffect, useCallback } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getPenerimaanFiltered, type PenerimaanFilterType, type PenerimaanFilteredResult } from "@/app/actions/penerimaan-filtered"
import { PenerimaanTahunBerjalanCard } from "./penerimaan-tahun-berjalan-card"
import { CapaianTargetCard } from "./capaian-target-card"
import { RataRataHarianCard } from "./rata-rata-harian-card"
import { TrenPendapatanChart } from "./tren-pendapatan-chart"
import { ProporsiPendapatanChart } from "./proporsi-pendapatan-chart"
import { ProporsiJenisChart } from "./proporsi-jenis-chart"
import { cn } from "@/lib/utils"

const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
]

export function PenerimaanCardsContainer({ className }: { className?: string }) {
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1 // 1-12

  const [filterType, setFilterType] = useState<PenerimaanFilterType>("bulan")
  const [filterValue, setFilterValue] = useState<number>(currentMonth)
  const [year, setYear] = useState<number>(currentYear)

  // Single shared data state — fetched ONCE for all child cards
  const [data, setData] = useState<PenerimaanFilteredResult | null>(null)
  const [isPending, startTransition] = useTransition()

  const fetchData = useCallback((type: PenerimaanFilterType, value: number, yr: number) => {
    startTransition(async () => {
      try {
        const result = await getPenerimaanFiltered(type, value, yr)
        setData(result)
      } catch (error) {
        console.error("Failed to fetch penerimaan data", error)
      }
    })
  }, [])

  // Fetch on mount and whenever filters change
  useEffect(() => {
    fetchData(filterType, filterValue, year)
  }, [filterType, filterValue, year, fetchData])

  const renderValueSelect = () => {
    if (filterType === "bulan") {
      return (
        <Select value={String(filterValue)} onValueChange={(v) => setFilterValue(Number(v))}>
          <SelectTrigger className="w-[130px] h-8 text-xs bg-background">
            <SelectValue placeholder="Pilih Bulan" />
          </SelectTrigger>
          <SelectContent>
            {MONTHS.map((m, i) => (
              <SelectItem key={i + 1} value={String(i + 1)} className="text-xs">{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    }
    if (filterType === "triwulan") {
      return (
        <Select value={String(filterValue)} onValueChange={(v) => setFilterValue(Number(v))}>
          <SelectTrigger className="w-[110px] h-8 text-xs bg-background">
            <SelectValue placeholder="Pilih Triwulan" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1" className="text-xs">Triwulan 1</SelectItem>
            <SelectItem value="2" className="text-xs">Triwulan 2</SelectItem>
            <SelectItem value="3" className="text-xs">Triwulan 3</SelectItem>
            <SelectItem value="4" className="text-xs">Triwulan 4</SelectItem>
          </SelectContent>
        </Select>
      )
    }
    if (filterType === "semester") {
      return (
        <Select value={String(filterValue)} onValueChange={(v) => setFilterValue(Number(v))}>
          <SelectTrigger className="w-[110px] h-8 text-xs bg-background">
            <SelectValue placeholder="Pilih Semester" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1" className="text-xs">Semester 1</SelectItem>
            <SelectItem value="2" className="text-xs">Semester 2</SelectItem>
          </SelectContent>
        </Select>
      )
    }
    return null
  }

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <div className="flex justify-end items-center gap-2 sticky top-0 z-10 bg-background/95 backdrop-blur py-2 -mx-2 px-2">
        <Select value={filterType} onValueChange={(v) => {
          if (!v) return;
          const typeVal = v as PenerimaanFilterType;
          setFilterType(typeVal)
          if (typeVal === "bulan") setFilterValue(currentMonth)
          else if (typeVal === "triwulan") setFilterValue(Math.ceil(currentMonth / 3))
          else if (typeVal === "semester") setFilterValue(Math.ceil(currentMonth / 6))
          else if (typeVal === "tahun") setFilterValue(1)
        }}>
          <SelectTrigger className="w-[110px] h-8 text-xs bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="bulan" className="text-xs">Bulan</SelectItem>
            <SelectItem value="triwulan" className="text-xs">Triwulan</SelectItem>
            <SelectItem value="semester" className="text-xs">Semester</SelectItem>
            <SelectItem value="tahun" className="text-xs">Tahun</SelectItem>
          </SelectContent>
        </Select>
        
        {renderValueSelect()}

        <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
          <SelectTrigger className="w-[80px] h-8 text-xs bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[currentYear, currentYear - 1, currentYear - 2].map((y) => (
              <SelectItem key={y} value={String(y)} className="text-xs">{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* All 3 cards share the SAME data — fetched once */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <PenerimaanTahunBerjalanCard
          data={data}
          isPending={isPending}
          className="h-full"
        />
        <CapaianTargetCard
          data={data}
          isPending={isPending}
          filterType={filterType}
          filterValue={filterValue}
          year={year}
          className="h-full"
        />
        <RataRataHarianCard
          data={data}
          isPending={isPending}
          filterType={filterType}
          filterValue={filterValue}
          year={year}
          className="h-full"
        />
      </div>

      {/* Tren Pendapatan Chart */}
      <TrenPendapatanChart
        data={data}
        isPending={isPending}
        filterType={filterType}
        filterValue={filterValue}
        year={year}
      />

      {/* Proporsi Pendapatan & Proporsi per Jenis Pendapatan */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ProporsiPendapatanChart
          data={data}
          isPending={isPending}
        />
        <ProporsiJenisChart
          data={data}
          isPending={isPending}
        />
      </div>
    </div>
  )
}
