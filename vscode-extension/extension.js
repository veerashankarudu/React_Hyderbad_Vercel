// QuizHub AI Agent — VS Code Extension
// When team installs this .vsix, this code runs automatically.
// It writes the agent + skill files into their workspace .github/ folder.
// They get the agent. They never see your Java source code.

const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

function activate(context) {

  // Auto-setup when extension activates
  setupAgentInWorkspace(context, false);

  // Command: manual setup
  const setupCmd = vscode.commands.registerCommand('quizhub.setupAgent', () => {
    setupAgentInWorkspace(context, true);
  });

  // Command: open agent chat
  const openCmd = vscode.commands.registerCommand('quizhub.openAgent', () => {
    vscode.commands.executeCommand('workbench.action.chat.open', {
      query: '@quizhub '
    });
  });

  context.subscriptions.push(setupCmd, openCmd);
}

function setupAgentInWorkspace(context, showMessage) {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    return;
  }

  const workspaceRoot = workspaceFolders[0].uri.fsPath;
  const githubDir = path.join(workspaceRoot, '.github');
  const skillsDir = path.join(githubDir, 'skills', 'quizhub-mcq-expert');

  // Read MCP server URL from VS Code settings (team lead sets this)
  const config = vscode.workspace.getConfiguration('quizhub');
  const mcpUrl = config.get('mcpServerUrl', 'http://localhost:8085/sse');

  // Create .github folders if they don't exist
  fs.mkdirSync(skillsDir, { recursive: true });

  // Read bundled agent + skill files from inside the extension
  const agentSource = path.join(context.extensionPath, 'agents', 'quizhub-agent.agent.md');
  const skillSource = path.join(context.extensionPath, 'skills', 'quizhub-mcq-expert', 'SKILL.md');

  // Read the agent template and inject the MCP server URL
  let agentContent = fs.readFileSync(agentSource, 'utf8');
  agentContent = agentContent.replace('http://localhost:8085/sse', mcpUrl);

  // Write into workspace
  const agentDest = path.join(githubDir, 'quizhub-agent.agent.md');
  const skillDest = path.join(skillsDir, 'SKILL.md');

  fs.writeFileSync(agentDest, agentContent, 'utf8');
  fs.copyFileSync(skillSource, skillDest);

  if (showMessage) {
    vscode.window.showInformationMessage(
      '✅ QuizHub Agent installed! Open GitHub Copilot Chat and type @quizhub',
      'Open Chat'
    ).then(selection => {
      if (selection === 'Open Chat') {
        vscode.commands.executeCommand('workbench.action.chat.open');
      }
    });
  }
}

function deactivate() {}

module.exports = { activate, deactivate };
