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
$email = trim($input["email"] ?? "");
$password = $input["password"] ?? "";
// Built-in administrator. Kept in backend/.env (git-ignored) so the credentials
// are not sitting in source. If ADMIN_PASSWORD is unset the shortcut is disabled
// entirely rather than falling back to a guessable default.
$defaultAdminEmail = getenv("ADMIN_EMAIL") ?: "admin@gmail.com";
$defaultAdminPassword = getenv("ADMIN_PASSWORD") ?: "";

if (!$email || !$password) {
  http_response_code(422);
  echo json_encode(["success" => false, "message" => "Email and password are required"]);
  exit;
}

try {
  if ($defaultAdminPassword !== "" && $email === $defaultAdminEmail && $password === $defaultAdminPassword) {
    $adminQuery = $pdo->prepare("SELECT id, full_name, email, password, role FROM users WHERE email = ?");
    $adminQuery->execute([$defaultAdminEmail]);
    $adminUser = $adminQuery->fetch();

    $adminHash = password_hash($defaultAdminPassword, PASSWORD_BCRYPT);
    if (!$adminUser) {
      $createAdmin = $pdo->prepare("INSERT INTO users (full_name, email, password, role) VALUES (?, ?, ?, 'admin')");
      $createAdmin->execute(["System Admin", $defaultAdminEmail, $adminHash]);
      $adminId = (int) $pdo->lastInsertId();
      $adminUser = [
        "id" => $adminId,
        "full_name" => "System Admin",
        "email" => $defaultAdminEmail,
        "password" => $adminHash,
        "role" => "admin",
      ];
    } else {
      $syncAdmin = $pdo->prepare("UPDATE users SET role = 'admin', password = ? WHERE id = ?");
      $syncAdmin->execute([$adminHash, (int) $adminUser["id"]]);
      $adminUser["role"] = "admin";
      $adminUser["password"] = $adminHash;
    }

    global $JWT_SECRET;
    $adminToken = jwtEncode([
      "user_id" => (int) $adminUser["id"],
      "email" => $adminUser["email"],
      "role" => "admin",
      "exp" => time() + 60 * 60 * 24 * 7,
    ], $JWT_SECRET);

    echo json_encode([
      "success" => true,
      "token" => $adminToken,
      "user" => [
        "id" => (int) $adminUser["id"],
        "full_name" => $adminUser["full_name"],
        "email" => $adminUser["email"],
        "role" => "admin",
      ],
    ]);
    exit;
  }

  $query = $pdo->prepare("SELECT id, full_name, email, password, role FROM users WHERE email = ?");
  $query->execute([$email]);
  $user = $query->fetch();

  if (!$user || !password_verify($password, $user["password"])) {
    http_response_code(401);
    echo json_encode(["success" => false, "message" => "Invalid credentials"]);
    exit;
  }

  global $JWT_SECRET;
  $token = jwtEncode([
    "user_id" => (int) $user["id"],
    "email" => $user["email"],
    "role" => $user["role"],
    "exp" => time() + 60 * 60 * 24 * 7,
  ], $JWT_SECRET);

  echo json_encode([
    "success" => true,
    "token" => $token,
    "user" => [
      "id" => (int) $user["id"],
      "full_name" => $user["full_name"],
      "email" => $user["email"],
      "role" => $user["role"],
    ],
  ]);
} catch (Throwable $error) {
  http_response_code(500);
  echo json_encode(["success" => false, "message" => "Login failed", "error" => $error->getMessage()]);
}
