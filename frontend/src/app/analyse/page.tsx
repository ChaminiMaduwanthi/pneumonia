"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, UploadCloud } from "lucide-react";
import { API_BASE_URL, imageUrl } from "@/lib/config";
import { downloadScanReport, type ReportLang } from "@/lib/scan-report";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CareInstructionsCard, type CareInstructions } from "@/components/scan/care-instructions";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";

type OodInfo = {
  available?: boolean;
  is_ood?: boolean;
  ood_confidence?: number;
  reason?: string;
  scores?: Record<string, number>;
  thresholds?: Record<string, number>;
  flags?: Record<string, boolean>;
};

type ResultData = {
  scan_id: number;
  original_image?: string;
  disease: string;
  disease_confidence: number;
  all_class_scores: Record<string, number>;
  gradcam_image: string;
  explanation: string;
  model?: string;
  is_ood?: boolean;
  ood?: OodInfo;
  care_instructions?: CareInstructions | null;
  patient_notes?: string | null;
  timestamp?: string;
};

export default function AnalysePage() {
  const router = useRouter();
  const { data } = useSession();
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [reportLang, setReportLang] = useState<ReportLang>("en");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ResultData | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const onSaveResult = async () => {
    if (!result) return;

    setSaving(true);
    try {
      toast.success("Result saved to your scan history");
      router.push(`/history/${result.scan_id}`);
    } finally {
      setSaving(false);
    }
  };

  const onDownloadPdf = async () => {
    if (!result || !data?.accessToken) return;

    setDownloadingPdf(true);
    try {
      await downloadScanReport({ scan_id: result.scan_id, lang: reportLang }, data.accessToken);
      toast.success("Report opened. Choose 'Save as PDF' in the print dialog.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate PDF");
    } finally {
      setDownloadingPdf(false);
    }
  };

  const onAnalyse = async () => {
    if (!file || !data?.accessToken) {
      toast.error("Please upload an image first");
      return;
    }

    setLoading(true);
    setProgress(10);
    const timer = setInterval(() => {
      setProgress((value) => Math.min(value + 15, 90));
    }, 350);

    const formData = new FormData();
    formData.append("xray", file);
    formData.append("patient_notes", notes);

    try {
      const response = await fetch(`${API_BASE_URL}/scans/upload.php`, {
        method: "POST",
        headers: { Authorization: `Bearer ${data.accessToken}` },
        body: formData,
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.message ?? "Analysis failed");
      }
      setResult(payload);
      setProgress(100);
      toast.success("Analysis complete");
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      clearInterval(timer);
      setLoading(false);
    }
  };

  return (
    <div className="container-wrap relative space-y-6 py-10">
      <div className="animate-in-up text-center">
        <h1 className="gradient-text text-4xl font-extrabold tracking-tight">Upload &amp; Analyse</h1>
        <p className="mt-2 text-foreground/65">Upload a chest radiograph to get a diagnosis and a Grad-CAM heatmap.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload &amp; Analyse</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="group flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-accent/40 bg-accent/5 p-6 text-center transition-all duration-300 ease-spring hover:-translate-y-0.5 hover:border-accent hover:bg-accent/10 hover:shadow-glow">
            <span className="mb-3 flex h-14 w-14 animate-float items-center justify-center rounded-2xl bg-gradient-to-br from-[hsl(var(--grad-from))] to-[hsl(var(--grad-to))] text-white shadow-glow">
              <UploadCloud className="h-7 w-7" />
            </span>
            <span className="font-semibold text-primary">Drag and drop X-ray (JPG/PNG)</span>
            <span className="mt-1 text-sm text-foreground/60">or click to browse</span>
            <input
              type="file"
              className="hidden"
              accept="image/png,image/jpeg"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </label>
          {file && (
            <div className="rounded-md border border-border p-3 text-sm">
              <p>{file.name}</p>
              <p className="text-foreground/70">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
          )}
          <Textarea
            placeholder="Patient notes (optional)"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
          {loading && (
            <div className="space-y-2">
              <p className="text-sm">AI is analysing your X-ray...</p>
              <Progress value={progress} />
            </div>
          )}
          <Button onClick={onAnalyse} disabled={loading || !file}>
            Analyse X-Ray
          </Button>
        </CardContent>
      </Card>

      {result && (
        <div className="space-y-6" ref={resultsRef}>
          {result.is_ood && (
            <div className="animate-in-up rounded-2xl border-2 border-amber-500/60 bg-amber-50 p-5 text-amber-900 shadow-sm dark:border-amber-400/40 dark:bg-amber-950/40 dark:text-amber-100">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-amber-600 dark:text-amber-400" />
                <div className="space-y-1">
                  <p className="text-base font-bold">Out-of-distribution image — diagnosis withheld</p>
                  <p className="text-sm leading-relaxed">
                    {result.ood?.reason ??
                      "This image does not resemble the chest X-rays the model was trained on, so a class prediction is not reliable."}
                  </p>
                  <p className="text-sm">
                    No diagnosis has been produced. Please upload a clear chest X-ray of one of the supported
                    conditions (COVID-19, Normal, Bacterial Pneumonia, Viral Pneumonia).
                  </p>
                </div>
              </div>
            </div>
          )}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Results</CardTitle>
              {result.model && (
                <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent ring-1 ring-accent/20">
                  Model: {result.model}
                </span>
              )}
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <figure className="space-y-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl(result.original_image)}
                  alt="Uploaded image"
                  className="h-72 w-full rounded-xl border border-border object-contain bg-slate-50 dark:bg-slate-900"
                />
                <figcaption className="text-center text-sm text-foreground/65">
                  {result.is_ood ? "Uploaded image" : "Original X-ray"}
                </figcaption>
              </figure>
              {!result.is_ood && (
                <figure className="space-y-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageUrl(result.gradcam_image)}
                    alt="Grad-CAM heatmap"
                    className="h-72 w-full rounded-xl border border-accent/30 object-contain bg-slate-50 shadow-glow dark:bg-slate-900"
                  />
                  <figcaption className="text-center text-sm text-foreground/65">Grad-CAM Heatmap</figcaption>
                </figure>
              )}
            </CardContent>
          </Card>

          {!result.is_ood && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Disease Result</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-xl font-bold text-primary">{result.disease}</p>
                  <p className="text-sm text-foreground/70">{result.disease_confidence}% confidence</p>
                  <Progress value={result.disease_confidence} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>All Class Confidence Scores</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="w-full">
                    <ResponsiveContainer width="100%" height={256} minHeight={256}>
                      <BarChart
                        data={Object.entries(result.all_class_scores).map(([name, score]) => ({ name, score }))}
                        margin={{ top: 8, right: 8, left: 0, bottom: 8 }}
                      >
                        <XAxis
                          dataKey="name"
                          interval={0}
                          tick={{ fontSize: 12 }}
                          tickFormatter={(value: string) => value.replace(" Pneumonia", "")}
                        />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="score" fill="#1282A2" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Grad-CAM Explanation</CardTitle>
                </CardHeader>
                <CardContent>{result.explanation}</CardContent>
              </Card>

              {result.care_instructions && <CareInstructionsCard care={result.care_instructions} />}
            </>
          )}

          <p className="text-sm text-amber-700 dark:text-amber-300">
            This system is a decision-support tool only and does not replace professional medical diagnosis.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button onClick={onSaveResult} disabled={saving}>
              {saving ? "Saving..." : "Save Result"}
            </Button>
            <div className="flex items-center gap-2">
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
            </div>
            <Button variant="ghost" onClick={() => setResult(null)}>
              Analyse Another
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
