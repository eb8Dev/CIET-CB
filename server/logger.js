import fs from 'fs';
import path from 'path';

// Ensure the logs directory exists
const logDir = path.resolve('./logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

function writeToFile(level, ...args) {
  const timestamp = new Date().toISOString();
  const content = `[${timestamp}] [${level.toUpperCase()}] ${args.join(' ')}\n`;
  const filePath = path.join(logDir, `${level}.log`);
  fs.appendFileSync(filePath, content, 'utf-8'); // Append to file
}

export const logger = {
  info: (...args) => writeToFile('info', ...args),
  warn: (...args) => writeToFile('warn', ...args),
  error: (...args) => writeToFile('error', ...args),
  debug: (...args) => writeToFile('debug', ...args)
};

// const collegeKnowledge = {
//   admissions: "Admissions are open from May to July each year. Requirements include high school diploma, entrance exam scores, and application essays.",
//   courses: "We offer undergraduate and graduate programs in Engineering, Sciences, and Medicine.",
//   campus: "Our campus spans 200 acres with modern facilities including libraries, labs, dormitories, and recreational centers.",
//   faculty: "Our faculty includes PhD holders from top universities worldwide with extensive research and industry experience.",
//   fees: "Tuition fees vary by program. Undergraduate programs range from 43,000 to 1,29,000 per year. Financial aid is available.",
//   scholarships: "Merit-based and need-based scholarships are available. Apply early for better chances.",
//   facilities: "State-of-the-art laboratories, digital library, medical center, and student housing available.",
//   events: "Regular seminars, workshops, cultural events, and career fairs are organized throughout the academic year."
// };
// const prompt = `As a college assistant, answer the question using ONLY the provided context. 
// Be specific with names, numbers, and details when available. 
// If information is missing, say "Please contact the administration office for this information."

// CONTEXT:
// ${contextText}

// QUESTION: ${query}

// ANSWER (be concise and factual):`;

// class SimpleVectorStore {
//   constructor() {
//     logger.debug('Initializing SimpleVectorStore...');
//     this.documents = [];
//     this.tfidf = new natural.TfIdf();
//   }

//   addDocument(text, metadata = {}) {
//     const doc = {
//       id: this.documents.length,
//       text,
//       metadata,
//       timestamp: new Date()
//     };
//     this.documents.push(doc);
//     this.tfidf.addDocument(text);
//     logger.debug(`Document added | ID: ${doc.id} | Metadata: ${JSON.stringify(metadata)}`);
//     return doc.id;
//   }

//   search(query, limit = 5) {
//     logger.debug(`Searching vector store for query: "${query}"`);
//     const results = [];
//     this.tfidf.tfidfs(query, (i, measure) => {
//       logger.debug(`TF-IDF Match: Doc ${i} Score ${measure}`);
//       if (measure > 0) {
//         results.push({
//           document: this.documents[i],
//           score: measure
//         });
//       }
//     });
//     return results.sort((a, b) => b.score - a.score).slice(0, limit);
//   }

//   clear() {
//     logger.info('Clearing vector store...');
//     this.documents = [];
//     this.tfidf = new natural.TfIdf();
//   }
// }


// ollama pull nomic-embed-text
