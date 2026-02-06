import express from "express";
import { createHttpTerminator } from "http-terminator";
import { log } from "./logger.js";
import * as Middleware from "./middleware.js";
import * as Routes from "./routes.js";
import { getBrowser, shutdownBrowser } from "./handlers/extract.js";

// create an instance of express
const app = express();

// define a port
const PORT = process.env.PORT || 3000;

// set up all middlewares
await Middleware.configure(app);

// configure api routes
await Routes.configure(app);

// launch the shared browser instance before accepting requests
await getBrowser();

// start the server
const server = app.listen(PORT, () => {
	log.info(`Server is running on port ${PORT}`);
});

// set up the httpTerminator which gracefully disconnects clients during shutdown
const httpTerminator = createHttpTerminator({ server });

process.on("uncaughtException", function (err) {
	log.error("UNCAUGHT EXCEPTION:", err);
});

// Graceful shutdown
for (const signal of ["SIGTERM", "SIGINT"]) {
	process.on(signal, async () => {
		log.info(`Received ${signal} – Stopping Application`);
		await httpTerminator.terminate();
		await shutdownBrowser();

		log.info("Exiting");
		process.exit(0);
	});
}
