# Command Naming Strategy

## Why `fluxm` Instead of `flux`?

### The Problem with `flux`

If we used `flux` as the command name, users would face **namespace conflicts** with other tools:

```bash
# User has Flux GitOps installed
npm install -g @fluxcd/flux
flux version  # → Flux GitOps

# User installs our tool
npm install -g flux-mobile-cli@beta
flux version  # → OVERWRITES GitOps! ❌

# Now their Flux GitOps is broken!
```

**This is a real problem!** Multiple npm packages can't share the same command name.

---

## Our Solution: Unique Command Names

We provide **TWO command aliases** for maximum flexibility:

### 1. `fluxm` (Recommended - Short & Fast)

```bash
fluxm init
fluxm build --release-type aab
fluxm deploy-android --track production
```

**Benefits:**
- ✅ **Short** - Quick to type (6 characters vs 11)
- ✅ **Memorable** - "fluxm" = Flux Mobile
- ✅ **Unique** - No conflicts with other tools
- ✅ **Fast** - Less typing in daily use

### 2. `flux-mobile` (Descriptive Alternative)

```bash
flux-mobile init
flux-mobile build --release-type aab
flux-mobile deploy-android --track production
```

**Benefits:**
- ✅ **Descriptive** - Clearly indicates "mobile deployment"
- ✅ **Self-documenting** - New users understand what it does
- ✅ **Tab-completion friendly** - Easy to discover

---

## Both Commands Work Identically

Users can choose whichever they prefer:

```bash
# These are EXACTLY the same:
fluxm doctor
flux-mobile doctor

# Choose based on your preference:
fluxm build --release-type ipa      # Fast typers
flux-mobile build --release-type ipa # Clarity lovers
```

---

## Comparison with Other Tools

| Tool | Command | Conflict Risk |
|------|---------|---------------|
| **Flux GitOps** | `flux` | ❌ Would conflict |
| **Our Tool** | `fluxm` or `flux-mobile` | ✅ No conflict |
| **Fastlane** | `fastlane` | ✅ Different namespace |
| **Flutter** | `flutter` | ✅ Different namespace |
| **React Native** | `react-native` or `npx react-native` | ✅ Different namespace |

---

## Why Not Just `flux`?

### Option 1: Use `flux` (❌ Bad Idea)

**Problems:**
1. Conflicts with Flux GitOps (popular Kubernetes tool)
2. Conflicts with any other `flux-*` package that uses `flux` command
3. Users would have to uninstall other tools
4. Creates frustration and bad user experience

### Option 2: Use Scoped Package `@thecodedaniel/flux` (❌ Still Bad)

**Problems:**
```bash
npm install -g @thecodedaniel/flux
# Command is still just "flux" - same conflict!
```

Scoped packages don't solve command name conflicts.

### Option 3: Use `fluxm` + `flux-mobile` (✅ Perfect!)

**Benefits:**
1. ✅ Zero conflicts with existing tools
2. ✅ Two aliases for user preference
3. ✅ Short option for speed (`fluxm`)
4. ✅ Descriptive option for clarity (`flux-mobile`)
5. ✅ Professional and unique branding

---

## User Experience

### First-Time Users

**Discovery:**
```bash
npm install -g flux-mobile-cli@beta

# Package name tells them what to expect
# After install, they can use either command
```

**Learning:**
```bash
# Start with descriptive version
flux-mobile doctor
flux-mobile init

# Graduate to short version as they get comfortable
fluxm build --release-type aab
fluxm deploy-ios
```

### Power Users

```bash
# Quick iterations with short command
fluxm build --release-type apk --flavor dev
fluxm deploy-android --track internal

# Aliases work in scripts too
alias fm="fluxm"
fm doctor
```

---

## In Documentation

We use `fluxm` in all examples because:
1. It's shorter (less visual clutter)
2. Most users will prefer it
3. Power users type commands frequently

But we mention both options prominently.

---

## Migration Path (If Needed)

If we ever want to change command names:

```json
{
  "bin": {
    "fluxm": "./fluxm.js",          // Primary
    "flux-mobile": "./fluxm.js",    // Alias
    "flux-m": "./fluxm.js"          // Future alias?
  }
}
```

npm allows multiple aliases, so we can add more without breaking existing users.

---

## Alternatives We Considered

| Command Name | Pros | Cons | Decision |
|--------------|------|------|----------|
| `flux` | Short, obvious | ❌ Conflicts with Flux GitOps | ❌ Rejected |
| `flux-cli` | Matches package name | Too generic, still conflicts | ❌ Rejected |
| `fluxmobile` | Descriptive | 11 characters (too long) | ❌ Rejected |
| `fm` | Very short | Too cryptic, hard to discover | ❌ Rejected |
| `mobile-flux` | Descriptive | Doesn't match package name | ❌ Rejected |
| **`fluxm`** | **Short, unique, memorable** | None | ✅ **CHOSEN** |
| **`flux-mobile`** | **Descriptive, clear** | Slightly longer | ✅ **BONUS ALIAS** |

---

## Command Name Best Practices

### ✅ Good Command Names

- Short but not cryptic
- Related to package name
- No conflicts with popular tools
- Easy to type and remember
- Supports tab completion

### ❌ Bad Command Names

- Generic words (`build`, `deploy`, `run`)
- Too long (`flux-mobile-deployment-tool`)
- Too short (`f`, `fx`)
- Conflicts with existing tools
- Hard to pronounce or spell

---

## Summary

**Command:** `fluxm` (primary) + `flux-mobile` (alias)
**Package:** `flux-mobile-cli`
**Why:** Unique, memorable, no conflicts

**Users get the best of both worlds:**
- Speed typers use `fluxm`
- Clarity lovers use `flux-mobile`
- No namespace conflicts
- Professional branding

---

## Technical Implementation

In [package.json](package.json):

```json
{
  "name": "flux-mobile-cli",
  "bin": {
    "fluxm": "./flux.js",
    "flux-mobile": "./flux.js"
  }
}
```

After `npm install -g flux-mobile-cli@beta`:

```bash
which fluxm         # → /usr/local/bin/fluxm
which flux-mobile   # → /usr/local/bin/flux-mobile

# Both point to the same executable
# Both work identically
```

---

**Result:** Professional, conflict-free, user-friendly CLI tool! 🚀
