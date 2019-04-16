import Github from "@octokit/rest"
import {
	debug,
	info,
	warn,
	error
} from "./log"
import Excel from "exceljs"
import Fs from "fs"
import Path from "path"
import Sh from "shelljs"
import Os from "os"
import _ from "lodash"
import excelReporter from "./ExcelReporter"

const DefaultStats = {
	additions: 0,
	removals: 0,
	commits: 0
}

class Stats {
	
	constructor(additions = 0, removals = 0, commits = 0) {
		this.additions = additions
		this.removals = removals
		this.commits = commits
	}
	
	reset() {
		Object.assign(this, DefaultStats)
	}
}

class MemberStats extends Stats {
	
	constructor(contrib) {
		super()
		
		if (![null, undefined].includes(contrib.percentage)) {
			Object.assign(this, _.cloneDeep(contrib))
			return
		}
		contrib.weeks.forEach((week) => {
			this.additions += week.a
			this.removals += week.d
			this.commits += week.c
		})
		
		const {author} = contrib
		this.percentage = 0
		this.login = author.login
		this.author = author
		
	}
}

class RepoStats extends Stats {
	constructor(repo, contribs) {
		super()
		this.name = repo.name
		this.repo = repo
		this.members = contribs
			.map(contrib => {
				const stats = new MemberStats(contrib)
				this.additions += stats.additions
				this.removals += stats.removals
				this.commits += stats.commits
				return stats
			})
			.reduce((map, stats) => {
				map[stats.login] = stats
				return map
			}, {})
		
		Object.values(this.members).forEach(stats => {
			stats.percentage = stats.additions / this.additions
		})
	}
}

class OrgStats extends Stats {
	
	constructor(repos) {
		super()
		
		this.repos = repos
		this.members = {}
		
		this.calculate()
	}
	
	calculate() {
		this.reset()
		this.members = {}
		this.repos.forEach(repo => {
			this.additions += repo.additions
			this.removals += repo.removals
			this.commits += repo.commits
			
			Object.values(repo.members).forEach(repoMember => {
				let member = this.members[repoMember.login]
				if (!member) {
					member = this.members[repoMember.login] = new MemberStats(repoMember)
					member.reset()
				}
				member.additions += repoMember.additions
				member.removals += repoMember.removals
				member.commits += repoMember.commits
			})
			
		})
		
		Object.values(this.members).forEach(member => {
			member.percentage = member.additions / this.additions
		})
	}
	
	filter(repoIncludeFilter, repoExcludeFilter) {
		this.repos = this.repos.filter(repo =>
			(!repoIncludeFilter || new RegExp(repoIncludeFilter).test(repo.name)) &&
			(!repoExcludeFilter || !(new RegExp(repoExcludeFilter).test(repo.name)))
		)
		
		this.calculate()
	}
}

function createClient(token) {
	return new Github({
		auth: token,
		log: {
			debug,
			info,
			warn,
			error
		},
	})
}


function toJSON(obj) {
	return JSON.stringify(obj, null, 2)
}

async function generateReport(opts) {
	const
		{
			org,
			token,
			data: dataRootDir,
			cache,
			open,
			"repo-include-filter": repoIncludeFilter,
			"repo-exclude-filter": repoExcludeFilter,
			"output-file": outputFile
		} = opts,
		dataDir = Path.resolve(dataRootDir, org)
	
	Sh.mkdir('-p', dataDir)
	
	if (!Sh.test("-d", dataDir))
		throw Error(`Invalid output dir: ${dataDir}`)
	
	debug(`Using output directory: ${dataDir}`)
	
	// Github client
	const client = createClient(token)
	
	function dataPath(filename) {
		return Path.resolve(dataDir, `${filename}.json`)
	}
	
	function writeJSON(filename, data) {
		const
			json = toJSON(data),
			file = dataPath(filename)
		
		Fs.writeFileSync(file, json)
	}
	
	/**
	 * Get members
	 *
	 * @returns {Promise<any[]>}
	 */
	async function getMembers() {
		const opts = client.orgs.listMembers.endpoint.merge({
			org,
			filter: "all",
			role: "all",
			per_page: 100
		})
		
		return await client.paginate(opts)
	}
	
	/**
	 * Get repos
	 * @returns {Promise<any[]>}
	 */
	async function getRepos() {
		const opts = client.repos.listForOrg.endpoint.merge({
			org,
			type: "all",
			per_page: 100
		})
		
		return (await client.paginate(opts))
	}
	
	const orgFile = dataPath("org")
	let orgStats
	if (!cache || !Fs.existsSync(orgFile)) {
		
		// Retrieve members first
		const
			members = await getMembers(),
			memberNames = members.map(member => member.login)
		
		writeJSON("members", members)
		debug(`Org Members\n${members.map(it => `\t${it.login}`).join("\n")}\n`)
		
		const repos = await getRepos()
		debug(`Org Repos\n${repos.map(it => `\t${it.full_name}`).join("\n")}\n`)
		
		for (const repo of repos) {
			writeJSON(`repo_${repo.name}`, repo)
		}
		
		
		const repoStats = {}
		for (const repo of repos) {
			try {
				info(`Gathering stats for ${repo.full_name}`)
				const
					result = await client.repos.getContributorsStats({
						owner: org,
						repo: repo.name
					}),
					stats = result.data
				
				writeJSON(`stats_${repo.name}`, stats)
				if (Array.isArray(stats))
					repoStats[repo.name] = new RepoStats(repo, stats.filter(contrib => memberNames.includes(contrib.author.login)))
			} catch (err) {
				warn(`Unable to get stats for: ${repo.name}`, err)
			}
		}
		
		orgStats = new OrgStats(Object.values(repoStats))
		writeJSON("org", orgStats)
	} else {
		orgStats = Object.assign(new OrgStats([]), JSON.parse(Fs.readFileSync(orgFile, 'utf-8')))
	}
	
	// FILTER DATA
	orgStats.filter(repoIncludeFilter, repoExcludeFilter)
	
	const reportFile = await excelReporter(opts, orgStats, outputFile)
	
	if (open) {
		const platform = Os.platform()
		
		if (platform.includes("win32")) {
			error(`Can not open report on ${platform}: ${reportFile}`)
		} else {
			
			const openCmd = platform === "darwin" ? "open" : "xdg-open"
			
			Sh.exec(`${openCmd} "${reportFile}"`)
		}
		
	}
}

export default generateReport