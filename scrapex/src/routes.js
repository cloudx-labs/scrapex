import healthCheck from "./handlers/healthcheck.js";
import extract from "./handlers/extract.js";

export function configure(app) {
	// Define a route
	app.get("/health", healthCheck);
	app.post("/extract", extract);
}
