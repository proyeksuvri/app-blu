"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

const tabs = [
  { label: "Harian", href: "/laporan/harian", value: "harian" },
  { label: "Bulanan", href: "/laporan/bulanan", value: "bulanan" },
  { label: "Per Rekening", href: "/laporan/per-rekening", value: "per-rekening" },
]

export function LaporanTabs() {
  const pathname = usePathname()
  const active = tabs.find((t) => pathname.startsWith(t.href))?.value ?? "harian"

  return (
    <Tabs value={active}>
      <TabsList variant="line">
        {tabs.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value} nativeButton={false} render={<Link href={tab.href} />}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
