import Link from "next/link";
import { requireAuth } from "@/lib/guards";
import { SERVER_API_BASE_URL } from "@/lib/config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HistoryChart } from "@/components/charts/history-chart";

async function getScans(token: string, limit = 10) {
  try {
    const response = await fetch(`${SERVER_API_BASE_URL}/scans/list.php?page=1&limit=${limit}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const data = await response.json();
    return data?.data ?? [];
  } catch {
    return [];
  }
}

// Bucket the user's own scans by calendar month for the history chart. Only months
// that actually contain a scan are returned, so a user with no scans gets nothing.
function toMonthlyHistory(scans: { created_at: string }[]) {
  const buckets = new Map<string, { month: string; count: number; order: number }>();

  for (const scan of scans) {
    const date = new Date(scan.created_at);
    if (Number.isNaN(date.getTime())) {
      continue;
    }
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.count += 1;
      continue;
    }
    buckets.set(key, {
      month: date.toLocaleString("en-US", { month: "short", year: "numeric" }),
      count: 1,
      order: date.getFullYear() * 12 + date.getMonth(),
    });
  }

  return [...buckets.values()]
    .sort((a, b) => a.order - b.order)
    .map(({ month, count }) => ({ month, count }));
}

export default async function DashboardPage() {
  const session = await requireAuth();
  // The table below shows the 10 most recent scans; the chart needs the full history.
  const [scans, allScans] = await Promise.all([
    getScans(session.accessToken),
    getScans(session.accessToken, 1000),
  ]);
  const monthlyHistory = toMonthlyHistory(allScans);
  const currentDate = new Date().toLocaleDateString();

  // Stats are computed over the user's FULL history, not the 10 rows shown in the
  // table below — otherwise every card silently caps at 10.
  const totalScans = allScans.length;
  const normalResults = allScans.filter((scan: { disease: string }) => scan.disease === "Normal").length;
  // Out-of-distribution scans have no diagnosis, so they are neither "normal"
  // nor "disease detected".
  const withheld = allScans.filter((scan: { is_ood?: number | boolean | null }) => Number(scan.is_ood) === 1).length;
  const diseaseDetected = Math.max(0, totalScans - normalResults - withheld);

  const now = new Date();
  const thisMonth = allScans.filter((scan: { created_at: string }) => {
    const d = new Date(scan.created_at);
    return (
      !Number.isNaN(d.getTime()) &&
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth()
    );
  }).length;

  return (
    <div className="container-wrap space-y-6 py-8">
      <Card>
        <CardContent className="pt-6">
          <h1 className="text-2xl font-semibold">Welcome, {session.user.name}</h1>
          <p className="text-foreground/70">{currentDate}</p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          ["Total Scans", String(totalScans)],
          ["Normal Results", String(normalResults)],
          ["Disease Detected", String(diseaseDetected)],
          ["This Month", String(thisMonth)],
        ].map(([label, value]) => (
          <Card key={label}>
            <CardHeader>
              <CardTitle className="text-sm text-foreground/70">{label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-primary">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Scans</CardTitle>
          <Link href="/analyse">
            <Button>Upload New X-Ray</Button>
          </Link>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="py-2">Date</th>
                <th>Thumbnail</th>
                <th>Disease</th>
                <th>Status</th>
                <th>View</th>
              </tr>
            </thead>
            <tbody>
              {scans.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-foreground/60">
                    No scans yet.
                  </td>
                </tr>
              ) : (
                scans.map((scan: { id: number; created_at: string; disease: string; status: string }) => (
                  <tr key={scan.id} className="border-b border-border">
                    <td className="py-3">{new Date(scan.created_at).toLocaleDateString()}</td>
                    <td>Image</td>
                    <td>{scan.disease ?? "Pending"}</td>
                    <td>
                      <Badge tone={scan.status === "completed" ? "success" : "warning"}>{scan.status}</Badge>
                    </td>
                    <td>
                      <Link className="text-accent hover:underline" href={`/history/${scan.id}`}>
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Scan History by Month</CardTitle>
        </CardHeader>
        <CardContent>
          {monthlyHistory.length === 0 ? (
            <p className="py-6 text-center text-foreground/60">No scan history yet.</p>
          ) : (
            <HistoryChart data={monthlyHistory} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tip of the day</CardTitle>
        </CardHeader>
        <CardContent>
          Ensure uploaded X-rays are clear and centered for more reliable AI predictions.
        </CardContent>
      </Card>
    </div>
  );
}
