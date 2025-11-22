# Flux CLI 📱🚀

> ⚠️ **BETA RELEASE** - This package is currently in beta (v0.1.0-beta.1). While the core features are stable and production-ready, expect active development and potential breaking changes before v1.0.0. Please report any issues on [GitHub](https://github.com/TheCodeDaniel/flux-cli/issues).

**Flux** is a powerful, open-source local CI/CD CLI tool for mobile developers. Build, test, and deploy your Flutter and React Native apps to Google Play Store and Apple App Store—all from your local machine. No mandatory cloud CI, no vendor lock-in, just simple commands that work.

---

## Table of Contents

- [Why Use Flux?](#why-use-flux)
- [Current Status](#current-status)
- [Features](#features)
- [Requirements](#requirements)
- [Installation](#installation)
- [Quick Start](#quick-start)
  - [Android (Google Play)](#android-google-play)
  - [iOS (App Store Connect)](#ios-app-store-connect)
- [Commands](#commands)
- [Configuration Reference](#configuration-reference)
- [Testing](#testing)
- [Security & Best Practices](#security--best-practices)
- [Troubleshooting & FAQ](#troubleshooting--faq)
- [Development & Contributing](#development--contributing)
- [Roadmap](#roadmap)
- [License](#license)

---

## Why Use Flux?

### 🚀 **Complete Mobile CI/CD Without the Complexity**

Traditional CI/CD platforms like GitHub Actions, CircleCI, or Fastlane can be:

- **Expensive** (pay per minute for build runners)
- **Slow** (network latency, cold starts, queue times)
- **Complex** (YAML config hell, debugging nightmares)
- **Privacy concerns** (uploading code to third-party servers)

Flux solves these problems:

### ✅ **Local-First Development**

- Run builds on **your own machine** for maximum speed and privacy
- No upload/download overhead—your code never leaves your control
- Use your powerful local hardware instead of slow cloud VMs

### ✅ **Production-Ready Automation**

- **Full iOS automation**: Build IPA → Upload → Submit for App Store review (all from CLI!)
- **Full Android automation**: Build APK/AAB → Upload → Deploy to any track
- Automatic version extraction from artifacts
- Multi-locale release notes support
- Comprehensive error handling

### ✅ **Developer Experience First**

- Simple, intuitive CLI commands
- Helpful diagnostics with `flux doctor`
- Interactive prompts for choices
- Color-coded output with progress spinners
- Detailed logging to `.flux/deployments.json`

### ✅ **Cost Effective**

- **100% free**: No per-minute charges, no subscription fees
- Use your existing hardware
- Only pay for Apple Developer ($99/year) and Google Play ($25 one-time)

### ✅ **Transparent & Open Source**

- MIT licensed—use it however you want
- No vendor lock-in
- Full control over your deployment pipeline

---

## Current Status

**✅ Production Ready**

### Android

- ✅ Build APK/AAB with flavors
- ✅ Deploy to Google Play (internal/alpha/beta/production)
- ✅ Automatic artifact detection
- ✅ Multi-language release notes
- ✅ Dry-run mode

### iOS (macOS only)

- ✅ Build IPA with flavors
- ✅ Upload to App Store Connect
- ✅ Automatic TestFlight submission
- ✅ **Full production automation**: Version extraction → Assignment → Release notes → Submit for review
- ✅ Interactive upload tool selection
- ✅ Multi-locale What's New support

### Developer Tools

- ✅ Project initialization
- ✅ Environment validation
- ✅ Build artifact cleanup
- ✅ **Comprehensive test suite** (89% pass rate)
- ✅ Deployment audit logging

### Planned

- React Native full iOS support
- Screenshot upload
- Metadata management
- CI runner agents

---

## Features

- Initialize project config with `flux init`
- Validate environment with `flux doctor`
- Clean build artifacts with `flux clean`
- Build Android (APK/AAB) and iOS (IPA) apps
- Deploy to Google Play (all tracks)
- Deploy to App Store Connect (TestFlight or Production)
- Flavor/Scheme support for staging/production builds
- Environment variable injection
- Multi-locale release notes
- Audit logging

---

## Requirements

### Common

- Node.js v14+ (v18+ recommended)
- npm or yarn

### Android

- Java (JDK 11 or 17)
- Android SDK
- Gradle
- Flutter (for Flutter projects)
- Google Play service account JSON

### iOS (macOS only)

- macOS
- Xcode & Xcode Command Line Tools
- Flutter (for Flutter projects)
- App Store Connect API key (.p8 file)

---

## Installation

### Development

```bash
git clone https://github.com/yourusername/flux-cli
cd flux-cli
npm install
npm link
```

### Production (when published)

```bash
npm install -g flux-cli
```

### Verify

```bash
flux --version
flux doctor
```

---

## Quick Start

### Android (Google Play)

1. **Initialize**:

```bash
flux init
```

2. **Configure** `flux.yml`:

```yaml
playstore:
  service_account_json: ./keys/playstore.json
  package_name: com.example.myapp
```

3. **Build**:

```bash
flux build --release-type aab
```

4. **Deploy**:

```bash
flux deploy-android --track internal --notes "First release!"
```

### iOS (App Store Connect)

**Requires macOS**

1. **Initialize**:

```bash
flux init
```

2. **Configure** `flux.yml`:

```yaml
appstore:
  api_key_path: ./keys/AuthKey_XXXXXXXXXX.p8
  api_key_id: XXXXXXXXXX
  issuer_id: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
  bundle_id: com.example.myapp
```

3. **Build**:

```bash
flux build --release-type ipa
```

4. **Deploy to TestFlight**:

```bash
flux deploy-ios --track testflight
```

5. **Deploy to Production** (full automation!):

```bash
flux deploy-ios --track production --notes "Bug fixes"
```

This automatically:

- ✅ Uploads IPA
- ✅ Extracts version
- ✅ Creates App Store version
- ✅ Sets release notes
- ✅ **Submits for review**

---

## Commands

### `flux init`

Initialize project configuration.

```bash
flux init [-f|--force]
```

Creates `flux.yml` and updates project files.

---

### `flux doctor`

Validate development environment.

```bash
flux doctor
```

Checks Node.js, Flutter, Xcode, Android SDK, etc.

---

### `flux clean`

Remove build artifacts.

```bash
flux clean
```

Cleans `build/`, `dist/`, and framework-specific caches.

---

### `flux info`

Display project and system information.

```bash
flux info
```

---

### `flux build`

Build mobile application.

```bash
flux build --release-type <apk|aab|ipa> [options]
```

**Options:**

- `--release-type <type>` — Build type (required): `apk`, `aab`, or `ipa`
- `--output-dir <path>` — Output directory (default: `./dist`)
- `--flavor <name>` — Build flavor/scheme
- `--mode <mode>` — Build mode: `release`, `debug`, `profile` (default: `release`)
- `--env-file <path>` — Environment file for `--dart-define-from-file`
- `--define <value...>` — Additional `--dart-define` values
- `--verbose` — Verbose output

**Examples:**

```bash
# Build production AAB
flux build --release-type aab

# Build with flavor
flux build --release-type apk --flavor dev --mode debug

# Build with environment variables
flux build --release-type ipa --env-file .env.prod
```

---

### `flux deploy-android`

Deploy to Google Play Store.

```bash
flux deploy-android [options]
```

**Options:**

- `--artifact <path>` — Path to `.apk` or `.aab` (auto-detected)
- `--track <name>` — Track: `internal`, `alpha`, `beta`, `production` (default: `internal`)
- `--notes <text>` — Release notes (string or JSON)
- `--key <path>` — Override service account path
- `--dry-run` — Validate without committing

**Examples:**

```bash
# Deploy to internal
flux deploy-android --track internal

# Production with notes
flux deploy-android --track production --notes "Major update"

# Multi-language notes
flux deploy-android --notes '{"en-US":"English","es-ES":"Español"}'
```

---

### `flux deploy-ios`

Deploy to App Store Connect.

**Requires macOS**

```bash
flux deploy-ios [options]
```

**Options:**

- `--artifact <path>` — Path to `.ipa` (auto-detected)
- `--track <name>` — Track: `testflight` or `production` (default: `testflight`)
- `--notes <text>` — Release notes (string or JSON)
- `--api-key-path <path>` — Override `.p8` file path
- `--api-key-id <id>` — Override API Key ID
- `--issuer-id <id>` — Override Issuer ID
- `--upload-tool <tool>` — Upload tool: `transporter` or `altool`

**Examples:**

```bash
# Deploy to TestFlight
flux deploy-ios --track testflight

# Production with auto-submission
flux deploy-ios --track production --notes "Bug fixes"

# Multi-locale notes
flux deploy-ios --notes '{"en-US":"English","fr-FR":"Français"}'

# Use altool
flux deploy-ios --upload-tool altool
```

**Production Track:**

- Uploads IPA
- Extracts version from IPA automatically
- Creates/finds App Store version
- Assigns build
- Sets release notes
- **Submits for App Store review**

---

## Configuration Reference

### flux.yml

```yaml
app_name: MyApp
platform: flutter

android:
  keystore_path: "./android/keystore.jks"
  key_alias: "mykey"
  key_password: ""
  store_password: ""

ios:
  enabled: true
  export_method: "app-store"

playstore:
  service_account_json: "./keys/playstore.json"
  package_name: "com.example.myapp"
  default_track: "internal"

appstore:
  api_key_path: "./keys/AuthKey_XXXXXXXXXX.p8"
  api_key_id: "XXXXXXXXXX"
  issuer_id: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
  bundle_id: "com.example.myapp"
  default_track: "testflight"
  upload_tool: "transporter"

versioning:
  strategy: auto

build:
  output_dir: "./dist"
  release_type: "aab"
```

### Google Play Console Setup

1. Enable Google Play Android Publisher API
2. Create service account in Google Cloud
3. Download JSON key
4. Grant access in Play Console
5. Assign Release Manager role
6. Configure `flux.yml`

[Detailed guide](https://cloud.google.com/iam/docs/service-accounts)

### App Store Connect Setup

1. Create App Store Connect API Key
2. Download `.p8` file
3. Note Key ID and Issuer ID
4. Save securely
5. Configure `flux.yml`
6. Install Xcode Command Line Tools

[Detailed guide](https://developer.apple.com/documentation/appstoreconnectapi/creating_api_keys_for_app_store_connect_api)

---

## Testing

Flux includes comprehensive tests.

```bash
# Run unit tests
npm run test:unit

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

**Status:** ✅ 89% pass rate (17/19 tests)

See [TESTING.md](TESTING.md) for details.

---

## Security & Best Practices

### Credential Security

```bash
# Add to .gitignore
keys/
*.json
*.p8
.env
```

```bash
# Secure permissions
chmod 600 keys/*.p8
chmod 600 keys/*.json
```

### Deployment Best Practices

1. Test with `--dry-run` first
2. Use internal/testflight for testing
3. Verify builds before deploying
4. Review deployment logs

---

## Troubleshooting & FAQ

### General

**Q: Check environment?**
A: Run `flux doctor`

**Q: Where are build artifacts?**
A: Default: `./dist`

### Android

**Q: 403 permission error?**
A: Verify service account has Play Console access and API is enabled

**Q: Artifact not found?**
A: Run `flux build --release-type aab` first

### iOS

**Q: Requires macOS error?**
A: iOS builds only work on macOS

**Q: iTMSTransporter not found?**
A: Install: `xcode-select --install`

**Q: Which upload tool?**
A: Use `transporter` (recommended)

**Q: Can it submit for review?**
A: **Yes!** Use `--track production`

---

## Development & Contributing

```bash
git clone https://github.com/yourusername/flux-cli
cd flux-cli
npm install
npm link
npm run test:unit
```

### Guidelines

- Write tests for new features
- Follow existing code style
- Update documentation
- Add helpful error messages

---

## Roadmap

### ✅ Completed

- Flutter Android/iOS builds
- Google Play deployment
- App Store Connect deployment
- Full iOS production automation
- Test suite (89% pass rate)
- Multi-locale release notes

### 📋 Planned

- React Native iOS support
- Screenshot upload
- Metadata management
- Expo/EAS integration
- CI runner agents
- Web dashboard

---

## License

MIT License © 2025 Flux CLI Project

---

## Support

- 📖 [Documentation](README.md)
- 🧪 [Testing Guide](TESTING.md)
- 🐛 [Issues](https://github.com/yourusername/flux-cli/issues)

---

**Built with ❤️ by developers, for developers.**

_Stop paying for slow CI/CD. Take control of your mobile deployments with Flux._
