const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

/**
 * Generate .mind file from marker image using Mind-AR web compiler
 * @param {string} imagePath - Local path to the marker image (already compressed)
 * @param {string} outputPath - Path to save the generated .mind file
 * @returns {Promise<string>} - Path to the generated .mind file
 */
async function generateMindFile(imagePath, outputPath) {
    let browser;

    try {
        console.log('🚀 Starting Mind-AR compiler...');
        console.log('📍 Image path:', imagePath);

        if (!fs.existsSync(imagePath)) {
            throw new Error(`Image file not found: ${imagePath}`);
        }

        console.log('✅ Image file verified');

        // Launch Puppeteer with enhanced stability settings
        console.log('🌐 Launching browser...');
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage', // Critical for Render.com
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu',
                '--memory-pressure-handler', // Better RAM management
                '--disable-software-rasterizer',
                '--disable-background-timer-throttling'
            ],
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
            timeout: 120000 // Increased timeout to 2 minutes
        });

        const page = await browser.newPage();

        // Set viewport for consistency
        await page.setViewport({ width: 1280, height: 720 });

        // Navigate to Mind-AR compiler
        console.log('📄 Loading compiler page...');
        await page.goto('https://hiukim.github.io/mind-ar-js-doc/tools/compile', {
            waitUntil: 'networkidle2',
            timeout: 60000
        });

        console.log('✅ Compiler page loaded');

        // Wait for file input
        const fileInputSelector = 'input[type="file"]';
        await page.waitForSelector(fileInputSelector, { timeout: 10000 });

        // Upload image
        const fileInput = await page.$(fileInputSelector);
        await fileInput.uploadFile(imagePath);

        console.log('📤 Image uploaded to compiler');

        // Wait for compile button and click
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

        if (!compileButtonFound) {
            throw new Error('Compile button not found on page');
        }

        // Wait for download link (this may take 15-20 seconds)
        console.log('⏳ Waiting for compilation (15-20 seconds)...');
        await page.waitForFunction(
            () => {
                const links = Array.from(document.querySelectorAll('a'));
                return links.some(link => link.href.includes('blob:') || link.download);
            },
            { timeout: 90000 } // Increased timeout for slower servers
        );

        console.log('✅ Compilation complete, downloading...');

        // Get download link
        const downloadLink = await page.evaluate(() => {
            const links = Array.from(document.querySelectorAll('a'));
            const mindLink = links.find(link => link.href.includes('blob:') || link.download);
            return mindLink ? mindLink.href : null;
        });

        if (!downloadLink) {
            throw new Error('Download link not found after compilation');
        }

        // Download the .mind file
        const mindFileBuffer = await page.evaluate(async (url) => {
            const response = await fetch(url);
            const blob = await response.blob();
            const arrayBuffer = await blob.arrayBuffer();
            return Array.from(new Uint8Array(arrayBuffer));
        }, downloadLink);

        if (!mindFileBuffer || mindFileBuffer.length === 0) {
            throw new Error('.mind file buffer is empty');
        }

        // Save to output path
        fs.writeFileSync(outputPath, Buffer.from(mindFileBuffer));

        console.log('💾 .mind file saved successfully:', outputPath);
        console.log('📊 File size:', mindFileBuffer.length, 'bytes');

        return outputPath;

    } catch (error) {
        console.error('❌ Mind-AR compilation error:', error.message);
        console.error('Stack trace:', error.stack);

        // Provide detailed error information
        const errorDetails = {
            message: error.message,
            type: error.constructor.name,
            imageUrl: imageUrl,
            timestamp: new Date().toISOString()
        };

        console.error('Error details:', JSON.stringify(errorDetails, null, 2));

        throw new Error(`Mind-AR generation failed: ${error.message}`);
    } finally {
        // Cleanup
        if (browser) {
            try {
                await browser.close();
                console.log('🔒 Browser closed');
            } catch (e) {
                console.error('Error closing browser:', e.message);
            }
        }
        // Note: Temp image cleanup now handled in server.js
    }
}

module.exports = { generateMindFile };
