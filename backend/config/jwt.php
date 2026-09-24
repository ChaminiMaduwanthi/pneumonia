<?php

require_once __DIR__ . "/env.php";

// Signing key for the API's JWTs. Kept in backend/.env (git-ignored) rather than
// in source, so it is never committed. Anyone holding this value can mint a
// token for any user, including an admin, so it must stay secret and must be
// replaced with a fresh random value on any real deployment.
$JWT_SECRET = getenv("JWT_SECRET") ?: "";

if ($JWT_SECRET === "" || strlen($JWT_SECRET) < 32) {
  // Fail loudly rather than silently signing with a weak or missing key.
  http_response_code(500);
  header("Content-Type: application/json");
  echo json_encode([
    "success" => false,
    "message" => "Server misconfigured: JWT_SECRET is missing or too short. Set it in backend/.env.",
  ]);
  exit;
}

function base64UrlEncode($data) {
  return rtrim(strtr(base64_encode($data), "+/", "-_"), "=");
}

function base64UrlDecode($data) {
  return base64_decode(strtr($data, "-_", "+/"));
}

function jwtEncode($payload, $secret) {
  $header = ["alg" => "HS256", "typ" => "JWT"];
  $headerEncoded = base64UrlEncode(json_encode($header));
  $payloadEncoded = base64UrlEncode(json_encode($payload));
  $signature = hash_hmac("sha256", "$headerEncoded.$payloadEncoded", $secret, true);
  $signatureEncoded = base64UrlEncode($signature);
  return "$headerEncoded.$payloadEncoded.$signatureEncoded";
}

function jwtDecode($token, $secret) {
  $parts = explode(".", $token);
  if (count($parts) !== 3) {
    return null;
  }

  [$headerEncoded, $payloadEncoded, $signatureEncoded] = $parts;
  $expectedSignature = base64UrlEncode(hash_hmac("sha256", "$headerEncoded.$payloadEncoded", $secret, true));

  if (!hash_equals($expectedSignature, $signatureEncoded)) {
    return null;
  }

  $payload = json_decode(base64UrlDecode($payloadEncoded), true);
  if (!$payload || (isset($payload["exp"]) && time() > $payload["exp"])) {
    return null;
  }

  return $payload;
}
