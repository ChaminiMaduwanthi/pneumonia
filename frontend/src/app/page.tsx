import Link from "next/link";
import {
  Activity,
  Brain,
  Eye,
  Gauge,
  History,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Upload,
  Zap,
} from "lucide-react";
import { TiltCard } from "@/components/ui/tilt-card";

const detectClasses = [
  {
    name: "COVID-19",
    icon: Activity,
    desc: "Pneumonia caused by SARS-CoV-2, often presenting as bilateral, peripheral ground-glass opacities.",
  },
  {
    name: "Viral Pneumonia",
    icon: Activity,
    desc: "Lung inflammation from a viral infection, typically showing diffuse, interstitial patterns.",
  },
  {
    name: "Bacterial Pneumonia",
    icon: ScanLine,
    desc: "Bacterial lung infection that commonly appears as focal, lobar consolidation.",
  },
  {
    name: "Normal",
    icon: ShieldCheck,
    desc: "No signs of the targeted lung conditions are detected in the chest radiograph.",
  },
];

const steps = [
  { step: "01", title: "Upload a Chest X-ray", icon: Upload },
  { step: "02", title: "AI Analysis & Safety Check", icon: Brain },
  { step: "03", title: "Diagnosis with Grad-CAM Evidence", icon: Eye },
];

const features = [
  { title: "Real-Time AI Analysis", icon: Zap },
  { title: "Grad-CAM Visual Evidence", icon: Eye },
  { title: "Per-Class Confidence Scores", icon: Gauge },
  { title: "Secure, Private Uploads", icon: ShieldCheck },
  { title: "Scan History & Reports", icon: History },
  { title: "Out-of-Distribution Checks", icon: Sparkles },
];

export default function Home() {
  return (
    <div className="relative overflow-hidden">
      {/* Animated ambient background */}
      <div className="aurora-bg" />
      <div className="grid-pattern pointer-events-none absolute inset-0 opacity-60" />
      <div className="blob absolute -left-32 top-10 h-80 w-80 bg-cyan-400/30 dark:bg-cyan-500/20" />
      <div
        className="blob absolute -right-24 top-40 h-96 w-96 bg-blue-500/25 dark:bg-blue-600/20"
        style={{ animationDelay: "-6s" }}
      />

      {/* Hero */}
      <section className="container-wrap relative py-16 md:py-24">
        <div className="animate-in-up mx-auto max-w-4xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-1.5 text-xs font-semibold text-accent shadow-sm backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" />
            Explainable AI · Grad-CAM Powered
          </span>

          <h1 className="mt-5 text-4xl font-extrabold leading-[1.1] tracking-tight md:text-5xl">
            <span className="gradient-text">A Web-Based Explainable AI Framework</span>{" "}
            <span className="text-primary">
              for Unified Detection of Lung-Related Diseases from Chest Radiographs
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-3xl text-lg leading-relaxed text-foreground/75">
            An explainable AI platform that classifies chest radiographs into four conditions — COVID-19, bacterial
            pneumonia, viral pneumonia, or normal — and reveals the visual evidence behind every prediction with
            Grad-CAM heatmaps and per-class confidence scores.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/register"
              className="shine group relative inline-flex h-12 items-center gap-2 overflow-hidden rounded-xl bg-gradient-to-br from-[hsl(var(--grad-from))] via-[hsl(var(--grad-via))] to-[hsl(var(--grad-to))] px-7 font-semibold text-white shadow-glow transition-all duration-300 ease-spring hover:-translate-y-1 hover:shadow-glow-lg"
            >
              Get Started
              <Zap className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/about"
              className="gradient-border inline-flex h-12 items-center rounded-xl bg-card/60 px-7 font-semibold text-primary backdrop-blur transition-all duration-300 ease-spring hover:-translate-y-1 hover:bg-muted"
            >
              Learn More
            </Link>
          </div>

          <div className="mx-auto mt-10 grid max-w-xl grid-cols-3 gap-3 text-center">
            {[
              ["4", "Lung conditions"],
              ["Grad-CAM", "Visual evidence"],
              ["OOD-aware", "Safety checks"],
            ].map(([value, label], i) => (
              <div
                key={label}
                className="lift-3d animate-in-up rounded-2xl border border-white/40 bg-white/60 px-3 py-4 shadow-sm backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/50"
                style={{ animationDelay: `${200 + i * 120}ms` }}
              >
                <p className="gradient-text text-xl font-extrabold">{value}</p>
                <p className="mt-1 text-xs text-foreground/70">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="container-wrap relative scene py-12">
        <h2 className="text-center text-3xl font-bold text-primary">How It Works</h2>
        <p className="mt-2 text-center text-foreground/65">Three steps from radiograph to explainable result.</p>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {steps.map(({ step, title, icon: Icon }) => (
            <div
              key={title}
              className="lift-3d group relative overflow-hidden rounded-3xl border border-white/50 bg-white/70 p-7 shadow-sm backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/60"
            >
              <span className="absolute right-5 top-4 text-5xl font-black text-accent/40 transition-colors group-hover:text-accent/60">
                {step}
              </span>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[hsl(var(--grad-from))] to-[hsl(var(--grad-to))] text-white shadow-glow">
                <Icon className="h-7 w-7" />
              </div>
              <p className="mt-5 text-lg font-semibold text-primary">{title}</p>
            </div>
          ))}
        </div>
      </section>

      {/* What We Detect */}
      <section className="container-wrap relative scene py-12">
        <h2 className="text-center text-3xl font-bold text-primary">What We Detect</h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {detectClasses.map(({ name, icon: Icon, desc }) => (
            <TiltCard
              key={name}
              max={12}
              className="rounded-3xl border border-white/50 bg-white/70 p-7 shadow-sm backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/60"
            >
              <div className="tilt-layer" style={{ "--depth": "36px" } as React.CSSProperties}>
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent ring-1 ring-accent/20">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-primary">{name}</h3>
                <p className="mt-2 text-sm text-foreground/70">{desc}</p>
              </div>
            </TiltCard>
          ))}
        </div>
      </section>

      {/* Grad-CAM */}
      <section className="container-wrap relative py-12">
        <h2 className="text-center text-3xl font-bold text-primary">What is Grad-CAM?</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <div className="lift-3d flex h-48 items-center justify-center rounded-3xl border border-white/50 bg-gradient-to-br from-slate-100 to-slate-200 text-center font-medium text-foreground/70 shadow-sm dark:border-slate-800 dark:from-slate-800 dark:to-slate-900">
            Original Chest Radiograph
          </div>
          <div className="lift-3d flex h-48 items-center justify-center rounded-3xl border border-accent/30 bg-gradient-to-br from-cyan-500/20 via-blue-500/15 to-indigo-500/20 text-center font-medium text-primary shadow-glow">
            Grad-CAM Localisation Map
          </div>
        </div>
        <p className="mx-auto mt-6 max-w-3xl text-center text-sm text-foreground/70">
          Grad-CAM (Gradient-weighted Class Activation Mapping) overlays a heatmap on the radiograph, highlighting the
          regions that most influenced the model&apos;s prediction. This shows the visual evidence behind every result —
          not just a label — supporting transparent, trustworthy interpretation.
        </p>
      </section>

      {/* Features */}
      <section className="container-wrap relative py-12">
        <h2 className="text-center text-3xl font-bold text-primary">Features</h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ title, icon: Icon }) => (
            <div
              key={title}
              className="lift-3d group flex items-center gap-4 rounded-2xl border border-white/50 bg-white/70 p-5 shadow-sm backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/60"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[hsl(var(--grad-from))] to-[hsl(var(--grad-to))] text-white shadow-glow transition-transform duration-300 group-hover:scale-110">
                <Icon className="h-5 w-5" />
              </span>
              <span className="font-medium text-primary">{title}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
