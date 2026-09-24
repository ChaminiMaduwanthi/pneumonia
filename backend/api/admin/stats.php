<?php

header("Content-Type: application/json");
require_once __DIR__ . "/../../config/cors.php";
require_once __DIR__ . "/../../config/db.php";
require_once __DIR__ . "/../../middleware/auth.php";
require_once __DIR__ . "/../../middleware/admin.php";

$authUser = getAuthenticatedUser();
requireAdmin($authUser);

if ($_SERVER["REQUEST_METHOD"] !== "GET") {
  http_response_code(405);
  echo json_encode(["success" => false, "message" => "Method not allowed"]);
  exit;
}

$stats = [
  "total_users" => (int) $pdo->query("SELECT COUNT(*) FROM users")->fetchColumn(),
  "total_scans" => (int) $pdo->query("SELECT COUNT(*) FROM scans")->fetchColumn(),
  "viral_count" => (int) $pdo->query("SELECT COUNT(*) FROM scans WHERE disease = 'Viral Pneumonia'")->fetchColumn(),
  "bacterial_count" => (int) $pdo->query("SELECT COUNT(*) FROM scans WHERE disease = 'Bacterial Pneumonia'")->fetchColumn(),
  "normal_count" => (int) $pdo->query("SELECT COUNT(*) FROM scans WHERE disease = 'Normal'")->fetchColumn(),
];

echo json_encode(["success" => true, "data" => $stats]);
