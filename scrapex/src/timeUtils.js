import short from "short-uuid";
import { log } from "./logger.js";

/**
 * Executes an async function while logging its start and elapsed time using
 * Winston's built-in profiler. Each invocation gets a unique timer label.
 *
 * @template T
 * @param {string} name - Human-readable label for the operation.
 * @param {() => T | Promise<T>} func - The function to execute and measure.
 * @returns {Promise<T>} The return value of `func`.
 */
export async function profile(name, func) {
	const timerLabel = `${name} - ${short.generate()}`;
	try {
		log.debug(`Starting ${name}`);
		log.profile(timerLabel);
		return await func();
	} finally {
		log.profile(timerLabel);
	}
}

/**
 * Returns a promise that resolves after the given number of milliseconds.
 * Resolves immediately when `time` is 0 or negative.
 *
 * @param {number} time - Milliseconds to wait.
 * @returns {Promise<void>}
 */
export function delay(time) {
	if (time > 0) {
		log.debug(`Waiting for ${time}ms`);
		return new Promise((resolve) => setTimeout(resolve, time));
	}
	return Promise.resolve();
}
