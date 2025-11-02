# Deployment Guide

deployment-guide, github-pages, documentation

Guide for deploying the @adi-family/http documentation to GitHub Pages.

## Automatic Deployment

The documentation is automatically deployed to GitHub Pages on every push to the `main` branch.

### Setup Steps

1. **Enable GitHub Pages** (one-time setup):
   - Go to your repository on GitHub: `https://github.com/adi-family/http`
   - Navigate to **Settings** → **Pages**
   - Under **Source**, select: **GitHub Actions**
   - Save the settings

2. **Push to main branch**:
   ```bash
   git push origin main
   ```

3. **Monitor deployment**:
   - Go to **Actions** tab in your repository
   - You'll see the "Deploy Documentation" workflow running
   - Once complete (2-3 minutes), docs are live!

4. **Access your documentation**:
   ```
   https://adi-family.github.io/http/
   ```

### How It Works

The `.github/workflows/deploy-docs.yml` workflow:
1. ✅ Triggers on push to `main` branch
2. ✅ Installs dependencies with Bun
3. ✅ Builds VitePress documentation
4. ✅ Deploys to GitHub Pages automatically

## Manual Deployment

You can also trigger deployment manually:

1. Go to **Actions** tab on GitHub
2. Select **Deploy Documentation** workflow
3. Click **Run workflow**
4. Select `main` branch
5. Click **Run workflow** button

## Local Preview

Before pushing, preview your documentation locally:

```bash
# Development server with hot reload
bun run docs:dev

# Build and preview production version
bun run docs:build
bun run docs:preview
```

## Custom Domain (Optional)

To use a custom domain like `docs.adi-family.com`:

1. **Add CNAME file**:
   ```bash
   echo "docs.adi-family.com" > docs/public/CNAME
   ```

2. **Configure DNS** (at your domain provider):
   ```
   Type: CNAME
   Name: docs
   Value: adi-family.github.io
   ```

3. **Update VitePress config** (`docs/.vitepress/config.ts`):
   ```typescript
   export default defineConfig({
     // Remove or update base
     base: '/',

     sitemap: {
       hostname: 'https://docs.adi-family.com'
     }
   })
   ```

4. **Configure in GitHub**:
   - Settings → Pages → Custom domain
   - Enter: `docs.adi-family.com`
   - Wait for DNS check
   - Enable "Enforce HTTPS"

## Troubleshooting

### Deployment fails

**Check the workflow logs:**
1. Go to Actions tab
2. Click on the failed workflow
3. Check the error messages

**Common issues:**

- **Pages not enabled**: Enable GitHub Pages in Settings
- **Wrong permissions**: Ensure workflow has `pages: write` permission
- **Build errors**: Run `bun run docs:build` locally to debug

### 404 on deployed site

**Issue**: Site shows 404 errors

**Solution**:
- Verify `base: '/http/'` in `docs/.vitepress/config.ts`
- Repository name must match the base path

### Assets not loading

**Issue**: CSS/JS files return 404

**Solution**:
- Check `base` path in config matches repository name
- Clear browser cache
- Check browser console for error details

### Changes not appearing

**Wait a few minutes** - GitHub Pages can take 2-3 minutes to update

**Hard refresh**:
- Windows/Linux: `Ctrl + Shift + R`
- Mac: `Cmd + Shift + R`

**Check workflow**:
- Go to Actions tab
- Verify latest workflow succeeded
- Check deployment timestamp

## Deployment Checklist

Before pushing documentation changes:

- [ ] Test locally with `bun run docs:dev`
- [ ] Build succeeds: `bun run docs:build`
- [ ] Preview production build: `bun run docs:preview`
- [ ] Check all links work
- [ ] Verify code examples are correct
- [ ] Review spelling and grammar
- [ ] Commit and push to main

## Alternative Deployment Options

### Vercel

1. Import repository on Vercel
2. Set build command: `bun run docs:build`
3. Set output directory: `docs/.vitepress/dist`
4. Deploy

### Netlify

1. Import repository on Netlify
2. Set build command: `bun run docs:build`
3. Set publish directory: `docs/.vitepress/dist`
4. Deploy

### Cloudflare Pages

1. Connect repository on Cloudflare Pages
2. Set build command: `bun run docs:build`
3. Set output directory: `docs/.vitepress/dist`
4. Deploy

## Documentation URLs

- **Production**: https://adi-family.github.io/http/
- **Repository**: https://github.com/adi-family/http
- **npm Package**: https://www.npmjs.com/package/@adi-family/http

## Support

If you encounter issues:
- Check GitHub Actions logs
- Review VitePress documentation: https://vitepress.dev/
- Open an issue: https://github.com/adi-family/http/issues
