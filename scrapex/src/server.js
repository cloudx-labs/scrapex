import express from "express";
import { createHttpTerminator } from "http-terminator";
import { log } from "./logger.js";
import * as Middleware from "./middleware.js";
import * as Routes from "./routes.js";

// create an instance of express
const app = express();

// define a port
const PORT = process.env.PORT || 3000;

// set up all middlewares
await Middleware.configure(app);

// configure api routes
await Routes.configure(app);

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
process.on("SIGTERM", async () => {
	log.info("Stopping Application");
	await httpTerminator.terminate();

	log.info("Exiting");
	process.exit(0);
});
