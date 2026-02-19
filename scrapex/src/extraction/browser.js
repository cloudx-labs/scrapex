import { log } from "../logger.js";
import * as TimeUtils from "../timeUtils.js";
import { chromium } from "playwright";

/** @type {import("playwright").Browser | null} */
let browserInstance = null;

/** @type {Promise<import("playwright").Browser> | null} */
let browserLaunchPromise = null;

/**
 * Returns the shared headless Chromium browser instance, launching it on first
 * call. Subsequent calls return the same instance. If the browser disconnects
 * unexpectedly the singleton is reset so the next call will re-launch.
 *
 * @returns {Promise<import("playwright").Browser>}
 */
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

/**
 * Gracefully closes the shared browser instance. If a launch is still in
 * progress it waits for it to complete before closing. Safe to call even when
 * no browser is running.
 *
 * @returns {Promise<void>}
 */
export async function shutdownBrowser() {
	if (browserLaunchPromise && !browserInstance) {
		log.info("Browser launch in progress – waiting before shutdown");
		try {
			await browserLaunchPromise;
		} catch {
			// launch failed; nothing to close
		}
	}
	if (browserInstance) {
		log.info("Closing shared browser instance");
		await browserInstance.close();
		browserInstance = null;
		browserLaunchPromise = null;
	}
}
