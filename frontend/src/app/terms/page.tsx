import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "Terms of Service | LungVision AI",
};

export default function TermsPage() {
  return (
    <div className="relative overflow-hidden">
      <div className="aurora-bg" />
      <div className="grid-pattern pointer-events-none absolute inset-0 opacity-50" />

      <div className="container-wrap relative space-y-6 py-10">
        <div className="animate-in-up mb-2 text-center">
          <h1 className="gradient-text text-4xl font-extrabold tracking-tight">Terms of Service</h1>
          <p className="mx-auto mt-3 max-w-2xl text-foreground/70">
            Please read these terms carefully before using LungVision AI.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Acceptance of Terms</CardTitle>
          </CardHeader>
          <CardContent className="text-foreground/80">
            By creating an account or using LungVision AI, you agree to these Terms of Service. If you do not agree,
            please do not use the service.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Not a Medical Diagnosis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-foreground/80">
            <p>
              LungVision AI is a decision-support tool only. Its results are not a medical diagnosis and must not be
              used as a substitute for professional medical advice, diagnosis, or treatment.
            </p>
            <p>
              Always consult a qualified doctor or healthcare professional about your X-ray and any health concerns.
              Never ignore or delay seeking medical advice because of a result shown by this tool.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Using the Service</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-foreground/80">
            <p>- Upload only chest X-ray images that you have the right to use.</p>
            <p>- Use the service for lawful, personal, educational, or research purposes only.</p>
            <p>- Do not attempt to misuse, disrupt, or gain unauthorised access to the service.</p>
            <p>- Do not upload harmful, illegal, or offensive content.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-foreground/80">
            <p>
              You are responsible for keeping your login details safe and for any activity that happens under your
              account. Please contact us if you believe your account has been used without your permission.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Accuracy and Availability</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-foreground/80">
            <p>
              While the tool aims to be helpful, its results may not always be correct, and it may sometimes be
              unavailable or interrupted. We provide the service on an &quot;as is&quot; basis without guarantees of
              accuracy or uninterrupted access.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Limitation of Liability</CardTitle>
          </CardHeader>
          <CardContent className="text-foreground/80">
            To the extent permitted by law, LungVision AI and its creators are not liable for any decisions made, or
            harm resulting, from reliance on the tool&apos;s results. Your use of the service is at your own risk.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Changes to These Terms</CardTitle>
          </CardHeader>
          <CardContent className="text-foreground/80">
            We may update these terms from time to time. Continued use of the service after changes means you accept the
            updated terms. Questions? Visit our{" "}
            <Link href="/contact" className="text-accent hover:underline">
              Contact &amp; Support
            </Link>{" "}
            page.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
