<?php

/**
 * Real system health for the admin console.
 *
 * The console used to display a hard-coded "AI Inference: Integration Pending"
 * line, which was both stale and wrong. This probes the services instead, so the
 * panel reflects what is actually running.
 */

header("Content-Type: application/json");
require_once __DIR__ . "/../../config/cors.php";
require_once __DIR__ . "/../../config/db.php";
require_once __DIR__ . "/../../config/ai.php";
require_once __DIR__ . "/../../middleware/auth.php";
require_once __DIR__ . "/../../middleware/admin.php";

$authUser = getAuthenticatedUser();
requireAdmin($authUser);

if ($_SERVER["REQUEST_METHOD"] !== "GET") {
  http_response_code(405);
  echo json_encode(["success" => false, "message" => "Method not allowed"]);
  exit;
}

// ── Database ──────────────────────────────────────────────────────────────────
$database = ["ok" => false, "detail" => "unreachable"];
try {
  $version = $pdo->query("SELECT VERSION()")->fetchColumn();
  $database = ["ok" => true, "detail" => (string) $version];
} catch (Throwable $e) {
  $database = ["ok" => false, "detail" => "query failed"];
}

// ── AI inference service ──────────────────────────────────────────────────────
$started = microtime(true);
$curl = curl_init("{$AI_SERVICE_URL}/health");
curl_setopt_array($curl, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 8]);
$raw = curl_exec($curl);
$status = curl_getinfo($curl, CURLINFO_HTTP_CODE);
curl_close($curl);
$latencyMs = (int) round((microtime(true) - $started) * 1000);

$ai = ["ok" => false, "detail" => "unreachable — start the service on port 8001"];
if ($raw !== false && $status === 200) {
  $body = json_decode($raw, true);
  $loaded = $body["loaded_models"] ?? [];
  $calibrated = array_keys(array_filter($body["ood_calibrated"] ?? []));
  $ai = [
    "ok" => true,
    "detail" => "loaded: " . (implode(", ", $loaded) ?: "none"),
    "default_model" => $body["default_model"] ?? null,
    "ood_calibrated" => $calibrated,
    "latency_ms" => $latencyMs,
  ];
}

// ── Uploads directory ─────────────────────────────────────────────────────────
$xrays = __DIR__ . "/../../uploads/xrays";
$gradcam = __DIR__ . "/../../uploads/gradcam";
$countFiles = function (string $dir): int {
  if (!is_dir($dir)) {
    return 0;
  }
  return max(0, count(scandir($dir)) - 2);
};
$storage = [
  "ok" => is_dir($xrays) && is_writable($xrays) && is_dir($gradcam) && is_writable($gradcam),
  "xrays" => $countFiles($xrays),
  "gradcam" => $countFiles($gradcam),
];

// ── Chat assistant (configured, not called — calling it would burn quota) ─────
$chatConfigured = false;
$envFile = __DIR__ . "/../../.env";
if (is_file($envFile)) {
  $chatConfigured = strpos((string) file_get_contents($envFile), "GEMINI_API_KEY=") !== false;
}

echo json_encode([
  "success" => true,
  "data" => [
    "api" => ["ok" => true, "detail" => "PHP " . PHP_VERSION],
    "database" => $database,
    "ai_service" => $ai,
    "storage" => $storage,
    "chat" => ["ok" => $chatConfigured, "detail" => $chatConfigured ? "API key configured" : "no API key"],
    "checked_at" => gmdate("c"),
  ],
]);
