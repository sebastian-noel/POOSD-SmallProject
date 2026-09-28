const assert = require('node:assert/strict');
const { chromium } = require('playwright');

// Optional real-browser checks against the disposable server from the runner.
// No production URL is accepted by this helper.
const base = process.env.API_TEST_BASE_URL;
if (!base || !/^http:\/\/127\.0\.0\.1:\d+$/.test(base)) {
    throw new Error('Run API_TEST_BROWSER=1 bash tests/run-api-validation.sh');
}

(async () => {
    const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || undefined });
    try {
        const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.goto(base);
        await page.waitForURL('**/login/index.html');
        assert.equal(await page.locator('#username').count(), 1);
        assert.equal(await page.locator('#email').count(), 0);

        await page.goto(base + '/signup/index.html');
        assert.equal(await page.locator('#email').count(), 0);
        await page.locator('#username').fill('BrowserOwner');
        await page.locator('#password').fill('BrowserPassword123!');
        await page.locator('#submitButton').click();
        await page.waitForURL('**/login/index.html');
        await page.locator('#username').fill('BrowserOwner');
        await page.locator('#password').fill('BrowserPassword123!');
        await page.locator('#submitButton').click();
        await page.waitForURL('**/contacts/contacts.html');
        await page.locator('#contactsPanel').waitFor({ state: 'visible' });
        console.log('PASS browser username signup/login and secure-cookie session');

        await page.locator('#addContactBtn').click();
        assert.equal(await page.locator('#contactAddress, #notes').count(), 0);
        assert.equal(await page.locator('#contactEmail').getAttribute('maxlength'), '60');
        await page.locator('#firstName').fill('Ada');
        await page.locator('#lastName').fill('Lovelace');
        await page.locator('#contactEmail').fill('ada@example.com');
        await page.locator('#contactPhone').fill('407-555-0100');
        await page.locator('#saveContactBtn').click();
        await page.locator('#popupOverlay').waitFor({ state: 'hidden' });
        await page.getByRole('cell', { name: 'Ada Lovelace', exact: true }).waitFor();
        await page.getByRole('button', { name: 'Edit', exact: true }).click();
        await page.locator('#popupOverlay').waitFor({ state: 'visible' });
        assert.equal(await page.locator('#contactEmail').inputValue(), 'ada@example.com');
        await page.locator('#lastName').fill('Byron');
        await page.locator('#saveContactBtn').click();
        await page.locator('#popupOverlay').waitFor({ state: 'hidden' });
        await page.getByRole('cell', { name: 'Ada Byron', exact: true }).waitFor();
        console.log('PASS browser add/edit using only original ERD contact fields');

        const search = page.locator('#searchBox');
        await search.fill('yro');
        const searched = page.waitForResponse(response => response.url().endsWith('contacts.php?search=yro'));
        await search.press('Enter');
        assert.equal((await searched).status(), 200);
        await page.getByRole('cell', { name: 'Ada Byron', exact: true }).waitFor();
        await search.fill('no-match-browser-test');
        await search.press('Enter');
        await page.getByRole('cell', { name: 'No contacts found', exact: true }).waitFor();
        await search.fill('Ada');
        await search.press('Enter');
        await page.getByRole('cell', { name: 'Ada Byron', exact: true }).waitFor();
        console.log('PASS browser search makes a server request and handles no matches');

        if (process.env.API_TEST_SCREENSHOT) {
            await page.screenshot({ path: process.env.API_TEST_SCREENSHOT, fullPage: true });
        }
        page.once('dialog', dialog => dialog.accept());
        await page.getByRole('button', { name: 'Delete', exact: true }).click();
        await page.getByRole('cell', { name: 'No contacts found', exact: true }).waitFor();
        await page.locator('#logoutBtn').click();
        await page.waitForURL('**/login/index.html');
        await page.goto(base + '/contacts/contacts.html');
        await page.waitForURL('**/login/index.html');
        assert.deepEqual(errors, []);
        console.log('PASS browser delete/logout and logged-out dashboard protection');
    } finally {
        await browser.close();
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
