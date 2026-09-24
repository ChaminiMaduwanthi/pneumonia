<?php

$host = "127.0.0.1";
$db = "pneumonia_ai";
$user = "root";
$pass = "";
$charset = "utf8mb4";

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
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
