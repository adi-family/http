import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: '@adi-family/http',
  description: 'Framework-agnostic, type-safe HTTP interface system',

  // GitHub Pages deployment
  base: '/http/',

  // Enable sitemap
  sitemap: {
    hostname: 'https://adi-family.github.io/http/'
  },

  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    logo: '/logo.svg',

    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'API Reference', link: '/api/core' },
      { text: 'Examples', link: '/examples/basic' },
      {
        text: 'v1.0.0',
        items: [
          { text: 'Changelog', link: 'https://github.com/adi-family/http/releases' },
          { text: 'Contributing', link: '/contributing' }
        ]
      }
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Introduction',
          items: [
            { text: 'What is @adi-family/http?', link: '/guide/what-is-it' },
            { text: 'Getting Started', link: '/guide/getting-started' },
            { text: 'Why Use It?', link: '/guide/why' }
          ]
        },
        {
          text: 'Core Concepts',
          items: [
            { text: 'Route Builder', link: '/guide/route-builder' },
            { text: 'Handlers', link: '/guide/handlers' },
            { text: 'Client', link: '/guide/client' },
            { text: 'Validation', link: '/guide/validation' }
          ]
        },
        {
          text: 'Framework Adapters',
          items: [
            { text: 'Express', link: '/guide/express' },
            { text: 'Native HTTP', link: '/guide/native' }
          ]
        },
        {
          text: 'Advanced',
          items: [
            { text: 'Custom Routes', link: '/guide/custom-routes' },
            { text: 'Middleware', link: '/guide/middleware' },
            { text: 'Error Handling', link: '/guide/error-handling' },
            { text: 'Testing', link: '/guide/testing' }
          ]
        }
      ],
      '/api/': [
        {
          text: 'API Reference',
          items: [
            { text: 'Core (@adi-family/http)', link: '/api/core' },
            { text: 'Express Adapter', link: '/api/express' },
            { text: 'Native Adapter', link: '/api/native' }
          ]
        },
        {
          text: 'Types',
          items: [
            { text: 'RouteConfig', link: '/api/types/route-config' },
            { text: 'HandlerConfig', link: '/api/types/handler-config' },
            { text: 'Type Helpers', link: '/api/types/helpers' }
          ]
        }
      ],
      '/examples/': [
        {
          text: 'Examples',
          items: [
            { text: 'Basic CRUD', link: '/examples/basic' },
            { text: 'Advanced Routing', link: '/examples/advanced' },
            { text: 'Authentication', link: '/examples/auth' },
            { text: 'File Upload', link: '/examples/file-upload' },
            { text: 'Migration from Hono', link: '/examples/migration' }
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/adi-family/http' },
      { icon: 'npm', link: 'https://www.npmjs.com/org/adi-family' }
    ],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2025 ADI Family'
    },

    search: {
      provider: 'local'
    },

    editLink: {
      pattern: 'https://github.com/adi-family/http/edit/main/docs/:path',
      text: 'Edit this page on GitHub'
    }
  },

  markdown: {
    theme: {
      light: 'github-light',
      dark: 'github-dark'
    }
  }
})
