import Link from "next/link";
import { getServerSession } from "next-auth";
import { SERVER_API_BASE_URL } from "@/lib/config";
import { authOptions } from "@/lib/auth";
import { AdminLogin } from "@/components/admin/admin-login";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

async function getData(path: string, token: string) {
  try {
    const response = await fetch(`${SERVER_API_BASE_URL}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const payload = await response.json();
    return payload.data ?? payload ?? [];
  } catch {
    return [];
  }
}

type AdminUser = {
  id: number;
  full_name: string;
  email: string;
  role: string;
  created_at: string;
  total_scans: number;
};

type AdminScan = {
  id: number;
  full_name?: string;
  email?: string;
  disease: string | null;
  disease_confidence: number | null;
  model?: string | null;
  is_ood?: number | boolean | null;
  status: string;
  created_at: string;
};

type Health = {
  api?: { ok: boolean; detail: string };
  database?: { ok: boolean; detail: string };
  ai_service?: {
    ok: boolean;
    detail: string;
    default_model?: string | null;
    ood_calibrated?: string[];
    latency_ms?: number;
  };
  storage?: { ok: boolean; xrays: number; gradcam: number };
  chat?: { ok: boolean; detail: string };
};

const ROLE_TONE: Record<string, "success" | "warning" | "default"> = {
  admin: "warning",
  researcher: "success",
};

function StatusRow({ label, ok, detail }: { label: string; ok: boolean; detail: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/50 py-2 last:border-0">
      <span className="flex items-center gap-2 text-sm font-medium">
        <span
          className={`h-2.5 w-2.5 shrink-0 rounded-full ${ok ? "bg-emerald-500" : "bg-red-500"}`}
        />
        {label}
      </span>
      <span className="text-right text-xs text-foreground/65">{detail}</span>
    </div>
  );
}

export default async function AdminPage() {
  const session = await getServerSession(authOptions);

  // Anyone who is not signed in as an admin gets the admin login form right here,
  // instead of being bounced to the normal /login page.
  if (session?.user?.role !== "admin") {
    return <AdminLogin />;
  }

  const [stats, users, scans, activity, health] = await Promise.all([
    getData("/admin/stats.php", session.accessToken),
    getData("/admin/users.php", session.accessToken),
    getData("/admin/scans.php", session.accessToken),
    getData("/admin/activity.php", session.accessToken),
    getData("/admin/health.php", session.accessToken),
  ]);

  const userList: AdminUser[] = Array.isArray(users) ? users : [];
  const scanList: AdminScan[] = Array.isArray(scans) ? scans : [];
  const activityList = Array.isArray(activity) ? activity : [];
  const h: Health = Array.isArray(health) ? {} : health;

  const covidCount =
    (stats.total_scans ?? 0) -
    (stats.viral_count ?? 0) -
    (stats.bacterial_count ?? 0) -
    (stats.normal_count ?? 0);
  const oodCount = scanList.filter((s) => Number(s.is_ood) === 1).length;

  const roleCounts = userList.reduce<Record<string, number>>((acc, u) => {
    acc[u.role] = (acc[u.role] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="container-wrap space-y-6 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="gradient-text text-3xl font-extrabold tracking-tight">Admin Console</h1>
          <p className="mt-1 text-foreground/70">
            Signed in as {session.user.name ?? session.user.email}
          </p>
        </div>
        <Link href="/research" className="text-sm font-medium text-accent hover:underline">
          Research &amp; model details →
        </Link>
      </div>

      {/* ── Key numbers ─────────────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Total Users", String(stats.total_users ?? 0)],
          ["Total Scans", String(stats.total_scans ?? 0)],
          ["Flagged Out-of-Distribution", String(oodCount)],
          ["Registered Researchers", String(roleCounts.researcher ?? 0)],
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

      {/* ── Health + breakdown ──────────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>System Health</CardTitle>
          </CardHeader>
          <CardContent>
            {h.api ? (
              <>
                <StatusRow label="Backend API" ok={h.api.ok} detail={h.api.detail} />
                <StatusRow
                  label="Database"
                  ok={Boolean(h.database?.ok)}
                  detail={h.database?.detail ?? "—"}
                />
                <StatusRow
                  label="AI Inference Service"
                  ok={Boolean(h.ai_service?.ok)}
                  detail={
                    h.ai_service?.ok
                      ? `${h.ai_service.detail}${
                          h.ai_service.latency_ms !== undefined
                            ? ` · ${h.ai_service.latency_ms} ms`
                            : ""
                        }`
                      : (h.ai_service?.detail ?? "unreachable")
                  }
                />
                <StatusRow
                  label="Upload Storage"
                  ok={Boolean(h.storage?.ok)}
                  detail={`${h.storage?.xrays ?? 0} x-rays · ${h.storage?.gradcam ?? 0} heatmaps`}
                />
                <StatusRow
                  label="Chat Assistant"
                  ok={Boolean(h.chat?.ok)}
                  detail={h.chat?.detail ?? "—"}
                />
                {h.ai_service?.ok && (
                  <p className="pt-3 text-xs text-foreground/60">
                    Production model: <strong>{h.ai_service.default_model}</strong> · OOD calibrated
                    for {h.ai_service.ood_calibrated?.length ? h.ai_service.ood_calibrated.join(", ") : "none"}
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-foreground/70">Health data unavailable.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Predictions by Class</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {[
                ["Normal", stats.normal_count ?? 0],
                ["Bacterial Pneumonia", stats.bacterial_count ?? 0],
                ["Viral Pneumonia", stats.viral_count ?? 0],
                ["COVID-19", Math.max(0, covidCount)],
              ].map(([label, n]) => {
                const total = Math.max(1, stats.total_scans ?? 1);
                const width = ((Number(n) / total) * 100).toFixed(1);
                return (
                  <li key={String(label)}>
                    <div className="flex justify-between">
                      <span>{label}</span>
                      <span className="text-foreground/70">
                        {String(n)} ({width}%)
                      </span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[hsl(var(--grad-from))] to-[hsl(var(--grad-to))]"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 text-xs text-foreground/60">
              Counts of predictions made by the deployed system — not model accuracy.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Users ───────────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Users</CardTitle>
          <span className="text-sm text-foreground/65">
            {Object.entries(roleCounts)
              .map(([r, n]) => `${n} ${r}`)
              .join(" · ") || "none"}
          </span>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="py-2">Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Joined</th>
                <th className="text-right">Scans</th>
              </tr>
            </thead>
            <tbody>
              {userList.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-foreground/60">
                    No users yet.
                  </td>
                </tr>
              ) : (
                userList.map((user) => (
                  <tr key={user.id} className="border-b border-border/50">
                    <td className="py-2">{user.full_name}</td>
                    <td className="text-foreground/75">{user.email}</td>
                    <td>
                      <Badge tone={ROLE_TONE[user.role] ?? "default"}>{user.role}</Badge>
                    </td>
                    <td>{new Date(user.created_at).toLocaleDateString()}</td>
                    <td className="text-right">{user.total_scans ?? 0}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* ── Recent scans ────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Scans</CardTitle>
          <span className="text-sm text-foreground/65">{scanList.length} total</span>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="py-2">Date</th>
                <th>User</th>
                <th>Result</th>
                <th>Confidence</th>
                <th>Model</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {scanList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-foreground/60">
                    No scans yet.
                  </td>
                </tr>
              ) : (
                scanList.slice(0, 15).map((scan) => {
                  const ood = Number(scan.is_ood) === 1;
                  return (
                    <tr key={scan.id} className="border-b border-border/50">
                      <td className="py-2">{new Date(scan.created_at).toLocaleDateString()}</td>
                      <td className="text-foreground/75">{scan.full_name ?? scan.email ?? "—"}</td>
                      <td>
                        {ood ? (
                          <span className="text-amber-600 dark:text-amber-400">
                            Withheld (out-of-distribution)
                          </span>
                        ) : (
                          (scan.disease ?? "—")
                        )}
                      </td>
                      <td>{ood || scan.disease_confidence === null ? "—" : `${scan.disease_confidence}%`}</td>
                      <td className="text-foreground/75">{scan.model ?? "—"}</td>
                      <td>
                        <Badge tone={scan.status === "completed" ? "success" : "warning"}>
                          {scan.status}
                        </Badge>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          {scanList.length > 15 && (
            <p className="pt-3 text-xs text-foreground/60">Showing the 15 most recent of {scanList.length}.</p>
          )}
        </CardContent>
      </Card>

      {/* ── Activity ────────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {activityList.length === 0 ? (
            <p className="text-foreground/60">No activity recorded.</p>
          ) : (
            activityList.map((log: { id: number; action: string; created_at: string }) => (
              <p key={log.id} className="border-b border-border/50 pb-1">
                <span className="text-foreground/60">
                  {new Date(log.created_at).toLocaleString()}
                </span>{" "}
                — {log.action}
              </p>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
