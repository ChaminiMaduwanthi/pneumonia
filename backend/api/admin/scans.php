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

$query = $pdo->query("
  SELECT s.*, u.full_name, u.email
  FROM scans s
  JOIN users u ON u.id = s.user_id
  ORDER BY s.created_at DESC
  LIMIT 200
");

echo json_encode(["success" => true, "data" => $query->fetchAll()]);
