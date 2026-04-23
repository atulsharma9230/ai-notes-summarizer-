'use strict';

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const { InferenceClient } = require('@huggingface/inference');

// ✅ CHECK API KEY
if (!process.env.HUGGINGFACE_API_KEY) {
  console.error('❌ API key missing in .env');
  process.exit(1);
}

const app = express();
const PORT = 3000;

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10 MB
});

const hf = new InferenceClient(process.env.HUGGINGFACE_API_KEY);

app.use(cors());
app.use(express.static(__dirname));
app.use(express.json({ limit: '10mb' }));
app.use((req, res, next) => {
  console.log(`➡️ ${req.method} ${req.url}`);
  next();
});

// ✅ HEALTH CHECK
const path = require('path');

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ✅ CHAT ROUTE
app.post('/chat', async (req, res) => {
  console.log('📩 /chat route hit');
  console.log('📦 Request body:', JSON.stringify(req.body, null, 2));

  const { messages, system } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    console.log('❌ Invalid messages array');
    return res.status(400).json({ error: 'messages array is required.' });
  }

  try {
    console.log('🤖 Sending request to Hugging Face...');

    const response = await hf.chatCompletion({
      model: 'meta-llama/Llama-3-8b-Instruct', // ✅ better model
      messages: [
        {
          role: 'system',
          content: system || 'You are a helpful AI assistant.'
        },
        ...messages
      ],
      max_tokens: 500,
      temperature: 0.7
    });

    console.log('✅ Raw HF response:', JSON.stringify(response, null, 2));

    if (!response || !response.choices || !response.choices.length) {
      throw new Error('Invalid response from AI');
    }

    const reply = response.choices[0].message.content;

    res.json({ reply });

  } catch (err) {
    console.error('❌ FULL CHAT ERROR:', err);

    res.status(500).json({
      error: err.message || 'Server error',
      reply: '⚠️ AI temporarily unavailable. Please try again.'
    });
  }
});

// ✅ SUMMARIZE ROUTE
app.post('/summarize', async (req, res) => {
  const { text } = req.body;

  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Text is required' });
  }

  try {
    console.log("📄 Text length:", text.length);

    const response = await hf.chatCompletion({
      model: 'meta-llama/Llama-3-8b-Instruct',
      messages: [
        { role: 'system', content: 'Summarize in 3-5 bullet points' },
        { role: 'user', content: text.slice(0, 3000) }
      ],
      max_tokens: 300
    });

    console.log("🤖 HF RAW RESPONSE:", response);

    if (!response || !response.choices || !response.choices.length) {
      throw new Error("Invalid AI response");
    }

    const summary = response.choices[0].message.content;

    res.json({ summary });

  } catch (err) {
    console.error("❌ Summary Error:", err);

    res.status(500).json({
      error: "Summary failed",
      summary: "⚠️ Summary not available right now."
    });
  }
});

// ✅ FILE UPLOAD ROUTE
app.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    console.log('📂 File received:', {
      name: req.file.originalname,
      type: req.file.mimetype,
      size: req.file.size
    });

    let text = '';

    if (req.file.mimetype === 'text/plain') {
      text = req.file.buffer.toString('utf-8');
    } else if (req.file.mimetype === 'application/pdf') {
      const data = await pdfParse(req.file.buffer);
      text = data.text;
    } else {
      return res.status(400).json({
        error: 'Only TXT and PDF files are supported right now.'
      });
    }

    if (!text || !text.trim()) {
      return res.status(400).json({
        error: 'No readable text found in the uploaded file.'
      });
    }

    console.log('📄 Extracted text preview:', text.slice(0, 300));

    res.json({ text });
  } catch (err) {
    console.error('❌ Upload Error:', err);
    res.status(500).json({
      error: 'Failed to process file'
    });
  }
});

// ✅ GLOBAL ERROR HANDLER
app.use((err, req, res, next) => {
  console.error('🔥 Global Error:', err);
  res.status(500).json({ error: 'Something went wrong' });
});

app.get('/test-log', (req, res) => {
  console.log('🧪 test-log hit');
  res.json({ ok: true });
});

// ✅ SERVER START
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});