#!/usr/bin/env node
/**
 * patch-workflow-runtime.js
 *
 * The `withWorkflow()` Next.js plugin generates route files under
 * src/app/.well-known/workflow/v1/ that import from 'workflow/runtime' and
 * 'workflow/api'. Internally these packages use `createRequire` from
 * 'node:module', which is NOT available in the Edge/V8 isolate runtime used
 * by Cloudflare Pages / @cloudflare/next-on-pages.
 *
 * This script runs AFTER `withWorkflow` regenerates those files and injects
 * `export const runtime = 'nodejs'` at the top of each generated route so
 * that Next.js compiles them for the Node.js runtime, not Edge.
 *
 * Usage: node scripts/patch-workflow-runtime.js
 * Called automatically via the "build" script in package.json.
 */

const fs = require('fs');
const path = require('path');

const RUNTIME_DECLARATION = "export const runtime = 'nodejs';\n";

const WORKFLOW_ROUTES = [
  'src/app/.well-known/workflow/v1/flow/route.js',
  'src/app/.well-known/workflow/v1/step/route.js',
  'src/app/.well-known/workflow/v1/webhook/[token]/route.js',
];

let patched = 0;
let skipped = 0;

for (const relPath of WORKFLOW_ROUTES) {
  const absPath = path.join(process.cwd(), relPath);

  if (!fs.existsSync(absPath)) {
    console.log(`[patch-workflow-runtime] Skipping (not found): ${relPath}`);
    skipped++;
    continue;
  }

  let content = fs.readFileSync(absPath, 'utf8');

  if (content.includes("export const runtime = 'nodejs'")) {
    console.log(`[patch-workflow-runtime] Already patched: ${relPath}`);
    skipped++;
    continue;
  }

  // Remove any existing edge runtime declaration to avoid conflicts
  content = content.replace(/export const runtime = ['"]edge['"];\n?/g, '');

  // Prepend the nodejs runtime declaration after any leading comments
  // Find the first non-comment line position
  const lines = content.split('\n');
  let insertAt = 0;
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (
      trimmed.startsWith('//') ||
      trimmed.startsWith('/*') ||
      trimmed.startsWith('*') ||
      trimmed === ''
    ) {
      insertAt = i + 1;
    } else {
      break;
    }
  }

  lines.splice(insertAt, 0, RUNTIME_DECLARATION.trimEnd());
  fs.writeFileSync(absPath, lines.join('\n'), 'utf8');
  console.log(`[patch-workflow-runtime] Patched: ${relPath}`);
  patched++;
}

console.log(`[patch-workflow-runtime] Done. Patched: ${patched}, Skipped: ${skipped}`);
