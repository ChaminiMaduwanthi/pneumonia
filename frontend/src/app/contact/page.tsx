"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, Clock, LifeBuoy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

// Update this to your real support address.
const SUPPORT_EMAIL = "chaminimaduwanthi97@gmail.com";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const body = `Name: ${name}\nEmail: ${email}\n\n${message}`;
    const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
      subject || "Support request"
    )}&body=${encodeURIComponent(body)}`;
    // Opens the user's email app with the message pre-filled.
    window.location.href = mailto;
  }

  return (
    <div className="relative overflow-hidden">
      <div className="aurora-bg" />
      <div className="grid-pattern pointer-events-none absolute inset-0 opacity-50" />

      <div className="container-wrap relative space-y-6 py-10">
        <div className="animate-in-up mb-2 text-center">
          <h1 className="gradient-text text-4xl font-extrabold tracking-tight">Contact &amp; Support</h1>
          <p className="mx-auto mt-3 max-w-2xl text-foreground/70">
            Have a question or need help? Send us a message and we&apos;ll get back to you.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Info column */}
          <div className="space-y-4 md:col-span-1">
            <Card>
              <CardContent className="flex items-start gap-3 py-5">
                <Mail className="mt-0.5 h-5 w-5 text-accent" />
                <div>
                  <p className="font-medium">Email us</p>
                  <a href={`mailto:${SUPPORT_EMAIL}`} className="text-sm text-accent hover:underline">
                    {SUPPORT_EMAIL}
                  </a>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-start gap-3 py-5">
                <Clock className="mt-0.5 h-5 w-5 text-accent" />
                <div>
                  <p className="font-medium">Response time</p>
                  <p className="text-sm text-foreground/70">We usually reply within 1–2 business days.</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-start gap-3 py-5">
                <LifeBuoy className="mt-0.5 h-5 w-5 text-accent" />
                <div>
                  <p className="font-medium">Quick answers</p>
                  <p className="text-sm text-foreground/70">
                    Many questions are answered on our{" "}
                    <Link href="/help" className="text-accent hover:underline">
                      Help &amp; FAQ
                    </Link>{" "}
                    page.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Form column */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Send a message</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label htmlFor="name" className="text-sm font-medium">
                      Your name
                    </label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Jane Doe"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="email" className="text-sm font-medium">
                      Your email
                    </label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="jane@example.com"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="subject" className="text-sm font-medium">
                    Subject
                  </label>
                  <Input
                    id="subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="How can we help?"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="message" className="text-sm font-medium">
                    Message
                  </label>
                  <Textarea
                    id="message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Describe your question or issue…"
                    required
                  />
                </div>
                <Button type="submit">Send message</Button>
                <p className="text-xs text-foreground/55">
                  This opens your email app with the message ready to send. Please do not include sensitive medical
                  details.
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
