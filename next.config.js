const { withWorkflow } = require('workflow/next');
const path = require('path');
const fs = require('fs');

/**
 * WorkflowNodeRuntimePlugin
 *
 * The `withWorkflow()` deferred builder writes generated route bundles to
 * `.well-known/workflow/v1/{flow,step,webhook}/route.js` during webpack
 * compilation. These bundles import `workflow/runtime` which internally uses
 * `node:module` (createRequire) — a Node.js-only API that crashes in the
 * Edge/V8 isolate runtime used by Cloudflare Pages.
 *
 * This webpack plugin hooks into `afterEmit` to inject
 * `export const runtime = 'nodejs'` into each generated route file AFTER the
 * deferred builder writes them but BEFORE Next.js collects page data.
 */
class WorkflowNodeRuntimePlugin {
  apply(compiler) {
    compiler.hooks.afterEmit.tapAsync('WorkflowNodeRuntimePlugin', (compilation, callback) => {
      const workflowRoutes = [
        'src/app/.well-known/workflow/v1/flow/route.js',
        'src/app/.well-known/workflow/v1/step/route.js',
        'src/app/.well-known/workflow/v1/webhook/[token]/route.js',
      ];

      const runtimeDecl = "export const runtime = 'nodejs';\n";

      for (const relPath of workflowRoutes) {
        const absPath = path.join(compiler.context, relPath);
        if (!fs.existsSync(absPath)) continue;

        let content = fs.readFileSync(absPath, 'utf8');
        if (content.includes("export const runtime = 'nodejs'")) continue;

        // Remove any stale edge declaration
        content = content.replace(/export const runtime = ['"]edge['"];\n?/g, '');

        // Inject after leading comments
        const lines = content.split('\n');
        let insertAt = 0;
        for (let i = 0; i < lines.length; i++) {
          const t = lines[i].trim();
          if (t.startsWith('//') || t.startsWith('/*') || t.startsWith('*') || t === '') {
            insertAt = i + 1;
          } else {
            break;
          }
        }
        lines.splice(insertAt, 0, runtimeDecl.trimEnd());
        fs.writeFileSync(absPath, lines.join('\n'), 'utf8');
        console.log(`[WorkflowNodeRuntimePlugin] Patched runtime for: ${relPath}`);
      }

      callback();
    });
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },
  experimental: {
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },

  // Prevent workflow SDK packages from being bundled into Edge/V8 isolate bundles.
  // These packages use node:module (createRequire) which is not available in Edge Runtime.
  serverExternalPackages: ['workflow', '@workflow/core', '@workflow/next'],

  // Inject the WorkflowNodeRuntimePlugin to patch runtime declarations in
  // auto-generated workflow route files during the webpack compilation phase.
  webpack(config, { isServer }) {
    if (isServer) {
      config.plugins.push(new WorkflowNodeRuntimePlugin());
    }
    return config;
  },

  // Security & Performance headers
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
      {
        source: '/offline.html',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self' capacitor://localhost ionic://localhost; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https: capacitor://localhost ionic://localhost; connect-src 'self' https://*.supabase.co https://ollama.com https://ai-gateway.vercel.sh https://cashbash.ai http://localhost:* http://10.0.2.2:* ws://localhost:* ws://10.0.2.2:* wss://*.supabase.co capacitor://localhost ionic://localhost; frame-ancestors 'none';"
          },
        ],
      },
    ];
  },
};

module.exports = withWorkflow(nextConfig);


