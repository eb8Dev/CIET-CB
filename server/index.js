import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import fssync from 'fs';
import path from 'path';
import xlsx from 'xlsx';
import natural from 'natural';
import chokidar from 'chokidar';
import { Server } from 'socket.io';
import { createServer } from 'http';
import fetch from 'node-fetch';
import { logger } from './logger.js';

const app = express();
const server = createServer(app);
const io = new Server(server, { cors: { origin: '*', methods: ['GET', 'POST'] } });

app.use(cors());
app.use(express.json());

const DATA_DIR = path.resolve('./data');
const CACHE_PATH = path.resolve('./cache/vectorstore.json');

class SimpleVectorStore {
  constructor() {
    logger.debug('Initializing SimpleVectorStore...');
    this.documents = [];
    this.tfidf = new natural.TfIdf();
  }

  async addDocument(text, metadata = {}) {
    const embedding = await getEmbedding(text); // use your Ollama API
    const doc = {
      id: this.documents.length,
      text,
      metadata,
      embedding,
      timestamp: new Date()
    };
    this.documents.push(doc);
    return doc.id;
  }

  async search(query, typeFilter = null) {
    const queryEmbedding = await getEmbedding(query);
    const results = [];

    for (const doc of this.documents) {
      if (!doc.embedding) continue;
      if (!typeFilter || doc.metadata.type === typeFilter) {
        const score = cosineSimilarity(queryEmbedding, doc.embedding);
        if (score > 0.75) { // tweak threshold if needed
          results.push({ document: doc, score });
        }
      }
    }

    return results.sort((a, b) => b.score - a.score);
    // logger.debug(`Search results count before limiting: ${results.length} `);
    // return results.sort((a, b) => b.score - a.score).slice(0);
  }



  clear() {
    logger.info('Clearing vector store...');
    this.documents = [];
    this.tfidf = new natural.TfIdf();
  }

  serialize() {
    return JSON.stringify(this.documents, null, 2);
  }

  deserialize(json) {
    this.clear();
    const docs = JSON.parse(json);
    docs.forEach(doc => {
      this.documents.push(doc); // includes embedding already
    });
  }

}

const vectorStore = new SimpleVectorStore();

const CATEGORY_QUERIES = {
  faculty: [
    'list of faculty',
    'HODs of the departments',
    'head of department',
    'department heads',
    'how many professors',
    'faculty details',
    'professors in CSE',
    'lecturers in ECE',
    'faculty members by department'
  ],
  hostel: [
    'hostel information',
    'accommodation for boys',
    'girls hostel capacity',
    'annual hostel fee',
    'dorm availability',
    'hostel facilities',
    'contact hostel incharge'
  ],
  fees: [
    'fee structure',
    'management quota fee',
    'convener quota fee',
    'total course fees',
    'admission fee',
    'specialization wise fees',
    'engineering course fees'
  ],
  placement: [
    'placement statistics',
    'students placed',
    'company wise placements',
    'highest package offered',
    'which companies visited',
    'placements in CSE',
    'placement year wise'
  ],
  transport: [
    'bus timings',
    'transport routes',
    'bus schedule',
    'college bus stop',
    'bus driver details',
    'route stop names'
  ],
  'lab infrastructure': [
    'labs available',
    'infrastructure for courses',
    'list of labs',
    'equipment in lab',
    'computer labs',
    'no of systems',
    'department lab details'
  ],
  'intake capacity': [
    'number of seats',
    'course intake',
    'department wise intake',
    'available seats',
    'intake for each course',
    'seat availability'
  ]
};


const CATEGORY_ALIAS_EMBEDDINGS_PATH = path.resolve('./cache/category_alias_embeddings.json');
let aliasEmbeddings = []; // Array of { category, phrase, embedding }

async function buildAliasEmbeddings() {
  aliasEmbeddings = [];

  for (const [category, phrases] of Object.entries(CATEGORY_QUERIES)) {
    for (const phrase of phrases) {
      const embedding = await getEmbedding(phrase);
      aliasEmbeddings.push({ category, phrase, embedding });
    }
  }

  await fs.mkdir(path.dirname(CATEGORY_ALIAS_EMBEDDINGS_PATH), { recursive: true });
  await fs.writeFile(
    CATEGORY_ALIAS_EMBEDDINGS_PATH,
    JSON.stringify(aliasEmbeddings, null, 2)
  );

  logger.info('✅ Alias-based category embeddings cached');
}

async function loadAliasEmbeddings() {
  try {
    const raw = await fs.readFile(CATEGORY_ALIAS_EMBEDDINGS_PATH, 'utf-8');
    aliasEmbeddings = JSON.parse(raw);
    logger.info('📦 Loaded alias-based category embeddings from cache');
  } catch (e) {
    logger.warn('⚠️ Alias embedding cache not found. Rebuilding...');
    await buildAliasEmbeddings();
  }
}



async function processAllExcelFiles() {
  logger.info('🔁 Rebuilding vector store...');
  vectorStore.clear();

  const files = await fs.readdir(DATA_DIR);
  const excelFiles = files.filter(file => file.endsWith('.xlsx') || file.endsWith('.xls'));

  let totalDocsAdded = 0;

  for (const file of excelFiles) {
    const filePath = path.join(DATA_DIR, file);
    const workbook = xlsx.readFile(filePath);

    for (const sheetName of workbook.SheetNames) {
      const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });

      for (const row of rows) {
        const lower = file.toLowerCase();
        let text = '', meta = { file, sheet: sheetName, original: row };

        if (lower.includes('hostel')) {
          text = `🏠 Hostel: ${row['Hostel Name']}, Type: ${row['Room Type']}, CapacityPerRoom: ${row['Capacity per Room']}, Total Rooms: ${row['Total Rooms']}, Annual Fee: ₹${row['Annual Fee (₹)']}, Wi - Fi: ${row['Wi-Fi']}, Laundry: ${row['Laundry']}, AC: ${row['AC']}, Common Bathroom: ${row['Common Bathroom']}, Incharge: ${row['Hostel Incharge']}, Contact: ${row['Contact']}, Year: ${row['Academic Year']} `;
          meta.type = 'hostel';
        } else if (lower.includes('faculty')) {
          const name = row['Faculty Name'] || row['ECE Faculty Name'] || '';
          const dept = row['Department'] || '';
          const desg = row['Designation'] || row['ECE Designation'] || '';
          const qual = row['Qualification'] || '';
          const year = row['Year'] || '';
          text = `👨‍🏫 ${name}, Dept: ${dept}, Designation: ${desg}, Qualification: ${qual}${year ? ', Year: ' + year : ''} `;
          meta.type = 'faculty';
        } else if (lower.includes('placement')) {
          text = `🎓 ${row['Name']} from ${row['DEPARTMENT']} placed in ${row['COMPANY']} (${row['YEAR']})`;
          meta.type = 'placement';
        } else if (lower.includes('fee')) {
          text = `💰 ${row['Specialization']} Fees - Convener: ₹${row['Convener Quota (₹)']}, Management: ₹${row['Management Quota (₹)']} `;
          meta.type = 'fees';
        } else if (lower.includes('intake')) {
          text = `🎓 Intake - Dept: ${row['Department']}, Capacity: ${row['Intake Capacity/No.of Seats']}, Year: ${row['Academic Year']} `;
          meta.type = 'intake';
        } else if (lower.includes('lab')) {
          text = `🧪 Lab: ${row['LAB NAME']} for ${row['SUBJECT/COURSE']} in ${row['DEPARTMENT']}, Systems: ${row['NO.OF SYSTEMS']}, Year: ${row['ACADEMIC YEAR']} `;
          meta.type = 'lab';
        } else if (lower.includes('transport')) {
          text = `🚌 Bus ${row['Bus No']} driven by ${row['Driver Name']} to ${row['Route Stop']} at ${row['Time']} `;
          meta.type = 'transport';
        } else {
          // fallback: store as key-value string
          text = Object.entries(row).map(([k, v]) => `${k}: ${v} `).join(', ');
          meta.type = 'general';
        }

        vectorStore.addDocument(text, meta);
        totalDocsAdded++;
      }
    }
  }
  await fs.mkdir(path.dirname(CACHE_PATH), { recursive: true });
  await fs.writeFile(CACHE_PATH, vectorStore.serialize());
  logger.info(`✅ Vector store rebuilt and cached.Total documents added: ${totalDocsAdded} `);
}

async function loadCacheOrBuild() {
  try {
    const cached = await fs.readFile(CACHE_PATH, 'utf-8');
    vectorStore.deserialize(cached);
    logger.info('📦 Loaded vector store from cache.');
  } catch (error) {
    logger.warn(`Cache load failed: ${error.message} `);
    await processAllExcelFiles();
  }
}

function watchDataFolder() {
  chokidar.watch(DATA_DIR, { ignoreInitial: true }).on('all', async () => {
    logger.info('🔁 File change detected. Rebuilding...');
    await processAllExcelFiles();
  });
}

async function getEmbedding(text) {
  const res = await fetch('http://localhost:11434/api/embeddings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'nomic-embed-text',
      prompt: text
    })
  });

  const data = await res.json();
  return data.embedding;
}

function cosineSimilarity(vecA, vecB) {
  const dot = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const normA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const normB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  return dot / (normA * normB);
}

async function detectCategory(query) {
  const queryEmbedding = await getEmbedding(query);

  let best = { category: null, phrase: null, score: -Infinity };

  for (const { category, phrase, embedding } of aliasEmbeddings) {
    const score = cosineSimilarity(queryEmbedding, embedding);
    if (score > best.score) {
      best = { category, phrase, score };
    }
  }

  logger.info(`🧠 Detected category: ${best.category} (via phrase "${best.phrase}", Score: ${best.score.toFixed(4)})`);

  // Optional threshold
  return best.score >= 0.75 ? best.category : null;
}


async function generateRAGResponse(query, context) {
  logger.debug('Generating RAG response for query:', query, context);

  const contextText = context.map(c =>
    `📄 ${c.document.text} [from ${c.document.metadata.file}]`
  ).join('\n---\n');

  const prompt = `You are an enquiry assistant for Chalapathi Institute of Engineering and Technology.

🎯 GOAL: Answer ONLY using the provided context.DO NOT calculate or explain anything.

🧠 CRITICAL INSTRUCTIONS:
- Do NOT show math, do NOT explain room counts or how totals were calculated.
- DO NOT write things like “8 students × 15 rooms” or “so, the total is...”
- Just give the final number confidently as if it’s already known.
- Sound like a helpful, informed human, not like a calculator or assistant trying to figure things out.
- If any information is missing, respond with:  
  _"I’m not sure about this info. Please contact the office for accurate details."_

📚 CONTEXT:
${contextText}

QUESTION: ${query}

ANSWER: `;

  try {
    logger.debug(`prompt: ${prompt} `);
    const res = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3.2',
        prompt,
        stream: false,
        options: { temperature: 0.3 }
      })
    });

    const data = await res.json();
    logger.debug(`Ollama response: ${JSON.stringify(data)} `);

    if (data && data.response) {
      return data.response.trim();
    } else {
      logger.error('Ollama response missing expected "response" field:', data);
      return "📌 Please contact the administration office for this information.";
    }

  } catch (e) {
    logger.error('Ollama generation failed:', e);
    return "📌 Please contact the administration office for this information.";
  }
};

app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Message is required' });

    logger.info(`Chat query: "${message}"`);
    const category = await detectCategory(message);
    const context = vectorStore.search(message, category);
    logger.debug("context from /api/chat is: ", context);
    const answer = await generateRAGResponse(message, context);

    res.json({ response: answer, meta: context.map(c => c.document.metadata), category });
  } catch (error) {
    logger.error('Chat error:', error);
    res.status(500).json({ error: 'Chat failed' });
  }
});


app.get('/api/knowledge-stats', (req, res) => {
  logger.info('Serving knowledge base stats');
  const stats = { totalDocuments: vectorStore.documents.length, categories: {}, types: {} };
  vectorStore.documents.forEach(doc => {
    const category = doc.metadata.type || 'uncategorized';
    const type = doc.metadata.type || 'unknown';
    stats.categories[category] = (stats.categories[category] || 0) + 1;
    stats.types[type] = (stats.types[type] || 0) + 1;
  });

  // Ensure 'excel' key exists to avoid frontend errors
  if (!stats.types.excel) {
    stats.types.excel = 0;
  }

  res.json(stats);
});

io.on('connection', socket => {
  logger.info(`Socket connected: ${socket.id} `);

  socket.on('chat-message', async ({ message }) => {
    try {
      logger.debug(`Socket received message: ${message} `);

      const category = await detectCategory(message); // ✅ now using alias detection
      const context = vectorStore.search(message, category);
      logger.debug("context from /chat-message: ", context);
      const answer = await generateRAGResponse(message, context);

      socket.emit('bot-typing', true);
      setTimeout(() => {
        socket.emit('bot-typing', false);
        socket.emit('bot-response', {
          response: answer,
          meta: context.map(c => c.document.metadata),
          category
        });
      }, 1200);
    } catch (error) {
      logger.error('Socket error:', error);
      socket.emit('bot-response', { response: '📌 An error occurred. Please try again.' });
    }
  });


  socket.on('disconnect', () => {
    logger.info(`Socket disconnected: ${socket.id} `);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, async () => {
  await loadCacheOrBuild();
  await loadAliasEmbeddings(); // loads or builds category alias embeddings

  watchDataFolder();
  logger.info(`🚀 Server ready at http://localhost:${PORT}`);
});
