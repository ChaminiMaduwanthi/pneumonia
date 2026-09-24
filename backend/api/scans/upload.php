<?php

header("Content-Type: application/json");
require_once __DIR__ . "/../../config/cors.php";
require_once __DIR__ . "/../../config/db.php";
require_once __DIR__ . "/../../config/ai.php";
require_once __DIR__ . "/../../config/care_instructions.php";
require_once __DIR__ . "/../../middleware/auth.php";

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
  http_response_code(405);
  echo json_encode(["success" => false, "message" => "Method not allowed"]);
  exit;
}

$authUser = getAuthenticatedUser();
$userId = (int) $authUser["user_id"];

if (!isset($_FILES["xray"]) || $_FILES["xray"]["error"] !== UPLOAD_ERR_OK) {
  http_response_code(422);
  echo json_encode(["success" => false, "message" => "Valid X-ray file is required"]);
  exit;
}

$uploadDirXrays = __DIR__ . "/../../uploads/xrays/";
$uploadDirGradcam = __DIR__ . "/../../uploads/gradcam/";
if (!is_dir($uploadDirXrays)) {
  mkdir($uploadDirXrays, 0755, true);
}
if (!is_dir($uploadDirGradcam)) {
  mkdir($uploadDirGradcam, 0755, true);
}

$file = $_FILES["xray"];
$extension = strtolower(pathinfo($file["name"], PATHINFO_EXTENSION));
$allowed = ["jpg", "jpeg", "png"];
if (!in_array($extension, $allowed, true)) {
  http_response_code(422);
  echo json_encode(["success" => false, "message" => "Only JPG and PNG are allowed"]);
  exit;
}

$filename = "scan_" . time() . "_" . bin2hex(random_bytes(4)) . "." . $extension;
$xrayPath = $uploadDirXrays . $filename;
$xrayRelativePath = "uploads/xrays/" . $filename;

if (!move_uploaded_file($file["tmp_name"], $xrayPath)) {
  http_response_code(500);
  echo json_encode(["success" => false, "message" => "Failed to save file"]);
  exit;
}

// ── Run real inference via the Python model service ────────────────────────────
$model = $_POST["model"] ?? $AI_DEFAULT_MODEL;
$mime = mime_content_type($xrayPath) ?: "application/octet-stream";

$curl = curl_init("{$AI_SERVICE_URL}/predict");
curl_setopt_array($curl, [
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_POST => true,
  CURLOPT_TIMEOUT => $AI_TIMEOUT,
  CURLOPT_POSTFIELDS => [
    "image" => new CURLFile($xrayPath, $mime, $filename),
    "model" => $model,
  ],
]);

$response = curl_exec($curl);
$httpStatus = curl_getinfo($curl, CURLINFO_HTTP_CODE);
$curlError = curl_error($curl);
curl_close($curl);

if ($response === false || $httpStatus !== 200) {
  // Do not fabricate results — surface a clear, actionable error instead.
  @unlink($xrayPath);
  $detail = "";
  if ($response !== false) {
    $decoded = json_decode($response, true);
    $detail = $decoded["detail"] ?? $decoded["message"] ?? "";
  }
  http_response_code(502);
  echo json_encode([
    "success" => false,
    "message" => "AI inference service is unavailable. Start it from /ai-service (uvicorn on port 8001).",
    "detail" => $curlError ?: $detail,
  ]);
  exit;
}

$prediction = json_decode($response, true);
if (!is_array($prediction) || empty($prediction["success"])) {
  @unlink($xrayPath);
  http_response_code(502);
  echo json_encode([
    "success" => false,
    "message" => "AI inference returned an invalid response",
    "detail" => $prediction["detail"] ?? null,
  ]);
  exit;
}

$disease = $prediction["disease"];
$diseaseConfidence = (float) $prediction["disease_confidence"];
$scores = $prediction["scores"] ?? [];
$explanation = $prediction["explanation"] ?? "";
// Store the friendly model label (e.g. "DenseNet121"), not the internal key.
$usedModel = $prediction["model_label"] ?? $prediction["model"] ?? $model;
$modelAccuracy = $prediction["model_accuracy"] ?? null;

$viralScore = (float) ($scores["Viral Pneumonia"] ?? 0);
$bacterialScore = (float) ($scores["Bacterial Pneumonia"] ?? 0);
$normalScore = (float) ($scores["Normal"] ?? 0);
$covidScore = (float) ($scores["COVID-19"] ?? 0);

// ── Out-of-distribution verdict from the inference service ─────────────────────
$ood = is_array($prediction["ood"] ?? null) ? $prediction["ood"] : [];
$isOod = !empty($ood["is_ood"]);
$oodScore = isset($ood["ood_confidence"]) ? (float) $ood["ood_confidence"] : null;
$oodReason = $isOod ? ($ood["reason"] ?? "Flagged as out-of-distribution") : null;

// ── Save the Grad-CAM heatmap returned by the service ──────────────────────────
$gradcamFilename = str_replace("scan_", "scan_gradcam_", pathinfo($filename, PATHINFO_FILENAME)) . ".png";
$gradcamPath = $uploadDirGradcam . $gradcamFilename;
$gradcamRelativePath = "uploads/gradcam/" . $gradcamFilename;

if (!empty($prediction["gradcam_base64"])) {
  $gradcamBytes = base64_decode($prediction["gradcam_base64"]);
  if ($gradcamBytes === false || file_put_contents($gradcamPath, $gradcamBytes) === false) {
    copy($xrayPath, $gradcamPath); // fallback so the UI still has an image
  }
} else {
  copy($xrayPath, $gradcamPath);
}

$patientNotes = $_POST["patient_notes"] ?? null;

$insert = $pdo->prepare("
  INSERT INTO scans (
    user_id, original_image, gradcam_image, disease, disease_confidence,
    viral_score, bacterial_score, normal_score, covid_score, model,
    is_ood, ood_score, ood_reason,
    explanation, patient_notes, status
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed')
");
$insert->execute([
  $userId,
  $xrayRelativePath,
  $gradcamRelativePath,
  $disease,
  $diseaseConfidence,
  $viralScore,
  $bacterialScore,
  $normalScore,
  $covidScore,
  $usedModel,
  $isOod ? 1 : 0,
  $oodScore,
  $oodReason,
  $explanation,
  $patientNotes,
]);

$scanId = (int) $pdo->lastInsertId();

echo json_encode([
  "success" => true,
  "scan_id" => $scanId,
  "original_image" => $xrayRelativePath,
  "disease" => $disease,
  "disease_confidence" => $diseaseConfidence,
  "all_class_scores" => $scores,
  "gradcam_image" => $gradcamRelativePath,
  "explanation" => $explanation,
  "model" => $usedModel,
  "is_ood" => $isOod,
  "ood" => $ood ?: ["available" => false, "is_ood" => false],
  // Aftercare / prevention guidance. Null when the diagnosis was withheld (OOD).
  "care_instructions" => careInstructionsFor($disease, "en", $isOod),
  "patient_notes" => $patientNotes,
  "timestamp" => gmdate("c"),
]);
