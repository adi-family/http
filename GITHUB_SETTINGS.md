# GitHub Repository Settings

This file contains the recommended settings for the GitHub repository.

## Repository Information

### Description
```
Framework-agnostic, type-safe HTTP interface system with end-to-end type safety between client and server
```

### Website
```
https://adi-family.github.io/http/
```

### Topics (Tags)
Add these topics to make the repository more discoverable:

```
typescript
http
type-safe
validation
zod
framework-agnostic
rest-api
api-contracts
express
nodejs
http-client
type-safety
api-design
backend
frontend
```

## Repository Settings

### General

- **Template repository**: ❌ No
- **Require contributors to sign off on web-based commits**: ❌ No
- **Allow merge commits**: ✅ Yes
- **Allow squash merging**: ✅ Yes
- **Allow rebase merging**: ✅ Yes
- **Automatically delete head branches**: ✅ Yes

### GitHub Pages

- **Source**: GitHub Actions
- **Custom domain**: (none)
- **Enforce HTTPS**: ✅ Yes

### Actions

- **Actions permissions**: Allow all actions and reusable workflows
- **Workflow permissions**: Read and write permissions
- **Allow GitHub Actions to create and approve pull requests**: ✅ Yes

## How to Apply These Settings

1. Go to: https://github.com/adi-family/http/settings

2. **General Tab**:
   - Add description and website
   - Scroll to "Features" and enable Issues, Discussions (optional)

3. **Topics** (on main repo page):
   - Click the ⚙️ icon next to "About"
   - Add the topics listed above

4. **Pages Tab**:
   - Set "Build and deployment" source to "GitHub Actions"

5. **Actions Tab**:
   - Under "General", set workflow permissions to "Read and write permissions"
   - Check "Allow GitHub Actions to create and approve pull requests"

## Quick Setup Commands

You can also use GitHub CLI (if available):

```bash
# Set repository description and website
gh repo edit adi-family/http \
  --description "Framework-agnostic, type-safe HTTP interface system with end-to-end type safety between client and server" \
  --homepage "https://adi-family.github.io/http/"

# Add topics
gh repo edit adi-family/http \
  --add-topic typescript,http,type-safe,validation,zod,framework-agnostic,rest-api,api-contracts,express,nodejs,http-client,type-safety,api-design,backend,frontend

# Enable GitHub Pages (requires manual setup via web UI)
```

## Notes

- The documentation is automatically deployed via GitHub Actions
- Make sure GitHub Pages is set to "GitHub Actions" as the source
- All topics help with discoverability in GitHub search and trending
