/**
 * Load env vars for walkthrough video tooling.
 * Priority: process.env → .env.local → .env → backend/.env
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, '../..');
export const SCENES_DIR = path.resolve(__dirname, 'output', 'scenes');
export const OUTPUT_DIR = path.resolve(__dirname, 'output');
export const SCENES_JSON = path.resolve(__dirname, 'scenes.json');

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const out = {};
  for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

export function loadWalkthroughEnv() {
  const files = [
    path.join(ROOT, 'backend', '.env'),
    path.join(ROOT, '.env'),
    path.join(ROOT, '.env.local'),
  ];
  const merged = {};
  for (const file of files) {
    Object.assign(merged, parseEnvFile(file));
  }
  for (const [key, value] of Object.entries(merged)) {
    if (process.env[key] === undefined || process.env[key] === '') {
      process.env[key] = value;
    }
  }
}

export function loadScenes() {
  return JSON.parse(fs.readFileSync(SCENES_JSON, 'utf8'));
}
