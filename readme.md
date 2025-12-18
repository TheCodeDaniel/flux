# Flux Mobile CLI 📱🚀

> ⚠️ **BETA RELEASE** - This package is currently in beta (v0.4.0-beta.4). While the core features are stable and production-ready, expect active development and potential breaking changes before v1.0.0. Please report any issues on [GitHub](https://github.com/TheCodeDaniel/flux-mobile-cli/issues).

**Flux Mobile CLI** is a powerful, open-source local CI/CD CLI tool for mobile developers. Build, test, and deploy your Flutter and React Native apps to Google Play Store and Apple App Store—all from your local machine. No mandatory cloud CI, no vendor lock-in, just simple commands that work.

---

## Table of Contents

- [Why Use Flux Mobile CLI?](#why-use-flux-mobile-cli)
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

## Why Use Flux Mobile CLI?

### 🚀 **Complete Mobile CI/CD Without the Complexity**

Traditional CI/CD platforms like GitHub Actions, CircleCI, or Fastlane can be:

- **Expensive** (pay per minute for build runners)
- **Slow** (network latency, cold starts, queue times)
- **Complex** (YAML config hell, debugging nightmares)
- **Privacy concerns** (uploading code to third-party servers)

Flux Mobile CLI solves these problems:

### ✅ **Local-First Development**

- Run builds on **your own machine** for maximum speed and privacy
- No upload/download overhead—your code never leaves your control
- Use your powerful local hardware instead of slow cloud VMs

### ✅ **Production-Ready Automation**

- **Unified workflow**: Build + Deploy in one command for both platforms
- **Full iOS automation**: Build IPA → Confirm → Upload → Wait for processing → Submit for review
- **Full Android automation**: Build AAB → Confirm → Upload → Deploy to any track
- **iOS build processing**: Wait for Apple validation with real-time progress (5-15 min avg)
- **Export compliance**: Auto-configure Info.plist for App Store requirements
- Interactive deployment confirmation with `--skip-confirm` for CI/CD
- Automatic version extraction from artifacts
- Multi-locale release notes support
- Comprehensive error handling

### ✅ **Developer Experience First**

- Simple, intuitive CLI commands
- Helpful diagnostics with `fluxm doctor`
- Interactive prompts for choices
- Color-coded output with progress spinners
- Detailed logging to `.flux-mobile/deployments.json`

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

- ✅ **Unified build + deploy workflow** (one command does it all)
- ✅ **Optional code obfuscation** (use --obfuscate flag)
- ✅ Build AAB with flavors
- ✅ Deploy to Google Play (internal/alpha/beta/production)
- ✅ Interactive deployment confirmation (skip with `--skip-confirm` for CI/CD)
- ✅ Animated build progress with live spinner
- ✅ Multi-language release notes
- ✅ Auto-parse build output for AAB path

### iOS (macOS only)

- ✅ **Unified build + deploy workflow** (one command does it all)
- ✅ **Optional code obfuscation** (use --obfuscate flag)
- ✅ Build IPA with flavors
- ✅ Upload to App Store Connect
- ✅ Automatic TestFlight submission
- ✅ **Full production automation**: Version extraction → Assignment → Release notes → Submit for review
- ✅ **Smart build processing**: Wait for Apple validation with real-time progress (5-15 min avg)
- ✅ **Export compliance auto-fix**: Automatically adds ITSAppUsesNonExemptEncryption to Info.plist
- ✅ Interactive deployment confirmation (skip with `--skip-confirm` for CI/CD)
- ✅ Animated build progress with live spinner
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

- Initialize project config with `fluxm init`
- Validate environment with `fluxm doctor`
- Clean build artifacts with `fluxm clean`
- **Self-update command**: `fluxm upgrade` to get latest version
- **Unified release workflow**: Build + Deploy in one command
- **Optional code obfuscation**: Use `--obfuscate` flag for increased security
- **Export compliance auto-fix**: Automatically configures iOS Info.plist for App Store (iOS)
- **Smart build processing**: Wait for Apple validation with progress updates (iOS)
- Build Android (AAB) and iOS (IPA) apps
- Deploy to Google Play (all tracks)
- Deploy to App Store Connect (TestFlight or Production)
- Interactive deployment confirmation with `--skip-confirm` for CI/CD automation
- Flavor/Scheme support for staging/production builds
- Environment variable injection via `--env-file` and `--define`
- Multi-locale release notes
- Animated build progress
- Audit logging to `.flux-mobile/deployments.json`

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
git clone https://github.com/TheCodeDaniel/flux-mobile-cli
cd flux-mobile-cli
npm install
npm link
```

### Production (when published)

```bash
npm install -g flux-mobile-cli@beta
```

### Verify

```bash
fluxm --version
fluxm doctor
```

> **Note:** After installation, you can use either `fluxm` (short form) or `flux-mobile` (descriptive form). Both commands work identically:
>
> ```bash
> fluxm release android --track internal
> # OR
> flux-mobile release android --track internal
> ```

---

## Quick Start

### Android (Google Play)

1. **Initialize**:

```bash
fluxm init
```

2. **Configure** `flux-mobile.yml`:

```yaml
playstore:
  service_account_json: ./keys/playstore.json
  package_name: com.example.myapp
```

3. **Build & Release** (unified command):

```bash
# Build AAB + Deploy to Play Store (one command!)
fluxm release android --track internal --notes "First release!"

# With flavor and environment variables
fluxm release android --track production --flavor prod --env-file .env.prod --notes "v1.0.0"
```

This command will:

- ✅ Build AAB in release mode
- ✅ Parse build output for AAB path
- ✅ Prompt you to confirm deployment (Y/n) - use `--skip-confirm` to skip for CI/CD
- ✅ Upload to Google Play Store
- ✅ Assign to specified track
- ✅ Log deployment to `.flux-mobile/deployments.json`

### iOS (App Store Connect)

**Requires macOS**

1. **Initialize**:

```bash
fluxm init
```

2. **Configure** `flux-mobile.yml`:

```yaml
appstore:
  api_key_path: ./keys/AuthKey_XXXXXXXXXX.p8
  api_key_id: XXXXXXXXXX
  issuer_id: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
  bundle_id: com.example.myapp
```

3. **Build & Release** (unified command):

```bash
# Build IPA + Deploy to TestFlight (one command!)
fluxm release ios --track testflight --notes "Beta build"

# Deploy to Production with full automation
fluxm release ios --track production --flavor prod --env-file .env.prod --notes "v1.0.0"
```

**For TestFlight**, this command will:

- ✅ Auto-add export compliance key to Info.plist (if missing)
- ✅ Build IPA in release mode
- ✅ Parse build output for IPA path
- ✅ Prompt you to confirm deployment (Y/n) - use `--skip-confirm` to skip for CI/CD
- ✅ Upload to App Store Connect
- ✅ **Wait for Apple to process build** (5-15 min with real-time progress updates)
- ✅ Submit to TestFlight
- ✅ Log deployment

**For Production**, it does everything above PLUS:

- ✅ Extract version from IPA
- ✅ Create/find App Store version
- ✅ Assign build to version
- ✅ Set release notes
- ✅ **Submit for App Store review automatically!**

---

## Commands

### `fluxm init`

Initialize project configuration.

```bash
fluxm init [-f|--force]
```

Creates `flux-mobile.yml` and updates project files.

---

### `fluxm doctor`

Validate development environment.

```bash
fluxm doctor
```

Checks Node.js, Flutter, Xcode, Android SDK, etc.

---

### `fluxm clean`

Remove build artifacts.

```bash
fluxm clean
```

Cleans `build/`, `dist/`, and framework-specific caches.

---

### `fluxm info`

Display project and system information.

```bash
fluxm info
```

---

### `fluxm upgrade`

Upgrade Flux Mobile CLI to the latest version.

```bash
fluxm upgrade
```

Automatically checks for updates and upgrades to the latest version from npm.

**Note:** May require `sudo` on some systems:

```bash
sudo npm install -g flux-mobile-cli@latest
```

---

### `fluxm release`

Build and release your mobile app in one unified command.

```bash
fluxm release <platform> --track <track> [options]
```

**Arguments:**

- `<platform>` — Platform to release: `android` or `ios`

**Options:**

- `--track <name>` — **Required**. Release track:
  - **Android**: `internal`, `alpha`, `beta`, `production`
  - **iOS**: `testflight`, `production`
- `--flavor <name>` — Build flavor/scheme
- `--notes <text>` — Release notes (string or JSON for multi-locale)
- `--env-file <path>` — Environment file for `--dart-define-from-file`
- `--define <value...>` — Additional `--dart-define` values
- `--obfuscate` — Obfuscate Dart code for increased security (optional)
- `--verbose` — Show verbose build output
- `--skip-confirm` — Skip deployment confirmation prompts (useful for CI/CD automation)

**Workflow:**

1. **(iOS only)** Auto-configures export compliance in Info.plist if needed
2. Builds the app (AAB for Android, IPA for iOS)
3. Parses Flutter build output for artifact path
4. **Prompts you to confirm deployment** (Y/n) — skip with `--skip-confirm`
5. Uploads to App Store Connect or Google Play Store
6. **(iOS only)** Waits for Apple build processing with real-time progress (5-15 min avg)
7. Assigns to specified track
8. Logs deployment to `.flux-mobile/deployments.json`

**Examples:**

```bash
# Android - Build AAB + Deploy to internal track
fluxm release android --track internal --notes "First release!"

# Android - Production with flavor and obfuscation
fluxm release android --track production --flavor prod --env-file .env.prod --obfuscate --notes "v1.0.0"

# Android - Multi-language notes
fluxm release android --track beta --notes '{"en-US":"English","es-ES":"Español"}'

# Android - CI/CD automation (skip confirmation prompt)
fluxm release android --track production --skip-confirm --notes "Automated release"

# iOS - Build IPA + Deploy to TestFlight with obfuscation
fluxm release ios --track testflight --obfuscate --notes "Beta build"

# iOS - Production with full automation (auto-submits for review!)
fluxm release ios --track production --flavor prod --obfuscate --notes "Bug fixes and improvements"

# iOS - With environment variables and obfuscation
fluxm release ios --track production --env-file .env.prod --define API_KEY=xyz --obfuscate --verbose

# iOS - CI/CD automation (skip confirmation prompt)
fluxm release ios --track testflight --skip-confirm --notes "Automated TestFlight build"
```

**Android Workflow:**

- Runs `flutter build appbundle --release`
- Optionally obfuscates code with `--obfuscate` flag
- Parses AAB path from build output
- Prompts for deployment confirmation (skip with `--skip-confirm`)
- Uploads to Google Play via Android Publisher API
- Assigns to specified track
- Sets release notes

**iOS Workflow (TestFlight):**

- Auto-adds export compliance key to Info.plist if missing
- Runs `flutter build ipa --release`
- Optionally obfuscates code with `--obfuscate` flag
- Parses IPA path from build output
- Prompts for deployment confirmation (skip with `--skip-confirm`)
- Uploads to App Store Connect via Transporter/altool
- **Waits for Apple to process build** (polls every 10s, up to 30 min)
- Shows real-time progress updates every minute
- Submits to TestFlight

**iOS Workflow (Production):**

Everything from TestFlight workflow, PLUS:

- Extracts version string from IPA
- Creates/finds App Store version
- Assigns build to version
- Sets release notes
- **Automatically submits for App Store review**

### 🔒 **Code Obfuscation (Optional)**

Use the `--obfuscate` flag to obfuscate your Dart code for increased security:

```bash
fluxm release android --track production --obfuscate
fluxm release ios --track production --obfuscate
```

**Benefits:**

- Makes reverse engineering significantly harder
- Protects your API keys and business logic
- Generates debug symbol files for crash reporting

**Debug symbols are saved to:**

- Android: `build/app/outputs/symbols`
- iOS: `build/ios/symbols`

Upload these to Firebase Crashlytics or your crash reporting tool to decode stack traces.

**Note:** Obfuscation works exactly like Flutter's native `--obfuscate` flag - same syntax, zero learning curve!

---

## Configuration Reference

### flux-mobile.yml

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
  upload_tool: "transporter" # transporter or altool

versioning:
  strategy: auto
```

### Google Play Console Setup

1. Enable Google Play Android Publisher API
2. Create service account in Google Cloud
3. Download JSON key
4. Grant access in Play Console
5. Assign Release Manager role
6. Configure `flux-mobile.yml`

[Detailed guide](https://cloud.google.com/iam/docs/service-accounts)

### App Store Connect Setup

1. Create App Store Connect API Key
2. Download `.p8` file
3. Note Key ID and Issuer ID
4. Save securely
5. Configure `flux-mobile.yml`
6. Install Xcode Command Line Tools

[Detailed guide](https://developer.apple.com/documentation/appstoreconnectapi/creating_api_keys_for_app_store_connect_api)

---

## Testing

Flux Mobile CLI includes comprehensive tests.

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

1. Use internal/testflight tracks for testing first
2. Always review the deployment confirmation prompt carefully
3. Use `--verbose` flag to see detailed build output
4. Review deployment logs at `.flux-mobile/deployments.json`
5. Test with different flavors before production release
6. Use `--skip-confirm` in CI/CD pipelines to automate releases

### Smart Features

**Export Compliance Auto-Fix** (iOS only)

Automatically adds the required export compliance key to `ios/Runner/Info.plist`:

```bash
⚠️  Export compliance key missing in Info.plist
Adding ITSAppUsesNonExemptEncryption = false
✅ Export compliance key added to Info.plist
```

**Smart Build Processing** (iOS only)

After uploading, Flux Mobile CLI waits for Apple to process your build:

```bash
⏳ Waiting for Apple to process your build...
ℹ️  This usually takes 5-15 minutes.

⏳ Still processing... (3 minutes elapsed)
⏳ Still processing... (5 minutes elapsed)
✅ Build 1.2.3 (45) processed successfully!
   Processing took 7 minutes
```

---

## Troubleshooting & FAQ

### General

**Q: Check environment?**
A: Run `fluxm doctor`

**Q: Where are build artifacts?**
A: They're built directly by Flutter. Android AAB: `build/app/outputs/bundle/`, iOS IPA: `build/ios/ipa/`

**Q: Can I skip the deployment prompt?**
A: Yes! Use the `--skip-confirm` flag for CI/CD automation: `fluxm release android --track production --skip-confirm`

### Android

**Q: 403 permission error?**
A: Verify service account has Play Console access and API is enabled

**Q: Build fails or AAB not found?**
A: Ensure Flutter is installed and run `flutter doctor` to check your environment

**Q: Can I build APK instead of AAB?**
A: The unified release command only supports AAB for Play Store deployment (as required by Google Play)

### iOS

**Q: Requires macOS error?**
A: iOS builds only work on macOS

**Q: iTMSTransporter not found?**
A: Install: `xcode-select --install`

**Q: Which upload tool?**
A: Use `transporter` (recommended)

**Q: Can it submit for review?**
A: **Yes!** Use `--track production`

**Q: How long does Apple take to process builds?**
A: Usually 5-15 minutes. Flux Mobile CLI waits automatically and shows real-time progress updates every minute.

**Q: What is export compliance?**
A: A required key in Info.plist for App Store submissions. Flux Mobile CLI automatically adds `ITSAppUsesNonExemptEncryption = false` if missing.

---

## Development & Contributing

```bash
git clone https://github.com/TheCodeDaniel/flux-mobile-cli
cd flux-mobile-cli
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

- **Unified build + deploy workflow** for Android and iOS
- Flutter Android/iOS builds with flavors
- Google Play deployment (all tracks)
- App Store Connect deployment (TestFlight & Production)
- Full iOS production automation with auto-review submission
- **Export compliance auto-fix** (iOS) - auto-configures Info.plist
- **Smart build processing** (iOS) - waits for Apple validation with progress
- Interactive deployment confirmation prompts with `--skip-confirm` for CI/CD
- Animated build progress with live spinners
- Test suite (89% pass rate)
- Multi-locale release notes
- Deployment audit logging

### 📋 Planned

- React Native iOS support
- Screenshot upload
- Metadata management
- Expo/EAS integration
- CI runner agents
- Web dashboard

---

## License

MIT License © 2025 Flux Mobile CLI Project

---

## Support

- 📖 [Documentation](README.md)
- 🧪 [Testing Guide](TESTING.md)
- 🐛 [Issues](https://github.com/TheCodeDaniel/flux-mobile-cli/issues)

---

**Built with ❤️ by developers, for developers.**

_Stop paying for slow CI/CD. Take control of your mobile deployments with Flux Mobile CLI._
