import { createLogger, format, transports } from "winston";
import expressWinston from "express-winston";

const customFormat = format.printf(({ level, message, timestamp, durationMs }) => {
	return `${timestamp} ${level}: ${message} ${durationMs ? durationMs + "ms" : ""}`;
});

export const log = createLogger({
	level: process.env.LOG_LEVEL || "debug",
	format: format.combine(format.timestamp(), customFormat),
	transports: [new transports.Console()],
});

export const express = expressWinston.logger({
	transports: [new transports.Console()],
	format: format.combine(format.timestamp(), customFormat),
	meta: true, // optional: control whether you want to log the meta data about the request (default to true)
	msg: "HTTP {{req.method}} {{req.url}}", // optional: customize the default logging message. E.g. "{{res.statusCode}} {{req.method}} {{res.responseTime}}ms {{req.url}}"
	expressFormat: true, // Use the default Express/morgan request formatting. Enabling this will override any msg if true. Will only output colors with colorize set to true
	colorize: false, // Color the text and status code, using the Express/morgan color palette (text: gray, status: default green, 3XX cyan, 4XX yellow, 5XX red).
	ignoreRoute: function (req, res) {
		return req.path === "/health";
	}, // optional: allows to skip some log messages based on request and/or response
});
