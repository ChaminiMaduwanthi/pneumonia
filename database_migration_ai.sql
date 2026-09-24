-- Migration: real AI model integration (4-class output incl. COVID-19) + model tracking.
-- Run this once against an existing `pneumonia_ai` database (phpMyAdmin or CLI).
-- New installs created from database.sql already include these columns.

USE pneumonia_ai;

ALTER TABLE scans
  ADD COLUMN IF NOT EXISTS covid_score FLOAT NULL AFTER normal_score,
  ADD COLUMN IF NOT EXISTS model VARCHAR(50) NULL AFTER covid_score;
