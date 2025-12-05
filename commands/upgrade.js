import { execSync } from "child_process";
import chalk from "chalk";
import ora from "ora";
import { logger } from "../utils/logger.js";

/**
 * Upgrade Flux Mobile CLI to the latest version
 *
 * This command updates the CLI globally using npm
 */
export async function upgradeCommand() {
    const spinner = ora();

    try {
        // Get current version
        const currentVersion = execSync('npm list -g flux-mobile-cli --depth=0 2>/dev/null || echo "not installed"', {
            encoding: 'utf8'
        }).trim();

        logger.info(chalk.dim(`Current installation: ${currentVersion}`));
        console.log('');

        // Check for latest version
        spinner.start(chalk.blue("Checking for updates..."));

        const latestVersion = execSync('npm view flux-mobile-cli version', {
            encoding: 'utf8'
        }).trim();

        spinner.succeed(chalk.green(`Latest version available: ${latestVersion}`));
        console.log('');

        // Check if already on latest
        if (currentVersion.includes(latestVersion)) {
            logger.success('You are already on the latest version! 🎉');
            return;
        }

        // Upgrade
        spinner.start(chalk.blue("Upgrading Flux Mobile CLI..."));

        execSync('npm install -g flux-mobile-cli@latest', {
            stdio: 'pipe'
        });

        spinner.succeed(chalk.green("Successfully upgraded to latest version! 🚀"));
        console.log('');

        // Show new version
        const newVersion = execSync('fluxm --version', {
            encoding: 'utf8'
        }).trim();

        logger.success(`Flux Mobile CLI ${newVersion}`);
        console.log('');
        logger.info('Run ' + chalk.cyan('fluxm --help') + ' to see available commands');

    } catch (err) {
        spinner.fail(chalk.red("Failed to upgrade"));

        if (err.message.includes('EACCES') || err.message.includes('permission denied')) {
            logger.error('Permission denied. Try running with sudo:');
            console.log(chalk.cyan('  sudo npm install -g flux-mobile-cli@latest'));
        } else if (err.message.includes('not found')) {
            logger.error('npm not found. Please install Node.js and npm first.');
        } else {
            logger.error(`Error: ${err.message}`);
            console.log('');
            logger.info('Try manually upgrading with:');
            console.log(chalk.cyan('  npm install -g flux-mobile-cli@latest'));
        }

        process.exit(1);
    }
}
