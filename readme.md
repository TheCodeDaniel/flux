# Flux CLI 📱🚀

**Flux** is a lightweight, open-source local CI/CD CLI tool for mobile developers. It focuses on a smooth developer experience for **Flutter** projects (Phase 1), providing build, deploy, and helper commands to streamline local Android development and Google Play deployment without mandatory cloud CI or a Mac.

---

## Table of Contents

- [Why Flux](#why-flux)
- [Current Status](#current-status)
- [Features](#features)
- [Requirements](#requirements)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Commands](#commands)
  - [init](#init)
  - [doctor](#doctor)
  - [clean](#clean)
  - [info](#info)
  - [build](#build)
  - [deploy](#deploy)
- [flux.yml — configuration reference](#fluxyml---configuration-reference)
- [Play Console setup (required for deploy)](#play-console-setup-required-for-deploy)
- [Security & Best Practices](#security--best-practices)
- [Troubleshooting & FAQ](#troubleshooting--faq)
- [Development & Contributing](#development--contributing)
- [Roadmap](#roadmap)
- [License](#license)

---

## Why Flux

- **Local-first**: run builds on your machine for maximal speed and privacy.
- **Developer UX**: simple CLI commands, sensible defaults, and helpful diagnostics.
- **Open & self-hostable**: configuration and secrets stay under your control.
- **Flutter-first**: Phase 1 targets Flutter where the toolchain is unified and predictable.

---

## Current Status

**Phase 1 (Flutter-focused)** — Implemented:

- `flux init` (creates `flux.yml`, updates `pubspec.yaml` for Flutter)
- `flux doctor`, `flux clean`, `flux info`
- `flux build` (APK / AAB via `flutter build`)
- `flux deploy` (uploads `.aab` / `.apk` to Google Play via service account)

Partial / Planned for later phases:

- React Native build/deploy support (Gradle-based)
- Expo/EAS integration
- iOS build & App Store Connect support
- GUI dashboard and hosted runners

---

## Features

- Initialize project config with `flux init`
- Validate environment with `flux doctor`
- Clean build artifacts with `flux clean`
- Build Android artifacts (`apk` / `aab`) with `flux build`
- Deploy to Google Play (internal/alpha/beta/production) with `flux deploy`
- Logs deployments in `.flux/deployments.json` for auditing

---

## Requirements

- Node.js (v14+ recommended)
- npm (or yarn)
- Flutter (for Flutter projects) and Android SDK (for Android builds)
- Java & Gradle (installed via Android Studio or standalone)
- A Google Play service account JSON for publishing (for `flux deploy`)

---

## Installation (development)

> For development use (recommended):

```bash
git clone <your-repo-url>
cd flux-cli
npm install
npm link    # makes 'flux' available globally for dev/testing
```

> For distribution (when published to npm):

```bash
npm install -g flux-cli
```

---

## Quick Start

1. From your Flutter project root run:

```bash
flux init
```

2. Edit `flux.yml` and add Play Store service account path + package name:

```yaml
playstore:
  service_account_json: ./playstore-service.json
  package_name: com.example.myapp
```

3. Build an app bundle (AAB):

```bash
flux build --release-type aab --output-dir ./dist
```

4. Deploy to internal track:

```bash
flux deploy --track internal --notes "Internal test build"
```

---

## Commands

### `flux init`

Scaffolds `flux.yml` and, for Flutter, registers the YAML under `flutter.assets` in `pubspec.yaml`.
Options:

- `-f, --force` — overwrite existing `flux.yml` (backups created automatically)

Example behavior:

- Detects project type (Flutter / React Native / Expo)
- Writes `flux.yml` with sensible defaults
- For Flutter, backs up and updates `pubspec.yaml` to include the generated `flux.yml` under `assets`

---

### `flux doctor`

Checks installed tools required for the detected framework:

- Node, npm, Java, Flutter, Gradle, etc.
  Example:

```bash
flux doctor
```

---

### `flux clean`

Removes build artifacts in a framework-aware way:

- Flutter: `build/`, `android/app/build/`, `ios/build/`
- React Native: `android/app/build/`, caches, etc.
  Example:

```bash
flux clean
```

---

### `flux info`

Displays project and system information, including data from `flux.yml`:

```bash
flux info
```

---

### `flux build`

Builds your project and copies artifacts to an output directory.
Options:

- `--release-type <apk|aab>` (default: `apk`)
- `--output-dir <path>` (default: `./dist`)

Examples:

```bash
# Build AAB (recommended for Play Store)
flux build --release-type aab --output-dir ./dist

# Build APK (for local testing)
flux build --release-type apk --output-dir ./dist
```

Technical notes:

- **Flutter**: runs `flutter build apk` or `flutter build appbundle`
- **React Native**: (planned) will run Gradle tasks like `./gradlew assembleRelease` or `./gradlew bundleRelease`

---

### `flux deploy`

Uploads the most recent `.aab` or `.apk` to Google Play using the Android Publisher API.
Options:

- `--artifact <path>` — specify exact artifact path (defaults to `dist` / build output detection)
- `--track <internal|alpha|beta|production>` — which track to release to (default: `internal`)
- `--notes <string|json>` — release notes (string or JSON map of language->text)
- `--key <path>` — override service account key path in `flux.yml`
- `--dry-run` — validate without committing the edit

Example:

```bash
flux deploy --track internal --notes "Bug fixes and improvements"
```

What it does:

- Reads `flux.yml` for `playstore.service_account_json` and `playstore.package_name`
- Locates artifact (supports Flutter & RN typical output paths)
- Authenticates with Google Play via service account
- Creates an edit, uploads artifact, updates track, commits edit
- Logs activity to `.flux/deployments.json`

---

## `flux.yml` — configuration reference

Below is a suggested schema and explanation. `flux init` creates a starter file — update it to match your project.

```yaml
app_name: MyApp
platform: flutter # or react-native
android:
  keystore_path: "./android/keystore.jks"
  key_alias: "mykey"
  key_password: ""
  store_password: ""
  package_name: "" # optional override
ios:
  enabled: false
  export_method: "app-store"
playstore:
  enabled: true
  service_account_json: "./playstore-service.json" # required for deploy
  package_name: "com.example.myapp" # recommended
  default_track: "internal"
  default_notes: "Automated deploy via Flux CLI"
versioning:
  strategy: auto # auto | manual
build:
  output_dir: "./dist"
  release_type: "aab" # aab | apk
```

Notes:

- `service_account_json` must point to a valid Google Cloud service account JSON with Play Console access.
- Don’t commit that JSON to source control — add it to `.gitignore`.

---

## Play Console setup (required for deploy)

1. In Google Play Console → **Settings → Developer account → API access**, link a Google Cloud project.
2. Create a **Service Account** in Google Cloud IAM & Admin and generate a JSON key.
3. In Play Console API access page, **Grant access** to the service account with at least **Release Manager** permissions (or the minimal scopes required to upload and edit tracks).
4. Save the JSON key locally and set `playstore.service_account_json` in `flux.yml` to its path.

Security tip: store keys outside your repo (e.g. `~/.config/flux/` or `./secure_keys/`) and add to `.gitignore`.

---

## Security & Best Practices

- **Never commit** service account JSON or keystore files to your git repository.
- Add obviously sensitive paths to `.gitignore` (e.g. `playstore-service.json`, `keys/`).
- Use `flux deploy --dry-run` first to validate authentication and edit creation without committing.
- If you share machine access, prefer storing keys in a local protected directory and reference the path from `flux.yml`.

---

## Troubleshooting & FAQ

**Q: Deploy fails with a 403 or permission error**  
A: Verify you granted the service account access in Play Console and assigned appropriate roles. Ensure the Play Android Publisher API is enabled for the linked Google Cloud project.

**Q: Artifact not found**  
A: Ensure you ran `flux build` first. Check the output folder or pass `--artifact ./dist/app-release.aab` to `flux deploy`.

**Q: I’m using Expo / EAS**  
A: Expo projects are handled differently. For Phase 1, Flux targets Flutter. Expo/EAS support is on the roadmap.

**Q: How do I log deployments?**  
A: Flux writes `.flux/deployments.json` with a basic audit trail. Use it to inspect past deploys.

---

## Development & Contributing

We welcome contributions! Basic workflow:

1. Fork the repo
2. Create a feature branch
3. Run `npm install && npm link` to test locally
4. Add tests and documentation for your changes
5. Open a Pull Request

Coding standards & notes:

- Split command logic inside `commands/` and utilities in `utils/`.
- Keep CLI minimal and delegate heavy work to modules for testability.

---

## Roadmap

- React Native AAB build & deploy support
- Expo/EAS integration
- iOS App Store Connect support (Transporter/Fastlane)
- CI runner agents (optional self-hosted)
- GUI dashboard for local deployments

---

## License

MIT License © 2025 Flux CLI Project

---
