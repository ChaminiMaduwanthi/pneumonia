"use client";

import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function AdminLogin() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);

    const response = await signIn("credentials", {
      email: form.email,
      password: form.password,
      redirect: false,
    });

    if (!response?.ok) {
      setLoading(false);
      toast.error("Invalid admin credentials");
      return;
    }

    // The credentials were valid, but this console is admin-only — check the role
    // before letting the dashboard render.
    try {
      const sessionResponse = await fetch("/api/auth/session");
      const sessionData = await sessionResponse.json();
      if (sessionData?.user?.role !== "admin") {
        setLoading(false);
        toast.error("This account does not have admin access");
        return;
      }
    } catch {
      setLoading(false);
      toast.error("Could not verify admin access");
      return;
    }

    toast.success("Signed in as admin");
    router.refresh();
  };

  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden py-12">
      <div className="aurora-bg" />
      <div className="grid-pattern pointer-events-none absolute inset-0 opacity-50" />
      <div className="blob absolute -left-20 top-10 h-72 w-72 bg-cyan-400/30" />
      <div className="blob absolute -right-16 bottom-10 h-80 w-80 bg-blue-500/25" style={{ animationDelay: "-7s" }} />

      <Card className="animate-in-scale glow-hover relative z-10 w-full max-w-lg">
        <CardHeader className="text-center">
          <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[hsl(var(--grad-from))] to-[hsl(var(--grad-to))] text-white shadow-glow">
            <ShieldCheck className="h-7 w-7" />
          </span>
          <CardTitle className="gradient-text text-3xl">Admin Login</CardTitle>
          <p className="mt-2 text-sm text-foreground/65">Restricted area — administrator access only</p>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <Input
              type="email"
              placeholder="Admin email"
              autoComplete="username"
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              required
            />
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                autoComplete="current-password"
                value={form.password}
                onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                required
              />
              <button
                type="button"
                className="absolute right-3 top-3 text-foreground/60"
                onClick={() => setShowPassword((prev) => !prev)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <Button className="w-full" type="submit" disabled={loading}>
              {loading ? "Signing in..." : "Sign In as Admin"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
