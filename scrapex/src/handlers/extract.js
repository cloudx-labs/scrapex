import { log } from "../logger.js";
import * as TimeUtils from "../timeUtils.js";
import { chromium } from "playwright";
import TurndownService from "turndown";

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
	const params = req.body ?? {};
	const outputType = params.outputType;
	const parsedWait = params.wait != null ? Number(params.wait) : NaN;
	const wait = Number.isNaN(parsedWait) ? DEFAULT_WAIT : parsedWait;
	const userAgent = params.userAgent || DEFAULT_USER_AGENT;

	let url;
	try {
		url = params.url != null ? decodeURIComponent(String(params.url)) : null;
	} catch {
		res.status(400).json({ message: "Malformed URL encoding" });
		return;
	}

	if (!url) {
		res.status(400).json({ message: "Missing or invalid url" });
		return;
	}
	if (!extractionHandlers.has(outputType)) {
		res.status(400).json({
			message: outputType != null ? `Unknown type "${outputType}"` : "Missing outputType",
		});
		return;
	}

	log.info(`Extracting "${outputType}" from "${url}"`);
	log.debug(JSON.stringify(params));

	let browser;
	let context;
	try {
		browser = await getBrowser();
		context = await getNewContext(browser, userAgent);

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

const JUNK_TAGS = ["script", "style", "noscript", "template"];

async function extractMarkdown({ context, url, wait }) {
	const result = await loadPage({
		context,
		url,
		wait,
	});

	const htmlContent = await result.page.content();

	const markdownContent = await TimeUtils.profile("Converting to MD", () => {
		const service = new TurndownService();
		service.remove(JUNK_TAGS);
		return service.turndown(htmlContent);
	});

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
	const pdfOptions = { ...(params.settings?.pdf?.options || { format: "Letter" }) };
	delete pdfOptions.path;

	log.debug(`PDF options: ${JSON.stringify(pdfOptions)}`);
	await result.page.emulateMedia({ media: "print" });

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

	const screenshotOptions = { ...(params.settings?.screenshot?.options || {}) };
	delete screenshotOptions.path;

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

let browserInstance = null;
let browserLaunchPromise = null;

export async function getBrowser() {
	if (browserInstance) return browserInstance;

	if (!browserLaunchPromise) {
		browserLaunchPromise = TimeUtils.profile("Launching Browser", () =>
			chromium.launch({
				headless: true,
			})
		)
			.then((browser) => {
				browserInstance = browser;
				browser.on("disconnected", () => {
					if (browserInstance === browser) {
						browserInstance = null;
						browserLaunchPromise = null;
					}
				});
				return browser;
			})
			.catch((err) => {
				browserLaunchPromise = null;
				throw err;
			});
	}

	return browserLaunchPromise;
}

async function getNewContext(browser, userAgent) {
	const context = await TimeUtils.profile("New Context", () =>
		browser.newContext({
			userAgent: userAgent,
		})
	);
	return context;
}

async function tearDown(_browser, context) {
	await TimeUtils.profile("Closing Context", async () => {
		if (context) await context.close();
	});
}

export async function shutdownBrowser() {
	if (browserInstance) {
		log.info("Closing shared browser instance");
		await browserInstance.close();
		browserInstance = null;
		browserLaunchPromise = null;
	}
}
