
'use strict';
console.log("✅ script.js loaded");
// ─── CONFIG ───────────────────────────────────
// BUG FIX #4 & #5: all fetch calls were hardcoded to localhost.
// Change this one constant if you deploy the server elsewhere.
const BASE_URL = 'http://127.0.0.1:3000';

// ─── STATE ───────────────────────────────────
let currentSummary = '';
let aiProcessing   = false;
let progressValue  = 30;
let currentCategory = 'General';
let musicPlaying   = false;
let isDark         = true;

// ─── CURSOR ───────────────────────────────────
(function initCursor() {
  const ring = document.getElementById('cursor-ring');
  const dot  = document.getElementById('cursor-dot');
  if (!ring || !dot) return;

  let mx = -200, my = -200, rx = -200, ry = -200;

  document.addEventListener('mousemove', e => {
    mx = e.clientX; my = e.clientY;
    dot.style.left  = mx + 'px';
    dot.style.top   = my + 'px';
  });

  (function lerp() {
    rx += (mx - rx) * 0.14;
    ry += (my - ry) * 0.14;
    ring.style.left = rx + 'px';
    ring.style.top  = ry + 'px';
    requestAnimationFrame(lerp);
  })();

  document.addEventListener('mouseleave', () => {
    ring.style.opacity = '0'; dot.style.opacity = '0';
  });
  document.addEventListener('mouseenter', () => {
    ring.style.opacity = '1'; dot.style.opacity = '1';
  });

  document.addEventListener('mouseover', e => {
    if (e.target.closest('button, a, textarea, input, [onclick], .nav-btn, .subject-btn')) {
      document.body.classList.add('cursor-hover');
    }
  });
  document.addEventListener('mouseout', e => {
    if (e.target.closest('button, a, textarea, input, [onclick], .nav-btn, .subject-btn')) {
      document.body.classList.remove('cursor-hover');
    }
  });

  document.addEventListener('click', e => createParticleBurst(e.clientX, e.clientY));
})();

function createParticleBurst(x, y) {
  for (let i = 0; i < 8; i++) {
    const p = document.createElement('div');
    const angle = (i / 8) * Math.PI * 2;
    const dist  = 25 + Math.random() * 25;
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist;

    p.style.cssText = `
      position:fixed; width:5px; height:5px; border-radius:50%;
      background: var(--accent); pointer-events:none; z-index:99998;
      left:${x - 2.5}px; top:${y - 2.5}px;
      box-shadow: 0 0 8px var(--accent);
      animation: none;
      transition: transform 0.5s ease, opacity 0.5s ease;
    `;
    document.body.appendChild(p);
    requestAnimationFrame(() => {
      p.style.transform = `translate(${dx}px, ${dy}px) scale(0)`;
      p.style.opacity   = '0';
    });
    setTimeout(() => p.remove(), 500);
  }
}

// ─── ANIMATED BG CANVAS ──────────────────────
(function initCanvas() {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, dots = [];

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function initDots() {
    dots = Array.from({length: 60}, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 1.5 + 0.5
    }));
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    const isDarkMode = !document.body.classList.contains('light');
    const c = isDarkMode ? '0,210,255' : '0,80,200';

    dots.forEach(d => {
      d.x += d.vx; d.y += d.vy;
      if (d.x < 0) d.x = W; if (d.x > W) d.x = 0;
      if (d.y < 0) d.y = H; if (d.y > H) d.y = 0;

      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${c}, 0.5)`;
      ctx.fill();
    });

    dots.forEach((a, i) => {
      dots.slice(i + 1).forEach(b => {
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (dist < 130) {
          ctx.beginPath();
          ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(${c}, ${(1 - dist / 130) * 0.15})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      });
    });

    requestAnimationFrame(draw);
  }

  window.addEventListener('resize', () => { resize(); initDots(); });
  resize(); initDots(); draw();
})();

// ─── NAVIGATION ──────────────────────────────
function showSection(id) {
  document.querySelectorAll('.section').forEach(s => {
    s.classList.remove('active');
    s.classList.add('hidden');
  });
  const el = document.getElementById(id);
  if (el) { el.classList.remove('hidden'); el.classList.add('active'); }

  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById(id + 'Btn');
  if (btn) btn.classList.add('active');

  if (id === 'notes')    loadRecentNotes();
  if (id === 'progress') updateQuote();

  if (window.innerWidth <= 1024) closeSidebar();
}

function toggleSidebar() {
  const sidebar  = document.getElementById('sidebar');
  const overlay  = document.getElementById('sidebarOverlay');
  const isActive = sidebar.classList.contains('active');
  sidebar.classList.toggle('active', !isActive);
  overlay.classList.toggle('active', !isActive);
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('active');
  document.getElementById('sidebarOverlay').classList.remove('active');
}

// ─── THEME ────────────────────────────────────
function toggleTheme() {
  isDark = !isDark;
  document.body.classList.toggle('light', !isDark);
  const btn = document.getElementById('themeBtn');
  if (btn) {
    btn.querySelector('svg').innerHTML = isDark
      ? '<path d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>'
      : '<path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/>';
  }
}

// ─── CHAT ─────────────────────────────────────
function handleEnter(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
}

function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 180) + 'px';
}

async function sendMessage() {
    console.log("🔥 sendMessage triggered");

  if (aiProcessing) return;

  const input = document.getElementById('inputText');
  const text = input.value.trim();

  if (!text) return;

  aiProcessing = true;

  const chatBox = document.getElementById('chatBox');
  const welcome = chatBox.querySelector('.chat-welcome');
  if (welcome) welcome.remove();

  appendMessage(text, 'user');
  input.value = '';
  input.style.height = 'auto';

  const typingId = 'typing-' + Date.now();
  appendTyping(typingId);

  try {
    const response = await callClaude(
      [{ role: 'user', content: text }],
      'You are NEXUS, a futuristic AI study assistant. Be concise, helpful, and encouraging. Use clear explanations. Your tone is intelligent but friendly.'
    );
    removeTyping(typingId);
    appendMessage(response, 'bot');
  } catch (err) {
    removeTyping(typingId);
    appendMessage('⚠️ Server error. Check backend or API key.', 'bot');
    console.error('sendMessage error:', err);
  } finally {
    aiProcessing = false;
  }
}

function appendMessage(text, role) {
  const chatBox = document.getElementById('chatBox');
  const div = document.createElement('div');
  div.className = `message ${role}`;
  div.innerHTML = `
    <div class="msg-avatar">${role === 'user' ? 'U' : '◈'}</div>
    <div class="msg-bubble">${escapeHtml(text).replace(/\n/g, '<br>')}</div>
  `;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function appendTyping(id) {
  const chatBox = document.getElementById('chatBox');
  const div = document.createElement('div');
  div.className = 'message bot';
  div.id = id;
  div.innerHTML = `
    <div class="msg-avatar">◈</div>
    <div class="msg-bubble typing-bubble"><span></span><span></span><span></span></div>
  `;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function removeTyping(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

function clearChat() {
  const chatBox = document.getElementById('chatBox');
  chatBox.innerHTML = `
    <div class="chat-welcome">
      <div class="welcome-icon">◈</div>
      <h3>NEXUS Intelligence Ready</h3>
      <p>Ask me anything. I can explain concepts, quiz you, summarize topics, or help you study smarter.</p>
    </div>
  `;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ─── API HELPERS ──────────────────────────────
// BUG FIX #4: was hardcoded 'http://localhost:3000/chat' — now uses BASE_URL
async function callClaude(messages, systemPrompt = '') {
    console.log("📤 Sending /chat request", { messages, systemPrompt });
  const response = await fetch(`${BASE_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: messages,        // ✅ FIXED
      system: systemPrompt       // ✅ FIXED
    })
  });

    console.log("📥 /chat status:", response.status);

  if (!response.ok) {
  const err = await response.json().catch(() => ({ error: 'Server error' }));
  console.error('❌ Backend returned error:', err);
  throw new Error(err.error || 'Server error');
}

  const data = await response.json();
    console.log("✅ /chat response data:", data);

  return data.reply; // ✅ IMPORTANT
}

// BUG FIX #5: was hardcoded 'http://localhost:3000/summarize' — now uses BASE_URL
async function aiSummarizeText(text) {
  const response = await fetch(`${BASE_URL}/summarize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Summary error' }));
    throw new Error(err.error || 'Summary error');
  }

  const data = await response.json();

if (!data.summary) {
  throw new Error('No summary received from server');
}
return data.summary;
}

// ─── NOTES / FILE UPLOAD ──────────────────────
function handleDragOver(e) {
  e.preventDefault();
  document.getElementById('aiUploadZone').classList.add('dragover');
}

function handleDragLeave(e) {
  e.preventDefault();
  document.getElementById('aiUploadZone').classList.remove('dragover');
}

async function handleAiDrop(e) {
  e.preventDefault();
  document.getElementById('aiUploadZone').classList.remove('dragover');
  const file = e.dataTransfer.files[0];
  if (file) await processAiUpload(file);
}

async function handleAiFiles(e) {
  const file = e.target.files[0];
  if (file) await processAiUpload(file);
}

async function processAiUpload(file) {
  if (aiProcessing) return;
  aiProcessing = true;

  const zone = document.getElementById('aiUploadZone');
  zone.classList.add('ai-processing');
  zone.innerHTML = `
    <div class="processing-state">
      <div class="spinner"></div>
      <h3>Processing...</h3>
      <p>${escapeHtml(file.name)}</p>
    </div>
  `;

  try {
    // STEP 1: send file to backend
const formData = new FormData();
formData.append('file', file);

const uploadRes = await fetch(`${BASE_URL}/upload`, {
  method: 'POST',
  body: formData
});

const uploadData = await uploadRes.json();

if (!uploadRes.ok) {
  throw new Error(uploadData.error || 'Upload failed');
}

// STEP 2: get extracted text
const text = uploadData.text;

// STEP 3: send to AI
const summary = await aiSummarizeText(text);
    displayAiSummary(file.name, summary);
  } catch (err) {
    showToast('Processing failed: ' + err.message, 'error');
    console.error('Upload error:', err);
  } finally {
    aiProcessing = false;
    resetUploadZone();
  }
}


function displayAiSummary(filename, summary) {
  currentSummary = summary;

  const container = document.getElementById('aiSummaryContainer');
  const content   = document.getElementById('aiSummary');

  container.classList.remove('hidden');
  content.innerHTML =
    `<strong style="color:var(--accent3)">Source:</strong> ${escapeHtml(filename)}<br><br>` +
    escapeHtml(summary).replace(/\n/g, '<br>');

  container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  loadRecentNotes();
}

function resetUploadZone() {
  const zone = document.getElementById('aiUploadZone');
  zone.classList.remove('ai-processing', 'dragover');
  zone.innerHTML = `
    <div class="upload-icon">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
        <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
      </svg>
    </div>
    <h3>Drop your file here</h3>
   <p>Supports PDF · TXT</p>
<input type="file" id="aiFileInput" accept=".pdf,.txt" hidden onchange="handleAiFiles(event)">
    <button class="upload-trigger" onclick="document.getElementById('aiFileInput').click()">Choose File</button>
  `;
}

function copySummary() {
  if (!currentSummary) return;
  navigator.clipboard.writeText(currentSummary)
    .then(() => showToast('Summary copied!', 'success'))
    .catch(() => showToast('Copy failed', 'error'));
}

function saveSummary() {
  if (!currentSummary) return;
  const notes = JSON.parse(localStorage.getItem('nexus_notes') || '[]');
  notes.unshift({
    text: currentSummary,
    title: 'AI Summary',
    created: new Date().toLocaleString(),
    source: 'ai-upload'
  });
  localStorage.setItem('nexus_notes', JSON.stringify(notes.slice(0, 50)));
  showToast('Saved to notes!', 'success');
  loadRecentNotes();
}

function loadRecentNotes() {
  const notes     = JSON.parse(localStorage.getItem('nexus_notes') || '[]');
  const container = document.getElementById('recentNotes');
  if (!container) return;

  if (notes.length === 0) {
    container.innerHTML = '<p style="opacity:0.5;text-align:center;font-family:var(--font-mono);font-size:12px;padding:20px">No notes saved yet</p>';
    return;
  }

  container.innerHTML = notes.slice(0, 5).map((note, i) => `
    <div class="recent-note">
      <div class="recent-note-content">
        <div class="recent-note-title">${escapeHtml(note.title || 'Note')}</div>
        <div class="recent-note-preview">${escapeHtml((note.text || '').slice(0, 90))}${note.text?.length > 90 ? '...' : ''}</div>
      </div>
      <div class="recent-note-time">${escapeHtml(note.created || '')}</div>
      <button class="recent-note-delete" onclick="deleteNote(${i})">Del</button>
    </div>
  `).join('');
}

function deleteNote(index) {
  const notes = JSON.parse(localStorage.getItem('nexus_notes') || '[]');
  notes.splice(index, 1);
  localStorage.setItem('nexus_notes', JSON.stringify(notes));
  loadRecentNotes();
  showToast('Note deleted', 'success');
}

// ─── PROGRESS ─────────────────────────────────
const quotes = [
  '"The secret of getting ahead is getting started." — Mark Twain',
  '"Learning is not attained by chance; it must be sought with ardor." — Abigail Adams',
  '"Tell me and I forget. Teach me and I remember. Involve me and I learn." — Benjamin Franklin',
  '"The more that you read, the more things you will know." — Dr. Seuss',
  '"An investment in knowledge pays the best interest." — Benjamin Franklin',
  '"The expert in anything was once a beginner."',
  '"Study hard, for the well is deep, and our brains are shallow." — Richard Baxter',
  '"Education is the most powerful weapon which you can use to change the world." — Nelson Mandela'
];

function updateQuote() {
  const el = document.getElementById('quoteBox');
  if (el) el.textContent = quotes[Math.floor(Math.random() * quotes.length)];
}

function increaseProgress() {
  progressValue = Math.min(100, progressValue + 10);
  updateProgressUI();
}

function decreaseProgress() {
  progressValue = Math.max(0, progressValue - 10);
  updateProgressUI();
}

function resetProgress() {
  progressValue = 0;
  updateProgressUI();
}

function setCategory(name) {
  currentCategory = name;
  const catEl = document.getElementById('catName');
  if (catEl) catEl.textContent = name;

  document.querySelectorAll('.subject-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.subj === name);
  });

  updateQuote();
}

function updateProgressUI() {
  const fill = document.getElementById('progressFill');
  const pct  = document.getElementById('progressPct');
  if (fill) fill.style.width = progressValue + '%';
  if (pct)  pct.textContent  = progressValue + '%';
}

// ─── MUSIC ────────────────────────────────────
function toggleMusic() {
  const player     = document.getElementById('musicPlayer');
  const vinyl      = document.getElementById('vinyl');
  const visualizer = document.getElementById('visualizer');
  const btn        = document.getElementById('musicToggle');

  if (!player) return;

  if (musicPlaying) {
    player.pause();
    vinyl.classList.remove('spinning');
    visualizer.classList.remove('active');
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
    musicPlaying = false;
  } else {
    player.play().then(() => {
      vinyl.classList.add('spinning');
      visualizer.classList.add('active');
      btn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';
      musicPlaying = true;
    }).catch(() => {
      showToast('Audio failed to load', 'error');
    });
  }
}

// ─── TOAST ────────────────────────────────────
function showToast(msg, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = msg;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity    = '0';
    toast.style.transform  = 'translateX(20px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ─── INIT ─────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  showSection('chat');
  loadRecentNotes();
  updateQuote();

  const ta = document.getElementById('inputText');
  if (ta) ta.addEventListener('input', () => autoResize(ta));
});
