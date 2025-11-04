# JIRA Monitor Agent

An intelligent agent that monitors JIRA tickets for SonarQube quality gate failures and automatically generates fixes using OpenAI.

## Features

- 🔍 **Monitors JIRA tickets** with specific labels (`sonarqube`, `auto-generated`, `quality-gate-failure`) and status "To Do"
- 📝 **Parses issue details** from JIRA ticket descriptions (bugs, vulnerabilities, code smells, security hotspots)
- 🤖 **Uses OpenAI** to generate intelligent code fixes for security issues
- 📦 **Clones Git repository** to analyze and fix code locally
- 🔀 **Creates Pull Requests** with all fixes automatically
- 💬 **Updates JIRA tickets** with PR links and status changes

## How It Works

1. **Poll JIRA**: Searches for tickets in ADP project with labels `sonarqube`, `auto-generated`, `quality-gate-failure` and status "To Do"
2. **Parse Issues**: Extracts all bugs, vulnerabilities, and other issues from the JIRA ticket description
3. **Clone Repository**: Clones the GitHub repository to a temporary workspace
4. **Generate Fixes**: For each file with issues, calls OpenAI API to generate secure code fixes
5. **Create PR**: Commits all fixes to a new branch and creates a pull request
6. **Update JIRA**: Adds a comment with the PR link and updates status to "In Progress"

## Environment Variables

Required environment variables:

```bash
# JIRA Configuration
JIRA_URL=https://your-domain.atlassian.net
JIRA_EMAIL=your-email@example.com
JIRA_API_TOKEN=your-jira-api-token
JIRA_PROJECT_KEY=ADP

# GitHub Configuration
GITHUB_TOKEN=your-github-token
GITHUB_REPOSITORY=owner/repo

# OpenAI Configuration
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-4  # Optional, defaults to gpt-4

# Agent Configuration
POLL_INTERVAL=60000  # Optional, defaults to 60000ms (1 minute)
```

## Running the Agent

### Using Node.js

```bash
cd agent
npm install
export JIRA_URL=https://maplelabs.atlassian.net
export JIRA_EMAIL=alok.pandey@xoriant.com
export JIRA_API_TOKEN=your-token
export JIRA_PROJECT_KEY=ADP
export GITHUB_TOKEN=your-github-token
export GITHUB_REPOSITORY=alokpandey/agent_sdlc
export OPENAI_API_KEY=your-openai-key
export OPENAI_MODEL=gpt-4
npm start
```

### Using Docker

```bash
cd agent
docker build -t jira-monitor-agent .
docker run -e JIRA_URL=... -e JIRA_EMAIL=... -e JIRA_API_TOKEN=... \
  -e JIRA_PROJECT_KEY=ADP -e GITHUB_TOKEN=... -e GITHUB_REPOSITORY=... \
  -e OPENAI_API_KEY=... -e OPENAI_MODEL=gpt-4 \
  jira-monitor-agent
```

### Using Docker Compose

```bash
cd agent
# Edit docker-compose.yml to add your environment variables
docker-compose up
```

## Issue Parsing

The agent parses issues from JIRA ticket descriptions in the following format:

```
### Bugs (2)
- [BLOCKER] Use try-with-resources or close this "Connection" in a "finally" clause. - src/main/java/.../MathController.java (Line 93)
- [BLOCKER] Use try-with-resources or close this "Statement" in a "finally" clause. - src/main/java/.../MathController.java (Line 98)

### Vulnerabilities (3)
- [BLOCKER] Revoke and change this password, as it is compromised. - src/main/java/.../MathController.java (Line 96)
- [BLOCKER] Change this code to not construct SQL queries directly from user-controlled data. - src/main/java/.../MathController.java (Line 101)
- [MINOR] Change this code to not construct OS command arguments from user-controlled data. - src/main/java/.../MathController.java (Line 117)
```

## OpenAI Integration

The agent uses OpenAI's Chat Completions API to generate fixes. For each file with issues:

1. Sends the current code and list of issues to OpenAI
2. Requests a complete fixed version of the code
3. Applies security best practices:
   - Hardcoded passwords → Environment variables
   - SQL injection → PreparedStatement with parameters
   - Command injection → Input validation and sanitization
   - Resource leaks → try-with-resources

## Example Workflow

1. SonarQube detects quality gate failure
2. GitHub Actions creates JIRA ticket ADP-5 with labels `sonarqube`, `auto-generated`, `quality-gate-failure`
3. Agent polls JIRA and finds ADP-5 in "To Do" status
4. Agent parses 2 bugs and 3 vulnerabilities from ticket description
5. Agent clones repository to `/tmp/jira-agent-workspace/agent_sdlc`
6. Agent calls OpenAI to fix `MathController.java` (5 issues)
7. Agent creates branch `fix/adp-5-sonarqube-issues`
8. Agent commits fixes and pushes to GitHub
9. Agent creates PR with detailed description
10. Agent updates JIRA ticket with PR link and status "In Progress"

## Security Considerations

- GitHub token needs `repo` scope for cloning and creating PRs
- JIRA API token needs permissions to read/update issues and add comments
- OpenAI API key is used for generating code fixes
- Repository is cloned to temporary directory and cleaned up after processing
- All credentials are passed via environment variables

## Limitations

- Currently supports Java code fixes
- Requires JIRA tickets to have specific format in description
- OpenAI API costs apply per fix generation
- May require manual review of generated fixes before merging

## License

MIT

# Demo run Tue Nov  4 15:11:24 IST 2025
