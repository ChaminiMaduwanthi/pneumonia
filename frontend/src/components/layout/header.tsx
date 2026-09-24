"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { APP_NAME } from "@/lib/config";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const publicLinks = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
];

const authLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/analyse", label: "Analyse" },
  { href: "/history", label: "History" },
  { href: "/profile", label: "Profile" },
];

export function Header() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const { data } = useSession();
  const isLoggedIn = Boolean(data?.user);
  // Researchers get the model/dataset page; admins get both it and the console.
  const role = data?.user?.role;
  const links = !isLoggedIn
    ? publicLinks
    : role === "admin"
      ? [...authLinks, { href: "/research", label: "Research" }, { href: "/admin", label: "Admin" }]
      : role === "researcher"
        ? [...authLinks, { href: "/research", label: "Research" }]
        : authLinks;

  return (
    <header className="sticky top-0 z-40 border-b border-border/50 bg-white/60 backdrop-blur-2xl supports-[backdrop-filter]:bg-white/40 dark:bg-slate-950/50 dark:supports-[backdrop-filter]:bg-slate-950/40">
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
      <div className="container-wrap flex h-16 items-center justify-between">
        <Link href="/" className="group flex items-center gap-3">
          <span className="scene relative flex h-9 w-9 items-center justify-center">
            <span className="absolute inset-0 animate-spin-slow rounded-xl bg-gradient-to-br from-[hsl(var(--grad-from))] via-accent to-[hsl(var(--grad-to))] opacity-80 blur-[2px]" />
            <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[hsl(var(--grad-from))] to-[hsl(var(--grad-to))] text-sm font-bold text-white shadow-glow transition-transform duration-500 ease-spring group-hover:[transform:perspective(500px)_rotateY(25deg)_scale(1.08)]">
              LV
            </span>
          </span>
          <span className="text-base font-semibold tracking-tight text-primary transition-colors group-hover:text-accent">
            {APP_NAME}
          </span>
        </Link>
        <nav className="hidden items-center gap-1 rounded-full border border-border/60 bg-white/70 px-2 py-1 shadow-sm backdrop-blur-xl dark:bg-slate-900/50 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "relative rounded-full px-4 py-2 text-sm font-medium transition-all duration-300",
                pathname === link.href
                  ? "bg-gradient-to-br from-[hsl(var(--grad-from))] to-[hsl(var(--grad-to))] text-white shadow-glow"
                  : "text-foreground/75 hover:-translate-y-0.5 hover:bg-muted hover:text-foreground"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-foreground/80 md:hidden"
            onClick={() => setMenuOpen((value) => !value)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
          <ThemeToggle />
          {isLoggedIn ? (
            <Button variant="outline" size="sm" onClick={() => signOut({ callbackUrl: "/login" })}>
              Logout
            </Button>
          ) : (
            <>
              <Link href="/login">
                <Button variant="outline" size="sm">
                  Login
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm">Register</Button>
              </Link>
            </>
          )}
        </div>
      </div>
      {menuOpen && (
        <div className="border-t border-border/70 bg-white/95 px-4 py-3 shadow-sm backdrop-blur dark:bg-slate-950/95 md:hidden">
          <nav className="container-wrap grid gap-2 px-0">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  pathname === link.href ? "bg-primary text-white" : "text-foreground/80 hover:bg-muted"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
