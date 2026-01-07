// ===========================
// CIVICEYE CIVIC ASSISTANT CHATBOT
// Powered by Google Gemini AI
// ===========================

// ===========================
// GEMINI API CONFIGURATION
// ===========================
const GEMINI_API_KEY = "AIzaSyBFWNX4Uq6_Y-fRjD3kWcw4lSnoUZd4XfI";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

// State
let chatMessages = [
    { role: 'assistant', content: 'Hello! I am your Civic Assistant. How can I help you with CivicEye today?' }
];
let isLoading = false;

// System Prompt for CivicEye
const SYSTEM_PROMPT = `You are the Civic Assistant for CivicEye, a civic-tech platform that connects citizens with NGOs to resolve community issues.

YOUR ROLE:
- Help citizens understand how to report civic issues
- Guide users to choose correct categories
- Explain how CivicEye works
- Assist NGOs with understanding their dashboard
- Answer FAQs about issue tracking and resolution

AVAILABLE ISSUE CATEGORIES:
- Infrastructure (roads, bridges, buildings)
- Sanitation (waste, drainage, cleanliness)
- Safety (street lights, security concerns)
- Environment (trees, pollution, parks)
- Other (anything else)

ISSUE LIFECYCLE:
1. Reported - Citizen submits issue with description, photo, location
2. Pending - Issue awaits assignment to NGO
3. In Progress - NGO is actively working on it
4. Resolved - Issue has been fixed

USER ROLES:
- Citizens/Users: Report issues, vote on others' issues, track progress
- NGOs: Get assigned issues, update status, resolve problems
- Admin: Moderate, assign issues to NGOs, manage platform

RESPONSE GUIDELINES:
- Be helpful, professional, and concise
- Use simple language
- Keep responses SHORT (2-3 sentences for simple questions)
- For unrelated questions, politely redirect to CivicEye topics`;

// ===========================
// FETCH WITH RETRY
// ===========================
async function fetchWithRetry(url, options, retries = 2, backoff = 1000) {
    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        if (retries > 0 && !error.message?.includes('quota')) {
            await new Promise(resolve => setTimeout(resolve, backoff));
            return fetchWithRetry(url, options, retries - 1, backoff * 2);
        }
        throw error;
    }
}

// ===========================
// FALLBACK RESPONSES (When API quota exceeded)
// ===========================
const FALLBACK_RESPONSES = {
    report: `**How to Report an Issue:**
1. Click "Report Issue" in the navigation
2. Enter a clear, descriptive title
3. Select the appropriate category
4. Describe the problem in detail
5. Add location by clicking the map
6. Upload a photo if available
7. Click "Submit Report"

Tip: Clear descriptions with photos get resolved faster!`,

    category: `**Available Issue Categories:**
• **Infrastructure** - Roads, bridges, buildings
• **Sanitation** - Waste, drainage, cleanliness
• **Safety** - Street lights, security concerns
• **Environment** - Trees, pollution, parks
• **Other** - Anything else

Choose the category that best matches your issue!`,

    resolution: `**Issue Resolution Process:**
1. **Reported** → You submit the issue
2. **Pending** → Admin assigns to NGO
3. **In Progress** → NGO working on it
4. **Resolved** → Problem fixed!

More community votes = higher priority!`,

    ngo: `**For NGO Users:**
• Access your NGO Dashboard
• View assigned issues
• Update status: Pending → In Progress → Resolved
• Track your resolution statistics

Focus on high-vote issues for maximum impact!`,

    default: `I'm your **Civic Assistant** for CivicEye!

I can help with:
• Reporting civic issues
• Understanding categories
• Issue resolution process
• NGO dashboard guidance

What would you like to know?`
};

function getFallbackResponse(message) {
    const lower = message.toLowerCase();

    if (lower.includes('report') || lower.includes('submit') || lower.includes('create')) {
        return FALLBACK_RESPONSES.report;
    }
    if (lower.includes('category') || lower.includes('categories') || lower.includes('type')) {
        return FALLBACK_RESPONSES.category;
    }
    if (lower.includes('resolution') || lower.includes('resolve') || lower.includes('status') || lower.includes('time') || lower.includes('long')) {
        return FALLBACK_RESPONSES.resolution;
    }
    if (lower.includes('ngo') || lower.includes('dashboard') || lower.includes('organization')) {
        return FALLBACK_RESPONSES.ngo;
    }

    return FALLBACK_RESPONSES.default;
}

// ===========================
// CHATBOT UI CONTROLLER
// ===========================
class CivicChatbot {
    constructor() {
        this.isOpen = false;
        this.elements = {};
        this.init();
    }

    init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }

    setup() {
        this.elements = {
            widget: document.getElementById('chatbot-widget'),
            toggle: document.getElementById('chatbot-toggle'),
            container: document.getElementById('chatbot-container'),
            close: document.getElementById('chatbot-close'),
            messages: document.getElementById('chatbot-messages'),
            input: document.getElementById('chatbot-input'),
            send: document.getElementById('chatbot-send'),
            icon: document.getElementById('chatbot-icon')
        };

        if (!this.elements.widget) {
            console.warn("⚠️ Chatbot widget not found");
            return;
        }

        this.bindEvents();
        this.renderMessages();
        console.log("🤖 Civic Chatbot ready!");
    }

    bindEvents() {
        this.elements.toggle?.addEventListener('click', () => this.toggle());
        this.elements.close?.addEventListener('click', () => this.close());

        this.elements.send?.addEventListener('click', () => this.handleSend());
        this.elements.input?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleSend();
            }
        });

        document.querySelectorAll('.quick-action-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const message = btn.dataset.message;
                if (message) {
                    this.elements.input.value = message;
                    this.handleSend();
                }
            });
        });
    }

    toggle() {
        this.isOpen ? this.close() : this.open();
    }

    open() {
        this.isOpen = true;
        this.elements.container?.classList.add('open');
        this.elements.icon.className = 'fas fa-times';
        this.elements.input?.focus();
    }

    close() {
        this.isOpen = false;
        this.elements.container?.classList.remove('open');
        this.elements.icon.className = 'fas fa-comments';
    }

    renderMessages() {
        if (!this.elements.messages) return;

        this.elements.messages.innerHTML = '';

        chatMessages.forEach(msg => {
            const isUser = msg.role === 'user';
            const messageDiv = document.createElement('div');
            messageDiv.className = `chat-message ${isUser ? 'user' : 'bot'}-message`;

            messageDiv.innerHTML = `
                <div class="message-avatar">
                    <i class="fas fa-${isUser ? 'user' : 'robot'}"></i>
                </div>
                <div class="message-content">
                    <p>${msg.content.replace(/\n/g, '<br>')}</p>
                </div>
            `;

            this.elements.messages.appendChild(messageDiv);
        });

        this.scrollToBottom();
    }

    async handleSend() {
        const text = this.elements.input?.value?.trim();
        if (!text || isLoading) return;

        // Add user message
        chatMessages.push({ role: 'user', content: text });
        this.elements.input.value = '';
        this.setLoading(true);
        this.renderMessages();

        try {
            const payload = {
                contents: chatMessages.map(msg => ({
                    role: msg.role === 'assistant' ? 'model' : 'user',
                    parts: [{ text: msg.content }]
                })),
                systemInstruction: {
                    parts: [{ text: SYSTEM_PROMPT }]
                }
            };

            console.log("📤 Sending to Gemini...");

            const result = await fetchWithRetry(GEMINI_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            console.log("📥 Response received:", result);

            const aiResponse = result.candidates?.[0]?.content?.parts?.[0]?.text || "I couldn't generate a response.";
            chatMessages.push({ role: 'assistant', content: aiResponse });

        } catch (error) {
            console.error("❌ Chat Error:", error);

            // Use fallback responses when quota exceeded or API fails
            if (error.message?.includes('quota') || error.message?.includes('429') || error.message?.includes('rate')) {
                console.log("📖 Using fallback response");
                const fallbackResponse = getFallbackResponse(text);
                chatMessages.push({ role: 'assistant', content: fallbackResponse });
            } else {
                chatMessages.push({
                    role: 'assistant',
                    content: getFallbackResponse(text)
                });
            }
        } finally {
            this.setLoading(false);
            this.renderMessages();
        }
    }

    setLoading(val) {
        isLoading = val;
        if (this.elements.send) {
            this.elements.send.disabled = val;
        }

        if (val) {
            // Add loading indicator
            const loadingDiv = document.createElement('div');
            loadingDiv.className = 'chat-message bot-message loading-message';
            loadingDiv.innerHTML = `
                <div class="message-avatar">
                    <i class="fas fa-robot"></i>
                </div>
                <div class="message-content">
                    <div class="typing-indicator">
                        <span></span><span></span><span></span>
                    </div>
                </div>
            `;
            this.elements.messages?.appendChild(loadingDiv);
            this.scrollToBottom();
        } else {
            // Remove loading indicator
            this.elements.messages?.querySelector('.loading-message')?.remove();
        }
    }

    scrollToBottom() {
        if (this.elements.messages) {
            this.elements.messages.scrollTop = this.elements.messages.scrollHeight;
        }
    }

    clearChat() {
        chatMessages = [
            { role: 'assistant', content: 'Hello! I am your Civic Assistant. How can I help you with CivicEye today?' }
        ];
        this.renderMessages();
    }
}

// Initialize
const civicChatbot = new CivicChatbot();
window.CivicChatbot = CivicChatbot;
