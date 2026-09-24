<?php

header("Content-Type: application/json");
require_once __DIR__ . "/../../config/cors.php";
require_once __DIR__ . "/../../config/db.php";
require_once __DIR__ . "/../../middleware/auth.php";

if ($_SERVER["REQUEST_METHOD"] !== "PUT") {
  http_response_code(405);
  echo json_encode(["success" => false, "message" => "Method not allowed"]);
  exit;
}

$authUser = getAuthenticatedUser();
$userId = (int) $authUser["user_id"];
$input = json_decode(file_get_contents("php://input"), true);
$currentPassword = $input["current_password"] ?? "";
$newPassword = $input["new_password"] ?? "";

if (!$currentPassword || !$newPassword) {
  http_response_code(422);
  echo json_encode(["success" => false, "message" => "Both fields are required"]);
  exit;
}

$query = $pdo->prepare("SELECT password FROM users WHERE id = ?");
$query->execute([$userId]);
$user = $query->fetch();

if (!$user || !password_verify($currentPassword, $user["password"])) {
  http_response_code(401);
  echo json_encode(["success" => false, "message" => "Current password is incorrect"]);
  exit;
}

$hashed = password_hash($newPassword, PASSWORD_BCRYPT);
$update = $pdo->prepare("UPDATE users SET password = ? WHERE id = ?");
$update->execute([$hashed, $userId]);

echo json_encode(["success" => true, "message" => "Password changed"]);
