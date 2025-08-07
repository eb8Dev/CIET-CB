import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User } from 'lucide-react';
import io, { Socket } from 'socket.io-client';
import CIETLogo from './assets/ciet-logo.svg';
// import TFILogo from './assets/TFI_LOGO_horizantal.png';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const CATEGORY_QUERIES = {
  faculty: [
    'Show all faculty names and their departments.',
    'What are the qualifications of the faculty in the CSE department?',
    'List the designations of faculty in the ECE department.',
    'Which faculty have Ph.D. qualifications?',
    'Who are the senior-most faculty members (based on joining year)?',
    'How many faculty are available in each department?'

  ],
  hostel: [
    'What accommodation facilities are available for boys and girls on campus?',
    'Could you provide information about the capacity and amenities of the girls\' hostel?',
    'What is the annual fee structure for hostel accommodation?',
    'Are there any guidelines or rules regarding dormitory availability and allocation?',
    'Please share details on application process and eligibility criteria for hostel admission.'
  ],
  placement: [
    'Which companies visited for placement in 2023?',
    'Show the list of students placed from CSE.',
    'Which student got placed in Infosys?',
    'How many students from ECE got placed?',
    'List students placed department-wise.',
    'What are the top hiring companies in the last 2 years?'

  ],
  fee: [
    'What is the convener quota fee for CSE?',
    'What is the convener quota fee for CSE?',
    'Show the fee structure for all specializations',
    'Show the fee structure for all specializations',
    'Which specialization has the highest fee?',
    'Which specialization has the highest fee?'

  ],
  transport: [
    'Which specialization has the highest fee?',
    'What time does the college bus reach Nallapadu?',
    'Who is the driver of Bus No. 5?',
    'What are the route stops covered by each bus?',
    'How many buses are available for student transport?',
    'Show the transport schedule and timings.'
  ],
  lab_infrastructure: [
    'List all labs available in the CSE department.',
    'How many systems are there in the Data Structures lab?',
    'What subjects are associated with each lab?',
    'Which lab has the highest number of systems?',
    'Show all labs along with their departments.',
    'What labs are available for ECE students?'
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
  ],
  global_Certifications: [
    'How many students have completed the "Certified Ethical Hacker" certification?',
    'List all certifications offered along with their certification bodies.',
    'Which certification has the highest number of certified students?',
    'How many students are certified in courses offered by ServiceNow?',
    'Give me the total number of certifications achieved by students.',
    'Show certifications related to cloud platforms like Azure or Salesforce.'
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
];


interface Message {
  id: string;
  text: string;
  isBot: boolean;
  timestamp: Date;
}

type OnboardingStep = 'welcome' | 'askName' | 'askRollNumber' | 'askEmail' | 'done';

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [userName, setUserName] = useState('');
  const [userRollNo, setUserRollNo] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [step, setStep] = useState<OnboardingStep>('welcome');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    console.log('Initializing socket connection...');
    const newSocket = io('http://localhost:3001');
    // const newSocket = io('http://192.168.1.6:3001/');
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

    const [localPart, domain] = email.split('@');
    if (localPart.length < 6) return false;

    return ALLOWED_EMAIL_DOMAINS.includes(domain.toLowerCase());
  };

  const VALID_BRANCHES = ['csm', 'cai', 'ds', 'cse', 'csy', 'csit', 'ece', 'eee', 'ce'];

  const isValidRollNumber = (roll: string) => {
    const rollRegex = /^[ly]\d{2}([a-z]{3})\d{3}$/i;
    if (!rollRegex.test(roll)) return false;

    const branchCode = roll.slice(3, 6).toLowerCase();
    return VALID_BRANCHES.includes(branchCode);
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
      sendBotMessage(`Nice to meet you, ${trimmed}! What's your Roll number?`);
      setStep('askRollNumber');
      console.log('User name set to:', trimmed, ', moving to askRollNumber step');
    } else if (step === 'askRollNumber') {
      if (!isValidRollNumber(trimmed)) {
        sendBotMessage("That doesn't look like a valid roll number. Please try again.");
        return;
      }
      // optionally store roll number in state
      sendBotMessage("Great! Now, what's your email address?");
      setUserRollNo(trimmed);
      setStep('askEmail');

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
          email: trimmed,
          rollno: userRollNo,
        });
        console.log('User info emitted to backend:', { name: userName, email: trimmed, rollno: userRollNo, });
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


  const extractYouTubeVideoIds = (text: string): string[] => {
    const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/g;
    const matches = [...text.matchAll(regex)];
    return matches.map((m) => m[1]);
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between h-[40px]">
            <div className="w-[30%] h-full flex items-center">
              <img src={CIETLogo} alt="CIET Logo" className="h-full object-contain" />
            </div>
            <div className="flex-1 px-4 text-right">
              <h1 className="text-xl font-bold text-slate-800">CIET Assistant</h1>
              <p className="text-sm text-slate-500">Your Trusted Digital Assistant for Students and the Public</p>
            </div>
            {/* <div className="w-[30%] h-full flex items-center ">
              <img src={TFILogo} alt="TFI Logo" className="h-full object-contain" />
            </div> */}
          </div>
        </div>
      </header>

      {/* Chat */}
      <div className="max-w-6xl mx-auto p-4 h-[calc(100vh-80px)] flex flex-col">
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 mb-4 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto p-2 space-y-4">
            {messages.map(msg => (
              <div className={`flex ${msg.isBot ? 'justify-start' : 'justify-end'}`}>
                <div className={`flex items-start space-x-3 max-w-3xl ${msg.isBot ? '' : 'flex-row-reverse space-x-reverse'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${msg.isBot ? 'bg-gradient-to-br from-orange-500 to-orange-700' : 'bg-gradient-to-br from-green-500 to-teal-600'}`}>
                    {msg.isBot ? <Bot className="w-5 h-5 text-white" /> : <User className="w-5 h-5 text-white" />}
                  </div>

                  {/* Message Bubble with Inline Timestamp */}
                  <div className={`rounded-2xl px-4 py-2 relative ${msg.isBot ? 'bg-slate-100 text-slate-800' : 'bg-gradient-to-r from-orange-500 to-orange-700 text-white'}`}>
                    <div className={`prose prose-sm max-w-none ${msg.isBot ? 'text-slate-800' : 'text-white'}`}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.text}
                      </ReactMarkdown>

                      {extractYouTubeVideoIds(msg.text).map((videoId) => (
                        <div key={videoId} className="aspect-w-16 aspect-h-9 w-full mt-2">
                          <iframe
                            src={`https://www.youtube.com/embed/${videoId}`}
                            title="YouTube Video"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            className="w-full h-64 rounded-lg"
                          ></iframe>
                        </div>
                      ))}
                    </div>

                    {/* Inline Shadow Timestamp */}
                    <div className={`text-xs mt-1 text-opacity-60 ${msg.isBot ? 'text-slate-500' : 'text-orange-100'} text-right`}>
                      {formatTime(msg.timestamp)}
                    </div>
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
                    placeholder={step === 'askName' ? 'Enter your name...' : step === 'askRollNumber' ? 'Enter your roll number (e.g., y23csm001)...' : step === 'askEmail' ? 'Enter your email...' : 'Ask your question...'}
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
