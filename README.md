# Github Org Exporter

Export GH org stats to excel or other output formats.  Currently only excel is supported

## Install

```bash
npm i -g github-org-stats
```

## Run

```bash
github-org-stats \ 
	-v \
	--org Signafy \
	--repo-exclude-filter "(pattern1|pattern2)" \
	--repo-include-filter "(some-pattern)" \
	--cache \
	--output-file \
	<output-file>.xlsx \
	--open
```

## Usage

```bash
Output stats for a github org

Options:
  --help                 Show help                                     [boolean]
  --version              Show version number                           [boolean]
  --output-file          Report output file
                         [string] [default: "${PWD}/report.xlsx"]
  --data                 Data output directory
                         [string] [default: "${PWD}/data"]
  --repo-include-filter  Regex repo include filter      
                         [string] [default: null]
  --repo-exclude-filter  Regex exclude filter    
                         [string] [default: null]
  --open                 Open when complete           
                         [boolean] [default: false] 
  --cache                Use cached data if available 
                         [boolean] [default: false]
  --org, -o              Org to generate for                 
                         [string] [required]
  --token, -t            Github token, if not available in env
                         [string] [default: ${GITHUB_TOKEN}]
  --verbose, -v          Verbose output               
                         [boolean] [default: false]

```
