import express from "express";
import { log, express as expressLogger } from "./logger.js";

export function configure(app) {
	app.use(express.json());
	app.use(expressLogger);
	app.use((err, req, res, next) => {
		log.error(err);
		res.status(500).send(err.message);
	});
}
