#!/usr/bin/env node --experimental-modules

import Yargs from "yargs"
import generateReport from "./report"
import {debug, setDebugEnabled} from "./log"
import Path from "path"

const defaultToken = process.env.GITHUB_TOKEN

const argv = Yargs
	.usage("Output stats for a github org")
	.option("output-file", {
		string: true,
		require: false,
		default: Path.resolve(process.cwd(), "report.xlsx"),
		requiresArg: true,
		description: "Report output file"
	})
	.option("data", {
		string: true,
		require: false,
		default: Path.resolve(process.cwd(), "data"),
		requiresArg: true,
		description: "Data output directory"
	})
	.option("repo-include-filter", {
		string: true,
		require: false,
		default: null,
		requiresArg: true,
		description: "Regex repo include filter"
	})
	.option("repo-exclude-filter", {
		string: true,
		require: false,
		default: null,
		requiresArg: true,
		description: "Regex exclude filter"
	})
	.option("open", {
		boolean: true,
		require: false,
		default: false,
		description: "Open when complete"
	})
	.option("cache", {
		boolean: true,
		require: false,
		default: false,
		description: "Use cached data if available"
	})
	.option("org", {
		alias: "o",
		string: true,
		require: true,
		requiresArg: true,
		demandOption: true,
		description: "Org to generate for"
	})
	.option("token", {
		alias: "t",
		string: true,
		default: defaultToken,
		require: !defaultToken,
		requiresArg: true,
		description: "Github token, if not available in env"
	})
	.option("verbose", {
		alias: "v",
		default: false,
		description: "Verbose output",
		boolean: true
	})
	.argv




// if (!org || !token || !output)
// 	Yargs.showHelp()

if (argv.verbose) {
	setDebugEnabled(true)
	debug("Verbose logging enabled")
}

//generateReport(token, org, data, repoFilter, cache, outputFile,open)
generateReport(argv)




