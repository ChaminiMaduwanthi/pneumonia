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
  SELECT u.id, u.full_name, u.email, u.role, u.created_at, COUNT(s.id) AS total_scans
  FROM users u
  LEFT JOIN scans s ON s.user_id = u.id
  GROUP BY u.id
  ORDER BY u.created_at DESC
");

echo json_encode(["success" => true, "data" => $query->fetchAll()]);
