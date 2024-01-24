import short from "short-uuid";
import { log } from "./logger.js";

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

export function delay(time) {
	if (time > 0) {
		log.debug(`Waiting for ${time}ms`);
		return new Promise((resolve) => setTimeout(resolve, time));
	}
	return Promise.resolve();
}
