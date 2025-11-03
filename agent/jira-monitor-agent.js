#!/usr/bin/env node

const axios = require('axios');
const { Octokit } = require('@octokit/rest');
const fs = require('fs').promises;
const path = require('path');

/**
 * JIRA Monitoring Agent
 * Monitors JIRA tickets for SonarQube issues and automatically creates fixes
 */
class JiraMonitorAgent {
  constructor(config) {
    this.config = config;
    this.jiraAuth = Buffer.from(`${config.jiraEmail}:${config.jiraToken}`).toString('base64');
    this.octokit = new Octokit({ auth: config.githubToken });
    this.processedTickets = new Set();
  }

  /**
   * Start monitoring JIRA tickets
   */
  async start() {
    console.log('🤖 JIRA Monitor Agent started...');
    console.log(`   Monitoring project: ${this.config.jiraProjectKey}`);
    console.log(`   Poll interval: ${this.config.pollInterval}ms`);

    // Initial poll
    await this.pollJiraTickets();

    // Set up polling interval
    setInterval(() => this.pollJiraTickets(), this.config.pollInterval);
  }

  /**
   * Poll JIRA for new tickets with specific labels
   */
  async pollJiraTickets() {
    try {
      const jql = `project = ${this.config.jiraProjectKey} AND labels = "sonarqube" AND labels = "auto-generated" AND status != "Done" AND status != "Closed"`;
      
      const response = await axios.get(
        `${this.config.jiraUrl}/rest/api/3/search`,
        {
          params: { jql, maxResults: 50 },
          headers: {
            'Authorization': `Basic ${this.jiraAuth}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const tickets = response.data.issues;
      console.log(`\n📋 Found ${tickets.length} open SonarQube tickets`);

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

      // Analyze the issue and generate fix
      const fix = await this.generateFix(ticket);

      // Create a new branch and PR with the fix
      const pr = await this.createPullRequest(ticket, fix);

      // Add comment to JIRA ticket with PR link
      await this.addJiraComment(ticket.key, `Automated fix created: ${pr.html_url}`);

      console.log(`✅ Successfully created PR for ${ticket.key}: ${pr.html_url}`);
    } catch (error) {
      console.error(`❌ Error processing ticket ${ticket.key}:`, error.message);
      await this.addJiraComment(ticket.key, `Failed to create automated fix: ${error.message}`);
    }
  }

  /**
   * Generate fix based on SonarQube issues
   */
  async generateFix(ticket) {
    console.log('   🔍 Analyzing SonarQube issues...');

    // For this POC, we'll create a predefined fix for the vulnerable controller
    // In a real implementation, this would parse SonarQube API results and generate appropriate fixes
    
    const fixes = [
      {
        file: 'src/main/java/com/example/mathapi/controller/VulnerableController.java',
        action: 'delete',
        reason: 'Remove file with multiple security vulnerabilities'
      },
      {
        file: 'src/main/java/com/example/mathapi/controller/SecureController.java',
        action: 'create',
        content: this.getSecureControllerContent(),
        reason: 'Replace with secure implementation'
      }
    ];

    return fixes;
  }

  /**
   * Get secure controller content (fixed version)
   */
  getSecureControllerContent() {
    return `package com.example.mathapi.controller;

import org.springframework.web.bind.annotation.*;
import org.springframework.beans.factory.annotation.Value;
import java.security.SecureRandom;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@RestController
@RequestMapping("/api/secure")
public class SecureController {

    private static final Logger logger = LoggerFactory.getLogger(SecureController.class);
    
    // Use environment variables instead of hardcoded credentials
    @Value("\${db.username:}")
    private String dbUser;
    
    @Value("\${db.password:}")
    private String dbPassword;
    
    // Use SecureRandom instead of Random for security-sensitive operations
    private final SecureRandom secureRandom = new SecureRandom();

    @GetMapping("/random")
    public int getSecureRandomNumber() {
        return secureRandom.nextInt(1000);
    }

    @GetMapping("/health")
    public String healthCheck() {
        return "Service is running securely";
    }
}
`;
  }

  /**
   * Create a pull request with the fix
   */
  async createPullRequest(ticket, fixes) {
    const branchName = `fix/${ticket.key.toLowerCase()}-sonarqube-issues`;
    const [owner, repo] = this.config.githubRepo.split('/');

    // Get the default branch
    const { data: repoData } = await this.octokit.repos.get({ owner, repo });
    const defaultBranch = repoData.default_branch;

    // Get the latest commit SHA from default branch
    const { data: refData } = await this.octokit.git.getRef({
      owner,
      repo,
      ref: `heads/${defaultBranch}`
    });
    const latestCommitSha = refData.object.sha;

    // Create a new branch
    try {
      await this.octokit.git.createRef({
        owner,
        repo,
        ref: `refs/heads/${branchName}`,
        sha: latestCommitSha
      });
      console.log(`   ✓ Created branch: ${branchName}`);
    } catch (error) {
      if (error.status === 422) {
        console.log(`   ℹ Branch ${branchName} already exists, using existing branch`);
      } else {
        throw error;
      }
    }

    // Apply fixes
    for (const fix of fixes) {
      if (fix.action === 'delete') {
        await this.deleteFile(owner, repo, branchName, fix.file, fix.reason);
      } else if (fix.action === 'create') {
        await this.createFile(owner, repo, branchName, fix.file, fix.content, fix.reason);
      }
    }

    // Create pull request
    const { data: pr } = await this.octokit.pulls.create({
      owner,
      repo,
      title: `Fix: ${ticket.fields.summary}`,
      head: branchName,
      base: defaultBranch,
      body: `## Automated Fix for ${ticket.key}

This PR addresses the SonarQube quality gate failures identified in [${ticket.key}](${this.config.jiraUrl}/browse/${ticket.key}).

### Changes:
${fixes.map(f => `- ${f.action === 'delete' ? '🗑️ Deleted' : '✨ Created'} \`${f.file}\`: ${f.reason}`).join('\n')}

### JIRA Ticket
- **Ticket**: [${ticket.key}](${this.config.jiraUrl}/browse/${ticket.key})
- **Summary**: ${ticket.fields.summary}

---
🤖 This PR was automatically generated by the JIRA Monitor Agent.
Please review and approve if the changes look correct.
`
    });

    return pr;
  }

  /**
   * Delete a file in the repository
   */
  async deleteFile(owner, repo, branch, filePath, message) {
    try {
      const { data: fileData } = await this.octokit.repos.getContent({
        owner,
        repo,
        path: filePath,
        ref: branch
      });

      await this.octokit.repos.deleteFile({
        owner,
        repo,
        path: filePath,
        message: `Delete ${filePath}: ${message}`,
        sha: fileData.sha,
        branch
      });

      console.log(`   ✓ Deleted: ${filePath}`);
    } catch (error) {
      if (error.status === 404) {
        console.log(`   ℹ File ${filePath} not found, skipping deletion`);
      } else {
        throw error;
      }
    }
  }

  /**
   * Create a file in the repository
   */
  async createFile(owner, repo, branch, filePath, content, message) {
    const contentEncoded = Buffer.from(content).toString('base64');

    try {
      await this.octokit.repos.createOrUpdateFileContents({
        owner,
        repo,
        path: filePath,
        message: `Create ${filePath}: ${message}`,
        content: contentEncoded,
        branch
      });

      console.log(`   ✓ Created: ${filePath}`);
    } catch (error) {
      console.error(`   ✗ Failed to create ${filePath}:`, error.message);
      throw error;
    }
  }

  /**
   * Update JIRA ticket status
   */
  async updateTicketStatus(ticketKey, status) {
    // This is simplified - in reality you'd need to get the transition ID
    console.log(`   ℹ Updating ${ticketKey} status to: ${status}`);
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
    pollInterval: parseInt(process.env.POLL_INTERVAL || '60000', 10) // Default: 1 minute
  };

  const agent = new JiraMonitorAgent(config);
  agent.start().catch(console.error);
}

module.exports = { JiraMonitorAgent };

