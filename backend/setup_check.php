<?php
header("Content-Type: application/json");
ini_set("display_errors", "1");
error_reporting(E_ALL);

$result = [
  "php_version" => PHP_VERSION,
  "pdo_mysql" => extension_loaded("pdo_mysql"),
  "steps" => [],
];

try {
  $pdo = new PDO("mysql:host=127.0.0.1;charset=utf8mb4", "root", "", [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
  ]);
  $result["steps"][] = "Connected to MySQL server";

  $dbExists = $pdo->query("SHOW DATABASES LIKE 'pneumonia_ai'")->fetch();
  $result["database_exists"] = (bool) $dbExists;

  if (!$dbExists) {
    $pdo->exec("CREATE DATABASE IF NOT EXISTS pneumonia_ai");
    $result["steps"][] = "Created database pneumonia_ai";
  }

  $pdo->exec("USE pneumonia_ai");
  $tables = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
  $result["tables"] = $tables;

  if (count($tables) === 0) {
    $sql = file_get_contents(__DIR__ . "/../database.sql");
    $sql = preg_replace("/^CREATE DATABASE.*?;/ims", "", $sql);
    $sql = preg_replace("/^USE pneumonia_ai;/im", "", $sql);
    $pdo->exec($sql);
    $tables = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
    $result["tables"] = $tables;
    $result["steps"][] = "Imported database.sql";
  }

  $result["success"] = true;
} catch (Throwable $error) {
  $result["success"] = false;
  $result["error"] = $error->getMessage();
}

echo json_encode($result, JSON_PRETTY_PRINT);
