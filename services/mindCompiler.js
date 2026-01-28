const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

/**
 * Generate .mind file from marker image using Mind-AR web compiler
 * @param {string} imageUrl - URL of the marker image
 * @param {string} outputPath - Path to save the generated .mind file
 * @returns {Promise<string>} - Path to the generated .mind file
 */
async function generateMindFile(imageUrl, outputPath) {
    let browser;
    let tempImagePath;

    try {
        console.log('🚀 Starting Mind-AR compiler...');
        console.log('📍 Image URL:', imageUrl);

        // Download and optimize image
        console.log('📥 Downloading image...');
        const response = await fetch(imageUrl);
        if (!response.ok) {
            throw new Error(`Failed to download image: ${response.statusText}`);
        }

        const buffer = await response.arrayBuffer();
        tempImagePath = path.join(__dirname, `temp_marker_${Date.now()}.jpg`);
        fs.writeFileSync(tempImagePath, Buffer.from(buffer));

        console.log('✅ Image downloaded:', tempImagePath);

        // Launch Puppeteer with Render.com compatible settings
        console.log('🌐 Launching browser...');
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu'
            ],
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined
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
        await fileInput.uploadFile(tempImagePath);

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

        if (tempImagePath && fs.existsSync(tempImagePath)) {
            try {
                fs.unlinkSync(tempImagePath);
                console.log('🗑️ Temp image cleaned up');
            } catch (e) {
                console.error('Error cleaning up temp image:', e.message);
            }
        }
    }
}

module.exports = { generateMindFile };
