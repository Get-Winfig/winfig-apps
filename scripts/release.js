/**
 * Release Script for Tauri Apps to be used in CI/CD Pipelines
 *
 * - Get config from `config.json` file.
 * - Automatically selects the app name based on the last commit message (release(appName): ...).
 * - Replace Required data in multiple files according to appName.
 * - Usage: Just run `node scripts/release.js` or `npm run release`.
 *
 * Maintainer: Armoghan-ul-Mohmin
 * License: MIT
 */

import fs from 'fs';
import path from 'path';
import { config } from 'process';
import { fileURLToPath } from 'url';

// Get current directory in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const PATHS = {
    config: path.join(__dirname, '..', 'scripts', 'apps.json'),
    indexHtml: path.join(__dirname, '..', 'src', 'index.html'),
    tauriConfig: path.join(__dirname, '..', 'src-tauri', 'tauri.conf.json'),
    cargo: path.join(__dirname, '..', 'src-tauri', 'Cargo.toml'),
};

function readJsonFile(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(content);
    } catch (error) {
        console.error(`Error reading file ${filePath}:`, error.message);
        throw error;
    }
}
function validateAppConfig(config, appName) {
    if (!config.apps?.[appName]) {
        throw new Error(`No configuration found for app: ${appName}`);
    }
}

function extractAppName(commitMessage) {
    const appNameMatch = commitMessage.match(/release\(([^)]+)\):/i);
    return appNameMatch ? appNameMatch[1] : 'default';
}

function updateHtmlContent(content, appConfig) {
    let updated = content;

    // Update app link
    updated = updated.replace(
        /window\.location\.replace\("([^"]+)"\);/,
        `window.location.replace("${appConfig.appLink}");`
    );

    // Update title
    updated = updated.replace(
        /<title>[^<]+<\/title>/,
        `<title>${appConfig.windowsTitle}</title>`
    );

    return updated;
}

function updateTauriConfig(content, appConfig) {
    let updated = content;

    const updates = [
        { pattern: /"productName": "([^"]+)"/, replacement: `"productName": "${appConfig.productName}"` },
        { pattern: /"name": "([^"]+)"/, replacement: `"name": "${appConfig.packageName}"` },
        { pattern: /"identifier": "([^"]+)"/, replacement: `"identifier": "${appConfig.appIdentifier}"` },
        { pattern: /"title": "([^"]+)"/, replacement: `"title": "${appConfig.windowsTitle}"` }
    ];

    updates.forEach(({ pattern, replacement }) => {
        updated = updated.replace(pattern, replacement);
    });

    return updated;
}

function updateCargoToml(content, appConfig) {
    let updated = content;

    const updates = [
        { pattern: /name = "([^"]+)"/, replacement: `name = "${appConfig.productName}"` },
        { pattern: /description = "([^"]+)"/, replacement: `description = "${appConfig.description}"` }
    ];

    updates.forEach(({ pattern, replacement }) => {
        updated = updated.replace(pattern, replacement);
    });

    return updated;
}

async function main() {
    try {
        // Get commit message from environment variable
        const commitMessage = process.env.COMMIT_MESSAGE || 'release(default): update release files';
        const appName = extractAppName(commitMessage);

        console.log(`Starting release process for app: ${appName}`);

        // Read configuration
        const config = readJsonFile(PATHS.config);
        validateAppConfig(config, appName);
        const appConfig = config.apps[appName];
        console.log('App configuration:', appConfig);

        // Update index.html
        const indexContent = fs.readFileSync(PATHS.indexHtml, 'utf-8');
        const updatedIndexContent = updateHtmlContent(indexContent, appConfig);
        fs.writeFileSync(PATHS.indexHtml, updatedIndexContent, 'utf-8');
        console.log('Updated index.html');

        // Update tauri.conf.json
        const tauriContent = fs.readFileSync(PATHS.tauriConfig, 'utf-8');
        const updatedTauriContent = updateTauriConfig(tauriContent, appConfig);
        fs.writeFileSync(PATHS.tauriConfig, updatedTauriContent, 'utf-8');
        console.log('Updated tauri.conf.json');

        // Update Cargo.toml
        const cargoContent = fs.readFileSync(PATHS.cargo, 'utf-8');
        const updatedCargoContent = updateCargoToml(cargoContent, appConfig);
        fs.writeFileSync(PATHS.cargo, updatedCargoContent, 'utf-8');
        console.log('Updated Cargo.toml');

    }catch (error) {
        console.error('Release automation failed:', error.message);
        process.exit(1);
    }
}

// Execute main function if this is the main module
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    main();
}
