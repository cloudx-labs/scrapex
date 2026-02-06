import express from "express";
import { log, express as expressLogger } from "./logger.js";

export function configure(app) {
	app.use(express.json());
	app.use(expressLogger);
}

export function configureErrorHandler(app) {
	app.use((err, _req, res, next) => {
		log.error(err);
		if (res.headersSent) {
			return next(err);
		}
		const isProduction = process.env.NODE_ENV === "production";
		const responseMessage = isProduction ? "Internal server error" : err.message;
		res.status(500).send(responseMessage);
		return;
	});
}
