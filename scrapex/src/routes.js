import healthCheck from "./handlers/healthcheck.js";
import extract from "./handlers/extract.js";

/**
 * Registers all API routes on the Express application.
 *
 * @param {import("express").Express} app
 */
export function configure(app) {
	app.get("/health", healthCheck);
	app.post("/extract", extract);
}
