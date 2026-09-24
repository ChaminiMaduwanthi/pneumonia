<?php

header("Content-Type: application/json");
require_once __DIR__ . "/../../config/cors.php";
require_once __DIR__ . "/../../config/chat.php";

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
  http_response_code(405);
  echo json_encode(["success" => false, "message" => "Method not allowed"]);
  exit;
}

if ($GEMINI_API_KEY === "") {
  http_response_code(500);
  echo json_encode([
    "success" => false,
    "message" => "Chatbot is not configured. Set GEMINI_API_KEY in backend/.env.",
  ]);
  exit;
}

$input = json_decode(file_get_contents("php://input"), true);
$message = trim($input["message"] ?? "");
$history = is_array($input["history"] ?? null) ? $input["history"] : [];

if ($message === "") {
  http_response_code(422);
  echo json_encode(["success" => false, "message" => "Message is required"]);
  exit;
}

if (mb_strlen($message) > $CHAT_MAX_MESSAGE_LEN) {
  $message = mb_substr($message, 0, $CHAT_MAX_MESSAGE_LEN);
}

// ── Build the Gemini `contents` array from prior history + the new message ────
$contents = [];
$history = array_slice($history, -$CHAT_MAX_HISTORY);
foreach ($history as $turn) {
  $role = ($turn["role"] ?? "") === "model" ? "model" : "user";
  $text = trim((string) ($turn["text"] ?? ""));
  if ($text === "") {
    continue;
  }
  $contents[] = [
    "role" => $role,
    "parts" => [["text" => mb_substr($text, 0, $CHAT_MAX_MESSAGE_LEN)]],
  ];
}
$contents[] = ["role" => "user", "parts" => [["text" => $message]]];

$payload = [
  "systemInstruction" => ["parts" => [["text" => $CHAT_SYSTEM_PROMPT]]],
  "contents" => $contents,
  "generationConfig" => [
    "temperature" => 0.4,
    "maxOutputTokens" => 1024,
  ],
];

// ── Call Gemini (key sent in a header, never logged in the URL) ───────────────
// Gemini regularly answers 503 ("model is currently experiencing high demand")
// and 429 for a second or two at a time. Both are explicitly retryable, and
// without a retry roughly half of all chat messages fail. Retry a couple of
// times with a short backoff, staying well inside $GEMINI_TIMEOUT.
// Only 503 is worth retrying: it clears in a second or two. A 429 is a quota
// limit where Google asks for a ~minute wait, so retrying just makes the user
// wait longer before the same failure.
$RETRY_STATUSES = [503];
$MAX_ATTEMPTS = 3;
$response = false;
$httpStatus = 0;
$curlError = "";

for ($attempt = 1; $attempt <= $MAX_ATTEMPTS; $attempt++) {
  $curl = curl_init($GEMINI_ENDPOINT);
  curl_setopt_array($curl, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_TIMEOUT => $GEMINI_TIMEOUT,
    CURLOPT_HTTPHEADER => [
      "Content-Type: application/json",
      "x-goog-api-key: {$GEMINI_API_KEY}",
    ],
    CURLOPT_POSTFIELDS => json_encode($payload),
  ]);

  $response = curl_exec($curl);
  $httpStatus = curl_getinfo($curl, CURLINFO_HTTP_CODE);
  $curlError = curl_error($curl);
  curl_close($curl);

  if ($response !== false && !in_array($httpStatus, $RETRY_STATUSES, true)) {
    break;
  }
  if ($attempt < $MAX_ATTEMPTS) {
    error_log("[chat] Gemini HTTP {$httpStatus} on attempt {$attempt}, retrying");
    usleep($attempt * 1200000); // 1.2s, then 2.4s
  }
}

if ($response === false) {
  http_response_code(502);
  echo json_encode([
    "success" => false,
    "message" => "Could not reach the AI assistant. Please try again.",
    "error" => $curlError,
  ]);
  exit;
}

$data = json_decode($response, true);

if ($httpStatus !== 200) {
  // Surface a clean message; keep Google's raw error out of the user-facing text.
  $apiMessage = $data["error"]["message"] ?? "Upstream error";
  error_log("[chat] Gemini HTTP {$httpStatus}: {$apiMessage}");
  http_response_code(502);
  echo json_encode([
    "success" => false,
    "message" => $httpStatus === 429
      ? "The assistant has reached its usage limit for now. Please try again in a minute."
      : "The AI assistant is busy right now. Please try again in a moment.",
  ]);
  exit;
}

// Extract the reply text from the first candidate.
$reply = "";
foreach ($data["candidates"][0]["content"]["parts"] ?? [] as $part) {
  if (isset($part["text"])) {
    $reply .= $part["text"];
  }
}
$reply = trim($reply);

if ($reply === "") {
  $blockReason = $data["promptFeedback"]["blockReason"] ?? null;
  $reply = $blockReason
    ? "I can't help with that request. Try asking me how to use the LungVision AI platform."
    : "Sorry, I couldn't generate a response. Please rephrase your question.";
}

echo json_encode([
  "success" => true,
  "reply" => $reply,
]);
