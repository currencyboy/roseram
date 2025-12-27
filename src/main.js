const $ = (s, r = document) => r.querySelector(s);
const messagesEl = $('#chat-messages');
const formEl = $('#chat-form');
const inputEl = $('#chat-input');

function appendMessage(text, who) {
  const wrapper = document.createElement('div');
  wrapper.className = `message is-${who}`;
  const inner = document.createElement('div');
  inner.className = 'message-inner';
  inner.textContent = text;
  wrapper.appendChild(inner);
  messagesEl.appendChild(wrapper);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

async function send(message) {
  appendMessage(message, 'user');
  inputEl.value = '';
  inputEl.focus();
  markActive();
  try {
    const resp = await fetch('/api/chat', {
      method: 'POST',
      headers,
      body)
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) throw new Error(data && data.error ? data.error : 'Request failed');
    const reply = (data && typeof data.reply === 'string' && data.reply.trim()) ? data.reply.trim() {
    appendMessage('Error: ' + (e.message || 'Something went wrong'), 'bot');
  }
}

// Idle glare logic
let lastActive = Date.now();
const idleThreshold = 10000; // 10s without interaction means idle
const glareIntervalMs = 12000; // glare periodically when idle

function markActive() { lastActive = Date.now(); }
function triggerGlare() {
  if (!messagesEl) return;
  if (document.activeElement === inputEl) return; // considered in use
  messagesEl.classList.add('glare-active');
  setTimeout(() => messagesEl.classList.remove('glare-active'), 20);
}

['pointerdown','keydown','touchstart','focusin','input','scroll'].forEach(ev => {
  window.addEventListener(ev, markActive, { passive: true });
});

setInterval(() => {
  const idle = Date.now() - lastActive > idleThreshold;
  if (idle) triggerGlare();
}, glareIntervalMs);

if (formEl && inputEl && messagesEl) {
  formEl.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = inputEl.value.trim();
    if (!v) return;
    send(v);
  });
}
