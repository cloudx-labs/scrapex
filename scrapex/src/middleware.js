import express from "express";
import { log, express as expressLogger } from "./logger.js";

/**
 * Registers standard middleware on the Express application: JSON body parsing
 * and HTTP request logging.
 *
 * @param {import("express").Express} app
 */
export function configure(app) {
	app.use(express.json());
	app.use(expressLogger);
}

/**
 * Registers the catch-all error-handling middleware. Must be called **after**
 * all routes are registered so it can catch their errors.
 *
 * @param {import("express").Express} app
 */
export function configureErrorHandler(app) {
	app.use((err, _req, res, next) => {
		log.error(err);
		if (res.headersSent) {
			return next(err);
		}
		res.status(500).send(err.message);
		return;
	});
}
