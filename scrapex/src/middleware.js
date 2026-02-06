import express from "express";
import { log, express as expressLogger } from "./logger.js";

export function configure(app) {
	app.use(express.json());
	app.use(expressLogger);
	app.use((err, _req, res, next) => {
		log.error(err);
		if (res.headersSent) {
			return next(err);
		}
		res.status(500).send(err.message);
		return;
	});
}
