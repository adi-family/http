# Documentation

This directory contains the VitePress documentation for @adi-family/http.

## Development

```bash
# Start development server
bun run docs:dev

# Build for production
bun run docs:build

# Preview production build
bun run docs:preview
```

## Structure

```
docs/
├── .vitepress/
│   └── config.ts           # VitePress configuration
├── index.md                # Home page
├── guide/                  # User guides
│   ├── getting-started.md
│   └── route-builder.md
├── api/                    # API reference
└── examples/               # Code examples
```

## Deployment

Documentation is automatically deployed to GitHub Pages on push to main.

## Contributing

To add or update documentation:

1. Edit the relevant `.md` files
2. Test locally with `bun run docs:dev`
3. Build with `bun run docs:build` to verify
4. Commit and push to main
5. GitHub Actions will deploy automatically

## Links

- Live docs: https://adi-family.github.io/http/
- Repository: https://github.com/adi-family/http
- VitePress: https://vitepress.dev/
