# College RAG Chatbot

A sophisticated college assistance chatbot built with Retrieval-Augmented Generation (RAG) architecture that can process Excel data and provide intelligent responses about college information.

## Features

- **RAG Architecture**: Implements retrieval-augmented generation for context-aware responses
- **Admin-Only Excel Integration**: Secure admin panel for uploading and processing Excel files
- **Real-time Chat**: Socket.IO powered real-time messaging
- **Vector Search**: TF-IDF based similarity search for relevant context retrieval
- **Beautiful UI**: Modern, responsive chat interface
- **Knowledge Management**: Track and display knowledge base statistics
- **Secure Admin Access**: Password-protected admin functionality

## Architecture

The system follows the RAG pattern:

1. **User Interface**: Clean chat interface focused on conversation
2. **Admin Panel**: Secure area for knowledge base management
3. **Server**: Express.js backend handling queries and file processing
4. **Search Component**: Vector similarity search using TF-IDF
5. **Knowledge Sources**: Excel files, default college data, and documents
6. **Response Generation**: Context-aware response generation

## Technology Stack

### Frontend
- React 18 with TypeScript
- Tailwind CSS for styling
- Lucide React for icons
- Socket.IO client for real-time communication

### Backend
- Node.js with Express
- Socket.IO for real-time messaging
- xlsx for Excel file processing
- Natural.js for text processing and TF-IDF
- Multer for file uploads

## Getting Started

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start the Application**
   ```bash
   npm run dev
   ```

   This will start both the frontend (port 5173) and backend (port 3001) servers.

3. **Admin Access**
   - Click the settings icon in the top-right corner
   - Enter admin password: `admin123`
   - Upload Excel files to expand the knowledge base

4. **Start Chatting**
   - Ask questions about admissions, courses, facilities, etc.
   - The bot will retrieve relevant context and generate informed responses

## Admin Features

### Accessing Admin Panel
1. Click the settings (⚙️) icon in the header
2. Enter the admin password (default: `admin123`)
3. The admin panel will appear with upload functionality

### Excel Upload
- Only authenticated admins can upload Excel files
- Supports .xlsx and .xls formats
- Files are processed and added to the knowledge base
- Upload status is shown in the chat with [ADMIN] prefix

### Security
- Admin functionality is completely hidden from regular users
- Password-protected access to upload features
- Admin session management with logout capability

## Excel Data Format

The system can process any Excel file structure. Each row becomes a searchable document in the knowledge base. For best results, structure your Excel files with:

- Clear column headers
- Descriptive data in each cell
- Multiple sheets for different categories (admissions, courses, faculty, etc.)

## API Endpoints

- `POST /api/upload-excel` - Upload and process Excel files (admin only)
- `POST /api/chat` - Send chat messages (also supports Socket.IO)
- `GET /api/knowledge-stats` - Get knowledge base statistics

## Socket.IO Events

- `chat-message` - Send a message to the bot
- `bot-response` - Receive bot responses
- `bot-typing` - Bot typing indicator

## Configuration

### Admin Password
The default admin password is `admin123`. For production, change this in the App.tsx file:

```javascript
const ADMIN_PASSWORD = 'your-secure-password';
```

### Customization

#### Adding New Knowledge Categories
Edit `server/index.js` to add new default knowledge:

```javascript
const collegeKnowledge = {
  newCategory: "Your new knowledge content here",
  // ... existing categories
};
```

#### Modifying Response Generation
Update the `generateResponse` function in `server/index.js` to customize how the bot generates responses based on retrieved context.

## Production Considerations

For production deployment:

1. **Security**
   - Use environment variables for admin password
   - Implement proper authentication system
   - Add rate limiting and CORS configuration
   - Use HTTPS for all communications

2. **Database**
   - Replace simple vector store with proper vector database (ChromaDB, Pinecone, etc.)
   - Add persistent storage for uploaded files
   - Implement backup and recovery procedures

3. **AI Integration**
   - Integrate with actual LLM APIs (OpenAI, Anthropic, or local Ollama)
   - Implement proper prompt engineering
   - Add response quality monitoring

4. **Infrastructure**
   - Set up proper file storage (AWS S3, etc.)
   - Add comprehensive error handling and logging
   - Implement monitoring and analytics
   - Configure auto-scaling and load balancing

## User Experience

### For Students
- Clean, distraction-free chat interface
- No visible admin controls or upload options
- Focus purely on getting information about the college
- Real-time responses with typing indicators

### For Administrators
- Discrete admin access via settings icon
- Secure password protection
- Easy Excel file upload and processing
- Real-time feedback on upload status
- Knowledge base statistics and management

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.