<?php

/**
 * Serves a training figure (confusion matrix / accuracy curves) for one model.
 *
 * The models directory also holds multi-hundred-megabyte .keras checkpoints, so
 * this deliberately serves from a fixed whitelist of model keys and figure names
 * rather than accepting a path.
 */

require_once __DIR__ . "/../../config/cors.php";
require_once __DIR__ . "/../../middleware/auth.php";

$authUser = getAuthenticatedUser();
$role = $authUser["role"] ?? "";
if (!in_array($role, ["researcher", "admin"], true)) {
  http_response_code(403);
  header("Content-Type: application/json");
  echo json_encode(["success" => false, "message" => "Researcher access required"]);
  exit;
}

$WORKSPACES = [
  "densenet121" => ["DenseNet121", "densenet121_workspace"],
  "efficientnetv2b3" => ["EfficientNetV2B3", "efficientnetv2b3_workspace"],
  "efficientnetv2s" => ["EfficientNetV2S", "efficientnetv2s_workspace"],
];

$FIGURES = [
  "confusion" => "confusion_matrix.png",
  "phase1" => "history_Phase1_Frozen.png",
  "phase2" => "history_Phase2_FineTune.png",
];

$model = strtolower((string) ($_GET["model"] ?? ""));
$fig = strtolower((string) ($_GET["fig"] ?? ""));

if (!isset($WORKSPACES[$model]) || !isset($FIGURES[$fig])) {
  http_response_code(404);
  header("Content-Type: application/json");
  echo json_encode(["success" => false, "message" => "Unknown figure"]);
  exit;
}

[$dir, $ws] = $WORKSPACES[$model];
$path = realpath(__DIR__ . "/../../../models/{$dir}/{$ws}/" . $FIGURES[$fig]);
$root = realpath(__DIR__ . "/../../../models");

if ($path === false || $root === false || strpos($path, $root) !== 0 || !is_file($path)) {
  http_response_code(404);
  header("Content-Type: application/json");
  echo json_encode(["success" => false, "message" => "Figure not found"]);
  exit;
}

header("Content-Type: image/png");
header("Content-Length: " . filesize($path));
header("Cache-Control: private, max-age=3600");
readfile($path);
