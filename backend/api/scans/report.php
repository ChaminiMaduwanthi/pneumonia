<?php

require_once __DIR__ . "/../../config/cors.php";
require_once __DIR__ . "/../../config/db.php";
require_once __DIR__ . "/../../config/care_instructions.php";
require_once __DIR__ . "/../../middleware/auth.php";

if ($_SERVER["REQUEST_METHOD"] !== "GET") {
  http_response_code(405);
  echo "Method not allowed";
  exit;
}

$authUser = getAuthenticatedUser();
$userId = (int) $authUser["user_id"];
$scanId = (int) ($_GET["id"] ?? 0);

if ($scanId <= 0) {
  http_response_code(422);
  echo "Invalid scan ID";
  exit;
}

$query = $pdo->prepare("
  SELECT s.*, u.full_name
  FROM scans s
  JOIN users u ON u.id = s.user_id
  WHERE s.id = ? AND s.user_id = ?
");
$query->execute([$scanId, $userId]);
$scan = $query->fetch();

if (!$scan) {
  http_response_code(404);
  echo "Scan not found";
  exit;
}

// ── Language selection (en | si | ta) ──────────────────────────────────────────
$lang = strtolower((string) ($_GET["lang"] ?? "en"));
if (!in_array($lang, ["en", "si", "ta"], true)) {
  $lang = "en";
}

// UI string table. Values are emitted as static markup (not user input).
$STRINGS = [
  "en" => [
    "subtitle" => "Chest X-Ray Analysis Report",
    "report_id" => "Report ID",
    "generated" => "Generated",
    "patient" => "Patient",
    "ood_heading" => "Out-of-distribution image — diagnosis not reliable",
    "ood_body" => "This image does not resemble the chest X-rays the model was trained on, so no diagnosis is produced. Please upload a valid chest X-ray.",
    "diagnosis_summary" => "Diagnosis Summary",
    "predicted_condition" => "Predicted Condition",
    "model_used" => "Model Used",
    "class_scores" => "Class Confidence Scores",
    "patient_notes" => "Patient Notes",
    "gradcam_explanation" => "Grad-CAM Explanation",
    "imaging" => "Imaging",
    "uploaded_section" => "Uploaded Image",
    "original_xray" => "Original X-ray",
    "uploaded_image" => "Uploaded image",
    "gradcam_heatmap" => "Grad-CAM Heatmap",
    "image_unavailable" => "Image unavailable",
    "disclaimer" => "Disclaimer: This system is a decision-support tool only and does not replace professional medical diagnosis.",
    "explanation_tpl" => "The highlighted regions show the areas most influential to the %s prediction (%s%% confidence).",
  ],
  "si" => [
    "subtitle" => "පපුවේ එක්ස් කිරණ විශ්ලේෂණ වාර්තාව",
    "report_id" => "වාර්තා අංකය",
    "generated" => "ජනනය කළ දිනය",
    "patient" => "රෝගියා",
    "ood_heading" => "ව්‍යාප්තියෙන් පිටත රූපයකි — රෝග විනිශ්චය විශ්වාසනීය නොවේ",
    "ood_body" => "මෙම රූපය ආකෘතිය පුහුණු කළ පපුවේ එක්ස් කිරණ වලට සමාන නොවන බැවින් රෝග විනිශ්චයක් ලබා නොදේ. කරුණාකර වලංගු පපුවේ එක්ස් කිරණයක් උඩුගත කරන්න.",
    "diagnosis_summary" => "රෝග විනිශ්චය සාරාංශය",
    "predicted_condition" => "පුරෝකථනය කළ තත්ත්වය",
    "model_used" => "භාවිත කළ ආකෘතිය",
    "class_scores" => "පන්ති විශ්වාස ලකුණු",
    "patient_notes" => "රෝගියාගේ සටහන්",
    "gradcam_explanation" => "Grad-CAM පැහැදිලි කිරීම",
    "imaging" => "රූපගත කිරීම",
    "uploaded_section" => "උඩුගත කළ රූපය",
    "original_xray" => "මුල් එක්ස් කිරණ",
    "uploaded_image" => "උඩුගත කළ රූපය",
    "gradcam_heatmap" => "Grad-CAM තාප සිතියම",
    "image_unavailable" => "රූපය නොමැත",
    "disclaimer" => "වගකීමෙන් බැහැරවීම: මෙම පද්ධතිය තීරණ-සහාය මෙවලමක් පමණක් වන අතර වෘත්තීය වෛද්‍ය රෝග විනිශ්චය ආදේශ නොකරයි.",
    "explanation_tpl" => "ඉස්මතු කළ ප්‍රදේශ %s පුරෝකථනයට වඩාත් බලපෑ ප්‍රදේශ පෙන්වයි (%s%% විශ්වාසය).",
  ],
  "ta" => [
    "subtitle" => "மார்பு எக்ஸ்-ரே பகுப்பாய்வு அறிக்கை",
    "report_id" => "அறிக்கை எண்",
    "generated" => "உருவாக்கப்பட்டது",
    "patient" => "நோயாளி",
    "ood_heading" => "விநியோகத்திற்கு வெளியே உள்ள படம் — நோயறிதல் நம்பகமானதல்ல",
    "ood_body" => "இந்தப் படம் மாதிரி பயிற்சி பெற்ற மார்பு எக்ஸ்-ரே படங்களை ஒத்ததல்ல, எனவே நோயறிதல் வழங்கப்படவில்லை. சரியான மார்பு எக்ஸ்-ரே படத்தைப் பதிவேற்றவும்.",
    "diagnosis_summary" => "நோயறிதல் சுருக்கம்",
    "predicted_condition" => "கணிக்கப்பட்ட நிலை",
    "model_used" => "பயன்படுத்தப்பட்ட மாதிரி",
    "class_scores" => "வகுப்பு நம்பிக்கை மதிப்பெண்கள்",
    "patient_notes" => "நோயாளி குறிப்புகள்",
    "gradcam_explanation" => "Grad-CAM விளக்கம்",
    "imaging" => "படிமம்",
    "uploaded_section" => "பதிவேற்றிய படம்",
    "original_xray" => "அசல் எக்ஸ்-ரே",
    "uploaded_image" => "பதிவேற்றிய படம்",
    "gradcam_heatmap" => "Grad-CAM வெப்ப வரைபடம்",
    "image_unavailable" => "படம் கிடைக்கவில்லை",
    "disclaimer" => "பொறுப்புத் துறப்பு: இந்த அமைப்பு ஒரு முடிவு-ஆதரவு கருவி மட்டுமே; இது தொழில்முறை மருத்துவ நோயறிதலுக்கு மாற்றாகாது.",
    "explanation_tpl" => "%s கணிப்புக்கு மிகவும் செல்வாக்கு செலுத்திய பகுதிகளை சிறப்பிக்கப்பட்ட பகுதிகள் காட்டுகின்றன (%s%% நம்பிக்கை).",
  ],
];

// Disease display names per language (keys = the English names stored in the DB).
$DISEASES = [
  "en" => ["COVID-19" => "COVID-19", "Normal" => "Normal", "Bacterial Pneumonia" => "Bacterial Pneumonia", "Viral Pneumonia" => "Viral Pneumonia"],
  "si" => ["COVID-19" => "කොවිඩ්-19", "Normal" => "සාමාන්‍ය", "Bacterial Pneumonia" => "බැක්ටීරියා නියුමෝනියාව", "Viral Pneumonia" => "වෛරස් නියුමෝනියාව"],
  "ta" => ["COVID-19" => "கோவிட்-19", "Normal" => "சாதாரணம்", "Bacterial Pneumonia" => "பாக்டீரியா நிமோனியா", "Viral Pneumonia" => "வைரஸ் நிமோனியா"],
];

$t = $STRINGS[$lang];
$dis = $DISEASES[$lang];
function tr_disease(array $dis, ?string $name): string
{
  return $dis[$name] ?? ($name ?? "");
}

/**
 * Inline a stored upload as a data: URI.
 *
 * The report is opened from a blob: URL (so the Authorization header can be sent
 * when fetching it), and on a phone it is reached through the Next.js proxy or an
 * HTTPS tunnel — in both cases neither a relative path nor a host-derived absolute
 * URL resolves to anything the browser can load. Embedding the bytes makes the
 * report self-contained, so it prints identically on desktop, phone and PDF.
 */
function inlineUpload(?string $relativePath): string
{
  if (!$relativePath) {
    return "";
  }
  $full = realpath(__DIR__ . "/../../" . $relativePath);
  $uploadsRoot = realpath(__DIR__ . "/../../uploads");
  // Only ever serve files from inside uploads/, whatever the DB happens to hold.
  if ($full === false || $uploadsRoot === false || strpos($full, $uploadsRoot) !== 0 || !is_file($full)) {
    return "";
  }
  $bytes = @file_get_contents($full);
  if ($bytes === false) {
    return "";
  }
  $mime = @mime_content_type($full) ?: "image/jpeg";
  return "data:{$mime};base64," . base64_encode($bytes);
}

$originalImage = inlineUpload($scan["original_image"] ?? null);
$gradcamImage = inlineUpload($scan["gradcam_image"] ?? null);

$ts = strtotime($scan["created_at"]);
$reportDate = $lang === "en" ? date("F j, Y g:i A", $ts) : date("Y-m-d H:i", $ts);
$isOod = !empty($scan["is_ood"]);

// Diagnosis text, localised and rebuilt from structured fields (so it translates).
$diseaseLocal = tr_disease($dis, $scan["disease"] ?? null);
$explanationLocal = sprintf($t["explanation_tpl"], $diseaseLocal, (string) $scan["disease_confidence"]);

// Aftercare / prevention guidance for the predicted condition. Withheld for
// out-of-distribution scans, where there is no trustworthy diagnosis to act on.
$care = careInstructionsFor($scan["disease"] ?? null, $lang, $isOod);

header("Content-Type: text/html; charset=UTF-8");

?>
<!DOCTYPE html>
<html lang="<?= htmlspecialchars($lang) ?>">
  <head>
    <meta charset="UTF-8" />
    <title>LungVision AI Report #<?= (int) $scan["id"] ?></title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Noto+Sans+Sinhala:wght@400;600;700&family=Noto+Sans+Tamil:wght@400;600;700&display=swap"
      rel="stylesheet"
    />
    <style>
      /* Latin renders in Arial; Sinhala/Tamil glyphs fall through to the Noto
         fonts (or Windows' Nirmala UI offline) with correct shaping/ligatures. */
      body {
        font-family: Arial, "Noto Sans Sinhala", "Noto Sans Tamil", "Nirmala UI", sans-serif;
        color: #0b2545;
        margin: 32px;
        line-height: 1.6;
      }
      h1,
      h2 {
        margin: 0 0 8px;
      }
      .meta,
      .disclaimer {
        color: #475569;
        font-size: 14px;
      }
      .section {
        margin-top: 24px;
        padding-top: 16px;
        border-top: 1px solid #dbe4ee;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 16px;
      }
      .card {
        border: 1px solid #dbe4ee;
        border-radius: 8px;
        padding: 12px;
      }
      img {
        width: 100%;
        max-height: 280px;
        object-fit: contain;
        border: 1px solid #dbe4ee;
        border-radius: 8px;
      }
      .ood-warning {
        margin-top: 20px;
        padding: 14px 16px;
        border: 2px solid #d97706;
        background: #fffbeb;
        border-radius: 8px;
        color: #92400e;
      }
      .ood-warning strong {
        font-size: 15px;
      }
      .disclaimer {
        margin-top: 28px;
        color: #b45309;
      }
      .care h3 {
        margin: 16px 0 6px;
        font-size: 15px;
      }
      .care ul {
        margin: 0;
        padding-left: 20px;
      }
      .care li {
        margin-bottom: 5px;
      }
      .care-urgent {
        margin-top: 16px;
        padding: 12px 16px;
        border: 2px solid #dc2626;
        background: #fef2f2;
        border-radius: 8px;
        color: #991b1b;
      }
      .care-urgent h3 {
        margin-top: 0;
        color: #991b1b;
      }
      .care-note {
        margin-top: 12px;
        font-size: 12px;
        color: #475569;
      }
      @media print {
        body {
          margin: 16px;
        }
        /* Keep the red-flag box from being split across two printed pages. */
        .care-urgent,
        .care li {
          page-break-inside: avoid;
        }
      }
    </style>
  </head>
  <body>
    <h1>LungVision AI</h1>
    <p class="meta"><?= $t["subtitle"] ?></p>
    <p class="meta"><?= $t["report_id"] ?>: #<?= (int) $scan["id"] ?> | <?= $t["generated"] ?>: <?= htmlspecialchars($reportDate) ?></p>
    <p class="meta"><?= $t["patient"] ?>: <?= htmlspecialchars($scan["full_name"]) ?></p>

    <?php if ($isOod) : ?>
      <div class="ood-warning">
        <strong>&#9888; <?= $t["ood_heading"] ?></strong>
        <p><?= $t["ood_body"] ?></p>
      </div>
    <?php endif; ?>

    <?php if (!$isOod) : ?>
      <div class="section">
        <h2><?= $t["diagnosis_summary"] ?></h2>
        <div class="grid">
          <div class="card">
            <strong><?= $t["predicted_condition"] ?></strong>
            <p><?= htmlspecialchars($diseaseLocal ?: "N/A") ?> (<?= htmlspecialchars((string) $scan["disease_confidence"]) ?>%)</p>
          </div>
          <div class="card">
            <strong><?= $t["model_used"] ?></strong>
            <p><?= htmlspecialchars($scan["model"] ?? "DenseNet121") ?></p>
          </div>
        </div>
      </div>

      <div class="section">
        <h2><?= $t["class_scores"] ?></h2>
        <p><?= htmlspecialchars($dis["COVID-19"]) ?>: <?= htmlspecialchars((string) ($scan["covid_score"] ?? 0)) ?>%</p>
        <p><?= htmlspecialchars($dis["Viral Pneumonia"]) ?>: <?= htmlspecialchars((string) $scan["viral_score"]) ?>%</p>
        <p><?= htmlspecialchars($dis["Bacterial Pneumonia"]) ?>: <?= htmlspecialchars((string) $scan["bacterial_score"]) ?>%</p>
        <p><?= htmlspecialchars($dis["Normal"]) ?>: <?= htmlspecialchars((string) $scan["normal_score"]) ?>%</p>
      </div>
    <?php endif; ?>

    <?php if ($care) : ?>
      <div class="section care">
        <h2><?= htmlspecialchars($care["labels"]["heading"]) ?></h2>
        <p><?= htmlspecialchars($care["intro"]) ?></p>

        <h3><?= htmlspecialchars($care["labels"]["do"]) ?></h3>
        <ul>
          <?php foreach ($care["do"] as $item) : ?>
            <li><?= htmlspecialchars($item) ?></li>
          <?php endforeach; ?>
        </ul>

        <h3><?= htmlspecialchars($care["labels"]["dont"]) ?></h3>
        <ul>
          <?php foreach ($care["dont"] as $item) : ?>
            <li><?= htmlspecialchars($item) ?></li>
          <?php endforeach; ?>
        </ul>

        <?php if (!empty($care["urgent"])) : ?>
          <div class="care-urgent">
            <h3>&#9888; <?= htmlspecialchars($care["labels"]["urgent"]) ?></h3>
            <ul>
              <?php foreach ($care["urgent"] as $item) : ?>
                <li><?= htmlspecialchars($item) ?></li>
              <?php endforeach; ?>
            </ul>
          </div>
        <?php endif; ?>

        <p class="care-note"><?= htmlspecialchars($care["labels"]["footnote"]) ?></p>
      </div>
    <?php endif; ?>

    <?php if (!empty($scan["patient_notes"])) : ?>
      <div class="section">
        <h2><?= $t["patient_notes"] ?></h2>
        <p><?= nl2br(htmlspecialchars($scan["patient_notes"])) ?></p>
      </div>
    <?php endif; ?>

    <?php if (!$isOod) : ?>
      <div class="section">
        <h2><?= $t["gradcam_explanation"] ?></h2>
        <p><?= htmlspecialchars($explanationLocal) ?></p>
      </div>
    <?php endif; ?>

    <div class="section">
      <h2><?= $isOod ? $t["uploaded_section"] : $t["imaging"] ?></h2>
      <div class="grid">
        <div>
          <p><strong><?= $isOod ? $t["uploaded_image"] : $t["original_xray"] ?></strong></p>
          <?php if ($originalImage) : ?>
            <img src="<?= htmlspecialchars($originalImage) ?>" alt="<?= $t["uploaded_image"] ?>" />
          <?php else : ?>
            <p><?= $t["image_unavailable"] ?></p>
          <?php endif; ?>
        </div>
        <?php if (!$isOod) : ?>
          <div>
            <p><strong><?= $t["gradcam_heatmap"] ?></strong></p>
            <?php if ($gradcamImage) : ?>
              <img src="<?= htmlspecialchars($gradcamImage) ?>" alt="<?= $t["gradcam_heatmap"] ?>" />
            <?php else : ?>
              <p><?= $t["image_unavailable"] ?></p>
            <?php endif; ?>
          </div>
        <?php endif; ?>
      </div>
    </div>

    <p class="disclaimer"><?= $t["disclaimer"] ?></p>

    <script>
      // Print only after webfonts are ready, so Sinhala/Tamil glyphs are shaped
      // correctly in the PDF (with a fallback timeout if fonts never resolve).
      (function () {
        var printed = false;
        function go() {
          if (printed) return;
          printed = true;
          window.print();
        }
        if (document.fonts && document.fonts.ready) {
          Promise.resolve(document.fonts.ready).then(function () {
            setTimeout(go, 250);
          });
          setTimeout(go, 3000);
        } else {
          window.addEventListener("load", go);
        }
      })();
    </script>
  </body>
</html>
