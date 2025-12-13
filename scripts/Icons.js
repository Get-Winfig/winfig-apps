/**
 * Icon Generation Script for Tauri Apps
 *
 * - Scans the `Icons` folder for a source image to generate Tauri-compatible icons.
 * - Automatically selects the image based on the last commit message (release(image-name): ...).
 * - If no matching image is found, falls back to `default.png`.
 * - Requires Tauri CLI: `npm install -g @tauri-apps/cli`
 * - Usage: Just run `node scripts/Icons.js` or `npm run icons`.
 *
 * Maintainer: Armoghan-ul-Mohmin
 * License: MIT
 */

import { exec } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sourceIcons = path.join(__dirname, 'Icons');
const tauriIcons = path.join(__dirname, '../src-tauri/icons');

async function ensureDir(dir) {
    try {
        await fs.mkdir(dir, { recursive: true });
    } catch {}
}

async function getImageNameFromCommit() {
    return new Promise((resolve) => {
        exec('git log -1 --pretty=%B', (err, stdout) => {
            if (err) {
                console.warn('Could not get last commit message:', err.message);
                return resolve('default');
            }
            const match = stdout.match(/release\(([^)]+)\):/i);
            if (match) return resolve(match[1]);
            console.warn('No image name found in last commit message. Using default.');
            resolve('default');
        });
    });
}

async function findImage(imageName) {
    const exts = ['.png', '.jpg', '.jpeg'];
    for (const ext of exts) {
        const candidate = path.join(sourceIcons, imageName + ext);
        try {
            await fs.access(candidate);
            return candidate;
        } catch {}
    }
    // fallback to default.png
    const fallback = path.join(sourceIcons, 'default.png');
    try {
        await fs.access(fallback);
        console.warn(`No image found for '${imageName}', using default.png.`);
        return fallback;
    } catch {
        throw new Error('No matching image found and default.png is missing.');
    }
}

async function generateIcons(imagePath) {
    return new Promise((resolve, reject) => {
        exec(`npx tauri icon "${imagePath}"`, { stdio: 'inherit' }, (err) => {
            if (err) return reject(err);
            resolve();
        });
    });
}

async function main() {
    await ensureDir(tauriIcons);
    const imageName = await getImageNameFromCommit();
    let imagePath;
    try {
        imagePath = await findImage(imageName);
    } catch (err) {
        console.error(err.message);
        process.exit(1);
    }
    console.log(`Generating icons for: ${path.basename(imagePath)}`);
    try {
        await generateIcons(imagePath);
        console.log(`Icons generated successfully for ${path.basename(imagePath)}!`);
    } catch (err) {
        console.error('Icon generation failed:', err.message);
        process.exit(1);
    }
}

main();
