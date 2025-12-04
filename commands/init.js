// lib/init.js
import fs from 'fs-extra';
import path from 'path';
import YAML from 'yaml';
import chalk from 'chalk';

const DEFAULT_FLUX_YML = (framework) => ({
    app_name: 'My App',
    platform: framework,
    android: {
        keystore_path: './android/keystore.jks',
        key_alias: 'mykey',
        key_password: '',
        store_password: ''
    },
    ios: {
        enabled: framework !== 'react-native' ? true : false,
        export_method: 'app-store'
    },
    playstore: {
        service_account_json: './keys/playstore.json',
        package_name: "", // e.g. com.yourapp.packagename
        default_track: "internal", // internal | alpha | beta | production
    },
    appstore: {
        api_key_path: './keys/AuthKey_XXXXXXXXXX.p8', // App Store Connect API Key (.p8 file)
        api_key_id: '', // e.g. XXXXXXXXXX (10 chars)
        issuer_id: '', // e.g. xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx (UUID format)
        bundle_id: '', // e.g. com.yourapp.bundleid
        default_track: 'testflight', // testflight | production
        upload_tool: 'transporter', // transporter | altool (transporter is recommended)
    },
    versioning: {
        strategy: 'auto' // options: auto, manual
    }
});

function timestamp() {
    const d = new Date();
    return d.toISOString().replace(/[:.]/g, '-');
}

async function writeYamlFile(filePath, data) {
    const yamlStr = YAML.stringify(data);
    await fs.outputFile(filePath, yamlStr, { encoding: 'utf8' });
}

async function detectProjectType(projectDir) {
    const pubspecPath = path.join(projectDir, 'pubspec.yaml');
    const packageJsonPath = path.join(projectDir, 'package.json');
    const androidDir = path.join(projectDir, 'android');
    const iosDir = path.join(projectDir, 'ios');

    const hasPubspec = await fs.pathExists(pubspecPath);
    const hasPackage = await fs.pathExists(packageJsonPath);
    const hasAndroid = await fs.pathExists(androidDir);
    const hasIos = await fs.pathExists(iosDir);

    if (hasPubspec) {
        const pubspecContent = await fs.readFile(pubspecPath, 'utf8');
        if (pubspecContent.includes('flutter:')) return 'flutter';
    }

    if (hasPackage) {
        try {
            const pkg = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
            const deps = { ...pkg.dependencies, ...pkg.devDependencies };

            if (deps['expo']) return 'expo';
            if (deps['react-native']) return 'react-native';
            if (deps['@react-navigation/native']) return 'react-native';
        } catch (err) {
            console.warn(chalk.yellow('Warning: could not parse package.json:'), err.message);
        }
    }

    // fallback heuristic
    if (hasAndroid && hasIos) return 'react-native';

    return 'unknown';
}

/**
 * Ensure flux-mobile.yml exists; if exist and !force -> throw
 */
async function createFluxYml(projectDir, framework, opts = { force: false }) {
    const fluxPath = path.join(projectDir, 'flux-mobile.yml');
    const exists = await fs.pathExists(fluxPath);
    if (exists && !opts.force) {
        throw new Error('flux-mobile.yml already exists. Use --force to overwrite.');
    }

    // if (exists && opts.force) {
    //     const backup = path.join(projectDir, `flux-mobile.yml.bak.${timestamp()}`);
    //     await fs.copyFile(fluxPath, backup);
    // }

    await writeYamlFile(fluxPath, DEFAULT_FLUX_YML(framework));
    return fluxPath;
}

/**
 * Safely update pubspec.yaml to include flux-mobile.yml in flutter.assets.
 */
async function registerAssetInPubspec(projectDir, assetRelativePath) {
    const pubspecPath = path.join(projectDir, 'pubspec.yaml');
    const exists = await fs.pathExists(pubspecPath);
    if (!exists) throw new Error('pubspec.yaml not found — this does not look like a Flutter project.');

    const original = await fs.readFile(pubspecPath, 'utf8');
    const doc = YAML.parseDocument(original);

    // const backupPath = path.join(projectDir, `pubspec.yaml.bak.${timestamp()}`);
    // await fs.copyFile(pubspecPath, backupPath);

    let flutterNode = doc.get('flutter', true);
    if (!flutterNode) {
        doc.set('flutter', {});
        flutterNode = doc.get('flutter', true);
    }

    let assetsNode = flutterNode.get('assets', true);
    if (!assetsNode) {
        doc.get('flutter').set('assets', []);
        assetsNode = doc.getIn(['flutter', 'assets'], true);
    }

    const assets = doc.getIn(['flutter', 'assets']).toJSON ? doc.getIn(['flutter', 'assets']).toJSON() : doc.getIn(['flutter', 'assets']);

    let normalized = assetRelativePath.replace(/\\/g, '/');
    if (normalized.startsWith('./')) normalized = normalized.slice(2);

    if (assets.includes(normalized)) {
        // return { updated: false, backupPath };
        return { updated: false };
    }

    const seq = doc.getIn(['flutter', 'assets']);
    seq.add(normalized);

    const newYaml = doc.toString();
    await fs.writeFile(pubspecPath, newYaml, 'utf8');

    // return { updated: true, backupPath };
    return { updated: true };
}

/**
 * Ensure .gitignore includes flux-mobile.yml and dist/
 */
async function updateGitignore(projectDir) {
    const gitignorePath = path.join(projectDir, '.gitignore');

    // Ensure file exists
    if (!(await fs.pathExists(gitignorePath))) {
        await fs.outputFile(gitignorePath, ''); // create empty file
        console.log(chalk.yellow('.gitignore not found — created a new one.'));
    }

    const content = await fs.readFile(gitignorePath, 'utf8');
    const lines = content.split('\n').map(line => line.trim());
    const entriesToAdd = ['flux-mobile.yml', 'dist/'];

    const newEntries = entriesToAdd.filter(entry => !lines.includes(entry));

    if (newEntries.length > 0) {
        const updatedContent = content.trimEnd() + '\n' + newEntries.join('\n') + '\n';
        await fs.writeFile(gitignorePath, updatedContent, 'utf8');
        console.log(chalk.green(`✅ Updated .gitignore`));
        newEntries.forEach(e => console.log(chalk.yellow(`→ Added ${e}`)));
    } else {
        console.log(chalk.gray('.gitignore already includes required entries — no changes made.'));
    }
}


/**
 * Public entry point for init
 */
export async function initCommand(projectDir = process.cwd(), opts = { force: false }) {
    try {
        const framework = await detectProjectType(projectDir);
        console.log(chalk.cyan(`Detected project type: ${framework}`));

        const createdFlux = await createFluxYml(projectDir, framework, { force: opts.force });
        console.log(chalk.green(`Created ${path.relative(process.cwd(), createdFlux)}`));

        if (framework === 'flutter') {
            // const { updated, backupPath } = await registerAssetInPubspec(projectDir, './flux-mobile.yml');
            const { updated } = await registerAssetInPubspec(projectDir, './flux-mobile.yml');
            if (updated) {
                // console.log(chalk.green(`Registered flux-mobile.yml in pubspec.yaml (backup saved to ${path.basename(backupPath)})`));
                console.log(chalk.green(`Registered flux-mobile.yml in pubspec.yaml`));
                console.log(chalk.yellow('Note: run `flutter pub get` if you plan to load the asset at runtime.'));
            } else {
                console.log(chalk.gray('flux-mobile.yml already registered in pubspec.yaml — no change.'));
            }
        } else if (framework === 'react-native' || framework === 'expo') {
            console.log(chalk.yellow(`${framework} project detected — no automatic asset registration needed.`));
            console.log(chalk.yellow('If you want to bundle flux-mobile.yml, configure Metro or copy file into your app assets.'));
        } else {
            console.log(chalk.yellow('Unknown project type — flux-mobile.yml created, but no further project changes made.'));
        }

        // 🆕 Add required entries to .gitignore
        await updateGitignore(projectDir);

        console.log(chalk.green('Initialization complete 🎉'));
    } catch (err) {
        console.error(chalk.red('Initialization failed:'), err.message);
        throw err;
    }
}
