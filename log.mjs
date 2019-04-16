

let debugEnabled = false

export function log(...args) {
	if (debugEnabled)
		console.log(...args)
}

export function debug(...args) {
	if (debugEnabled)
		console.debug(...args)
}

export function info(...args) {
	console.info(...args)
}

export function warn(...args) {
	console.warn(...args)
}

export function error(...args) {
	console.error(...args)
}

export function setDebugEnabled(enabled) {
	debugEnabled = enabled
}

export default {
	log,
	debug,
	info,
	warn,
	error,
	setDebugEnabled
}