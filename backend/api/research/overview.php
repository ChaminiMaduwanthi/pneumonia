<?php

/**
 * Research overview: the model, dataset and evaluation details behind the system.
 *
 * Restricted to researcher and admin accounts. Everything returned here is read
 * from the actual training artefacts and the live inference service — nothing is
 * hard-coded, so the page can never drift away from the model that is deployed.
 */

header("Content-Type: application/json");
require_once __DIR__ . "/../../config/cors.php";
require_once __DIR__ . "/../../config/db.php";
require_once __DIR__ . "/../../config/ai.php";
require_once __DIR__ . "/../../middleware/auth.php";

if ($_SERVER["REQUEST_METHOD"] !== "GET") {
  http_response_code(405);
  echo json_encode(["success" => false, "message" => "Method not allowed"]);
  exit;
}

$authUser = getAuthenticatedUser();
$role = $authUser["role"] ?? "";
if (!in_array($role, ["researcher", "admin"], true)) {
  http_response_code(403);
  echo json_encode(["success" => false, "message" => "Researcher access required"]);
  exit;
}

$MODELS_ROOT = realpath(__DIR__ . "/../../../models");
$AI_ROOT = realpath(__DIR__ . "/../../../ai-service");

// Registry keys -> the workspace folder that holds that model's artefacts.
$WORKSPACES = [
  "densenet121" => ["DenseNet121", "densenet121_workspace"],
  "efficientnetv2b3" => ["EfficientNetV2B3", "efficientnetv2b3_workspace"],
  "efficientnetv2s" => ["EfficientNetV2S", "efficientnetv2s_workspace"],
];

// Training hyper-parameters taken from each notebook. They differ between models,
// which is exactly why they are surfaced rather than hidden.
$TRAINING = [
  "densenet121" => ["batch_size" => 32, "head_lr" => "1e-4", "fine_tune_lr" => "1e-5"],
  "efficientnetv2b3" => ["batch_size" => 24, "head_lr" => "1e-3", "fine_tune_lr" => "1e-5"],
  "efficientnetv2s" => ["batch_size" => 16, "head_lr" => "1e-4", "fine_tune_lr" => "1e-5"],
];

// ── Dataset composition, counted from the split the training actually used ─────
function readSplit(string $csv): ?array
{
  if (!is_file($csv)) {
    return null;
  }
  $fh = fopen($csv, "r");
  if (!$fh) {
    return null;
  }
  $header = fgetcsv($fh);
  $iLabel = array_search("label", $header, true);
  $iSplit = array_search("split", $header, true);
  if ($iLabel === false || $iSplit === false) {
    fclose($fh);
    return null;
  }
  $classes = [];
  $splits = [];
  $total = 0;
  while (($row = fgetcsv($fh)) !== false) {
    if (count($row) <= max($iLabel, $iSplit)) {
      continue;
    }
    $classes[$row[$iLabel]] = ($classes[$row[$iLabel]] ?? 0) + 1;
    $splits[$row[$iSplit]] = ($splits[$row[$iSplit]] ?? 0) + 1;
    $total++;
  }
  fclose($fh);
  arsort($classes);
  return ["total" => $total, "classes" => $classes, "splits" => $splits];
}

// ── Training history: epoch count and final-epoch metrics from the CSV logs ────
function readLog(string $csv): ?array
{
  if (!is_file($csv)) {
    return null;
  }
  $rows = array_filter(array_map("str_getcsv", file($csv)));
  if (count($rows) < 2) {
    return null;
  }
  $header = array_shift($rows);
  $last = array_combine($header, end($rows));
  $pick = function ($key) use ($last) {
    return isset($last[$key]) ? round((float) $last[$key], 4) : null;
  };
  return [
    "epochs" => count($rows),
    "accuracy" => $pick("accuracy"),
    "val_accuracy" => $pick("val_accuracy"),
    "loss" => $pick("loss"),
    "val_loss" => $pick("val_loss"),
    "val_auc" => $pick("val_auc"),
  ];
}

$dataset = null;
$models = [];

foreach ($WORKSPACES as $key => [$dir, $ws]) {
  $base = "{$MODELS_ROOT}/{$dir}/{$ws}";
  if ($dataset === null) {
    $dataset = readSplit("{$base}/data_split.csv");
  }

  $figures = [];
  foreach (["confusion" => "confusion_matrix.png",
            "phase1" => "history_Phase1_Frozen.png",
            "phase2" => "history_Phase2_FineTune.png"] as $tag => $file) {
    if (is_file("{$base}/{$file}")) {
      $figures[] = $tag;
    }
  }

  $models[$key] = [
    "key" => $key,
    "training" => $TRAINING[$key] ?? null,
    "phase1" => readLog("{$base}/log_phase1.csv"),
    "phase2" => readLog("{$base}/log_phase2.csv"),
    "figures" => $figures,
  ];
}

// ── Live model registry from the inference service (label, size, accuracy) ─────
$registry = null;
$curl = curl_init("{$AI_SERVICE_URL}/models");
curl_setopt_array($curl, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 10]);
$raw = curl_exec($curl);
$status = curl_getinfo($curl, CURLINFO_HTTP_CODE);
curl_close($curl);
if ($raw !== false && $status === 200) {
  $registry = json_decode($raw, true);
}
if (is_array($registry["models"] ?? null)) {
  foreach ($registry["models"] as $key => $info) {
    if (isset($models[$key])) {
      $models[$key] = array_merge($models[$key], $info);
    }
  }
}

// ── Out-of-distribution calibration artefacts ─────────────────────────────────
$ood = [];
foreach (glob("{$AI_ROOT}/ood_artifacts/*_ood.json") ?: [] as $file) {
  $parsed = json_decode((string) file_get_contents($file), true);
  if (is_array($parsed)) {
    $ood[$parsed["model"] ?? basename($file)] = $parsed;
  }
}

// ── Aggregate usage of the deployed system (no per-patient data) ──────────────
$usage = [
  "total_scans" => (int) $pdo->query("SELECT COUNT(*) FROM scans")->fetchColumn(),
  "flagged_ood" => (int) $pdo->query("SELECT COUNT(*) FROM scans WHERE is_ood = 1")->fetchColumn(),
  "by_disease" => $pdo->query(
    "SELECT disease, COUNT(*) AS n FROM scans WHERE disease IS NOT NULL GROUP BY disease ORDER BY n DESC"
  )->fetchAll(),
  "by_model" => $pdo->query(
    "SELECT model, COUNT(*) AS n FROM scans WHERE model IS NOT NULL GROUP BY model ORDER BY n DESC"
  )->fetchAll(),
];

echo json_encode([
  "success" => true,
  "data" => [
    "dataset" => $dataset,
    "classes" => $registry["classes"] ?? null,
    "default_model" => $registry["default"] ?? null,
    "models" => array_values($models),
    "ood" => $ood,
    "usage" => $usage,
  ],
]);
