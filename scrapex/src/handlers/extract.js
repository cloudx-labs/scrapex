import { log } from "../logger.js";
import * as TimeUtils from "../timeUtils.js";
import {
	extractHtml,
	extractMarkdown,
	extractPdf,
	extractScreenshot,
} from "../extraction/extractors.js";

/** @typedef {import("../extraction/extractors.js").ExtractorParams} ExtractorParams */

/**
 * Maps `outputType` values from the request to their extraction functions.
 * @type {Map<string, (params: ExtractorParams) => Promise<import("../extraction/strategies.js").ExtractionResult>>}
 */
const extractionHandlers = new Map([
	["html", extractHtml],
	["md", extractMarkdown],
	["pdf", extractPdf],
	["screenshot", extractScreenshot],
]);

/** @type {Set<string>} Output types that support fetch mode. */
const FETCH_SUPPORTED = new Set(["html", "md"]);

/** @type {Set<string>} Valid extraction mode values. */
const VALID_MODES = new Set(["browser", "fetch"]);

/** @type {number} Default milliseconds to wait after page load (browser mode). */
const DEFAULT_WAIT = process.env.DEFAULT_WAIT || 0;

/**
 * Express route handler for `POST /extract`. Validates the request payload,
 * resolves extraction parameters, and delegates to the appropriate extractor.
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<void>}
 */
export default async function handle(req, res) {
	const params = req.body ?? {};
	const outputType = params.outputType;
	const parsedWait = params.wait != null ? Number(params.wait) : NaN;
	const wait = Number.isNaN(parsedWait) ? DEFAULT_WAIT : parsedWait;
	const userAgent = params.userAgent;
	const mode = params.mode || "browser";

	/** @type {string | null} */
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
	if (!VALID_MODES.has(mode)) {
		res.status(400).json({ message: `Unknown mode "${mode}"` });
		return;
	}
	if (mode === "fetch" && !FETCH_SUPPORTED.has(outputType)) {
		res.status(400).json({
			message: `Fetch mode only supports: ${[...FETCH_SUPPORTED].join(", ")}`,
		});
		return;
	}

	log.info(`Extracting "${outputType}" (mode: ${mode}) from "${url}"`);
	log.debug(JSON.stringify(params));

	try {
		const extractionResult = await TimeUtils.profile("Extraction", () =>
			extractionHandlers.get(outputType)({ url, wait, userAgent, mode, params })
		);
		res.json(extractionResult);
	} catch (err) {
		log.warn(err);
		res.status(500).json({
			message: err.message,
		});
	}
}
