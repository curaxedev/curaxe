import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const siteOrigin = (env.VITE_SITE_ORIGIN ?? '').replace(/\/$/, '')
  // Target del proxy dev verso Laravel (override: API_PROXY_TARGET=http://127.0.0.1:8010 npm run dev)
  const apiProxyTarget = env.API_PROXY_TARGET || 'http://127.0.0.1:8000'

  return {
    base: '/',
    plugins: [
      react(),
      ...(siteOrigin
        ? [
            {
              name: 'inject-production-site-meta',
              transformIndexHtml(html: string) {
                const block = `    <link rel="canonical" href="${siteOrigin}/" />\n    <meta property="og:url" content="${siteOrigin}/" />\n`
                return html.replace(/<\/head>/i, `${block}  </head>`)
              },
            },
          ]
        : []),
    ],
    server: {
      proxy: {
        '/api': {
          target: apiProxyTarget,
          changeOrigin: true,
        },
        '/sanctum': {
          target: apiProxyTarget,
          changeOrigin: true,
        },
      },
    },
  }
})
