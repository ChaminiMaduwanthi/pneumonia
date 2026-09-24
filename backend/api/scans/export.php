<?php

require_once __DIR__ . "/../../config/cors.php";
require_once __DIR__ . "/../../config/db.php";
require_once __DIR__ . "/../../middleware/auth.php";

if ($_SERVER["REQUEST_METHOD"] !== "GET") {
  http_response_code(405);
  echo "Method not allowed";
  exit;
}

$authUser = getAuthenticatedUser();
$userId = (int) $authUser["user_id"];

$query = $pdo->prepare("SELECT created_at, disease, disease_confidence, model, status FROM scans WHERE user_id = ? ORDER BY created_at DESC");
$query->execute([$userId]);
$rows = $query->fetchAll();

header("Content-Type: text/csv");
header("Content-Disposition: attachment; filename=scans_export.csv");

$output = fopen("php://output", "w");
fputcsv($output, ["Date", "Disease", "Confidence", "Model", "Status"]);
foreach ($rows as $row) {
  fputcsv($output, [
    $row["created_at"],
    $row["disease"],
    $row["disease_confidence"],
    $row["model"],
    $row["status"],
  ]);
}
fclose($output);
