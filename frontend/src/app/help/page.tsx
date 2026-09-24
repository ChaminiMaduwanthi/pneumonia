"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const faqs: { q: string; a: string }[] = [
  {
    q: "What is LungVision AI?",
    a: "LungVision AI is an online tool that looks at a chest X-ray and tells you which of four results it most likely matches: COVID-19, Normal, Bacterial Pneumonia, or Viral Pneumonia. It also shows how confident it is and highlights the areas of the lungs the result was based on.",
  },
  {
    q: "How do I analyse an X-ray?",
    a: "Log in, open the Analyse page, and upload a chest X-ray image. Start the analysis and, after a few seconds, you will see your result, a confidence score, and a colour heatmap over the image.",
  },
  {
    q: "What image should I upload?",
    a: "Upload a clear chest X-ray image (for example a JPG or PNG). The tool is built for chest X-rays only. If you upload a photo, scan, or any image that is not a proper chest X-ray, the tool will not show a result.",
  },
  {
    q: "What do the four results mean?",
    a: "Normal means no signs of the conditions the tool checks for. COVID-19, Bacterial Pneumonia, and Viral Pneumonia are the three lung conditions the tool can flag. The result shown is the one the X-ray most closely matches.",
  },
  {
    q: "What is the confidence score?",
    a: "The confidence score is a percentage that shows how sure the tool is about its result. A higher score means the tool is more certain. It is not the same as a medical certainty, so always discuss your result with a doctor.",
  },
  {
    q: "What is the colour heatmap?",
    a: "The colour heatmap is placed over your X-ray and highlights the areas of the lungs the tool focused on when reaching its result. It helps you see which part of the image influenced the outcome.",
  },
  {
    q: "Why did the tool not show a result for my image?",
    a: "If your image does not look like a proper chest X-ray, the tool will not show a diagnosis and will let you know the image could not be analysed. Please upload a clear chest X-ray and try again.",
  },
  {
    q: "Is this a medical diagnosis?",
    a: "No. LungVision AI is a support tool only. It does not replace a medical diagnosis. Always share your results with a qualified doctor before making any health decision.",
  },
  {
    q: "Where can I see my past scans?",
    a: "All of your previous analyses are saved on the History page. Open any past scan to view its result, confidence score, and heatmap again.",
  },
  {
    q: "Can I save or print my result?",
    a: "Yes. After an analysis you can download your result as a PDF report, which you can keep for your records or share with your doctor.",
  },
  {
    q: "How do I reset my password?",
    a: "On the login page, click \"Forgot password\" and follow the steps to set a new password.",
  },
  {
    q: "Is my data private?",
    a: "Your account details and uploaded X-rays are used only to provide your results. See our Privacy Policy for full details on how your information is stored and used.",
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border/60 last:border-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 py-4 text-left"
        aria-expanded={open}
      >
        <span className="font-medium text-foreground">{q}</span>
        <ChevronDown
          className={cn("h-5 w-5 shrink-0 text-foreground/60 transition-transform", open && "rotate-180")}
        />
      </button>
      <div
        className={cn(
          "grid overflow-hidden text-foreground/75 transition-all duration-300",
          open ? "grid-rows-[1fr] pb-4 opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <p className="min-h-0">{a}</p>
      </div>
    </div>
  );
}

export default function HelpPage() {
  return (
    <div className="relative overflow-hidden">
      <div className="aurora-bg" />
      <div className="grid-pattern pointer-events-none absolute inset-0 opacity-50" />

      <div className="container-wrap relative space-y-6 py-10">
        <div className="animate-in-up mb-2 text-center">
          <h1 className="gradient-text text-4xl font-extrabold tracking-tight">Help &amp; FAQ</h1>
          <p className="mx-auto mt-3 max-w-2xl text-foreground/70">
            Answers to the most common questions about using LungVision AI.
          </p>
        </div>

        <Card>
          <CardContent className="py-2">
            {faqs.map((item) => (
              <FaqItem key={item.q} q={item.q} a={item.a} />
            ))}
          </CardContent>
        </Card>

        <p className="text-center text-sm text-foreground/65">
          Still need help?{" "}
          <Link href="/contact" className="font-medium text-accent hover:underline">
            Contact our support team
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
