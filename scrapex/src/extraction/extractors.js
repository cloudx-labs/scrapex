import { log } from "../logger.js";
import * as TimeUtils from "../timeUtils.js";
import TurndownService from "turndown";
import { browserExtract, fetchExtract } from "./strategies.js";

/**
 * @typedef {import("./strategies.js").ExtractionResult} ExtractionResult
 */

/**
 * @typedef {Object} ExtractorParams
 * @property {string} url - Target URL to extract from.
 * @property {number} [wait] - Milliseconds to wait after page load (browser mode only).
 * @property {string} [userAgent] - Custom User-Agent header.
 * @property {"browser" | "fetch"} mode - Extraction strategy to use.
 * @property {Record<string, any>} [params] - Full request parameters (for format-specific settings).
 */

/** @type {string[]} HTML tags stripped before Markdown conversion. */
const JUNK_TAGS = ["script", "style", "noscript", "template"];

/**
 * Extracts raw HTML content from a URL.
 *
 * @param {ExtractorParams} options
 * @returns {Promise<ExtractionResult>}
 */
export async function extractHtml({ url, wait, userAgent, mode }) {
	const strategy = mode === "fetch" ? fetchExtract : browserExtract;
	return strategy({ url, wait, userAgent }, async ({ page, html }) => ({
		contentType: "text/html",
		content: html ?? (await page.content()),
	}));
}

/**
 * Extracts content from a URL and converts it to Markdown using Turndown.
 * Script, style, noscript, and template tags are removed before conversion.
 *
 * @param {ExtractorParams} options
 * @returns {Promise<ExtractionResult>}
 */
export async function extractMarkdown({ url, wait, userAgent, mode }) {
	const strategy = mode === "fetch" ? fetchExtract : browserExtract;
	return strategy({ url, wait, userAgent }, async ({ page, html }) => {
		const htmlContent = html ?? (await page.content());
		const markdownContent = await TimeUtils.profile("Converting to MD", () => {
			const service = new TurndownService();
			service.remove(JUNK_TAGS);
			return service.turndown(htmlContent);
		});
		return {
			contentType: "text/markdown",
			content: markdownContent,
		};
	});
}

/**
 * Renders a URL in the browser and generates a PDF document. Always uses
 * browser mode. Supports all Playwright PDF options via `params.settings.pdf.options`.
 *
 * @param {ExtractorParams} options
 * @returns {Promise<ExtractionResult>} Content is base64-encoded.
 */
export async function extractPdf({ url, wait, userAgent, params }) {
	return browserExtract({ url, wait, userAgent }, async ({ page }) => {
		const pdfOptions = { ...(params.settings?.pdf?.options || { format: "Letter" }) };
		delete pdfOptions.path;

		log.debug(`PDF options: ${JSON.stringify(pdfOptions)}`);
		await page.emulateMedia({ media: "print" });

		const buffer = await TimeUtils.profile("Creating PDF", () => page.pdf(pdfOptions));
		return {
			contentType: "application/pdf",
			content: buffer.toString("base64"),
		};
	});
}

/**
 * Renders a URL in the browser and captures a full-page screenshot. Always
 * uses browser mode. Supports all Playwright screenshot options via
 * `params.settings.screenshot.options`.
 *
 * @param {ExtractorParams} options
 * @returns {Promise<ExtractionResult>} Content is base64-encoded.
 */
export async function extractScreenshot({ url, wait, userAgent, params }) {
	return browserExtract({ url, wait, userAgent }, async ({ page }) => {
		const screenshotOptions = { ...(params.settings?.screenshot?.options || {}) };
		delete screenshotOptions.path;

		if (screenshotOptions.quality && !screenshotOptions.type) {
			screenshotOptions.type = "jpeg";
		}

		const mergedOptions = {
			fullPage: true,
			...screenshotOptions,
		};

		log.debug(`Screenshot options: ${JSON.stringify(mergedOptions)}`);

		const buffer = await TimeUtils.profile("Creating Screenshot", () => page.screenshot(mergedOptions));
		const contentType = mergedOptions.type === "jpeg" ? "image/jpeg" : "image/png";

		return {
			contentType,
			content: buffer.toString("base64"),
		};
	});
}
