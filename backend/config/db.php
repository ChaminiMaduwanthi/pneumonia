<?php

require_once __DIR__ . "/env.php";

// Defaults suit a stock XAMPP install; override any of them in backend/.env
// (e.g. DB_PORT=3307 when another MySQL server already holds port 3306).
$host = getenv("DB_HOST") ?: "127.0.0.1";
$port = getenv("DB_PORT") ?: "3306";
$db = getenv("DB_NAME") ?: "pneumonia_ai";
$user = getenv("DB_USER") ?: "root";
$pass = getenv("DB_PASS") ?: "";
$charset = "utf8mb4";

$dsn = "mysql:host=$host;port=$port;dbname=$db;charset=$charset";
$options = [
  PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
  PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
  PDO::ATTR_EMULATE_PREPARES => false,
];

try {
  $pdo = new PDO($dsn, $user, $pass, $options);
} catch (PDOException $exception) {
  http_response_code(500);
  echo json_encode([
    "success" => false,
    "message" => "Database connection failed",
    "error" => $exception->getMessage(),
  ]);
  exit;
}
