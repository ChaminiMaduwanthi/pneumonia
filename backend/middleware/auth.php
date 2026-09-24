<?php

require_once __DIR__ . "/../config/jwt.php";

function getAuthenticatedUser() {
  global $JWT_SECRET;
  $headers = getallheaders();
  $authorization = $headers["Authorization"] ?? $headers["authorization"] ?? "";

  if (!$authorization || strpos($authorization, "Bearer ") !== 0) {
    http_response_code(401);
    echo json_encode(["success" => false, "message" => "Missing token"]);
    exit;
  }

  $token = str_replace("Bearer ", "", $authorization);
  $payload = jwtDecode($token, $JWT_SECRET);

  if (!$payload || !isset($payload["user_id"])) {
    http_response_code(401);
    echo json_encode(["success" => false, "message" => "Invalid token"]);
    exit;
  }

  return $payload;
}
