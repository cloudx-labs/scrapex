import { createLogger, format, transports } from "winston";
import expressWinston from "express-winston";

/**
 * Custom Winston format that prints a single-line log entry:
 * `{timestamp} {level}: {message} {durationMs?}`
 */
const customFormat = format.printf(({ level, message, timestamp, durationMs }) => {
	return `${timestamp} ${level}: ${message} ${durationMs ? durationMs + "ms" : ""}`;
});

/**
 * Application-wide Winston logger instance.
 * Log level is controlled by the `LOG_LEVEL` env var (default: `"debug"`).
 *
 * @type {import("winston").Logger}
 */
export const log = createLogger({
	level: process.env.LOG_LEVEL || "debug",
	format: format.combine(format.timestamp(), customFormat),
	transports: [new transports.Console()],
});

/**
 * Express middleware that logs every HTTP request using Winston.
 * Requests to `/health` are silently skipped.
 *
 * @type {import("express").Handler}
 */
export const express = expressWinston.logger({
	transports: [new transports.Console()],
	format: format.combine(format.timestamp(), customFormat),
	meta: true,
	msg: "HTTP {{req.method}} {{req.url}}",
	expressFormat: true,
	colorize: false,
	ignoreRoute: function (req, res) {
		return req.path === "/health";
	},
});
