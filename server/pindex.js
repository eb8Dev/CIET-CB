import express from 'express';
import cors from 'cors';
import multer from 'multer';
import xlsx from 'xlsx';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import natural from 'natural';
import fetch from 'node-fetch';
import { logger } from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  logger.info(`Incoming ${req.method} request to ${req.url}`);
  next();
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    logger.debug(`Saving file to server/uploads: ${file.originalname}`);
    cb(null, 'server/uploads/');
  },
  filename: (req, file, cb) => {
    const filename = Date.now() + '-' + file.originalname;
    logger.debug(`Generated filename: ${filename}`);
    cb(null, filename);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }
});

class SimpleVectorStore {
  constructor() {
    logger.debug('Initializing SimpleVectorStore...');
    this.documents = [];
    this.tfidf = new natural.TfIdf();
  }

  addDocument(text, metadata = {}) {
    const doc = {
      id: this.documents.length,
      text,
      metadata,
      timestamp: new Date()
    };
    this.documents.push(doc);
    this.tfidf.addDocument(text);
    logger.debug(`Document added | ID: ${doc.id} | Metadata: ${JSON.stringify(metadata)}`);
    return doc.id;
  }

  search(query, limit = 5) {
    logger.debug(`Searching vector store for query: "${query}"`);
    const results = [];
    this.tfidf.tfidfs(query, (i, measure) => {
      logger.debug(`TF-IDF Match: Doc ${i} Score ${measure}`);
      if (measure > 0) {
        results.push({
          document: this.documents[i],
          score: measure
        });
      }
    });
    return results.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  clear() {
    logger.info('Clearing vector store...');
    this.documents = [];
    this.tfidf = new natural.TfIdf();
  }
}

const vectorStore = new SimpleVectorStore();

const collegeKnowledge = {
  admissions: "Admissions are open from May to July each year. Requirements include high school diploma, entrance exam scores, and application essays.",
  courses: "We offer undergraduate and graduate programs in Engineering, Sciences, and Medicine.",
  campus: "Our campus spans 200 acres with modern facilities including libraries, labs, dormitories, and recreational centers.",
  faculty: "Our faculty includes PhD holders from top universities worldwide with extensive research and industry experience.",
  fees: "Tuition fees vary by program. Undergraduate programs range from 43,000 to 1,29,000 per year. Financial aid is available.",
  scholarships: "Merit-based and need-based scholarships are available. Apply early for better chances.",
  facilities: "State-of-the-art laboratories, digital library, medical center, and student housing available.",
  events: "Regular seminars, workshops, cultural events, and career fairs are organized throughout the academic year."
};

Object.entries(collegeKnowledge).forEach(([key, value]) => {
  logger.debug(`Adding default knowledge for category: ${key}`);
  vectorStore.addDocument(value, { category: key, type: 'default' });
});

try {
  await fs.mkdir('server/uploads', { recursive: true });
  logger.info('Uploads directory created or already exists.');
} catch (error) {
  logger.warn(`Error ensuring uploads directory: ${error.message}`);
}

async function processExcelData(filePath, vectorStore) {
  try {
    logger.info(`Reading Excel file: ${filePath}`);
    const workbook = xlsx.readFile(filePath);
    const sheetNames = workbook.SheetNames;
    logger.debug(`Sheets found: ${sheetNames.join(', ')}`);

    let recordsProcessed = 0;

    for (const sheetName of sheetNames) {
      try {
        logger.debug(`Processing sheet: ${sheetName}`);
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = xlsx.utils.sheet_to_json(worksheet);
        logger.debug(`Rows in sheet: ${jsonData.length}`);

        for (const row of jsonData) {
          try {
            logger.debug(`Row data: ${JSON.stringify(row)}`);
            const fileName = path.basename(filePath).toLowerCase();

            if (fileName.includes('hostel')) {
              const text = `Hostel: ${row['Hostel Name'] || ''}, Type: ${row['Room Type'] || ''}, Capacity: ${row['Capacity per Room'] || ''}, Fee: ₹${row['Annual Fee (₹)'] || ''}, Incharge: ${row['Hostel Incharge'] || ''}, Contact: ${row['Contact'] || ''}`;
              vectorStore.addDocument(text, {
                type: 'hostel',
                category: row['Hostel Name']?.toUpperCase().includes('BOYS') ? 'boys_hostel' : 'girls_hostel',
                academicYear: row['Academic Year'] || '',
                originalData: row
              });
            } else if (fileName.includes('faculty')) {
              const deptMatch = fileName.match(/(CSE|ECE|EEE|MECH|CIVIL|MBA|MCA)/i);
              const dept = deptMatch ? deptMatch[0].toUpperCase() : row.Department || '';
              const text = `Faculty: ${row['ECE Faculty Name'] || row['Faculty Name'] || ''}, Dept: ${dept}, Designation: ${row['ECE Designation'] || row['Designation'] || ''}, Qualification: ${row['Qualification'] || ''}`;
              vectorStore.addDocument(text, {
                type: 'faculty',
                department: dept,
                isHOD: (row['ECE Designation'] || row['Designation'] || '').toUpperCase().includes('HOD'),
                originalData: row
              });
            } else if (fileName.includes('fee')) {
              const text = `Department: ${row['Specialization'] || ''}, Convener Quota: ₹${row['Convener Quota (₹)'] || ''}, Management Quota: ₹${row['Management Quota (₹)'] || ''}`;
              vectorStore.addDocument(text, {
                type: 'fees',
                department: row['Specialization']?.split(' ')[0] || '',
                originalData: row
              });
            } else if (fileName.includes('transport')) {
              const text = `Bus ${row['Bus No'] || ''}, Driver: ${row['Driver Name'] || ''}, Route: ${row['Route Stop'] || ''}, Time: ${row['Time'] || ''}`;
              vectorStore.addDocument(text, {
                type: 'transport',
                originalData: row
              });
            } else if (fileName.includes('placement')) {
              logger.debug(`Placement row detected.`);
              const dept = (row['DEPARTMENT'] || '').replace(/[^a-zA-Z]/g, '').toUpperCase();
              const text = `PLACEMENT: ${row['Name'] || 'Student'}, ${dept}, ${row['COMPANY'] || 'Company'}, ${row['YEAR'] || 'Year'}`;
              vectorStore.addDocument(text, {
                type: 'placement',
                department: dept,
                year: row['YEAR'] || '',
                originalData: row
              });
            } else {
              const text = Object.entries(row).map(([key, val]) => `${key}: ${val}`).join(', ');
              vectorStore.addDocument(text, {
                type: path.basename(filePath, '.xlsx'),
                originalData: row
              });
            }

            recordsProcessed++;
          } catch (rowError) {
            logger.error(`Row processing error in ${sheetName}:`, rowError);
          }
        }
      } catch (sheetError) {
        logger.error(`Sheet processing error: ${sheetName}`, sheetError);
      }
    }

    logger.info(`Finished processing ${recordsProcessed} records from ${filePath}`);
    return recordsProcessed;
  } catch (error) {
    logger.error('Error processing Excel file:', error);
    throw error;
  }
}

async function generateRAGResponse(query, context) {
  logger.debug('Generating RAG response for query:', query);

  const contextText = context.map(c => {
    const source = c.document.metadata.type || 'data';
    return `[From ${source}]\n${c.document.text}\n---`;
  }).join('\n');

const prompt = `You are an enquiry assistant for Chalapathi Institute of Engineering and Technology. 
Answer the question using ONLY the provided context.

Tone:
- Professional yet friendly.
- Use clear formatting with symbols like ✅, 🔹, ₹, etc., to make details easy to understand.
- Mention specific names, numbers, dates, and details exactly as they appear.
- Do not make up or assume anything outside the given context.
- If information is missing, respond with: "📌 Please contact the administration office for this information."

CONTEXT:
${contextText}

QUESTION: ${query}

ANSWER:`;

  try {
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3',
        prompt,
        stream: false,
        options: { temperature: 0.3 }
      })
    });

    const data = await response.json();
    logger.debug(`Ollama response: ${data.response}`);
    return data.response.trim();
  } catch (error) {
    logger.error('Ollama generation failed:', error);
    return "Please contact the administration office for this information.";
  }
}

async function generateResponse(query, context) {
  logger.info(`Generating response for: "${query}"`);
  const lowerQuery = query.toLowerCase();

  if (/hello|hi|hey/.test(lowerQuery)) {
    return "Hello! I'm your college assistant. How can I help you today?";
  }

  if (/bus|transport|route|schedule|time|stop/.test(lowerQuery)) {
    const transportContext = context.filter(c =>
      c.document.metadata.type === 'transport' ||
      c.document.text.includes('Bus No')
    );
    logger.debug(`Found ${transportContext.length} transport results`);
    return transportContext.length
      ? await generateRAGResponse(query, transportContext)
      : "Transport information not found.";
  }

  if (/placement|placed|company|recruitment|job/.test(lowerQuery)) {
    const placementContext = context.filter(c => c.document.metadata.type === 'placement');
    const targetYear = query.match(/20\d{2}/)?.[0];
    const filteredPlacements = targetYear
      ? placementContext.filter(doc => doc.document.metadata.year === targetYear)
      : placementContext;

    logger.debug(`Filtered placements (${filteredPlacements.length}) for year: ${targetYear}`);
    return filteredPlacements.length
      ? await generateRAGResponse(`How many students were placed in ${targetYear}?`, filteredPlacements)
      : "Placement records not found.";
  }

  if (/hostel|room|accommodation/.test(lowerQuery)) {
    const hostelContext = context.filter(c => c.document.metadata.type === 'hostel');
    logger.debug(`Found ${hostelContext.length} hostel entries`);
    return hostelContext.length
      ? await generateRAGResponse(query, hostelContext)
      : "Hostel information not found.";
  }

  logger.debug(`Fallback context length: ${context.length}`);
  return context.length
    ? await generateRAGResponse(query, context)
    : "I couldn't find specific information. Try asking about admissions, courses, faculty, or facilities.";
}

app.post('/api/upload-excel', upload.single('file'), async (req, res) => {
  logger.info('Excel upload received.');
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const ext = path.extname(req.file.originalname).toLowerCase();
    if (!['.xlsx', '.xls', '.csv'].includes(ext)) {
      await fs.unlink(req.file.path);
      logger.warn('Invalid file type uploaded:', ext);
      return res.status(400).json({ error: 'Invalid file type' });
    }

    logger.info(`Processing uploaded file: ${req.file.originalname}`);
    const recordsProcessed = await processExcelData(req.file.path, vectorStore);
    const workbook = xlsx.readFile(req.file.path);

    const sheetNames = workbook.SheetNames;

    await fs.unlink(req.file.path);

    res.json({
      success: true,
      message: `Processed ${recordsProcessed} records`,
      totalRecords: vectorStore.documents.length,
      fileName: req.file.originalname,
      sheets: sheetNames,
    });
  } catch (error) {
    logger.error('Upload processing failed:', error);
    if (req.file) await fs.unlink(req.file.path);
    res.status(500).json({ error: 'Internal error', details: error.message });
  }
});

app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Message is required' });

    logger.info(`Chat query: "${message}"`);
    const searchResults = vectorStore.search(message, 20);
    logger.debug(`Search result count: ${searchResults.length}`);
    const response = await generateResponse(message, searchResults);

    res.json({ response });
  } catch (error) {
    logger.error('Chat error:', error);
    res.status(500).json({ error: 'Chat failed' });
  }
});

app.get('/api/knowledge-stats', (req, res) => {
  logger.info('Serving knowledge base stats');
  const stats = {
    totalDocuments: vectorStore.documents.length,
    categories: {},
    types: {}
  };

  vectorStore.documents.forEach(doc => {
    const category = doc.metadata.category || 'uncategorized';
    const type = doc.metadata.type || 'unknown';
    stats.categories[category] = (stats.categories[category] || 0) + 1;
    stats.types[type] = (stats.types[type] || 0) + 1;
  });

  res.json(stats);
});

io.on('connection', (socket) => {
  logger.info(`Socket connected: ${socket.id}`);

  socket.on('chat-message', async ({ message }) => {
    try {
      logger.debug(`Socket received message: ${message}`);
      const searchResults = vectorStore.search(message, 20);
      const response = await generateResponse(message, searchResults);

      socket.emit('bot-typing', true);
      setTimeout(() => {
        socket.emit('bot-typing', false);
        socket.emit('bot-response', { response });
      }, 1200);
    } catch (error) {
      logger.error('Socket error:', error);
      socket.emit('bot-response', { response: 'An error occurred.' });
    }
  });

  socket.on('disconnect', () => {
    logger.info(`Socket disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  logger.info(`Server listening on port ${PORT}`);
});
