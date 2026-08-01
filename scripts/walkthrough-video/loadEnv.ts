/**
 * Load env vars for walkthrough video tooling.
 * Priority (first wins): process.env → repo .env.local → repo .env → backend/.env
 */
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../..');

function parseEnvFile(filePath: string): Record<string, string> {
  if (!fs.existsSync(filePath)) return {};
  const out: Record<string, string> = {};
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

export function loadWalkthroughEnv(): void {
  const files = [
    path.join(ROOT, '.env.local'),
    path.join(ROOT, '.env'),
    path.join(ROOT, 'backend', '.env'),
  ];
  const merged: Record<string, string> = {};
  // Later files fill gaps only — process.env always wins
  for (const file of files.reverse()) {
    Object.assign(merged, parseEnvFile(file));
  }
  for (const [key, value] of Object.entries(merged)) {
    if (process.env[key] === undefined || process.env[key] === '') {
      process.env[key] = value;
    }
  }
}

export const SCENES_DIR = path.resolve(__dirname, 'output', 'scenes');
export const OUTPUT_DIR = path.resolve(__dirname, 'output');
export const SCENES_JSON = path.resolve(__dirname, 'scenes.json');

export type Scene = {
  id: string;
  caption: string;
  minDurationSec: number;
  elevenLabsText: string;
};

export function loadScenes(): Scene[] {
  return JSON.parse(fs.readFileSync(SCENES_JSON, 'utf8')) as Scene[];
}
