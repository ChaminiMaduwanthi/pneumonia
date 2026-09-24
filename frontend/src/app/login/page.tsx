"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", rememberMe: false });

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);

    // signIn() rejects on transport failures (offline, tunnel dropped, blocked
    // request). Those are not bad credentials, so report them separately —
    // otherwise every problem looks like a wrong password.
    let response;
    try {
      response = await signIn("credentials", {
        email: form.email.trim(),
        password: form.password,
        redirect: false,
      });
    } catch (error) {
      setLoading(false);
      console.error("signIn failed:", error);
      toast.error("Could not reach the server. Check your connection and try again.");
      return;
    }
    setLoading(false);

    if (response?.ok) {
      toast.success("Login successful");
      try {
        const sessionResponse = await fetch("/api/auth/session");
        const sessionData = await sessionResponse.json();
        if (sessionData?.user?.role === "admin") {
          router.push("/admin");
          return;
        }
      } catch {
        // Fallback to standard dashboard if session fetch fails.
      }
      router.push("/dashboard");
      return;
    }

    console.error("signIn returned:", response);
    toast.error(
      response?.error === "CredentialsSignin" || !response
        ? "Invalid email or password"
        : `Sign-in failed: ${response.error ?? response.status}`
    );
  };

  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden py-12">
      <div className="aurora-bg" />
      <div className="grid-pattern pointer-events-none absolute inset-0 opacity-50" />
      <div className="blob absolute -left-20 top-10 h-72 w-72 bg-cyan-400/30" />
      <div className="blob absolute -right-16 bottom-10 h-80 w-80 bg-blue-500/25" style={{ animationDelay: "-7s" }} />

      <Card className="animate-in-scale glow-hover relative z-10 w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="gradient-text text-3xl">Welcome Back</CardTitle>
          <p className="mt-2 text-sm text-foreground/65">Sign in to continue your diagnostic workflow</p>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            {/* Mobile keyboards capitalise and autocorrect by default, which quietly
                mangles an email address into something that will never match. */}
            <Input
              type="email"
              placeholder="Email"
              autoComplete="email"
              inputMode="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              required
            />
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                autoComplete="current-password"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
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
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.rememberMe}
                onChange={(event) => setForm((prev) => ({ ...prev, rememberMe: event.target.checked }))}
              />
              Remember me
            </label>
            <Button className="w-full" type="submit" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
          <div className="mt-4 flex justify-between text-sm">
            <Link href="/register" className="text-accent hover:underline">
              Create account
            </Link>
            <Link href="/forgot-password" className="text-accent hover:underline">
              Forgot password?
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
