# Flux Mobile CLI - Naming Consistency Changes

## Summary of Changes

To maintain consistency and avoid namespace conflicts, we've updated all internal naming to use "flux-mobile" branding.

---

## Changes Made

### 1. CLI Command Names

**Before:**
```json
{
  "bin": {
    "flux": "./flux.js"
  }
}
```

**After:**
```json
{
  "bin": {
    "fluxm": "./flux.js",
    "flux-mobile": "./flux.js"
  }
}
```

**Users can now use:**
- `fluxm` (short, recommended)
- `flux-mobile` (descriptive)

---

### 2. Configuration File

**Before:**
- `flux.yml`

**After:**
- `flux-mobile.yml`

**Impact:**
- Users run `fluxm init` to create `flux-mobile.yml`
- All commands read from `flux-mobile.yml`
- Old `flux.yml` files won't be recognized

---

### 3. Deployment Log Directory

**Before:**
```
.flux/deployments.json
```

**After:**
```
.flux-mobile/deployments.json
```

**Impact:**
- Deployment history stored in `.flux-mobile/` directory
- Auto-created on first deployment
- Should be added to `.gitignore`

---

### 4. pubspec.yaml Asset Reference (Flutter)

**Before:**
```yaml
flutter:
  assets:
    - flux.yml
```

**After:**
```yaml
flutter:
  assets:
    - flux-mobile.yml
```

**Impact:**
- Flutter projects will reference `flux-mobile.yml` in assets
- Auto-updated by `fluxm init`

---

## File Changes

### Modified Files

| File | What Changed |
|------|--------------|
| `flux.js` | - `.name('flux')` → `.name('fluxm')`<br>- Version: `0.0.1` → `0.1.0-beta.1`<br>- Descriptions mention `flux-mobile.yml` |
| `package.json` | - `"flux": "./flux.js"` → `"fluxm": "./flux.js"` + `"flux-mobile": "./flux.js"` |
| `utils/config.js` | - Reads `flux-mobile.yml` instead of `flux.yml` |
| `commands/init.js` | - Creates `flux-mobile.yml`<br>- Updates pubspec.yaml with `flux-mobile.yml` |
| `commands/deploy-android.js` | - Logs to `.flux-mobile/deployments.json` |
| `commands/deploy-ios.js` | - Logs to `.flux-mobile/deployments.json` |
| `.gitignore` | - Excludes `.flux-mobile/` instead of `.flux/` |
| `.npmignore` | - Excludes `.flux-mobile/` instead of `.flux/` |
| `README.md` | - All examples use `fluxm` command<br>- References to `flux-mobile.yml` |
| `TESTING.md` | - Test examples use `fluxm` |
| `jest.config.js` | - Excludes `.flux-mobile/` from coverage |

---

## Migration Guide for Existing Users

If you were using the old naming (from development/testing):

### 1. Rename Config File
```bash
mv flux.yml flux-mobile.yml
```

### 2. Update pubspec.yaml (Flutter projects)
```yaml
# Change this:
flutter:
  assets:
    - flux.yml

# To this:
flutter:
  assets:
    - flux-mobile.yml
```

### 3. Rename Deployment Log Directory (Optional)
```bash
mv .flux .flux-mobile
```

### 4. Update .gitignore
```bash
# Change this:
.flux/

# To this:
.flux-mobile/
```

### 5. Use New Commands
```bash
# Instead of:
flux init
flux build --release-type aab

# Use:
fluxm init
fluxm build --release-type aab

# Or:
flux-mobile init
flux-mobile build --release-type aab
```

---

## Rationale

### Why These Changes?

1. **Namespace Safety**
   - `flux` command conflicts with Flux GitOps and other tools
   - `fluxm` and `flux-mobile` are unique

2. **Brand Consistency**
   - Package name: `flux-mobile-cli`
   - Config file: `flux-mobile.yml`
   - Command names: `fluxm` / `flux-mobile`
   - Log directory: `.flux-mobile/`

3. **User Clarity**
   - `flux-mobile.yml` clearly indicates it's for mobile CI/CD
   - `.flux-mobile/` directory is self-documenting

---

## Quick Reference

### Old Names → New Names

| Old | New |
|-----|-----|
| Command: `flux` | Commands: `fluxm` or `flux-mobile` |
| Config: `flux.yml` | Config: `flux-mobile.yml` |
| Logs: `.flux/deployments.json` | Logs: `.flux-mobile/deployments.json` |
| Asset: `flux.yml` | Asset: `flux-mobile.yml` |

---

## Testing the Changes

```bash
# 1. Install package
npm install -g flux-mobile-cli@beta

# 2. Verify commands work
fluxm --version          # Should show 0.1.0-beta.1
flux-mobile --version    # Should show 0.1.0-beta.1

# 3. Initialize project
fluxm init

# 4. Verify config file created
ls -la flux-mobile.yml   # Should exist

# 5. Build something
fluxm build --release-type apk

# 6. Check deployment logs
ls -la .flux-mobile/     # Should exist after first deployment
```

---

## Documentation Updates

All documentation has been updated:
- ✅ README.md - Uses `fluxm` in all examples
- ✅ TESTING.md - Test commands updated
- ✅ PUBLISHING.md - Installation examples updated
- ✅ PRE_PUBLISH_CHECKLIST.md - Test commands updated
- ✅ All code examples reference `flux-mobile.yml`

---

## Backward Compatibility

**Breaking Changes:**
- Old `flux.yml` files will NOT be recognized
- Old `.flux/` directory path is NOT used
- Old `flux` command is NOT available

**Migration Required:**
- Users must rename `flux.yml` → `flux-mobile.yml`
- Users must update command from `flux` → `fluxm` or `flux-mobile`

**Note:** Since this is a beta release (v0.1.0-beta.1), breaking changes are acceptable and expected. Users installing for the first time will use the new naming from the start.

---

## Summary

**All naming is now consistent:**
- 📦 Package: `flux-mobile-cli`
- 💻 Commands: `fluxm` / `flux-mobile`
- ⚙️ Config: `flux-mobile.yml`
- 📝 Logs: `.flux-mobile/deployments.json`
- 🎯 Brand: Flux Mobile CLI

**Result:** Professional, consistent, conflict-free branding! 🚀
