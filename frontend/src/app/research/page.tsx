import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { SERVER_API_BASE_URL } from "@/lib/config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ResearchFigure } from "@/components/research/research-figure";

type LogSummary = {
  epochs: number;
  accuracy: number | null;
  val_accuracy: number | null;
  loss: number | null;
  val_loss: number | null;
  val_auc: number | null;
} | null;

type ModelInfo = {
  key: string;
  label?: string;
  img_size?: [number, number];
  preprocess?: string;
  test_accuracy?: number;
  training?: { batch_size: number; head_lr: string; fine_tune_lr: string } | null;
  phase1: LogSummary;
  phase2: LogSummary;
  figures: string[];
};

type Overview = {
  dataset: { total: number; classes: Record<string, number>; splits: Record<string, number> } | null;
  classes: string[] | null;
  default_model: string | null;
  models: ModelInfo[];
  ood: Record<string, Record<string, unknown>>;
  usage: {
    total_scans: number;
    flagged_ood: number;
    by_disease: { disease: string; n: number }[];
    by_model: { model: string; n: number }[];
  };
};

async function getOverview(token: string): Promise<Overview | null> {
  try {
    const response = await fetch(`${SERVER_API_BASE_URL}/research/overview.php`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const payload = await response.json();
    return payload?.data ?? null;
  } catch {
    return null;
  }
}

const pct = (n: number, total: number) => (total > 0 ? ((n / total) * 100).toFixed(1) : "0.0");

export default async function ResearchPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }
  if (session.user.role !== "researcher" && session.user.role !== "admin") {
    redirect("/dashboard");
  }

  const data = await getOverview(session.accessToken);

  if (!data) {
    return (
      <div className="container-wrap py-10">
        <Card>
          <CardHeader>
            <CardTitle>Research data unavailable</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-foreground/70">
            The research API could not be reached. Check that Apache and the inference service on
            port 8001 are running.
          </CardContent>
        </Card>
      </div>
    );
  }

  const ds = data.dataset;
  const oodEntries = Object.entries(data.ood);

  return (
    <div className="container-wrap space-y-6 py-8">
      <div>
        <h1 className="gradient-text text-3xl font-extrabold tracking-tight">Research</h1>
        <p className="mt-1 text-foreground/70">
          The model, the data it was trained on, and how it is evaluated. Figures come straight from
          the training artefacts, so this page always matches the deployed model.
        </p>
      </div>

      {/* ── Dataset ─────────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Dataset</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {ds ? (
            <>
              <p className="text-sm text-foreground/70">
                Counted from <code>data_split.csv</code> — the split the training actually used.
                Total <strong>{ds.total.toLocaleString()}</strong> chest radiographs.
              </p>
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-primary">Class distribution</h3>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left">
                        <th className="py-1">Class</th>
                        <th className="text-right">Images</th>
                        <th className="text-right">Share</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(ds.classes).map(([name, n]) => (
                        <tr key={name} className="border-b border-border/50">
                          <td className="py-1.5">{name}</td>
                          <td className="text-right">{n.toLocaleString()}</td>
                          <td className="text-right text-foreground/65">{pct(n, ds.total)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-primary">Train / val / test</h3>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left">
                        <th className="py-1">Split</th>
                        <th className="text-right">Images</th>
                        <th className="text-right">Share</th>
                      </tr>
                    </thead>
                    <tbody>
                      {["train", "val", "test"].map((k) =>
                        ds.splits[k] !== undefined ? (
                          <tr key={k} className="border-b border-border/50">
                            <td className="py-1.5 capitalize">{k}</td>
                            <td className="text-right">{ds.splits[k].toLocaleString()}</td>
                            <td className="text-right text-foreground/65">
                              {pct(ds.splits[k], ds.total)}%
                            </td>
                          </tr>
                        ) : null
                      )}
                    </tbody>
                  </table>
                  <p className="mt-3 text-xs text-foreground/60">
                    The dataset is imbalanced — this shows up directly in per-class performance.
                  </p>
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-foreground/70">
              data_split.csv was not found, so the dataset breakdown cannot be shown.
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Models ──────────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Models compared</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="py-2">Model</th>
                <th>Input</th>
                <th>Preprocessing</th>
                <th>Batch</th>
                <th>Head LR</th>
                <th className="text-right">Test accuracy</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.models.map((m) => (
                <tr key={m.key} className="border-b border-border/50">
                  <td className="py-2 font-medium">{m.label ?? m.key}</td>
                  <td>{m.img_size ? `${m.img_size[0]}×${m.img_size[1]}` : "—"}</td>
                  <td>{m.preprocess === "effnetv2" ? "preprocess_input [-1,1]" : "rescale 1/255"}</td>
                  <td>{m.training?.batch_size ?? "—"}</td>
                  <td>{m.training?.head_lr ?? "—"}</td>
                  <td className="text-right font-semibold text-primary">
                    {m.test_accuracy !== undefined ? `${m.test_accuracy}%` : "—"}
                  </td>
                  <td className="pl-2">
                    {m.key === data.default_model && <Badge tone="success">Production</Badge>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-4 rounded-xl border border-amber-500/40 bg-amber-50/70 p-3 text-xs leading-relaxed text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
            <strong>Caveat.</strong> The comparison is not fully controlled: batch size and head
            learning rate differ between models, and EfficientNetV2S was trained with{" "}
            <code>rescale 1/255</code> while the EfficientNetV2 ImageNet weights expect{" "}
            <code>preprocess_input</code> ([-1,1]). That mismatch is the likely reason for its weaker
            result, so its accuracy reflects that training configuration rather than the
            architecture.
          </div>
        </CardContent>
      </Card>

      {/* ── Training history + figures per model ────────────────────────────── */}
      {data.models.map((m) => (
        <Card key={m.key}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{m.label ?? m.key} — training</CardTitle>
            {m.key === data.default_model && <Badge tone="success">Deployed</Badge>}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {(["phase1", "phase2"] as const).map((phase) => {
                const log = m[phase];
                if (!log) return null;
                return (
                  <div key={phase} className="rounded-xl border border-border p-3 text-sm">
                    <p className="font-semibold text-primary">
                      {phase === "phase1" ? "Phase 1 — frozen backbone" : "Phase 2 — fine-tuning"}
                    </p>
                    <p className="mt-1 text-foreground/70">{log.epochs} epochs</p>
                    <p className="text-foreground/70">
                      final train acc {log.accuracy !== null ? (log.accuracy * 100).toFixed(2) : "—"}% ·
                      val acc {log.val_accuracy !== null ? (log.val_accuracy * 100).toFixed(2) : "—"}%
                    </p>
                    {log.val_auc !== null && (
                      <p className="text-foreground/70">val AUC {log.val_auc.toFixed(4)}</p>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {m.figures.includes("confusion") && (
                <figure className="space-y-1">
                  <ResearchFigure model={m.key} fig="confusion" alt="Confusion matrix" />
                  <figcaption className="text-center text-xs text-foreground/65">
                    Confusion matrix (test set)
                  </figcaption>
                </figure>
              )}
              {m.figures.includes("phase1") && (
                <figure className="space-y-1">
                  <ResearchFigure model={m.key} fig="phase1" alt="Phase 1 training curves" />
                  <figcaption className="text-center text-xs text-foreground/65">
                    Phase 1 — frozen backbone
                  </figcaption>
                </figure>
              )}
              {m.figures.includes("phase2") && (
                <figure className="space-y-1">
                  <ResearchFigure model={m.key} fig="phase2" alt="Phase 2 training curves" />
                  <figcaption className="text-center text-xs text-foreground/65">
                    Phase 2 — fine-tuning
                  </figcaption>
                </figure>
              )}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* ── Architecture + explainability method ────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Production architecture</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="overflow-x-auto rounded-xl border border-border bg-muted/50 p-3 text-xs leading-relaxed">
{`Input 224 × 224 × 3
  └─ DenseNet121 backbone (ImageNet)  →  7 × 7 × 1024
  └─ GlobalAveragePooling2D           →  1024
  └─ BatchNormalization
  └─ Dense(512, relu, L2 1e-4) → Dropout(0.4)
  └─ Dense(256, relu, L2 1e-4) → Dropout(0.3)
  └─ Dense(4, softmax)`}
            </pre>
            <p className="mt-3 text-xs text-foreground/65">
              The 256-unit layer is the penultimate representation used by the out-of-distribution
              detector. Two-phase transfer learning: frozen backbone first, then fine-tuning at a
              lower learning rate.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Explainability — Grad-CAM</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-foreground/75">
            <p>
              Target layer is the DenseNet121 output at 7 × 7 × 1024. The <strong>pre-softmax
              logit</strong> is differentiated, not the softmax probability — at 99% confidence the
              softmax gradient vanishes and the heat map collapses.
            </p>
            <p>
              An audit against occlusion sensitivity (gradient-free) found the two agree
              (r ≈ 0.49) but both attend largely outside the lungs — the shortcut behaviour reported
              by DeGrave et al., <em>Nature Machine Intelligence</em> 3:610–619 (2021).
            </p>
            <p>
              The displayed map is therefore restricted to an estimated lung field (Teixeira et al.,
              <em> Sensors</em> 21:7116, 2021), raising in-lung heat-map mass from{" "}
              <strong>44.5% to 90.0%</strong>. The unmasked in-lung fraction is still reported per
              scan as <code>lung_focus</code>, so the underlying behaviour is not hidden.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── OOD calibration ─────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Out-of-distribution calibration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {oodEntries.length === 0 ? (
            <p className="text-sm text-foreground/70">No OOD artefacts found.</p>
          ) : (
            oodEntries.map(([key, a]) => {
              const thresholds = (a.thresholds ?? {}) as Record<string, number>;
              const auroc = (a.auroc_vs_synthetic_far_ood ?? {}) as Record<string, number>;
              const retention = (a.measured_id_retention ?? {}) as Record<string, number>;
              return (
                <div key={key} className="space-y-2">
                  <p className="text-sm font-semibold text-primary">{String(a.model_label ?? key)}</p>
                  <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-xl border border-border p-3">
                      <p className="text-xs text-foreground/60">Policy / feature dim</p>
                      <p className="font-medium">
                        {String(a.policy ?? "—")} · {String(a.feature_dim ?? "—")}-d
                      </p>
                    </div>
                    <div className="rounded-xl border border-border p-3">
                      <p className="text-xs text-foreground/60">Mahalanobis threshold</p>
                      <p className="font-medium">{thresholds.maha?.toFixed(2) ?? "—"}</p>
                    </div>
                    <div className="rounded-xl border border-border p-3">
                      <p className="text-xs text-foreground/60">ID retention (val / test)</p>
                      <p className="font-medium">
                        {retention.val !== undefined ? `${(retention.val * 100).toFixed(1)}%` : "—"} ·{" "}
                        {retention.test !== undefined ? `${(retention.test * 100).toFixed(1)}%` : "—"}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border p-3">
                      <p className="text-xs text-foreground/60">AUROC maha / energy</p>
                      <p className="font-medium">
                        {auroc.mahalanobis ?? "—"} · {auroc.energy ?? "—"}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div className="rounded-xl border border-amber-500/40 bg-amber-50/70 p-3 text-xs leading-relaxed text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
            <strong>Caveat.</strong> The AUROC figures are measured against a <em>synthetic</em>{" "}
            probe — noise, gradients and solid colour blocks generated during calibration. That is
            an indicative sanity check, not validation against real non-radiograph photographs.
            Near-OOD (a real chest X-ray of an untrained condition) is untested.
          </div>
        </CardContent>
      </Card>

      {/* ── Deployed usage ──────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Deployed system — aggregate usage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border p-3">
              <p className="text-xs text-foreground/60">Scans analysed</p>
              <p className="text-2xl font-bold text-primary">{data.usage.total_scans}</p>
            </div>
            <div className="rounded-xl border border-border p-3">
              <p className="text-xs text-foreground/60">Flagged out-of-distribution</p>
              <p className="text-2xl font-bold text-primary">{data.usage.flagged_ood}</p>
            </div>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="mb-2 text-sm font-semibold text-primary">Predictions by class</h3>
              {data.usage.by_disease.length === 0 ? (
                <p className="text-sm text-foreground/60">No scans yet.</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {data.usage.by_disease.map((d) => (
                    <li key={d.disease} className="flex justify-between border-b border-border/50 py-1">
                      <span>{d.disease}</span>
                      <span className="text-foreground/70">{d.n}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h3 className="mb-2 text-sm font-semibold text-primary">By model</h3>
              {data.usage.by_model.length === 0 ? (
                <p className="text-sm text-foreground/60">No scans yet.</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {data.usage.by_model.map((m) => (
                    <li key={m.model} className="flex justify-between border-b border-border/50 py-1">
                      <span>{m.model}</span>
                      <span className="text-foreground/70">{m.n}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <p className="text-xs text-foreground/60">
            Aggregate counts only — no patient images or per-user records are exposed here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
