const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

/**
 * Generate .mind file from marker image using Mind-AR web compiler
 * @param {string} imagePath - Local path to the marker image
 * @param {string} outputPath - Path to save the generated .mind file
 * @returns {Promise<string>} - Path to the generated .mind file
 */
async function generateMindFile(imagePath, outputPath) {
    let browser;
    let optimizedPath = null;

    try {
        console.log('🚀 Starting Mind-AR compiler...');
        console.log('📍 Input Image path:', imagePath);

        if (!fs.existsSync(imagePath)) {
            throw new Error(`Image file not found: ${imagePath}`);
        }

        // --- 1. OPTIMIZE IMAGE (CRITICAL) ---
        // Resize to max 800px to prevent timeouts on low-resource servers
        console.log('🎨 Optimizing image for compiler...');
        const dir = path.dirname(imagePath);
        const ext = path.extname(imagePath);
        const name = path.basename(imagePath, ext);
        optimizedPath = path.join(dir, `${name}_opt${ext}`);

        await sharp(imagePath)
            .resize(800, 800, { fit: 'inside' })
            .jpeg({ quality: 80 })
            .toFile(optimizedPath);

        console.log('✅ Image optimized:', optimizedPath);

        // --- 2. LAUNCH PUPPETEER ---
        console.log('🌐 Launching browser (Low-Resource Mode)...');
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage', // Critical for Render
                '--single-process',        // Critical for Render
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu'
            ],
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
            timeout: 120000 // Extended to 2 minutes
        });

        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 720 });

        // Navigate to Mind-AR compiler
        console.log('📄 Loading compiler page...');
        await page.goto('https://hiukim.github.io/mind-ar-js-doc/tools/compile', {
            waitUntil: 'networkidle2',
            timeout: 60000
        });

        // Wait for file input
        const fileInputSelector = 'input[type="file"]';
        await page.waitForSelector(fileInputSelector, { timeout: 10000 });

        // Upload OPTIMIZED image
        const fileInput = await page.$(fileInputSelector);
        await fileInput.uploadFile(optimizedPath);

        console.log('📤 Image uploaded to compiler');

        // Wait for compile button
        await page.waitForSelector('button', { timeout: 10000 });
        const buttons = await page.$$('button');

        let compileButtonFound = false;
        for (const button of buttons) {
            const text = await page.evaluate(el => el.textContent, button);
            if (text.toLowerCase().includes('start') || text.toLowerCase().includes('compile')) {
                await button.click();
                console.log('⚙️ Compilation started...');
                compileButtonFound = true;
                break;
            }
        }

        if (!compileButtonFound) throw new Error('Compile button not found');

        // Wait for download link (Extended timeout)
        console.log('⏳ Waiting for compilation (may take up to 2 mins)...');
        await page.waitForFunction(
            () => {
                const links = Array.from(document.querySelectorAll('a'));
                return links.some(link => link.href.includes('blob:') || link.download);
            },
            { timeout: 110000 } // Slightly less than browser timeout
        );

        console.log('✅ Compilation complete, downloading...');

        // Get download link
        const downloadLink = await page.evaluate(() => {
            const links = Array.from(document.querySelectorAll('a'));
            const mindLink = links.find(link => link.href.includes('blob:') || link.download);
            return mindLink ? mindLink.href : null;
        });

        if (!downloadLink) throw new Error('Download link not found');

        // Download buffer
        const mindFileBuffer = await page.evaluate(async (url) => {
            const response = await fetch(url);
            const blob = await response.blob();
            const arrayBuffer = await blob.arrayBuffer();
            return Array.from(new Uint8Array(arrayBuffer));
        }, downloadLink);

        if (!mindFileBuffer || mindFileBuffer.length === 0) {
            throw new Error('Empty .mind file received');
        }

        fs.writeFileSync(outputPath, Buffer.from(mindFileBuffer));
        console.log('💾 .mind file saved:', outputPath, `(${mindFileBuffer.length} bytes)`);

        return outputPath;

    } catch (error) {
        console.error('❌ Mind-AR compilation error:', error.message);

        // Fix: Removed reference to 'imageUrl' which was undefined
        const errorDetails = {
            message: error.message,
            inputPath: imagePath,
            timestamp: new Date().toISOString()
        };
        console.error('Error details:', JSON.stringify(errorDetails, null, 2));

        throw new Error(`Mind-AR generation failed: ${error.message}`);
    } finally {
        if (browser) await browser.close();
        // Cleanup optimized user file
        if (optimizedPath && fs.existsSync(optimizedPath)) {
            try { fs.unlinkSync(optimizedPath); } catch (e) { }
        }
    }
}

module.exports = { generateMindFile };
