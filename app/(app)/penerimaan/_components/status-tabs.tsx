"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

const STATUS_TABS = [
  { label: "Semua", value: "" },
  { label: "Draft", value: "draft" },
  { label: "Terverifikasi", value: "verified" },
  { label: "Dibatalkan", value: "void" },
]

export function StatusTabs() {
  const searchParams = useSearchParams()
  const active = searchParams.get("status") ?? ""

  return (
    <Tabs value={active}>
      <TabsList>
        {STATUS_TABS.map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            nativeButton={false}
            render={<Link href={tab.value ? `/penerimaan?status=${tab.value}` : "/penerimaan"} />}
          >
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
