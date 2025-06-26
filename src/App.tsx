import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User } from 'lucide-react';
import io, { Socket } from 'socket.io-client';
import CIETLogo from './assets/ciet-logo.svg';
// import TFILogo from './assets/TFI_LOGO_horizantal.png';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const CATEGORY_QUERIES = {
  faculty: [
    'Could you provide a detailed list of the faculty members, including their designations and departments?',
    'Who are the current Heads of Departments for each academic department?',
    'Please share the profiles of the department heads along with their research interests.',
    'How many professors and assistant professors are currently employed in each department?',
    'Can you provide detailed faculty contact information and office hours?'
  ],
  hostel: [
    'What accommodation facilities are available for boys and girls on campus?',
    'Could you provide information about the capacity and amenities of the girls\' hostel?',
    'What is the annual fee structure for hostel accommodation?',
    'Are there any guidelines or rules regarding dormitory availability and allocation?',
    'Please share details on application process and eligibility criteria for hostel admission.'
  ],
  fees: [
    'Can you provide the detailed fee structure for all courses offered?',
    'What are the fees applicable for management quota seats compared to convener quota?',
    'Please share the complete admission fee details, including any refundable deposits.',
    'Are there any scholarships or financial aid options available for fee payment?',
    'What is the breakdown of tuition and other fees for each semester?'
  ],
  placement: [
    'Could you provide recent placement statistics including percentage of students placed?',
    'Which companies have visited the campus for recruitment in the last year?',
    'What is the highest and average salary package offered to students during placements?',
    'Can you provide information on internship opportunities and placement support?',
    'Please share details about placement cell activities and contact information.'
  ],
  transport: [
    'What are the official college bus timings and routes available for students?',
    'Could you provide detailed information about transportation facilities and stops?',
    'Is there a schedule available for all buses running between the campus and the city?',
    'Are there any shuttle services available during late hours or weekends?',
    'Please share guidelines on how to register for college transport services.'
  ],
  lab_infrastructure: [
    'What laboratory facilities are available for each academic department?',
    'Can you provide detailed information about lab equipment and infrastructure?',
    'Are there any specialized labs for research and development purposes?',
    'Please share the list of labs accessible to undergraduate and postgraduate students.',
    'What safety protocols are followed in the laboratories?'
  ],
  intake_capacity: [
    'What is the total intake capacity for each course offered by the college?',
    'Could you provide the department-wise seat allocation and reservation details?',
    'Are there any recent changes in the intake capacity for undergraduate programs?',
    'What is the process to apply for seats in management and convener quotas?',
    'Please share statistics on seat availability and admissions for the current academic year.'
  ],
  college: [
    'What is the full official name of the college?',
    'In which year was the college established?',
    'Could you provide details on the total campus area in acres?',
    'Where is the college located (address and city)?',
    'Who is the founder of the college?',
    'Is the college autonomous or affiliated? Please specify the status.',
    'Which programs have received NBA accreditation?',
    'Could you list all undergraduate programs offered by the college?',
    'Please provide details of the postgraduate programs available.',
    'What is the vision statement of the college?',
    'What is the mission statement that guides the college’s objectives?',
    'Can you share the official contact phone number of the college?',
    'What is the mobile contact number for admissions or inquiries?',
    'Please provide the official email address for general communication.',
    'What is the college’s official website URL?'
  ]
};

const ALLOWED_EMAIL_DOMAINS = [
  'gmail.com',
  'yahoo.com',
  'outlook.com',
  'hotmail.com',
  'icloud.com',
  'protonmail.com',
  'live.com',
  'msn.com',
  // add any other domains you consider popular
];


interface Message {
  id: string;
  text: string;
  isBot: boolean;
  timestamp: Date;
}

type OnboardingStep = 'welcome' | 'askName' | 'askEmail' | 'done';

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [step, setStep] = useState<OnboardingStep>('welcome');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    console.log('Initializing socket connection...');
    // const newSocket = io('http://localhost:3001');
    const newSocket = io('http://192.168.31.80:3001');
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Socket connected with id:', newSocket.id);
      setStep('askName');
      console.log('Welcome message sent, onboarding step set to askName');
    });

    newSocket.on('bot-response', (data: { response: string }) => {
      console.log('Received bot-response:', data.response);
      sendBotMessage(data.response);
      setIsTyping(false);
      console.log('Bot stopped typing');
    });

    newSocket.on('bot-typing', (typing: boolean) => {
      console.log('Bot typing status:', typing);
      setIsTyping(typing);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    return () => {
      console.log('Cleaning up socket connection...');
      newSocket.close();
    };
  }, []);

  useEffect(() => {
    console.log('Messages or typing state changed, scrolling to bottom.');
    scrollToBottom();
  }, [messages, isTyping]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendBotMessage = (text: string) => {
    console.log('Sending bot message:', text);
    const botMessage: Message = {
      id: Date.now().toString() + '-' + Math.random().toString(36).substr(2, 5),
      text,
      isBot: true,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, botMessage]);
  };

  const sendUserMessage = (text: string) => {
    console.log('Sending user message:', text);
    const userMessage: Message = {
      id: Date.now().toString() + '-' + Math.random().toString(36).substr(2, 5),
      text,
      isBot: false,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
  };

  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return false;

    const domain = email.split('@')[1].toLowerCase();
    return ALLOWED_EMAIL_DOMAINS.includes(domain);
  };


  const handleSubmit = () => {
    const trimmed = inputMessage.trim();
    console.log('handleSubmit called with input:', trimmed);
    if (!trimmed) {
      console.log('Empty input, ignoring submit.');
      return;
    }

    sendUserMessage(trimmed);

    if (step === 'askName') {
      console.log('Onboarding step: askName');
      setUserName(trimmed);
      sendBotMessage(`Nice to meet you, ${trimmed}! What's your email address?`);
      setStep('askEmail');
      console.log('User name set to:', trimmed, ', moving to askEmail step');
    } else if (step === 'askEmail') {
      console.log('Onboarding step: askEmail');
      if (!isValidEmail(trimmed)) {
        sendBotMessage("That doesn't look like a valid email. Please try again.");
        console.log('Invalid email entered:', trimmed);
        return;
      }
      setUserEmail(trimmed);
      // Send user info to backend
      if (socket) {
        socket.emit('register_user', {
          name: userName,
          email: trimmed
        });
        console.log('User info emitted to backend:', { name: userName, email: trimmed });
      }
      sendBotMessage(`You're all set, ${userName}. You can ask questions or click on a topic below.`);
      setStep('done');
      console.log(`User email set to:', ${userEmail}, trimmed: ${trimmed} onboarding done`);
    } else {
      console.log('Onboarding done, sending message to socket:', trimmed);
      if (socket) {
        socket.emit('chat_message', { message: trimmed });
        setIsTyping(true);
        console.log('Message emitted to socket and typing indicator set');
      } else {
        console.warn('Socket is null, cannot send message');
      }
    }

    setInputMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      console.log('Enter pressed, submitting message');
      handleSubmit();
    }
  };

  const formatTime = (date: Date) =>
    date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between h-[80px]">
            <div className="w-[30%] h-full flex items-center">
              <img src={CIETLogo} alt="CIET Logo" className="h-full object-contain" />
            </div>
            <div className="flex-1 px-4 text-right">
              <h1 className="text-xl font-bold text-slate-800">CIET Assistant</h1>
              <p className="text-sm text-slate-500">First Ever db Agent</p>
            </div>
            {/* <div className="w-[30%] h-full flex items-center ">
              <img src={TFILogo} alt="TFI Logo" className="h-full object-contain" />
            </div> */}
          </div>
        </div>
      </header>

      {/* Chat */}
      <div className="max-w-4xl mx-auto p-4 h-[calc(100vh-100px)] flex flex-col">
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 mb-4 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.isBot ? 'justify-start' : 'justify-end'}`}>
                <div className={`flex items-start space-x-3 max-w-3xl ${msg.isBot ? '' : 'flex-row-reverse space-x-reverse'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${msg.isBot ? 'bg-gradient-to-br from-orange-500 to-orange-700' : 'bg-gradient-to-br from-green-500 to-teal-600'}`}>
                    {msg.isBot ? <Bot className="w-5 h-5 text-white" /> : <User className="w-5 h-5 text-white" />}
                  </div>
                  <div className={`rounded-2xl px-4 py-3 ${msg.isBot ? 'bg-slate-100 text-slate-800' : 'bg-gradient-to-r from-orange-500 to-orange-700 text-white'}`}>
                    <div className={`prose prose-sm max-w-none ${msg.isBot ? 'text-slate-800' : 'text-white'}`}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.text}
                      </ReactMarkdown>
                    </div>
                    <p className={`text-xs mt-2 ${msg.isBot ? 'text-slate-400' : 'text-orange-100'}`}>
                      {formatTime(msg.timestamp)}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <div className="bg-slate-100 rounded-2xl px-4 py-3">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Category Buttons */}
          {step === 'done' && (
            <div className="px-4 pb-2">
              <div className="flex flex-wrap gap-2">
                {Object.keys(CATEGORY_QUERIES).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => {
                      const queries = CATEGORY_QUERIES[cat as keyof typeof CATEGORY_QUERIES];
                      const randomIndex = Math.floor(Math.random() * queries.length);
                      const example = queries[randomIndex];
                      console.log(`Category button clicked: ${cat}, random example query: "${example}"`);
                      sendUserMessage(example);
                      if (socket) {
                        socket.emit('chat_message', { message: example });
                        setIsTyping(true);
                        console.log('Emitted random category example query to socket and set typing to true');
                      }
                    }}
                    className="px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-sm hover:bg-orange-200 transition"
                  >
                    {cat}
                  </button>
                ))}

              </div>
            </div>
          )}

          {/* Input */}
          <div className="border-t border-slate-200 p-4">
            <div className="flex items-end space-x-3">
              <div className="flex-1">
                <div className="relative">
                  <textarea
                    value={inputMessage}
                    onChange={(e) => {
                      setInputMessage(e.target.value);
                      console.log('Input message changed:', e.target.value);
                    }}
                    onKeyPress={handleKeyPress}
                    placeholder={step === 'askName' ? 'Enter your name...' : step === 'askEmail' ? 'Enter your email...' : 'Ask your question...'}
                    className="
  w-full px-4 py-3 pr-12 border border-slate-300 rounded-xl 
  focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent 
  resize-none min-h-[50px]
"
                  />
                  <button
                    onClick={() => {
                      console.log('Send button clicked');
                      handleSubmit();
                    }}
                    className="absolute right-2 top-5 w-8 h-8 bg-gradient-to-r from-orange-500 to-orange-700 text-white rounded-lg hover:from-orange-600 hover:to-blue-600 flex items-center justify-center"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
