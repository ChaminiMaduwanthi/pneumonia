"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { API_BASE_URL, imageUrl } from "@/lib/config";
import { downloadScanReport, type ReportLang } from "@/lib/scan-report";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CareInstructionsCard, type CareInstructions } from "@/components/scan/care-instructions";

type ScanDetail = {
  id: number;
  original_image?: string | null;
  gradcam_image?: string | null;
  disease: string;
  disease_confidence: number;
  viral_score: number;
  bacterial_score: number;
  normal_score: number;
  covid_score: number;
  model?: string;
  is_ood?: number | boolean | null;
  ood_score?: number | null;
  ood_reason?: string | null;
  patient_notes: string;
  explanation: string;
  created_at?: string;
};

export default function ScanDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data } = useSession();
  const [scan, setScan] = useState<ScanDetail | null>(null);
  const [care, setCare] = useState<CareInstructions | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [reportLang, setReportLang] = useState<ReportLang>("en");

  useEffect(() => {
    const load = async () => {
      if (!data?.accessToken) return;
      const response = await fetch(`${API_BASE_URL}/scans/detail.php?id=${params.id}`, {
        headers: { Authorization: `Bearer ${data.accessToken}` },
      });
      const payload = await response.json();
      setScan(payload.data ?? null);
      setCare(payload.care_instructions ?? null);
    };
    void load();
  }, [params.id, data?.accessToken]);

  const onDownloadPdf = async () => {
    if (!scan || !data?.accessToken) return;

    setDownloadingPdf(true);
    try {
      await downloadScanReport({ scan_id: scan.id, lang: reportLang }, data.accessToken);
      toast.success("Report opened. Choose 'Save as PDF' in the print dialog.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate PDF");
    } finally {
      setDownloadingPdf(false);
    }
  };

  const deleteScan = async () => {
    if (!confirm("Delete this scan permanently?") || !data?.accessToken) return;
    const response = await fetch(`${API_BASE_URL}/scans/delete.php?id=${params.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${data.accessToken}` },
    });
    const payload = await response.json();
    if (!response.ok || !payload.success) {
      toast.error(payload.message ?? "Delete failed");
      return;
    }
    toast.success("Scan deleted");
    router.push("/history");
  };

  if (!scan) {
    return <div className="container-wrap py-8">Loading scan details...</div>;
  }

  const isOod = Boolean(Number(scan.is_ood));

  return (
    <div className="container-wrap space-y-6 py-8">
      {isOod && (
        <div className="rounded-2xl border-2 border-amber-500/60 bg-amber-50 p-5 text-amber-900 dark:border-amber-400/40 dark:bg-amber-950/40 dark:text-amber-100">
          <p className="text-base font-bold">⚠ Out-of-distribution image — diagnosis unreliable</p>
          <p className="mt-1 text-sm leading-relaxed">
            {scan.ood_reason ??
              "This image did not resemble the chest X-rays the model was trained on. The result below is shown for reference only and should not be used clinically."}
          </p>
        </div>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Scan Detail #{scan.id}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <figure className="space-y-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl(scan.original_image)}
              alt="Uploaded image"
              className="h-72 w-full rounded-xl border border-border object-contain bg-slate-50 dark:bg-slate-900"
            />
            <figcaption className="text-center text-sm text-foreground/65">
              {isOod ? "Uploaded image" : "Original X-ray"}
            </figcaption>
          </figure>
          {!isOod && (
            <figure className="space-y-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl(scan.gradcam_image)}
                alt="Grad-CAM heatmap"
                className="h-72 w-full rounded-xl border border-accent/30 object-contain bg-slate-50 shadow-glow dark:bg-slate-900"
              />
              <figcaption className="text-center text-sm text-foreground/65">Grad-CAM Heatmap</figcaption>
            </figure>
          )}
        </CardContent>
      </Card>

      {!isOod && (
        <Card>
          <CardHeader>
            <CardTitle>Result Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm md:grid-cols-2">
            <p>Disease: {scan.disease}</p>
            <p>Disease confidence: {scan.disease_confidence}%</p>
            <p>Model: {scan.model ?? "DenseNet121"}</p>
            <p>COVID-19 score: {scan.covid_score}</p>
            <p>Viral score: {scan.viral_score}</p>
            <p>Bacterial score: {scan.bacterial_score}</p>
            <p>Normal score: {scan.normal_score}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Patient Notes</CardTitle>
        </CardHeader>
        <CardContent>{scan.patient_notes || "No notes provided."}</CardContent>
      </Card>

      {!isOod && (
        <Card>
          <CardHeader>
            <CardTitle>Grad-CAM Explanation</CardTitle>
          </CardHeader>
          <CardContent>{scan.explanation}</CardContent>
        </Card>
      )}

      {!isOod && care && <CareInstructionsCard care={care} />}

      <div className="flex flex-wrap items-center gap-3">
        <select
          value={reportLang}
          onChange={(event) => setReportLang(event.target.value as ReportLang)}
          aria-label="Report language"
          className="rounded-md border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="en">English</option>
          <option value="si">සිංහල</option>
          <option value="ta">தமிழ்</option>
        </select>
        <Button variant="outline" onClick={onDownloadPdf} disabled={downloadingPdf}>
          {downloadingPdf ? "Generating PDF..." : "Download PDF Report"}
        </Button>
        <Link href="/history">
          <Button variant="ghost">Back to History</Button>
        </Link>
        <Button variant="destructive" onClick={deleteScan}>
          Delete Scan
        </Button>
      </div>
    </div>
  );
}
