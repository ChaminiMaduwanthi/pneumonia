<?php

header("Content-Type: application/json");
require_once __DIR__ . "/../../config/cors.php";
require_once __DIR__ . "/../../config/db.php";
require_once __DIR__ . "/../../middleware/auth.php";

if ($_SERVER["REQUEST_METHOD"] !== "DELETE") {
  http_response_code(405);
  echo json_encode(["success" => false, "message" => "Method not allowed"]);
  exit;
}

$authUser = getAuthenticatedUser();
$userId = (int) $authUser["user_id"];
$scanId = (int) ($_GET["id"] ?? 0);

if ($scanId <= 0) {
  http_response_code(422);
  echo json_encode(["success" => false, "message" => "Invalid scan ID"]);
  exit;
}

$query = $pdo->prepare("SELECT original_image, gradcam_image FROM scans WHERE id = ? AND user_id = ?");
$query->execute([$scanId, $userId]);
$scan = $query->fetch();

if (!$scan) {
  http_response_code(404);
  echo json_encode(["success" => false, "message" => "Scan not found"]);
  exit;
}

$delete = $pdo->prepare("DELETE FROM scans WHERE id = ? AND user_id = ?");
$delete->execute([$scanId, $userId]);

$originalPath = __DIR__ . "/../../" . $scan["original_image"];
$gradcamPath = __DIR__ . "/../../" . $scan["gradcam_image"];
if (file_exists($originalPath)) {
  unlink($originalPath);
}
if ($scan["gradcam_image"] && file_exists($gradcamPath)) {
  unlink($gradcamPath);
}

echo json_encode(["success" => true, "message" => "Scan deleted"]);
