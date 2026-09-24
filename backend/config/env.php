<?php

// Minimal .env loader. Reads backend/.env once and exposes values via getenv()
// and $_ENV. Keeps secrets (e.g. the Gemini API key) out of source files.
//
// Existing environment variables are NOT overwritten, so real server env wins
// over the file in production.

function loadEnv(string $path): void {
  static $loaded = [];
  if (isset($loaded[$path])) {
    return;
  }
  $loaded[$path] = true;

  if (!is_readable($path)) {
    return;
  }

  $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
  foreach ($lines as $line) {
    $line = trim($line);
    if ($line === "" || $line[0] === "#") {
      continue;
    }
    $pos = strpos($line, "=");
    if ($pos === false) {
      continue;
    }
    $name = trim(substr($line, 0, $pos));
    $value = trim(substr($line, $pos + 1));

    // Strip optional surrounding quotes.
    if (strlen($value) >= 2) {
      $first = $value[0];
      $last = $value[strlen($value) - 1];
      if (($first === '"' && $last === '"') || ($first === "'" && $last === "'")) {
        $value = substr($value, 1, -1);
      }
    }

    if ($name === "" || getenv($name) !== false) {
      continue;
    }

    putenv("$name=$value");
    $_ENV[$name] = $value;
    $_SERVER[$name] = $value;
  }
}

// Load the backend .env (backend/.env) on include.
loadEnv(__DIR__ . "/../.env");
