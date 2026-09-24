<?php

// Base URL of the Python inference microservice (see /ai-service).
// Override via the AI_SERVICE_URL environment variable if needed.
$AI_SERVICE_URL = getenv("AI_SERVICE_URL") ?: "http://127.0.0.1:8001";

// Default production model key. DenseNet121 achieved the highest test accuracy.
$AI_DEFAULT_MODEL = getenv("AI_DEFAULT_MODEL") ?: "densenet121";

// Max seconds to wait for an inference response.
$AI_TIMEOUT = 60;
