// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");
const path = require("path");
const fs = require("fs");

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  const provider = new MyWebviewViewProvider(context);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider("digi.main", provider)
  );

  // Listen for typing
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) => {
      for (const change of event.contentChanges) {
        provider.sendJoy("code updated");
      }
    })
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("digi")) {
        provider.updateConfig();
      }
    })
  );
}

class MyWebviewViewProvider {
  constructor(context) {
    this._context = context;
    this._view = null;
  }

  resolveWebviewView(webviewView, context, _token) {
    this._view = webviewView; // keep reference!
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.file(path.join(this._context.extensionPath, "media")),
      ],
    };

    const htmlPath = path.join(
      this._context.extensionPath,
      "media",
      "index.html"
    );
    let html = fs.readFileSync(htmlPath, "utf8");

    // rewrite local resource URIs so they’re safe inside webview
    const mediaUri = webviewView.webview.asWebviewUri(
      vscode.Uri.file(path.join(this._context.extensionPath, "media"))
    );
    html = html.replace(/\{\{media\}\}/g, mediaUri.toString());
    webviewView.webview.html = html;

    // Send settings initially
    this.updateConfig();

    webviewView.webview.onDidReceiveMessage((message) => {
      if (message.command === "showMessage") {
        vscode.window.showInformationMessage(message.text);
      }
      if (message.command === "requestConfig") {
        this.updateConfig();
      }
    });
  }

  updateConfig() {
    if (this._view) {
      const config = vscode.workspace.getConfiguration("digi");
      this._view.webview.postMessage({
        type: "config",
        settings: {
          textColor: config.get("textColor"),
          joyColor: config.get("joyColor"),
          lowJoyColor: config.get("lowJoyColor"),
          criticalJoyColor: config.get("criticalJoyColor"),
          backgroundColor: config.get("backgroundColor"),
        },
      });
    }
  }

  sendJoy(reason) {
    if (this._view) {
      this._view.webview.postMessage({ type: "joy", reason });
    }
  }
}

// This method is called when your extension is deactivated
function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
