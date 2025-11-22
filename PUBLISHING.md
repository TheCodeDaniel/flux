# Publishing Flux CLI to npm

This guide walks you through publishing Flux CLI to npm as a beta release.

---

## Prerequisites

1. **npm Account**
   - Create account at [npmjs.com](https://www.npmjs.com/signup)
   - Verify your email address

2. **Two-Factor Authentication (Recommended)**
   - Enable 2FA in your npm account settings for security
   - Choose "Authorization and Publishing" mode

3. **Login to npm**
   ```bash
   npm login
   ```
   Enter your username, password, and email (and 2FA code if enabled)

---

## Pre-Publishing Checklist

Before publishing, ensure everything is ready:

### ✅ 1. Version Check
```bash
# Current version should be 0.1.0-beta.1
grep version package.json
```

### ✅ 2. Run Tests
```bash
npm run test:unit
```
Should show: **17/19 tests passing (89% pass rate)**

### ✅ 3. Verify Package Contents
```bash
# See what files will be included in the package
npm pack --dry-run
```

This shows all files that will be published. Verify that:
- ✅ Source files are included (`commands/`, `utils/`, `flux.js`)
- ✅ Documentation is included (`README.md`, `TESTING.md`)
- ✅ `package.json` is included
- ❌ Tests are excluded (`tests/` directory)
- ❌ Credentials are excluded (`keys/`, `*.p8`, `*.json` except package.json)
- ❌ `.env` files are excluded

### ✅ 4. Test Package Locally
```bash
# Create a tarball
npm pack

# This creates flux-cli-0.1.0-beta.1.tgz
# Install it globally to test
npm install -g ./flux-cli-0.1.0-beta.1.tgz

# Test it works
flux --version
flux doctor

# Clean up
npm uninstall -g flux-cli
rm flux-cli-0.1.0-beta.1.tgz
```

### ✅ 5. Check Package Name Availability
```bash
# Verify the name "flux-cli" is available (or already yours)
npm view flux-cli
```

If it shows "404 Not Found" - the name is available! ✅
If it shows package details - check if you own it or need a different name.

---

## Publishing Steps

### 1. First-Time Beta Release

```bash
# Publish as beta (users need to explicitly install beta versions)
npm publish --tag beta --access public
```

**Flags explained:**
- `--tag beta` - Marks this as a beta release (not `latest`)
- `--access public` - Makes the package publicly available

### 2. Verify Publication

```bash
# Check the package on npm
npm view flux-cli

# Should show:
# - version: 0.1.0-beta.1
# - dist-tags: { beta: '0.1.0-beta.1' }
```

### 3. Test Installation

```bash
# Install the beta version globally
npm install -g flux-cli@beta

# Verify it works
flux --version  # Should show 0.1.0-beta.1
flux doctor

# Try a command
flux init
```

---

## After Publishing

### Share Your Release!

1. **GitHub Release**
   ```bash
   git tag v0.1.0-beta.1
   git push origin v0.1.0-beta.1
   ```
   Then create a release on GitHub with:
   - Title: "v0.1.0-beta.1 - Initial Beta Release"
   - Description: Highlight key features, known limitations, and beta warning

2. **Update README Badge** (optional)
   Add npm version badge to README:
   ```markdown
   [![npm version](https://badge.fury.io/js/flux-cli.svg)](https://www.npmjs.com/package/flux-cli)
   ```

3. **Social Media / Community**
   - Share on Twitter, Reddit (r/FlutterDev, r/reactnative), Dev.to
   - Mention it's in beta and you welcome feedback

---

## Installing Beta Version (For Users)

Users can install the beta with:

```bash
# Install latest beta version
npm install -g flux-cli@beta

# Or install specific beta version
npm install -g flux-cli@0.1.0-beta.1
```

**Note:** Running `npm install -g flux-cli` (without `@beta`) won't install your package yet because you haven't published a stable `latest` version.

---

## Future Beta Releases

When you make updates and want to release a new beta:

### 1. Bump Version
```bash
# For new features
npm version preminor --preid=beta
# Changes 0.1.0-beta.1 → 0.2.0-beta.0

# For bug fixes
npm version prepatch --preid=beta
# Changes 0.1.0-beta.1 → 0.1.1-beta.0

# For incremental beta iterations
npm version prerelease --preid=beta
# Changes 0.1.0-beta.1 → 0.1.0-beta.2
```

### 2. Publish
```bash
npm publish --tag beta --access public
```

---

## Releasing Stable v1.0.0

When ready to release stable version:

### 1. Update Version
```bash
npm version 1.0.0
```

### 2. Update README
Remove the beta warning banner

### 3. Publish as Latest
```bash
npm publish --access public
```

This will tag it as `latest` and users can install with:
```bash
npm install -g flux-cli
```

---

## Unpublishing (Emergency Only)

If you need to unpublish within 72 hours:

```bash
# Unpublish specific version
npm unpublish flux-cli@0.1.0-beta.1

# Unpublish entire package (use with extreme caution!)
npm unpublish flux-cli --force
```

⚠️ **Warning:** Unpublishing can break projects depending on your package. Only do this for serious issues (security, accidentally published secrets, etc.)

---

## Troubleshooting

### "Package name too similar to existing package"
- Change the name in `package.json` to something unique
- Try: `@yourusername/flux-cli` (scoped package)

### "You must verify your email"
- Check your npm account email
- Click verification link
- Try publishing again

### "You do not have permission to publish"
- Ensure you're logged in: `npm whoami`
- Check package name isn't taken by someone else
- Use `--access public` flag

### "402 Payment Required"
- Private packages require paid npm account
- Use `--access public` to publish as public (free)

---

## Security Checklist

Before publishing, verify:

- ✅ No API keys in code
- ✅ No `.p8` files in package
- ✅ No `*.json` credential files (except package.json)
- ✅ No `.env` files
- ✅ `.npmignore` properly excludes sensitive files
- ✅ Test with `npm pack --dry-run` to see what's included

---

## Resources

- [npm Documentation](https://docs.npmjs.com/cli/v8/commands/npm-publish)
- [Semantic Versioning](https://semver.org/)
- [npm Beta Releases](https://docs.npmjs.com/cli/v8/commands/npm-dist-tag)
- [Your Package Page](https://www.npmjs.com/package/flux-cli) (after publishing)

---

**Good luck with your beta release! 🚀**

Remember: Beta releases are perfect for getting early feedback while you refine features. Don't wait for perfection—ship it and iterate!
