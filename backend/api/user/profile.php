<?php

header("Content-Type: application/json");
require_once __DIR__ . "/../../config/cors.php";
require_once __DIR__ . "/../../config/db.php";
require_once __DIR__ . "/../../middleware/auth.php";

$authUser = getAuthenticatedUser();
$userId = (int) $authUser["user_id"];

if ($_SERVER["REQUEST_METHOD"] === "GET") {
  $query = $pdo->prepare("
    SELECT u.id, u.full_name, u.email, u.role, u.avatar, u.phone, u.dob, u.created_at,
      (SELECT COUNT(*) FROM scans WHERE user_id = u.id) AS total_scans
    FROM users u
    WHERE u.id = ?
  ");
  $query->execute([$userId]);
  $profile = $query->fetch();

  echo json_encode(["success" => true, "data" => $profile]);
  exit;
}

if ($_SERVER["REQUEST_METHOD"] === "PUT") {
  $input = json_decode(file_get_contents("php://input"), true);
  $fullName = trim($input["full_name"] ?? "");
  $email = trim($input["email"] ?? "");
  $phone = trim($input["phone"] ?? "");
  $dob = trim($input["dob"] ?? "");

  $update = $pdo->prepare("UPDATE users SET full_name = ?, email = ?, phone = ?, dob = ? WHERE id = ?");
  $update->execute([$fullName, $email, $phone ?: null, $dob ?: null, $userId]);

  echo json_encode(["success" => true, "message" => "Profile updated"]);
  exit;
}

http_response_code(405);
echo json_encode(["success" => false, "message" => "Method not allowed"]);
