/**
 * Application entry point. Sets up Express with middleware and routes, launches
 * the shared Playwright browser, starts the HTTP server, and registers graceful
 * shutdown handlers for SIGTERM/SIGINT.
 */

import express from "express";
import { createHttpTerminator } from "http-terminator";
import { log } from "./logger.js";
import * as Middleware from "./middleware.js";
import * as Routes from "./routes.js";
import { getBrowser, shutdownBrowser } from "./extraction/browser.js";

const app = express();

/** @type {number} */
const PORT = Number(process.env.PORT) || 3000;

await Middleware.configure(app);
await Routes.configure(app);
Middleware.configureErrorHandler(app);

try {
	await getBrowser();
} catch (err) {
	log.error("Fatal: failed to launch browser", err);
	process.exit(1);
}

const server = app.listen(PORT, () => {
	log.info(`Server is running on port ${PORT}`);
});

const httpTerminator = createHttpTerminator({ server });

process.on("uncaughtException", function (err) {
	log.error("UNCAUGHT EXCEPTION:", err);
});

let isShuttingDown = false;
for (const signal of ["SIGTERM", "SIGINT"]) {
	process.on(signal, async () => {
		if (isShuttingDown) {
			log.info(`Received ${signal} – Shutdown already in progress, ignoring`);
			return;
		}
		isShuttingDown = true;
		log.info(`Received ${signal} – Stopping Application`);
		let exitCode = 0;
		try {
			await httpTerminator.terminate();
		} catch (err) {
			log.error("Error terminating HTTP server:", err);
			exitCode = 1;
		}
		try {
			await shutdownBrowser();
		} catch (err) {
			log.error("Error shutting down browser:", err);
			exitCode = 1;
		}
		log.info("Exiting");
		process.exit(exitCode);
	});
}
