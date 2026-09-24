-- Migration: post-hoc out-of-distribution (OOD) detection metadata for scans.
-- Run once against an existing `pneumonia_ai` database (phpMyAdmin or CLI).
-- Stores whether an uploaded image was flagged as out-of-distribution by the
-- inference service, the strength of that verdict, and a human-readable reason.

USE pneumonia_ai;

ALTER TABLE scans
  ADD COLUMN IF NOT EXISTS is_ood TINYINT(1) NOT NULL DEFAULT 0 AFTER model,
  ADD COLUMN IF NOT EXISTS ood_score FLOAT NULL AFTER is_ood,
  ADD COLUMN IF NOT EXISTS ood_reason VARCHAR(500) NULL AFTER ood_score;
