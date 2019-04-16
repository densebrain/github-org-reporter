import {
	debug,
	info,
	warn,
	error
} from "./log"
import Excel from "exceljs"
import _ from "lodash"

async function excelReporter(opts, orgStats, outputFile) {
	
	const {org} = opts
	
	info(`Generating excel report for Github Organization ${org}`)
	
	// GENERATE REPORT
	const workbook = new Excel.Workbook()
	Object.assign(workbook, {
		creator: process.env.USER,
		lastModifiedBy: process.env.USER,
		modified: new Date(),
		created: new Date(),
		// views: [
		// 	{
		// 		firstSheet: 0, activeTab: 1, visibility: 'visible'
		// 	}
		// ]
	})
	//workbook.creator = process.env.USER || "UNKNOWN"
	/**
	 * Generate the org sheet
	 * @returns {Promise<void>}
	 */
	async function generateOrgSheet() {
		const
			sheet = workbook.addWorksheet(`Org ${org}`),
			members = _.sortBy(Object.values(orgStats.members), member => member.percentage).reverse(),
			columns = [
				{header: "name", key: "name", width: 32},
				{header: "org", key: "ownership", width: 20, style: {numFmt: '0.00%'}},
				{header: "total lines of code", key: "lines", width: 20},
				{header: "total # commits", key: "commits", width: 20}
			]
		
		orgStats.repos.forEach(repo => {
			columns.push({header: `${repo.name}`, key: repo.name, width: 20, style: {numFmt: '0.00%'}})
		})
		
		sheet.columns = columns
		sheet.autoFilter = {
			from: 'B1',
			to: {
				row: 1,
				column: columns.length
			},
		}
		sheet.addRows(
			members.map(member => {
				const row = ({
					name: member.login,
					ownership: member.percentage,
					lines: member.additions,
					commits: member.commits,
					...orgStats.repos.reduce((data, repo) => {
						const
							repoMember = Object.values(repo.members).find(it => it.login === member.login)
						
						data[repo.name] = repoMember ? repoMember.percentage : 0
						return data
					}, {})
				})
				
				
				return row
			})
		)
		
		sheet.state = 'visible'
		sheet.addRows([{}, {}, {}, {}])
		sheet.addRow([
			`Github Organization: ${org}`
		
		])
		sheet.addRow([
			`Total Lines of Code: ${orgStats.additions}`
		])
		
		//sheet.commit()
	}
	
	/**
	 * Generate the repo sheets
	 * @returns {Promise<void>}
	 */
	async function generateRepoSheets() {
		orgStats.repos.filter(repo => Object.values(repo.members).length).forEach(repo => {
			if (!repo.name) return
			const
				sheet = workbook.getWorksheet(repo.name) || workbook.addWorksheet(repo.name),
				members = _.sortBy(Object.values(repo.members), member => member.percentage).reverse(),
				columns = [
					{header: "name", key: `${repo.name}-name`, width: 32},
					{header: "percentage", key: `${repo.name}-ownership`, width: 20, style: {numFmt: '0.00%'}},
					{header: "total lines of code", key: `${repo.name}-lines`, width: 20},
					{header: "total # commits", key: `${repo.name}-commits`, width: 20}
				]
			
			sheet.columns = columns
			sheet.state = 'visible'
			sheet.autoFilter = {
				from: 'B1',
				to: {
					row: 1,
					column: columns.length
				},
			}
			sheet.addRows(
				members.map(member => [
					member.login || "Unknown",
					member.percentage || 0,
					member.additions || 0,
					member.commits || 0
				])
			)
			
			sheet.addRows([{}, {}, {}, {}])
			let row = sheet.addRow([])
			row.getCell(1).style = {
				font: {name: `Arial`}
			}
			row.values = [
				`Github Repo = ${repo.name}`
			]
			row = sheet.addRow([
				repo.additions
			])
			
			row.getCell(1).numFmt = "0"
		})
	}
	
	await generateOrgSheet()
	await generateRepoSheets()
	
	let file = outputFile
	if (!file.endsWith(".xlsx")) {
		file += ".xlsx"
	}
	
	// ALL DONE - SAVE
	await workbook.xlsx.writeFile(file)
	info(`Exported github stats in excel format: ${file}`)
	
	return file
	
}

export default excelReporter