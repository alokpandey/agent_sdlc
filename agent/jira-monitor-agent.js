#!/usr/bin/env node

const axios = require('axios');
const { Octokit } = require('@octokit/rest');
const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

/**
 * JIRA Monitoring Agent
 * Monitors JIRA tickets for SonarQube issues and automatically creates fixes using OpenAI
 */
class JiraMonitorAgent {
  constructor(config) {
    this.config = config;
    this.jiraAuth = Buffer.from(`${config.jiraEmail}:${config.jiraToken}`).toString('base64');
    this.octokit = new Octokit({ auth: config.githubToken });
    this.processedTickets = new Set();
    this.workDir = path.join(os.tmpdir(), 'jira-agent-workspace');
  }

  /**
   * Start monitoring JIRA tickets
   */
  async start() {
    console.log('🤖 JIRA Monitor Agent started...');
    console.log(`   Monitoring project: ${this.config.jiraProjectKey}`);
    console.log(`   Poll interval: ${this.config.pollInterval}ms`);
    console.log(`   OpenAI Model: ${this.config.openaiModel}`);

    // Initial poll
    await this.pollJiraTickets();

    // Set up polling interval
    setInterval(() => this.pollJiraTickets(), this.config.pollInterval);
  }

  /**
   * Poll JIRA for new tickets with specific labels and status "To Do"
   */
  async pollJiraTickets() {
    try {
      const jql = `project = ${this.config.jiraProjectKey} AND labels = "sonarqube" AND labels = "auto-generated" AND labels = "quality-gate-failure" AND status = "To Do"`;

      const response = await axios.post(
        `${this.config.jiraUrl}/rest/api/3/search/jql`,
        {
          jql: jql,
          maxResults: 50,
          fields: ['summary', 'description', 'status', 'labels']
        },
        {
          headers: {
            'Authorization': `Basic ${this.jiraAuth}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const tickets = response.data.issues || [];
      console.log(`\n📋 Found ${tickets.length} tickets in "To Do" status with required labels`);

      for (const ticket of tickets) {
        if (!this.processedTickets.has(ticket.key)) {
          await this.processTicket(ticket);
          this.processedTickets.add(ticket.key);
        }
      }
    } catch (error) {
      console.error('❌ Error polling JIRA:', error.response?.data || error.message);
    }
  }

  /**
   * Process a JIRA ticket and create a fix
   */
  async processTicket(ticket) {
    console.log(`\n🔧 Processing ticket: ${ticket.key}`);
    console.log(`   Summary: ${ticket.fields.summary}`);

    try {
      // Update ticket status to "In Progress"
      await this.updateTicketStatus(ticket.key, 'In Progress');

      // Parse issues from JIRA description
      const issues = await this.parseJiraDescription(ticket);
      console.log(`   📝 Found ${issues.bugs.length} bugs, ${issues.vulnerabilities.length} vulnerabilities`);

      // Clone the repository
      const repoPath = await this.cloneRepository();

      // Generate fixes for all issues using OpenAI
      const fixes = await this.generateFixesWithOpenAI(issues, repoPath);

      // Create a new branch and PR with the fixes
      const pr = await this.createPullRequest(ticket, fixes, repoPath);

      // Add comment to JIRA ticket with PR link
      await this.addJiraComment(ticket.key, `Automated fix created: ${pr.html_url}`);

      console.log(`✅ Successfully created PR for ${ticket.key}: ${pr.html_url}`);

      // Cleanup
      await this.cleanup(repoPath);
    } catch (error) {
      console.error(`❌ Error processing ticket ${ticket.key}:`, error.message);
      console.error(error.stack);
      await this.addJiraComment(ticket.key, `Failed to create automated fix: ${error.message}`);
    }
  }

  /**
   * Parse JIRA description to extract issues
   */
  async parseJiraDescription(ticket) {
    const description = ticket.fields.description;
    const issues = {
      bugs: [],
      vulnerabilities: [],
      codeSmells: [],
      securityHotspots: []
    };

    if (!description || !description.content) {
      console.log('   ⚠️  No description content found');
      return issues;
    }

    let currentSection = null;

    for (const block of description.content) {
      // Check for headings
      if (block.type === 'heading' && block.content && block.content[0]) {
        const headingText = block.content[0].text || '';
        if (headingText.includes('Bugs')) {
          currentSection = 'bugs';
        } else if (headingText.includes('Vulnerabilities')) {
          currentSection = 'vulnerabilities';
        } else if (headingText.includes('Code Smells')) {
          currentSection = 'codeSmells';
        } else if (headingText.includes('Security Hotspots')) {
          currentSection = 'securityHotspots';
        } else {
          currentSection = null;
        }
      }

      // Parse bullet lists
      if (block.type === 'bulletList' && currentSection && block.content) {
        for (const item of block.content) {
          if (item.type === 'listItem' && item.content && item.content[0]) {
            const paragraph = item.content[0];
            if (paragraph.content && paragraph.content[0]) {
              const text = paragraph.content[0].text || '';
              const parsed = this.parseIssueText(text);
              if (parsed) {
                issues[currentSection].push(parsed);
              }
            }
          }
        }
      }
    }

    return issues;
  }

  /**
   * Parse individual issue text
   * Format: [SEVERITY] Message - File (Line N)
   */
  parseIssueText(text) {
    const match = text.match(/\[([^\]]+)\]\s+(.+?)\s+-\s+(.+?)\s+\(Line\s+(\d+|N\/A)\)/);
    if (match) {
      return {
        severity: match[1],
        message: match[2],
        file: match[3],
        line: match[4] === 'N/A' ? null : parseInt(match[4], 10)
      };
    }
    return null;
  }

  /**
   * Clone the Git repository
   */
  async cloneRepository() {
    console.log('   📦 Cloning repository...');

    const [owner, repo] = this.config.githubRepo.split('/');
    const repoUrl = `https://${this.config.githubToken}@github.com/${owner}/${repo}.git`;
    const repoPath = path.join(this.workDir, repo);

    // Clean up existing directory
    try {
      await fs.rm(repoPath, { recursive: true, force: true });
    } catch (error) {
      // Ignore if doesn't exist
    }

    // Create work directory
    await fs.mkdir(this.workDir, { recursive: true });

    // Clone repository
    execSync(`git clone ${repoUrl} ${repoPath}`, { stdio: 'inherit' });
    console.log(`   ✓ Repository cloned to ${repoPath}`);

    return repoPath;
  }

  /**
   * Generate fixes for all issues using OpenAI API
   */
  async generateFixesWithOpenAI(issues, repoPath) {
    console.log('   🤖 Generating fixes with OpenAI...');

    const fixes = [];
    const allIssues = [
      ...issues.bugs.map(i => ({ ...i, type: 'BUG' })),
      ...issues.vulnerabilities.map(i => ({ ...i, type: 'VULNERABILITY' })),
      ...issues.codeSmells.map(i => ({ ...i, type: 'CODE_SMELL' })),
      ...issues.securityHotspots.map(i => ({ ...i, type: 'SECURITY_HOTSPOT' }))
    ];

    // Group issues by file
    const issuesByFile = {};
    for (const issue of allIssues) {
      if (!issuesByFile[issue.file]) {
        issuesByFile[issue.file] = [];
      }
      issuesByFile[issue.file].push(issue);
    }

    // Generate fixes for each file
    for (const [filePath, fileIssues] of Object.entries(issuesByFile)) {
      const fullPath = path.join(repoPath, filePath);

      try {
        // Read current file content
        const currentContent = await fs.readFile(fullPath, 'utf-8');

        // Generate fix using OpenAI
        const fixedContent = await this.callOpenAI(filePath, currentContent, fileIssues);

        fixes.push({
          file: filePath,
          action: 'update',
          content: fixedContent,
          issues: fileIssues,
          reason: `Fix ${fileIssues.length} issue(s): ${fileIssues.map(i => i.type).join(', ')}`
        });

        console.log(`   ✓ Generated fix for ${filePath} (${fileIssues.length} issues)`);
      } catch (error) {
        console.error(`   ✗ Failed to generate fix for ${filePath}:`, error.message);
      }
    }

    return fixes;
  }

  /**
   * Call OpenAI API to generate code fix
   */
  async callOpenAI(filePath, currentContent, issues) {
    const issueDescriptions = issues.map(issue =>
      `- [${issue.severity}] ${issue.type}: ${issue.message} (Line ${issue.line || 'N/A'})`
    ).join('\n');

    const prompt = `You are a code security expert. Fix the following security issues in this Java file.

File: ${filePath}

Issues to fix:
${issueDescriptions}

Current code:
\`\`\`java
${currentContent}
\`\`\`

Please provide the complete fixed code with all security issues resolved. Follow these guidelines:
1. For hardcoded passwords: Use environment variables or configuration files
2. For SQL injection: Use PreparedStatement with parameterized queries
3. For command injection: Validate and sanitize input, avoid Runtime.exec with user input
4. For resource leaks: Use try-with-resources to ensure proper resource cleanup
5. Maintain the existing functionality and code structure
6. Only output the fixed Java code, no explanations

Fixed code:`;

    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: this.config.openaiModel,
          messages: [
            {
              role: 'system',
              content: 'You are an expert Java developer specializing in security fixes. You provide only code without explanations.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 4000
        },
        {
          headers: {
            'Authorization': `Bearer ${this.config.openaiApiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      let fixedCode = response.data.choices[0].message.content.trim();

      // Remove markdown code blocks if present
      fixedCode = fixedCode.replace(/^```java\n/, '').replace(/\n```$/, '');
      fixedCode = fixedCode.replace(/^```\n/, '').replace(/\n```$/, '');

      return fixedCode;
    } catch (error) {
      console.error('   ✗ OpenAI API error:', error.response?.data || error.message);
      throw new Error(`OpenAI API failed: ${error.message}`);
    }
  }

  /**
   * Create a pull request with the fixes
   */
  async createPullRequest(ticket, fixes, repoPath) {
    console.log('   🔀 Creating pull request...');

    const branchName = `fix/${ticket.key.toLowerCase()}-sonarqube-issues`;
    const [owner, repo] = this.config.githubRepo.split('/');

    // Get the default branch
    const { data: repoData } = await this.octokit.repos.get({ owner, repo });
    const defaultBranch = repoData.default_branch;

    // Create and checkout new branch in local repo
    try {
      execSync(`git checkout -b ${branchName}`, { cwd: repoPath, stdio: 'inherit' });
      console.log(`   ✓ Created local branch: ${branchName}`);
    } catch (error) {
      console.log(`   ℹ Branch ${branchName} may already exist, checking out...`);
      execSync(`git checkout ${branchName}`, { cwd: repoPath, stdio: 'inherit' });
    }

    // Apply fixes to local files
    for (const fix of fixes) {
      const fullPath = path.join(repoPath, fix.file);

      if (fix.action === 'update') {
        await fs.writeFile(fullPath, fix.content, 'utf-8');
        console.log(`   ✓ Updated: ${fix.file}`);
      } else if (fix.action === 'delete') {
        await fs.unlink(fullPath);
        console.log(`   ✓ Deleted: ${fix.file}`);
      } else if (fix.action === 'create') {
        await fs.mkdir(path.dirname(fullPath), { recursive: true });
        await fs.writeFile(fullPath, fix.content, 'utf-8');
        console.log(`   ✓ Created: ${fix.file}`);
      }
    }

    // Commit changes
    execSync('git add .', { cwd: repoPath });
    const commitMessage = `Fix: ${ticket.fields.summary}

Automated fixes for SonarQube issues in ${ticket.key}

${fixes.map(f => `- ${f.reason}`).join('\n')}

JIRA: ${this.config.jiraUrl}/browse/${ticket.key}`;

    execSync(`git commit -m "${commitMessage.replace(/"/g, '\\"')}"`, { cwd: repoPath, stdio: 'inherit' });
    console.log('   ✓ Committed changes');

    // Push branch
    execSync(`git push origin ${branchName}`, { cwd: repoPath, stdio: 'inherit' });
    console.log('   ✓ Pushed branch to remote');

    // Create pull request via GitHub API
    const { data: pr } = await this.octokit.pulls.create({
      owner,
      repo,
      title: `Fix: ${ticket.fields.summary}`,
      head: branchName,
      base: defaultBranch,
      body: `## Automated Fix for ${ticket.key}

This PR addresses the SonarQube quality gate failures identified in [${ticket.key}](${this.config.jiraUrl}/browse/${ticket.key}).

### Changes:
${fixes.map(f => `- 🔧 **${f.file}**: ${f.reason}`).join('\n')}

### Issues Fixed:
${fixes.map(f => f.issues ? f.issues.map(i => `  - [${i.severity}] ${i.type}: ${i.message} (Line ${i.line || 'N/A'})`).join('\n') : '').join('\n')}

### JIRA Ticket
- **Ticket**: [${ticket.key}](${this.config.jiraUrl}/browse/${ticket.key})
- **Summary**: ${ticket.fields.summary}

---
🤖 This PR was automatically generated by the JIRA Monitor Agent using OpenAI ${this.config.openaiModel}.
Please review and approve if the changes look correct.
`
    });

    console.log(`   ✓ Created PR: ${pr.html_url}`);
    return pr;
  }

  /**
   * Cleanup workspace
   */
  async cleanup(repoPath) {
    try {
      await fs.rm(repoPath, { recursive: true, force: true });
      console.log('   ✓ Cleaned up workspace');
    } catch (error) {
      console.error('   ⚠️  Failed to cleanup workspace:', error.message);
    }
  }

  /**
   * Update JIRA ticket status to "In Progress"
   */
  async updateTicketStatus(ticketKey, statusName) {
    try {
      // Get available transitions
      const transitionsResponse = await axios.get(
        `${this.config.jiraUrl}/rest/api/3/issue/${ticketKey}/transitions`,
        {
          headers: {
            'Authorization': `Basic ${this.jiraAuth}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const transitions = transitionsResponse.data.transitions;
      const transition = transitions.find(t => t.name === statusName || t.to.name === statusName);

      if (transition) {
        await axios.post(
          `${this.config.jiraUrl}/rest/api/3/issue/${ticketKey}/transitions`,
          {
            transition: {
              id: transition.id
            }
          },
          {
            headers: {
              'Authorization': `Basic ${this.jiraAuth}`,
              'Content-Type': 'application/json'
            }
          }
        );
        console.log(`   ✓ Updated ${ticketKey} status to: ${statusName}`);
      } else {
        console.log(`   ⚠️  Transition to "${statusName}" not found for ${ticketKey}`);
      }
    } catch (error) {
      console.error(`   ✗ Failed to update status:`, error.response?.data || error.message);
    }
  }

  /**
   * Add comment to JIRA ticket
   */
  async addJiraComment(ticketKey, comment) {
    try {
      await axios.post(
        `${this.config.jiraUrl}/rest/api/3/issue/${ticketKey}/comment`,
        {
          body: {
            type: "doc",
            version: 1,
            content: [
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: comment
                  }
                ]
              }
            ]
          }
        },
        {
          headers: {
            'Authorization': `Basic ${this.jiraAuth}`,
            'Content-Type': 'application/json'
          }
        }
      );
      console.log(`   ✓ Added comment to ${ticketKey}`);
    } catch (error) {
      console.error(`   ✗ Failed to add comment:`, error.response?.data || error.message);
    }
  }
}

// CLI usage
if (require.main === module) {
  const config = {
    jiraUrl: process.env.JIRA_URL,
    jiraEmail: process.env.JIRA_EMAIL,
    jiraToken: process.env.JIRA_API_TOKEN,
    jiraProjectKey: process.env.JIRA_PROJECT_KEY,
    githubToken: process.env.GITHUB_TOKEN,
    githubRepo: process.env.GITHUB_REPOSITORY,
    openaiApiKey: process.env.OPENAI_API_KEY,
    openaiModel: process.env.OPENAI_MODEL || 'gpt-4',
    pollInterval: parseInt(process.env.POLL_INTERVAL || '60000', 10) // Default: 1 minute
  };

  // Validate required config
  const required = ['jiraUrl', 'jiraEmail', 'jiraToken', 'jiraProjectKey', 'githubToken', 'githubRepo', 'openaiApiKey'];
  const missing = required.filter(key => !config[key]);

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing.join(', '));
    process.exit(1);
  }

  const agent = new JiraMonitorAgent(config);
  agent.start().catch(console.error);
}

module.exports = { JiraMonitorAgent };

