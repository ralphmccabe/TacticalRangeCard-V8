import re

with open('js/modules/scanner_module.js', 'r', encoding='utf-8') as f:
    content = f.read()

start_str = "    renderDiagnosticTerminalEntries() {"
end_str = "if (window.showToast) window.showToast('dY 1 Diagnostic terminal cleared.', 'INFO');\n    }"

start_idx = content.find(start_str)
end_idx = content.find(end_str, start_idx) + len(end_str)

if start_idx == -1 or end_idx < len(end_str):
    print("Could not find bounds")
    exit(1)

new_func = """    renderDiagnosticTerminalEntries() {
        const termBody = document.getElementById('diag-terminal-body');
        if (!termBody) return;

        // Only show the last 2 logs to fit on the small LCD screen
        const recentLogs = this.diagnosticLogs.slice(-2);

        termBody.innerHTML = recentLogs.map(e => {
            return `<div class="truncate opacity-90"><span class="opacity-50">> ${e.type}</span> ${e.msg}</div>`;
        }).join('');
    }

    clearDiagnosticTerminal() {
        this.diagnosticLogs = [];
        this.renderDiagnosticTerminalEntries();
    }"""

new_content = content[:start_idx] + new_func + content[end_idx:]

with open('js/modules/scanner_module.js', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Replaced successfully.")
