import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "Privacy Policy | LungVision AI",
};

export default function PrivacyPage() {
  return (
    <div className="relative overflow-hidden">
      <div className="aurora-bg" />
      <div className="grid-pattern pointer-events-none absolute inset-0 opacity-50" />

      <div className="container-wrap relative space-y-6 py-10">
        <div className="animate-in-up mb-2 text-center">
          <h1 className="gradient-text text-4xl font-extrabold tracking-tight">Privacy Policy</h1>
          <p className="mx-auto mt-3 max-w-2xl text-foreground/70">
            How LungVision AI collects, uses, and protects your information.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Information We Collect</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-foreground/80">
            <p>
              Account details: when you register, we collect your name, email address, and a securely stored password.
            </p>
            <p>
              X-ray images: the chest X-ray images you upload for analysis, along with the results we generate for them.
            </p>
            <p>
              Usage information: basic records of your activity, such as when you run an analysis, so we can show your
              history and keep the service working.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>How We Use Your Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-foreground/80">
            <p>We use your information only to provide the service. Specifically, we use it to:</p>
            <p>- Analyse the X-rays you upload and show you the results.</p>
            <p>- Keep a history of your scans so you can view them later.</p>
            <p>- Manage your account and keep it secure.</p>
            <p>- Respond to your support requests.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>How Your Data Is Stored</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-foreground/80">
            <p>
              Your account information and uploaded images are stored on the service&apos;s database and file storage.
              Passwords are never stored in plain text.
            </p>
            <p>
              We keep your data only for as long as your account is active or as needed to provide the service. You can
              ask us to delete your data at any time.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sharing Your Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-foreground/80">
            <p>
              We do not sell your personal information or X-ray images. Your data is not shared with third parties for
              advertising.
            </p>
            <p>
              Your results are yours to share. If you choose to download a report or share it with your doctor, that is
              entirely your decision.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your Choices and Rights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-foreground/80">
            <p>- You can view and update your account details on your profile page.</p>
            <p>- You can view or remove your past scans from your history.</p>
            <p>- You can request that we delete your account and associated data.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contact Us</CardTitle>
          </CardHeader>
          <CardContent className="text-foreground/80">
            If you have any questions about your privacy or this policy, please reach out through our{" "}
            <Link href="/contact" className="text-accent hover:underline">
              Contact &amp; Support
            </Link>{" "}
            page.
          </CardContent>
        </Card>

        <p className="text-center text-xs text-foreground/55">
          This Privacy Policy is provided for general information and may be updated from time to time.
        </p>
      </div>
    </div>
  );
}
