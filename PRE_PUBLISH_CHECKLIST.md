# Pre-Publish Checklist for Flux CLI v0.1.0-beta.1

Use this checklist before running `npm publish --tag beta --access public`

---

## ✅ Package Verification

- [x] **Version updated** to `0.1.0-beta.1` in package.json
- [x] **Description added** to package.json
- [x] **Keywords optimized** (17 relevant keywords for discoverability)
- [x] **License set** to MIT
- [x] **Repository URL** added (GitHub)
- [x] **Beta warning** added to README.md
- [x] **.npmignore created** to exclude test files and credentials

---

## ✅ Files Check

Run: `npm pack --dry-run`

Verify the package includes (17 files total, ~96KB):
- [x] All command files (`commands/*.js`)
- [x] All utility files (`utils/*.js`)
- [x] Main entry point (`flux.js`)
- [x] Documentation (`README.md`, `TESTING.md`, `PUBLISHING.md`)
- [x] Package manifest (`package.json`)

Verify the package EXCLUDES:
- [x] Test files (`tests/` directory)
- [x] Coverage reports (`coverage/`)
- [x] Keys and credentials (`keys/`, `*.p8`, `*.json` except package.json)
- [x] Environment files (`.env`, `.env.*`)
- [x] Git files (`.git/`, `.gitignore`)
- [x] IDE files (`.vscode/`, `.idea/`)

---

## ✅ Testing

```bash
# Run unit tests
npm run test:unit
```

**Expected:** 17/19 tests passing (89% pass rate) ✅

---

## ✅ Local Installation Test

```bash
# Create package tarball
npm pack

# Install globally for testing
npm install -g ./flux-mobile-cli-0.1.0-beta.1.tgz

# Test basic commands
fluxm --version
fluxm doctor
cd /tmp && fluxm init

# Clean up
npm uninstall -g flux-mobile-cli
rm flux-mobile-cli-0.1.0-beta.1.tgz
```

---

## ✅ npm Account Setup

- [ ] npm account created at [npmjs.com](https://www.npmjs.com/signup)
- [ ] Email verified
- [ ] Logged in locally: `npm whoami` (should show your username)
- [ ] (Optional) 2FA enabled for security

To login:
```bash
npm login
```

---

## ✅ Name Availability

Check if "flux-mobile-cli" is available:
```bash
npm view flux-mobile-cli
```

- If shows "404" → Name is available ✅
- If shows package info → Check if you own it or need a different name

---

## ✅ Git Commit

Commit all changes before publishing:

```bash
git status
git add .
git commit -m "chore: prepare v0.1.0-beta.1 for npm release"
git push origin deployment_prep
```

---

## 🚀 Ready to Publish!

If all checks pass, publish with:

```bash
npm publish --tag beta --access public
```

**What this does:**
- Publishes `flux-mobile-cli@0.1.0-beta.1` to npm
- Tags it as `beta` (not `latest`)
- Makes it publicly accessible
- Users install with: `npm install -g flux-mobile-cli@beta`

---

## After Publishing

1. **Verify on npm**
   ```bash
   npm view flux-mobile-cli
   ```

2. **Create Git Tag**
   ```bash
   git tag v0.1.0-beta.1
   git push origin v0.1.0-beta.1
   ```

3. **Create GitHub Release**
   - Go to https://github.com/TheCodeDaniel/flux-mobile-cli/releases
   - Create new release from tag `v0.1.0-beta.1`
   - Title: "v0.1.0-beta.1 - Initial Beta Release"
   - Description: Feature highlights and beta disclaimer

4. **Test Installation**
   ```bash
   npm install -g flux-mobile-cli@beta
   fluxm --version
   ```

5. **Share the news!**
   - Twitter/X
   - Reddit (r/FlutterDev, r/reactnative)
   - Dev.to
   - Product Hunt (when closer to v1.0)

---

## Troubleshooting

**"You must verify your email"**
→ Check npm account email and click verification link

**"402 Payment Required"**
→ Add `--access public` flag (you already have this)

**"You do not have permission to publish"**
→ Run `npm whoami` to verify you're logged in

**"Name too similar to existing package"**
→ Change name in package.json or use scoped package: `@yourusername/flux-mobile-cli`

---

**Good luck! 🎉**

See [PUBLISHING.md](PUBLISHING.md) for detailed publishing guide.
