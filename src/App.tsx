import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User } from 'lucide-react';
import io, { Socket } from 'socket.io-client';

import CIETLogo from './assets/ciet-logo.svg';
import TFILogo from './assets/TFI_LOGO_horizantal.png';

const CATEGORY_QUERIES = {
  faculty: [
    'list of faculty',
    'HODs of the departments',
    'head of department',
    'department heads',
    'how many professors',
    'faculty details'
  ],
  hostel: [
    'hostel information',
    'accommodation for boys',
    'girls hostel capacity',
    'annual hostel fee',
    'dorm availability'
  ],
  fees: [
    'fee structure',
    'management quota fee',
    'convener quota fee',
    'total course fees',
    'admission fee'
  ],
  placement: [
    'placement statistics',
    'students placed',
    'company wise placements',
    'highest package offered'
  ],
  transport: [
    'bus timings',
    'transport routes',
    'bus schedule',
    'college bus stop'
  ],
  'lab infrastructure': [
    'labs available',
    'infrastructure for courses',
    'list of labs',
    'equipment in lab'
  ],
  'intake capacity': [
    'number of seats',
    'course intake',
    'department wise intake',
    'available seats'
  ]
};

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
    const newSocket = io('http://localhost:3001');
    setSocket(newSocket);

    // Only show welcome if socket doesn't echo it back
    newSocket.on('connect', () => {
      const welcome: Message = {
        id: Date.now().toString(),
        text: "👋 Welcome to Chalapathi Assistant! What's your name?",
        isBot: true,
        timestamp: new Date()
      };
      setMessages([welcome]);
      setStep('askName');
    });


    newSocket.on('bot-response', (data: { response: string }) => {
      sendBotMessage(data.response);
      setIsTyping(false);
    });

    newSocket.on('bot-typing', (typing: boolean) => {
      setIsTyping(typing);
    });

    return () => {
      newSocket.close();
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendBotMessage = (text: string) => {
    const botMessage: Message = {
      id: Date.now().toString(),
      text,
      isBot: true,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, botMessage]);
  };

  const sendUserMessage = (text: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      text,
      isBot: false,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
  };

  const isValidEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSubmit = () => {
    const trimmed = inputMessage.trim();
    if (!trimmed) return;

    sendUserMessage(trimmed);

    if (step === 'askName') {
      setUserName(trimmed);
      sendBotMessage(`Nice to meet you, ${trimmed}! What's your email address?`);
      setStep('askEmail');
    } else if (step === 'askEmail') {
      console.log(userEmail);
      if (!isValidEmail(trimmed)) {
        sendBotMessage("❌ That doesn't look like a valid email. Please try again.");
        return;
      }
      setUserEmail(trimmed);
      sendBotMessage(`You're all set, ${userName}. You can ask questions or click on a topic below.`);
      setStep('done');
    } else {
      if (socket) {
        socket.emit('chat-message', { message: trimmed });
        setIsTyping(true);
      }
    }

    setInputMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
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
            <div className="flex-1 px-4 text-center">
              <h1 className="text-xl font-bold text-slate-800">CHALAPATHI Assistant</h1>
              <p className="text-sm text-slate-500">AI-Powered Student Support</p>
            </div>
            <div className="w-[30%] h-full flex items-center justify-end">
              <img src={TFILogo} alt="TFI Logo" className="h-full object-contain" />
            </div>
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
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${msg.isBot ? 'bg-gradient-to-br from-blue-500 to-purple-600' : 'bg-gradient-to-br from-green-500 to-teal-600'}`}>
                    {msg.isBot ? <Bot className="w-5 h-5 text-white" /> : <User className="w-5 h-5 text-white" />}
                  </div>
                  <div className={`rounded-2xl px-4 py-3 ${msg.isBot ? 'bg-slate-100 text-slate-800' : 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'}`}>
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                    <p className={`text-xs mt-2 ${msg.isBot ? 'text-slate-400' : 'text-blue-100'}`}>{formatTime(msg.timestamp)}</p>
                  </div>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <div className="bg-slate-100 rounded-2xl px-4 py-3">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
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
                      const example = CATEGORY_QUERIES[cat as keyof typeof CATEGORY_QUERIES][0];
                      sendUserMessage(example);
                      if (socket) {
                        socket.emit('chat-message', { message: example });
                        setIsTyping(true);
                      }
                    }}
                    className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm hover:bg-blue-200 transition"
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
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={step === 'askName' ? 'Enter your name...' : step === 'askEmail' ? 'Enter your email...' : 'Ask your question...'}
                    className="w-full px-4 py-3 pr-12 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none min-h-[50px]"
                  />
                  <button
                    onClick={handleSubmit}
                    className="absolute right-2 bottom-2 w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 flex items-center justify-center"
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
