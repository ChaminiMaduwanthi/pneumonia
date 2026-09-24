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

$delete = $pdo->prepare("DELETE FROM users WHERE id = ?");
$delete->execute([$userId]);

echo json_encode(["success" => true, "message" => "Account deleted"]);
