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
    try {
        console.log('🚀 Starting Mind-AR compiler...');

        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();

        // Navigate to Mind-AR compiler
        await page.goto('https://hiukim.github.io/mind-ar-js-doc/tools/compile', {
            waitUntil: 'networkidle2',
            timeout: 60000
        });

        console.log('📄 Compiler page loaded');

        // Wait for file input
        const fileInputSelector = 'input[type="file"]';
        await page.waitForSelector(fileInputSelector, { timeout: 10000 });

        // Download image to temp file
        const response = await fetch(imageUrl);
        const buffer = await response.arrayBuffer();
        const tempImagePath = path.join(__dirname, 'temp_marker.jpg');
        fs.writeFileSync(tempImagePath, Buffer.from(buffer));

        // Upload image
        const fileInput = await page.$(fileInputSelector);
        await fileInput.uploadFile(tempImagePath);

        console.log('📤 Image uploaded to compiler');

        // Wait for compile button and click
        await page.waitForSelector('button', { timeout: 10000 });
        const buttons = await page.$$('button');

        for (const button of buttons) {
            const text = await page.evaluate(el => el.textContent, button);
            if (text.toLowerCase().includes('start') || text.toLowerCase().includes('compile')) {
                await button.click();
                console.log('⚙️ Compilation started...');
                break;
            }
        }

        // Wait for download link (this may take 15-20 seconds)
        await page.waitForFunction(
            () => {
                const links = Array.from(document.querySelectorAll('a'));
                return links.some(link => link.href.includes('blob:') || link.download);
            },
            { timeout: 60000 }
        );

        console.log('✅ Compilation complete, downloading...');

        // Get download link
        const downloadLink = await page.evaluate(() => {
            const links = Array.from(document.querySelectorAll('a'));
            const mindLink = links.find(link => link.href.includes('blob:') || link.download);
            return mindLink ? mindLink.href : null;
        });

        if (!downloadLink) {
            throw new Error('Download link not found');
        }

        // Download the .mind file
        const mindFileBuffer = await page.evaluate(async (url) => {
            const response = await fetch(url);
            const blob = await response.blob();
            const arrayBuffer = await blob.arrayBuffer();
            return Array.from(new Uint8Array(arrayBuffer));
        }, downloadLink);

        // Save to output path
        fs.writeFileSync(outputPath, Buffer.from(mindFileBuffer));

        // Cleanup temp image
        fs.unlinkSync(tempImagePath);

        console.log('💾 .mind file saved successfully');

        return outputPath;

    } catch (error) {
        console.error('❌ Mind-AR compilation error:', error);
        throw error;
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

module.exports = { generateMindFile };
