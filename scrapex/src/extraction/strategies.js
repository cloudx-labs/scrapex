import * as TimeUtils from "../timeUtils.js";
import { getBrowser } from "./browser.js";

const DEFAULT_USER_AGENT =
	process.env.DEFAULT_USER_AGENT ||
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

/**
 * @typedef {Object} StrategyOptions
 * @property {string} url - Target URL to extract from.
 * @property {number} [wait] - Milliseconds to wait after page load (browser mode only).
 * @property {string} [userAgent] - Custom User-Agent header.
 */

/**
 * @typedef {Object} ExtractionOutput
 * @property {string} contentType - MIME type of the extracted content.
 * @property {string} content - The extracted content (plain text or base64-encoded).
 */

/**
 * @typedef {Object} SourceInfo
 * @property {boolean} ok - Whether the HTTP response status was in the 2xx range.
 * @property {number} status - HTTP status code.
 * @property {string} url - Final URL after any redirects.
 * @property {Record<string, string>} headers - Response headers.
 */

/**
 * @typedef {Object} ExtractionResult
 * @property {SourceInfo} source - Metadata about the HTTP response.
 * @property {ExtractionOutput} output - The extracted content and its MIME type.
 */

/**
 * @typedef {Object} BrowserCallbackContext
 * @property {import("playwright").Page} page - The Playwright page instance.
 * @property {import("playwright").Response} response - The Playwright navigation response.
 */

/**
 * @typedef {Object} FetchCallbackContext
 * @property {string} html - The raw HTML body from the HTTP response.
 */

/**
 * Extraction strategy that uses a headless Chromium browser via Playwright.
 * Creates an isolated browser context, navigates to the URL, waits for
 * `domcontentloaded`, then hands the page to the callback for
 * content-specific extraction. The context is always closed afterwards.
 *
 * Falls back to {@link DEFAULT_USER_AGENT} when no `userAgent` is provided.
 *
 * @param {StrategyOptions} options
 * @param {(ctx: BrowserCallbackContext) => Promise<ExtractionOutput>} callback
 * @returns {Promise<ExtractionResult>}
 */
export async function browserExtract({ url, wait, userAgent }, callback) {
	const browser = await getBrowser();
	const resolvedUserAgent = userAgent || DEFAULT_USER_AGENT;
	const context = await TimeUtils.profile("New Context", () =>
		browser.newContext({ userAgent: resolvedUserAgent })
	);
	try {
		const { page, response } = await TimeUtils.profile("Opening Page", async () => {
			const page = await context.newPage();
			const response = await page.goto(url);
			if (!response) {
				throw new Error(`Navigation to ${url} returned no response`);
			}
			await page.waitForLoadState("domcontentloaded");
			return { page, response };
		});
		await TimeUtils.delay(wait);

		const output = await callback({ page, response });

		return {
			source: {
				ok: response.ok(),
				status: response.status(),
				url: page.url(),
				headers: await response.headers(),
			},
			output,
		};
	} finally {
		await TimeUtils.profile("Closing Context", () => context.close());
	}
}

/**
 * Extraction strategy that uses a direct HTTP fetch (no browser). Sends a
 * `GET` request, reads the full body as text, and hands it to the callback.
 *
 * Only sets a `User-Agent` header when explicitly provided — otherwise Node's
 * default is used.
 *
 * @param {StrategyOptions} options
 * @param {(ctx: FetchCallbackContext) => Promise<ExtractionOutput>} callback
 * @returns {Promise<ExtractionResult>}
 */
export async function fetchExtract({ url, userAgent }, callback) {
	const headers = {};
	if (userAgent) {
		headers["User-Agent"] = userAgent;
	}

	const response = await TimeUtils.profile("Fetching Page", () =>
		fetch(url, { headers, redirect: "follow" })
	);
	const html = await response.text();

	const output = await callback({ html });

	return {
		source: {
			ok: response.ok,
			status: response.status,
			url: response.url,
			headers: Object.fromEntries(response.headers.entries()),
		},
		output,
	};
}
