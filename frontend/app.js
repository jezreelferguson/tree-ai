/* ════════════════════════════════════════════════════════════════════
   Tree AI — Frontend JavaScript
   ════════════════════════════════════════════════════════════════════ */

const API_URL = "https://tree-ai-l1qf.onrender.com";

// ── State 
let chatHistory = [];
let isLoading = false;

// ── DOM Elements 
const chatMessages = document.getElementById("chatMessages");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const welcomeScreen = document.getElementById("welcomeScreen");
const sidebar = document.getElementById("sidebar");

// ── Input Handling 
messageInput.addEventListener("input", () => {
    sendBtn.disabled = !messageInput.value.trim() || isLoading;
});

function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (!sendBtn.disabled) sendMessage();
    }
}

function autoResize(el) {
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 150) + "px";
}

// ── Send Message 
async function sendMessage() {
    const question = messageInput.value.trim();
    if (!question || isLoading) return;

    // Hide welcome screen
    if (welcomeScreen) {
        welcomeScreen.style.display = "none";
    }

    // Add user message to chat
    appendMessage("user", question);
    chatHistory.push({ role: "user", content: question });

    // Clear input
    messageInput.value = "";
    messageInput.style.height = "auto";
    sendBtn.disabled = true;
    isLoading = true;

    // Show typing indicator
    const typingEl = showTypingIndicator();

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                question: question,
                chat_history: chatHistory.slice(-6),
            }),
        });

        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }

        const data = await response.json();

        // Remove typing indicator
        typingEl.remove();

        // Add assistant message
        appendMessage("assistant", data.answer, data.sources);
        chatHistory.push({ role: "assistant", content: data.answer });

    } catch (error) {
        typingEl.remove();
        appendMessage("assistant", `⚠️ **Connection Error**\n\nI couldn't reach the server. Please make sure the API is running and try again.\n\n_Error: ${error.message}_`);
    }

    isLoading = false;
    sendBtn.disabled = !messageInput.value.trim();
    messageInput.focus();
}

// ── Quick Questions 
function askQuickQuestion(question) {
    messageInput.value = question;
    sendBtn.disabled = false;
    sendMessage();
    // Close sidebar on mobile
    if (window.innerWidth <= 900) {
        sidebar.classList.remove("open");
    }
}

// ── New Chat 
function startNewChat() {
    chatHistory = [];
    chatMessages.innerHTML = "";
    // Re-show welcome screen
    if (welcomeScreen) {
        chatMessages.appendChild(welcomeScreen);
        welcomeScreen.style.display = "block";
    }
    messageInput.focus();
}

// ── Toggle Sidebar 
function toggleSidebar() {
    if (window.innerWidth <= 900) {
        sidebar.classList.toggle("open");
    } else {
        sidebar.classList.toggle("collapsed");
    }
}

// ── Render Messages 
function appendMessage(role, content, sources = []) {
    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${role}`;

    const avatar = role === "assistant" ? "🌿" : "👤";

    let sourcesHTML = "";
    if (sources && sources.length > 0) {
        const sourceId = "src-" + Date.now();
        const sourceItems = sources
            .map(
                (s) =>
                    `<div class="source-item">
                        <div class="source-label">📄 ${s.source} — Page ${s.page}</div>
                        <div>${escapeHtml(s.text)}</div>
                    </div>`
            )
            .join("");

        sourcesHTML = `
            <div class="sources-section">
                <button class="sources-toggle" onclick="toggleSources('${sourceId}')">
                    📚 View ${sources.length} source(s) ▾
                </button>
                <div class="sources-list" id="${sourceId}">
                    ${sourceItems}
                </div>
            </div>`;
    }

    messageDiv.innerHTML = `
        <div class="message-avatar">${avatar}</div>
        <div class="message-content">
            <div class="message-bubble">${renderMarkdown(content)}</div>
            ${sourcesHTML}
        </div>
    `;

    chatMessages.appendChild(messageDiv);
    scrollToBottom();
}

// ── Typing Indicator 
function showTypingIndicator() {
    const div = document.createElement("div");
    div.className = "message assistant";
    div.innerHTML = `
        <div class="message-avatar">🌿</div>
        <div class="message-content">
            <div class="message-bubble">
                <div class="typing-indicator">
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                </div>
            </div>
        </div>
    `;
    chatMessages.appendChild(div);
    scrollToBottom();
    return div;
}

// ── Toggle Sources 
function toggleSources(id) {
    const el = document.getElementById(id);
    if (el) el.classList.toggle("visible");
}

// ── Scroll 
function scrollToBottom() {
    requestAnimationFrame(() => {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    });
}

// ── Basic Markdown Renderer 
function renderMarkdown(text) {
    if (!text) return "";

    let html = escapeHtml(text);

    // Headers
    html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
    html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
    html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");

    // Bold & italic
    html = html.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
    html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
    html = html.replace(/_(.+?)_/g, "<em>$1</em>");

    // Inline code
    html = html.replace(/`(.+?)`/g, "<code>$1</code>");

    // Blockquotes
    html = html.replace(/^&gt; (.+)$/gm, "<blockquote>$1</blockquote>");

    // Unordered lists
    html = html.replace(/^[-•] (.+)$/gm, "<li>$1</li>");
    html = html.replace(/((<li>.*<\/li>\n?)+)/g, "<ul>$1</ul>");

    // Ordered lists
    html = html.replace(/^\d+\. (.+)$/gm, "<li>$1</li>");

    // Line breaks → paragraphs
    html = html.replace(/\n\n/g, "</p><p>");
    html = html.replace(/\n/g, "<br>");
    html = "<p>" + html + "</p>";

    // Clean up empty tags
    html = html.replace(/<p><\/p>/g, "");
    html = html.replace(/<p>(<h[1-4]>)/g, "$1");
    html = html.replace(/(<\/h[1-4]>)<\/p>/g, "$1");
    html = html.replace(/<p>(<ul>)/g, "$1");
    html = html.replace(/(<\/ul>)<\/p>/g, "$1");
    html = html.replace(/<p>(<blockquote>)/g, "$1");
    html = html.replace(/(<\/blockquote>)<\/p>/g, "$1");

    return html;
}

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

// ── Init 
messageInput.focus();
