import { log } from "../logger.js";
import * as TimeUtils from "../timeUtils.js";
import { chromium } from "playwright";
import html2md from "html-to-md";

const extractionHandlers = new Map([
	["html", extractHtml],
	["md", extractMarkdown],
	["pdf", extractPdf],
	["screenshot", extractScreenshot],
]);

const DEFAULT_WAIT = process.env.DEFAULT_WAIT || 0;
const DEFAULT_USER_AGENT =
	process.env.DEFAULT_USER_AGENT ||
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export default async function handle(req, res) {
	const params = req.body;
	const url = decodeURIComponent(params.url);
	const outputType = params.outputType; // type = "html", "md", "pdf", "screenshot"
	const wait = params.wait || DEFAULT_WAIT;
	const userAgent = params.userAgent || DEFAULT_USER_AGENT;

	log.info(`Extracting "${outputType}" from "${url}"`);
	log.debug(JSON.stringify(params));

	const browser = await getBrowser();
	const context = await getNewContext(browser, userAgent);

	try {
		if (!extractionHandlers.has(outputType)) {
			throw new Error(`Unknown type "${outputType}"`);
		}
		const parameters = {
			context,
			url,
			wait,
			params,
		};
		const extractionResult = await TimeUtils.profile("Extraction", () =>
			extractionHandlers.get(outputType)(parameters)
		);
		res.json(extractionResult);
	} catch (err) {
		log.warn(err);
		res.status(500).json({
			message: err.message,
		});
	} finally {
		await tearDown(browser, context);
	}
}

async function loadPage({ context, url, wait }) {
	const result = await TimeUtils.profile("Opening Page", async () => {
		const page = await context.newPage();
		const response = await page.goto(url);
		await page.waitForLoadState("domcontentloaded");
		return { page, response };
	});
	await TimeUtils.delay(wait);
	return result;
}

async function buildResponse({ page, response }, { contentType, content }) {
	return {
		source: {
			ok: response.ok(),
			status: response.status(),
			url: page.url(),
			headers: await response.headers(),
		},
		output: {
			contentType: contentType,
			content: content,
		},
	};
}

async function extractHtml({ context, url, wait }) {
	const result = await loadPage({
		context,
		url,
		wait,
	});
	return await buildResponse(result, {
		contentType: "text/html",
		content: await result.page.content(),
	});
}

async function extractMarkdown({ context, url, wait, params }) {
	const result = await loadPage({
		context,
		url,
		wait,
	});

	const htmlContent = await result.page.content();

	const mdOptions = params.settings?.md?.options || {};
	if (mdOptions.tagListener) delete mdOptions.tagListener;

	log.debug(`MD options: ${JSON.stringify(mdOptions)}`);

	const markdownContent = await TimeUtils.profile("Converting to MD", () => html2md(htmlContent, mdOptions));

	return await buildResponse(result, {
		contentType: "text/markdown",
		content: markdownContent,
	});
}

async function extractPdf({ context, url, wait, params }) {
	const result = await loadPage({
		context,
		url,
		wait,
	});
	result.page.emulateMedia({ media: "print" });
	const pdfOptions = params.settings?.pdf?.options || {
		format: "Letter",
	};
	if (pdfOptions.path) delete pdfOptions.path;

	log.debug(`PDF options: ${JSON.stringify(pdfOptions)}`);

	const buffer = await TimeUtils.profile("Creating PDF", () => result.page.pdf(pdfOptions));
	return buildResponse(result, {
		contentType: "application/pdf",
		content: buffer.toString("base64"),
	});
}

async function extractScreenshot({ context, url, wait, params }) {
	const result = await loadPage({
		context,
		url,
		wait,
	});

	const screenshotOptions = params.settings?.screenshot?.options || {};
	if (screenshotOptions.path) delete screenshotOptions.path;

	// Playwright expects `quality` only for jpeg; if caller sets it without `type`, default to jpeg.
	if (screenshotOptions.quality && !screenshotOptions.type) {
		screenshotOptions.type = "jpeg";
	}

	const mergedOptions = {
		fullPage: true, // full-page screenshot by default
		...screenshotOptions,
	};

	log.debug(`Screenshot options: ${JSON.stringify(mergedOptions)}`);

	const buffer = await TimeUtils.profile("Creating Screenshot", () => result.page.screenshot(mergedOptions));
	const contentType = mergedOptions.type === "jpeg" ? "image/jpeg" : "image/png";

	return buildResponse(result, {
		contentType,
		content: buffer.toString("base64"),
	});
}

async function getBrowser() {
	const browser = await TimeUtils.profile("Opening Browser", () =>
		chromium.launch({
			headless: true,
		})
	);
	return browser;
}

async function getNewContext(browser, userAgent) {
	const context = await TimeUtils.profile("New Context", () =>
		browser.newContext({
			userAgent: userAgent,
		})
	);
	return context;
}

async function tearDown(browser, context) {
	await TimeUtils.profile("Closing Context and Browser", async () => {
		await context.close();
		await browser.close();
	});
}
