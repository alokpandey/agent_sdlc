// GitHub context from environment variables
const context = {
  repo: {
    owner: process.env.GITHUB_REPOSITORY.split("/")[0],
    repo: process.env.GITHUB_REPOSITORY.split("/")[1]
  },
  ref: process.env.GITHUB_REF,
  sha: process.env.GITHUB_SHA,
  serverUrl: process.env.GITHUB_SERVER_URL || "https://github.com",
  runId: process.env.GITHUB_RUN_ID
};

const jiraUrl = process.env.JIRA_URL;
const jiraEmail = process.env.JIRA_EMAIL;
const jiraToken = process.env.JIRA_API_TOKEN;
const projectKey = process.env.JIRA_PROJECT_KEY;

// Get SonarQube details from previous step
const qgStatus = process.env.QG_STATUS || "FAILED";
const bugs = process.env.BUGS || "0";
const vulnerabilities = process.env.VULNERABILITIES || "0";
const codeSmells = process.env.CODE_SMELLS || "0";
const securityHotspots = process.env.SECURITY_HOTSPOTS || "0";

// Get detailed issue information from environment variables (base64 encoded)
let bugsDetails = [];
let vulnsDetails = [];
let codeSmellsDetails = [];
let hotspotsDetails = [];

try {
  const bugsDetailsB64 = process.env.BUGS_DETAILS || "";
  const vulnsDetailsB64 = process.env.VULNS_DETAILS || "";
  const codeSmellsDetailsB64 = process.env.CODE_SMELLS_DETAILS || "";
  const hotspotsDetailsB64 = process.env.HOTSPOTS_DETAILS || "";
  
  console.log("Base64 lengths - Bugs: " + bugsDetailsB64.length + ", Vulns: " + vulnsDetailsB64.length + ", Code Smells: " + codeSmellsDetailsB64.length + ", Hotspots: " + hotspotsDetailsB64.length);
  
  // Decode base64 and split into lines
  const bugsDetailsText = bugsDetailsB64 ? Buffer.from(bugsDetailsB64, "base64").toString("utf8") : "";
  const vulnsDetailsText = vulnsDetailsB64 ? Buffer.from(vulnsDetailsB64, "base64").toString("utf8") : "";
  const codeSmellsDetailsText = codeSmellsDetailsB64 ? Buffer.from(codeSmellsDetailsB64, "base64").toString("utf8") : "";
  const hotspotsDetailsText = hotspotsDetailsB64 ? Buffer.from(hotspotsDetailsB64, "base64").toString("utf8") : "";
  
  bugsDetails = bugsDetailsText.trim() ? bugsDetailsText.split("\n").filter(line => line.trim()) : [];
  vulnsDetails = vulnsDetailsText.trim() ? vulnsDetailsText.split("\n").filter(line => line.trim()) : [];
  codeSmellsDetails = codeSmellsDetailsText.trim() ? codeSmellsDetailsText.split("\n").filter(line => line.trim()) : [];
  hotspotsDetails = hotspotsDetailsText.trim() ? hotspotsDetailsText.split("\n").filter(line => line.trim()) : [];
  
  console.log("Found " + bugsDetails.length + " bugs, " + vulnsDetails.length + " vulnerabilities, " + codeSmellsDetails.length + " code smells, " + hotspotsDetails.length + " security hotspots");
} catch (error) {
  console.error("Error decoding issue details:", error.message);
  console.error("Stack:", error.stack);
}

const auth = Buffer.from(jiraEmail + ":" + jiraToken).toString("base64");

// Helper function to create issue list items
const createIssueListItems = (issues) => {
  return issues.map(issue => ({
    type: "listItem",
    content: [{
      type: "paragraph",
      content: [{ type: "text", text: issue }]
    }]
  }));
};

// Build description content with issue summary
const descriptionContent = [
  {
    type: "heading",
    attrs: { level: 3 },
    content: [{ type: "text", text: "Quality Gate Failure Summary" }]
  },
  {
    type: "paragraph",
    content: [
      { type: "text", text: "SonarQube quality gate ", marks: [{ type: "strong" }] },
      { type: "text", text: qgStatus, marks: [{ type: "strong" }, { type: "textColor", attrs: { color: "#DE350B" } }] },
      { type: "text", text: " for commit " + context.sha.substring(0, 7) }
    ]
  },
  {
    type: "heading",
    attrs: { level: 3 },
    content: [{ type: "text", text: "Issue Summary" }]
  },
  {
    type: "bulletList",
    content: [
      {
        type: "listItem",
        content: [{
          type: "paragraph",
          content: [
            { type: "text", text: "Bugs: ", marks: [{ type: "strong" }] },
            { type: "text", text: bugs, marks: [{ type: "textColor", attrs: { color: "#DE350B" } }] }
          ]
        }]
      },
      {
        type: "listItem",
        content: [{
          type: "paragraph",
          content: [
            { type: "text", text: "Vulnerabilities: ", marks: [{ type: "strong" }] },
            { type: "text", text: vulnerabilities, marks: [{ type: "textColor", attrs: { color: "#DE350B" } }] }
          ]
        }]
      },
      {
        type: "listItem",
        content: [{
          type: "paragraph",
          content: [
            { type: "text", text: "Security Hotspots: ", marks: [{ type: "strong" }] },
            { type: "text", text: securityHotspots, marks: [{ type: "textColor", attrs: { color: "#FF991F" } }] }
          ]
        }]
      },
      {
        type: "listItem",
        content: [{
          type: "paragraph",
          content: [
            { type: "text", text: "Code Smells: ", marks: [{ type: "strong" }] },
            { type: "text", text: codeSmells, marks: [{ type: "textColor", attrs: { color: "#FF991F" } }] }
          ]
        }]
      }
    ]
  }
];

// Add detailed bugs section if there are bugs
if (bugsDetails.length > 0) {
  descriptionContent.push({
    type: "heading",
    attrs: { level: 3 },
    content: [{ type: "text", text: "Bugs (" + bugs + ")" }]
  });
  descriptionContent.push({
    type: "bulletList",
    content: createIssueListItems(bugsDetails)
  });
}

// Add detailed vulnerabilities section if there are vulnerabilities
if (vulnsDetails.length > 0) {
  descriptionContent.push({
    type: "heading",
    attrs: { level: 3 },
    content: [{ type: "text", text: "Vulnerabilities (" + vulnerabilities + ")" }]
  });
  descriptionContent.push({
    type: "bulletList",
    content: createIssueListItems(vulnsDetails)
  });
}

// Add detailed security hotspots section if there are hotspots
if (hotspotsDetails.length > 0) {
  descriptionContent.push({
    type: "heading",
    attrs: { level: 3 },
    content: [{ type: "text", text: "Security Hotspots (" + securityHotspots + ")" }]
  });
  descriptionContent.push({
    type: "bulletList",
    content: createIssueListItems(hotspotsDetails)
  });
}

// Add detailed code smells section (showing top 20)
if (codeSmellsDetails.length > 0) {
  const codeSmellsTitle = codeSmells > 20 ? "Code Smells (showing 20 of " + codeSmells + ")" : "Code Smells (" + codeSmells + ")";
  descriptionContent.push({
    type: "heading",
    attrs: { level: 3 },
    content: [{ type: "text", text: codeSmellsTitle }]
  });
  descriptionContent.push({
    type: "bulletList",
    content: createIssueListItems(codeSmellsDetails)
  });
}

// Add repository details section
descriptionContent.push(
  {
    type: "heading",
    attrs: { level: 3 },
    content: [{ type: "text", text: "Details" }]
  },
  {
    type: "bulletList",
    content: [
      {
        type: "listItem",
        content: [{
          type: "paragraph",
          content: [
            { type: "text", text: "Repository: ", marks: [{ type: "strong" }] },
            { type: "text", text: context.repo.owner + "/" + context.repo.repo }
          ]
        }]
      },
      {
        type: "listItem",
        content: [{
          type: "paragraph",
          content: [
            { type: "text", text: "Branch: ", marks: [{ type: "strong" }] },
            { type: "text", text: context.ref.replace("refs/heads/", "") }
          ]
        }]
      },
      {
        type: "listItem",
        content: [{
          type: "paragraph",
          content: [
            { type: "text", text: "Commit: ", marks: [{ type: "strong" }] },
            { type: "text", text: context.sha }
          ]
        }]
      }
    ]
  },
  {
    type: "heading",
    attrs: { level: 3 },
    content: [{ type: "text", text: "Links" }]
  },
  {
    type: "bulletList",
    content: [
      {
        type: "listItem",
        content: [{
          type: "paragraph",
          content: [
            { type: "text", text: "GitHub Action: ", marks: [{ type: "strong" }] },
            {
              type: "text",
              text: context.serverUrl + "/" + context.repo.owner + "/" + context.repo.repo + "/actions/runs/" + context.runId,
              marks: [{
                type: "link",
                attrs: { href: context.serverUrl + "/" + context.repo.owner + "/" + context.repo.repo + "/actions/runs/" + context.runId }
              }]
            }
          ]
        }]
      },
      {
        type: "listItem",
        content: [{
          type: "paragraph",
          content: [
            { type: "text", text: "SonarCloud Dashboard: ", marks: [{ type: "strong" }] },
            {
              type: "text",
              text: "View in SonarCloud",
              marks: [{
                type: "link",
                attrs: { href: "https://sonarcloud.io/dashboard?id=" + context.repo.owner + "_" + context.repo.repo }
              }]
            }
          ]
        }]
      }
    ]
  }
);

const issueData = {
  fields: {
    project: {
      key: projectKey
    },
    summary: "SonarQube Quality Gate Failed - " + context.repo.repo + " - " + context.sha.substring(0, 7),
    description: {
      type: "doc",
      version: 1,
      content: descriptionContent
    },
    issuetype: {
      name: "Bug"
    },
    labels: ["sonarqube", "quality-gate-failure", "auto-generated"]
  }
};

try {
  const response = await fetch(
    jiraUrl + "/rest/api/3/issue",
    {
      method: "POST",
      headers: {
        "Authorization": "Basic " + auth,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(issueData)
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error("HTTP " + response.status + ": " + errorText);
  }

  const data = await response.json();
  console.log("JIRA ticket created: " + data.key);
  console.log("::set-output name=jira-ticket::" + data.key);
} catch (error) {
  console.error("Failed to create JIRA ticket:", error.message);
  process.exit(1);
}

