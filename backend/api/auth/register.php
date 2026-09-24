<?php

header("Content-Type: application/json");
require_once __DIR__ . "/../../config/cors.php";
require_once __DIR__ . "/../../config/db.php";
require_once __DIR__ . "/../../config/jwt.php";

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
  http_response_code(405);
  echo json_encode(["success" => false, "message" => "Method not allowed"]);
  exit;
}

$input = json_decode(file_get_contents("php://input"), true);
$fullName = trim($input["full_name"] ?? "");
$email = trim($input["email"] ?? "");
$password = $input["password"] ?? "";
$role = $input["role"] ?? "patient";

if (!$fullName || !$email || !$password) {
  http_response_code(422);
  echo json_encode(["success" => false, "message" => "Missing required fields"]);
  exit;
}

// "admin" is deliberately excluded — admin accounts are not self-registrable.
$allowedRoles = ["patient", "doctor", "researcher"];
if (!in_array($role, $allowedRoles, true)) {
  $role = "patient";
}

try {
  $check = $pdo->prepare("SELECT id FROM users WHERE email = ?");
  $check->execute([$email]);
  if ($check->fetch()) {
    http_response_code(409);
    echo json_encode(["success" => false, "message" => "Email already exists"]);
    exit;
  }

  $hashedPassword = password_hash($password, PASSWORD_BCRYPT);
  $insert = $pdo->prepare("INSERT INTO users (full_name, email, password, role) VALUES (?, ?, ?, ?)");
  $insert->execute([$fullName, $email, $hashedPassword, $role]);
  $userId = (int) $pdo->lastInsertId();

  global $JWT_SECRET;
  $token = jwtEncode([
    "user_id" => $userId,
    "email" => $email,
    "role" => $role,
    "exp" => time() + 60 * 60 * 24 * 7,
  ], $JWT_SECRET);

  echo json_encode([
    "success" => true,
    "token" => $token,
    "user" => [
      "id" => $userId,
      "full_name" => $fullName,
      "email" => $email,
      "role" => $role,
    ],
  ]);
} catch (Throwable $error) {
  http_response_code(500);
  echo json_encode(["success" => false, "message" => "Registration failed", "error" => $error->getMessage()]);
}
