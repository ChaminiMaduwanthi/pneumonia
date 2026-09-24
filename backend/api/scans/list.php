<?php

header("Content-Type: application/json");
require_once __DIR__ . "/../../config/cors.php";
require_once __DIR__ . "/../../config/db.php";
require_once __DIR__ . "/../../middleware/auth.php";

if ($_SERVER["REQUEST_METHOD"] !== "GET") {
  http_response_code(405);
  echo json_encode(["success" => false, "message" => "Method not allowed"]);
  exit;
}

$authUser = getAuthenticatedUser();
$userId = (int) $authUser["user_id"];
$page = max((int) ($_GET["page"] ?? 1), 1);
$limit = max((int) ($_GET["limit"] ?? 10), 1);
$offset = ($page - 1) * $limit;

$query = $pdo->prepare("
  SELECT id, original_image, gradcam_image, disease, disease_confidence, severity, severity_confidence,
         is_ood, status, created_at
  FROM scans
  WHERE user_id = ?
  ORDER BY created_at DESC
  LIMIT ? OFFSET ?
");
$query->bindValue(1, $userId, PDO::PARAM_INT);
$query->bindValue(2, $limit, PDO::PARAM_INT);
$query->bindValue(3, $offset, PDO::PARAM_INT);
$query->execute();
$rows = $query->fetchAll();

echo json_encode([
  "success" => true,
  "page" => $page,
  "limit" => $limit,
  "data" => $rows,
]);
