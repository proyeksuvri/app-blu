"use client"

import { useState } from "react"
import { Eye, EyeOff, Building2, AlertCircle, ShieldCheck, Users, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { actionLogin } from "@/app/actions/auth"

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    const form = e.currentTarget
    const email = (form.elements.namedItem("email") as HTMLInputElement)?.value ?? ""
    const password = (form.elements.namedItem("password") as HTMLInputElement)?.value ?? ""

    try {
      const result = await actionLogin(email, password)
      if (!result.ok) {
        setError(result.pesan)
        return
      }
      window.location.href = "/dashboard"
    } catch {
      setError("Terjadi kesalahan koneksi. Coba lagi.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Right: brand panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-primary p-12 order-last">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-foreground/10 ring-1 ring-primary-foreground/20">
            <Building2 className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-sm font-semibold text-primary-foreground/80">BLU UIN Palopo</span>
        </div>

        <div className="flex flex-col gap-10">
          <div>
            <h2 className="text-4xl font-bold leading-tight tracking-tight text-primary-foreground">
              Sistem Pengelolaan<br />Penerimaan Dana
            </h2>
            <p className="mt-4 text-base text-primary-foreground/60">
              Platform terpadu untuk pencatatan, verifikasi, dan pelaporan penerimaan dana BLU UIN Palopo.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            {[
              { icon: ShieldCheck, label: "Keamanan data terenkripsi end-to-end" },
              { icon: Users, label: "Akses berbasis peran (Admin, Operator, Pimpinan)" },
              { icon: FileText, label: "Laporan lengkap harian, bulanan, dan per rekening" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-foreground/10">
                  <Icon className="h-4 w-4 text-primary-foreground/80" />
                </div>
                <span className="text-sm text-primary-foreground/70">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-primary-foreground/30">
          © {new Date().getFullYear()} BLU UIN Palopo. Semua hak dilindungi.
        </p>
      </div>

      {/* Left: form panel */}
      <div className="flex w-full lg:w-1/2 flex-col items-center justify-center bg-background p-8">
        {/* Mobile branding */}
        <div className="mb-8 flex flex-col items-center gap-2 lg:hidden">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary">
            <Building2 className="h-5 w-5 text-primary-foreground" />
          </div>
          <p className="text-sm font-semibold text-foreground">BLU UIN Palopo</p>
        </div>

        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="text-xl">Masuk ke akun Anda</CardTitle>
            <CardDescription>
              Gunakan kredensial yang diberikan administrator
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="flex flex-col gap-4">
              {error && (
                <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive ring-1 ring-destructive/20">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="nama@uinpalopo.ac.id"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Kata Sandi</Label>
                  <button
                    type="button"
                    className="py-1.5 px-1 -my-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Lupa kata sandi?
                  </button>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                    aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex-col gap-3">
              <Button type="submit" className="w-full h-10" disabled={isLoading}>
                {isLoading ? "Memproses..." : "Masuk"}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Hubungi administrator jika mengalami kesulitan masuk
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}
