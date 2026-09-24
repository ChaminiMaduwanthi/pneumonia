import { API_BASE_URL } from "@/lib/config";

export type ReportLang = "en" | "si" | "ta";

export type ScanReportData = {
  scan_id: number;
  lang?: ReportLang;
};

export async function downloadScanReport(data: ScanReportData, token: string) {
  const lang = data.lang ?? "en";
  const response = await fetch(`${API_BASE_URL}/scans/report.php?id=${data.scan_id}&lang=${lang}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error("Failed to generate report");
  }

  const html = await response.text();
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const reportWindow = window.open(url, "_blank");

  if (!reportWindow) {
    URL.revokeObjectURL(url);
    throw new Error("Please allow pop-ups to open the PDF report");
  }

  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
