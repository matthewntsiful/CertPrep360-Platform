/**
 * IAM Policy Formatter
 * Detects and formats IAM policies in exam questions for better readability
 */

function formatIAMPolicies(text) {
    // Pattern to detect IAM policy JSON structures
    const policyPattern = /\{\s*\\?"Version\\?":\s*\\?"2012-10-17\\?"/gi;
    
    if (!policyPattern.test(text)) {
        return text;
    }
    
    // Extract policy JSON from text
    let formatted = text;
    
    // Find policy blocks and format them
    const policyRegex = /(\{[^{}]*"Version"[^{}]*"Statement"[^{}]*\})/gi;
    
    formatted = formatted.replace(policyRegex, (match) => {
        try {
            // Clean up escaped quotes and format
            let cleaned = match
                .replace(/\\"/g, '"')
                .replace(/\s+/g, ' ')
                .trim();
            
            // Parse and pretty print
            const policy = JSON.parse(cleaned);
            const prettyJson = JSON.stringify(policy, null, 2);
            
            // Return as code block
            return `\n\n<pre class="policy-json"><code>${escapeHtml(prettyJson)}</code></pre>\n\n`;
        } catch (e) {
            return match;
        }
    });
    
    return formatted;
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// Add CSS for policy formatting
const policyStyles = `
<style>
.policy-json {
    background: #1e1e1e;
    border: 1px solid #444;
    border-radius: 6px;
    padding: 16px;
    margin: 16px 0;
    overflow-x: auto;
    font-family: 'Courier New', Consolas, monospace;
    font-size: 13px;
    line-height: 1.6;
}

.policy-json code {
    color: #d4d4d4;
    display: block;
}

.dark-mode .policy-json {
    background: #0d1117;
    border-color: #30363d;
}

.policy-json code {
    white-space: pre;
    word-wrap: normal;
}
</style>
`;

// Inject styles
if (typeof document !== 'undefined') {
    document.head.insertAdjacentHTML('beforeend', policyStyles);
}
