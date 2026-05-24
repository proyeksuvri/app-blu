import { redirect } from "next/navigation"
import { getCurrentProfile } from "@/lib/session"
import { getDraftCount } from "@/app/actions/dashboard"
import { AppShell } from "@/components/app-shell"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile()
  if (!profile) redirect("/")
  if (!profile.is_active) redirect("/")

  const draftCount = await getDraftCount()

  return <AppShell profile={profile} draftCount={draftCount}>{children}</AppShell>
}
