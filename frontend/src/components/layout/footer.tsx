import Link from "next/link";

const footerLinks = [
  { href: "/about", label: "About" },
  { href: "/help", label: "Help & FAQ" },
  { href: "/contact", label: "Contact" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms" },
];

export function Footer() {
  return (
    <footer className="relative mt-10 border-t border-border/50">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent" />
      <div className="container-wrap flex flex-col items-center gap-4 py-7 text-center">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-[hsl(var(--grad-from))] to-[hsl(var(--grad-to))] text-[10px] font-bold text-white shadow-glow">
            AI
          </span>
          <span className="text-sm font-semibold text-primary">LungVision AI</span>
        </div>

        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          {footerLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-foreground/65 transition-colors hover:text-accent"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <p className="text-sm text-foreground/65">
          Final Year Research Project | Explainable AI for Lung Disease Detection
        </p>
      </div>
    </footer>
  );
}
