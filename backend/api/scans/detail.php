<?php

header("Content-Type: application/json");
require_once __DIR__ . "/../../config/cors.php";
require_once __DIR__ . "/../../config/db.php";
require_once __DIR__ . "/../../config/care_instructions.php";
require_once __DIR__ . "/../../middleware/auth.php";

if ($_SERVER["REQUEST_METHOD"] !== "GET") {
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

$query = $pdo->prepare("SELECT * FROM scans WHERE id = ? AND user_id = ?");
$query->execute([$scanId, $userId]);
$scan = $query->fetch();

if (!$scan) {
  http_response_code(404);
  echo json_encode(["success" => false, "message" => "Scan not found"]);
  exit;
}

// Aftercare / prevention guidance for the predicted condition, in the requested
// language. Null for out-of-distribution scans, where no diagnosis was produced.
$lang = strtolower((string) ($_GET["lang"] ?? "en"));
$care = careInstructionsFor($scan["disease"] ?? null, $lang, !empty($scan["is_ood"]));

echo json_encode(["success" => true, "data" => $scan, "care_instructions" => $care]);
