<?php

function requireAdmin($user) {
  if (($user["role"] ?? "") !== "admin") {
    http_response_code(403);
    echo json_encode(["success" => false, "message" => "Admin access required"]);
    exit;
  }
}
