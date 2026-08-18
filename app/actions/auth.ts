"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export type LoginResult =
  | { ok: true }
  | { ok: false; pesan: string }

export async function actionLogin(email: string, password: string): Promise<LoginResult> {
  if (!email.trim() || !password) {
    return { ok: false, pesan: "Email dan password wajib diisi" }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { ok: false, pesan: "Email atau password salah" }
  }

  return { ok: true }
}

export async function actionLogout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/")
}
