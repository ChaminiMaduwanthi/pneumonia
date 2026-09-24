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
  SELECT al.id, al.user_id, al.action, al.details, al.ip_address, al.created_at, u.full_name
  FROM activity_log al
  LEFT JOIN users u ON u.id = al.user_id
  ORDER BY al.created_at DESC
  LIMIT 100
");

echo json_encode(["success" => true, "data" => $query->fetchAll()]);
