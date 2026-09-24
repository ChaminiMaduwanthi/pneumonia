"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { toast } from "sonner";
import { API_BASE_URL } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "patient",
    acceptedTerms: false,
  });

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (form.password !== form.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (!form.acceptedTerms) {
      toast.error("Please accept terms and conditions");
      return;
    }

    setLoading(true);
    const response = await fetch(`${API_BASE_URL}/auth/register.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
      }),
    });
    const data = await response.json();

    if (!response.ok || !data.success) {
      setLoading(false);
      toast.error(data.message ?? "Registration failed");
      return;
    }

    // Sign the new account in immediately so the user lands on the dashboard
    // instead of being sent back to the login page.
    const signInResponse = await signIn("credentials", {
      email: form.email.trim(),
      password: form.password,
      redirect: false,
    });
    setLoading(false);

    if (!signInResponse?.ok) {
      toast.success("Account created. Please log in to continue.");
      router.push("/login");
      return;
    }

    toast.success("Registration successful");
    router.push("/dashboard");
  };

  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden py-12">
      <div className="aurora-bg" />
      <div className="grid-pattern pointer-events-none absolute inset-0 opacity-50" />
      <div className="blob absolute -right-20 top-10 h-72 w-72 bg-cyan-400/30" />
      <div className="blob absolute -left-16 bottom-10 h-80 w-80 bg-blue-500/25" style={{ animationDelay: "-7s" }} />

      <Card className="animate-in-scale glow-hover relative z-10 w-full max-w-xl">
        <CardHeader className="text-center">
          <CardTitle className="gradient-text text-3xl">Create Your Account</CardTitle>
          <p className="mt-2 text-sm text-foreground/65">Join the explainable AI diagnostic platform</p>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <Input
              placeholder="Full name"
              value={form.full_name}
              onChange={(event) => setForm((prev) => ({ ...prev, full_name: event.target.value }))}
              required
            />
            {/* Same mobile-keyboard guard as the login form: a capitalised or
                autocorrected address here would create an account the user then
                cannot sign in to. */}
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
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                type="password"
                placeholder="Password"
                value={form.password}
                onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                required
              />
              <Input
                type="password"
                placeholder="Confirm password"
                value={form.confirmPassword}
                onChange={(event) => setForm((prev) => ({ ...prev, confirmPassword: event.target.value }))}
                required
              />
            </div>
            <select
              className="h-11 w-full rounded-lg border border-border bg-white/70 px-4 text-sm shadow-sm backdrop-blur transition-all duration-300 hover:border-accent/50 focus-visible:border-accent focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/20 dark:bg-slate-900/60"
              value={form.role}
              onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value }))}
            >
              <option value="patient">Patient</option>
              <option value="doctor">Doctor</option>
              <option value="researcher">Researcher</option>
            </select>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.acceptedTerms}
                onChange={(event) => setForm((prev) => ({ ...prev, acceptedTerms: event.target.checked }))}
              />
              I accept terms and conditions
            </label>
            <Button className="w-full" disabled={loading}>
              {loading ? "Creating account..." : "Create Account"}
            </Button>
          </form>
          <p className="mt-4 text-sm">
            Already have an account?{" "}
            <Link href="/login" className="text-accent hover:underline">
              Login
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
