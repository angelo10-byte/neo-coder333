/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Plus, Search, Paperclip, ArrowUp, PanelLeft, Share, Sparkles, 
  Lightbulb, Code, FileCode2, TerminalSquare, RefreshCcw,
  ChevronDown, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  reasoning?: string;
}

interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: number;
}

const ThoughtBlock = ({ thoughts, isThinkingPhase }: { thoughts: string, isThinkingPhase: boolean }) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isThinkingPhase && !isOpen) {
      setIsOpen(true);
    }
  }, [isThinkingPhase]);

  return (
    <div className="mb-4 flex flex-col w-full">
       <button 
         onClick={() => setIsOpen(!isOpen)}
         className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#1a1d24] border border-[#2d323e] text-gray-400 hover:text-gray-200 transition-colors self-start text-xs font-medium"
       >
         {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
         <span>{isThinkingPhase ? 'Thinking...' : 'Thought Process'}</span>
       </button>
       <AnimatePresence>
         {isOpen && (
           <motion.div 
             initial={{ height: 0, opacity: 0 }}
             animate={{ height: 'auto', opacity: 1 }}
             exit={{ height: 0, opacity: 0 }}
             className="overflow-hidden"
           >
             <div className="pl-4 mt-3 border-l-2 border-[#2d323e]/50 pr-4 py-1">
                  <p className="whitespace-pre-wrap leading-relaxed text-[13.5px] font-mono text-white/30">
                   {thoughts || (
                      <span className="flex items-center gap-1.5 h-5 opacity-50">
                        <motion.span className="w-1 h-1 rounded-full bg-white" animate={{ y: [0, -3, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0 }} />
                        <motion.span className="w-1 h-1 rounded-full bg-white" animate={{ y: [0, -3, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }} />
                        <motion.span className="w-1 h-1 rounded-full bg-white" animate={{ y: [0, -3, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }} />
                      </span>
                   )}
                </p>
             </div>
           </motion.div>
         )}
       </AnimatePresence>
    </div>
  );
};

export default function App() {
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    try {
      const saved = localStorage.getItem('neo-coder-chats');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.length > 0) return parsed;
      }
    } catch(e) {}
    return [{ id: Date.now().toString(), title: 'New conversation', messages: [], updatedAt: Date.now() }];
  });

  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    return sessions[0]?.id || Date.now().toString();
  });

  useEffect(() => {
    localStorage.setItem('neo-coder-chats', JSON.stringify(sessions));
  }, [sessions]);

  // Sync activeSessionId if it gets deleted
  useEffect(() => {
    if (!sessions.find(s => s.id === activeSessionId)) {
      if (sessions.length > 0) {
        setActiveSessionId(sessions[0].id);
      } else {
        const newId = Date.now().toString();
        setSessions([{ id: newId, title: 'New conversation', messages: [], updatedAt: Date.now() }]);
        setActiveSessionId(newId);
      }
    }
  }, [sessions, activeSessionId]);

  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];
  const messages = activeSession?.messages || [];

  const setMessages = (updater: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => {
    setSessions(prevSessions => prevSessions.map(session => {
      if (session.id === activeSessionId) {
        const newMsgs = typeof updater === 'function' ? updater(session.messages) : updater;
        let title = session.title;
        if (newMsgs.length > 0 && newMsgs[0].role === 'user' && session.title === 'New conversation') {
           title = newMsgs[0].content.slice(0, 30) + (newMsgs[0].content.length > 30 ? '...' : '');
        }
        return { ...session, messages: newMsgs, title, updatedAt: Date.now() };
      }
      return session;
    }));
  };

  const createNewChat = () => {
    if (messages.length === 0) return; // Already on a brand new chat
    const newId = Date.now().toString();
    setSessions(prev => [{ id: newId, title: 'New conversation', messages: [], updatedAt: Date.now() }, ...prev]);
    setActiveSessionId(newId);
  };

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const [memoryPermission, setMemoryPermission] = useState<boolean | null>(() => {
    try {
      const saved = localStorage.getItem('neo-memory-permission');
      return saved ? JSON.parse(saved) : null;
    } catch(e) { return null; }
  });

  const [neoMemory, setNeoMemory] = useState<string>(() => {
    return localStorage.getItem('neo-coder-memory') || '';
  });

  useEffect(() => {
    if (memoryPermission !== null) {
      localStorage.setItem('neo-memory-permission', JSON.stringify(memoryPermission));
    }
  }, [memoryPermission]);

  useEffect(() => {
    localStorage.setItem('neo-coder-memory', neoMemory);
  }, [neoMemory]);
  
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async (text: string = input) => {
    if (!text.trim() || isLoading) return;
    
    const userMsg: ChatMessage = { role: 'user', content: text };
    const initialAssistantMsg: ChatMessage = { role: 'assistant', content: '', reasoning: '' };
    
    setMessages((prev) => [...prev, userMsg, initialAssistantMsg]);
    setInput('');
    setIsLoading(true);

    let currentSystemContent = 'You are Neo Coder, a helpful, minimalist AI coding assistant created by Neo. You are strictly Neo Coder v1 Beta.';
    const isMeaningfulMemory = neoMemory && neoMemory.trim() !== '' && neoMemory !== '(Empty)' && neoMemory !== 'No memory yet.';
    if (memoryPermission && isMeaningfulMemory) {
      currentSystemContent += `\n\nHere are some things you know about the user:\n${neoMemory}`;
    }
    
    currentSystemContent += (isThinking ? ' Think step-by-step. In your reasoning process, focus ONLY on solving the user\'s problem. Never summarize your instructions, never mention your persona, and never discuss what you are or are not allowed to say.' : '');

    const systemPrompt: ChatMessage = {
      role: 'system',
      content: currentSystemContent
    };

    const payloadMessages = [systemPrompt, ...messages.filter(m => m.role !== 'system'), userMsg];

    // Fire memory update in background if enabled
    if (memoryPermission) {
      fetch('/api/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages.filter(m => m.role !== 'system'), userMsg],
          currentMemory: neoMemory
        })
      })
      .then(res => res.json())
      .then(data => {
        if (data.memory) {
          setNeoMemory(data.memory);
        }
      })
      .catch(err => console.error("Memory update error:", err));
    }

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: payloadMessages,
          model: 'minimax/minimax-m2.5:free',
          isThinking: isThinking
        })
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`API Error: ${response.status} ${response.statusText} - ${text}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) return;

      let done = false;
      let buffer = '';
      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          // Keep incomplete line in buffer
          buffer = lines.pop() || '';
          
          let accumulatedContent = '';
          let accumulatedReasoning = '';

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine.startsWith('data: ')) {
              const dataStr = trimmedLine.slice(6);
              if (dataStr === '[DONE]') break;
              try {
                const parsed = JSON.parse(dataStr);
                if (parsed.error) {
                  throw new Error(parsed.error);
                }
                accumulatedContent += (parsed.content || '');
                accumulatedReasoning += (parsed.reasoning || '');
              } catch (e: any) {
                if (e.message !== "Unexpected end of JSON input" && !e.message.includes("is not valid JSON")) {
                  throw e; // Re-throw actual API errors
                }
                // Otherwise ignore incomplete JSON
              }
            }
          }

          if (accumulatedContent || accumulatedReasoning) {
            setMessages((prev) => {
              const newMessages = [...prev];
              const lastIdx = newMessages.length - 1;
              const lastMsg = newMessages[lastIdx];
              
              return [
                ...newMessages.slice(0, lastIdx),
                {
                  ...lastMsg,
                  content: lastMsg.content + accumulatedContent,
                  reasoning: (lastMsg.reasoning || '') + accumulatedReasoning
                }
              ];
            });
          }
        }
      }
    } catch (error: any) {
      console.error(error);
      setMessages((prev) => {
        const newMsgs = [...prev];
        newMsgs[newMsgs.length - 1] = { role: 'assistant', content: `**Error:** ${error.message || 'Failed to fetch response'}` };
        return newMsgs;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const suggestions = [
    { text: "Write a Python snake game with curses" },
    { text: "Explain what a closure is in JavaScript" },
    { text: "Build a REST API with FastAPI + JWT auth" },
    { text: "Refactor this React component to hooks" }
  ];

  const renderAssistantMessage = (msg: ChatMessage) => {
    let displayContent = msg.content;
    let displayReasoning = msg.reasoning || '';
    let isThinkingPhase = false;

    // Parse <think> out of content
    const thinkStart = displayContent.indexOf('<think>');
    if (thinkStart !== -1) {
      const thinkEnd = displayContent.indexOf('</think>');
      if (thinkEnd !== -1) {
        displayReasoning += (displayReasoning ? '\n' : '') + displayContent.substring(thinkStart + 7, thinkEnd);
        displayContent = displayContent.substring(0, thinkStart) + displayContent.substring(thinkEnd + 9);
      } else {
        displayReasoning += (displayReasoning ? '\n' : '') + displayContent.substring(thinkStart + 7);
        displayContent = displayContent.substring(0, thinkStart);
        isThinkingPhase = true;
      }
    }

    displayReasoning = displayReasoning.trim();
    const isCurrentlyThinking = isLoading && [...messages].pop() === msg && !displayContent && !displayReasoning;
    const shouldShowThoughts = displayReasoning || isThinkingPhase || (isLoading && [...messages].pop() === msg && !displayContent && isThinking);

    return (
      <div className="flex flex-col w-full">
        {shouldShowThoughts && (
          <ThoughtBlock 
            thoughts={displayReasoning} 
            isThinkingPhase={isThinkingPhase || (isLoading && [...messages].pop() === msg && !displayContent && isThinking) || (isLoading && [...messages].pop() === msg && !displayContent && !!displayReasoning) } 
          />
        )}
        {displayContent && (
          <div className="markdown-body prose prose-invert prose-p:leading-relaxed prose-pre:my-0 max-w-none prose-sm">
            <Markdown>{displayContent}</Markdown>
          </div>
        )}
        {isCurrentlyThinking && !isThinking && (
          <div className="flex items-center gap-2 h-6 mt-1 ml-1">
            <motion.div 
              className="w-1.5 h-1.5 rounded-full bg-blue-400/50"
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
            />
            <motion.div 
              className="w-1.5 h-1.5 rounded-full bg-blue-400/50"
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
            />
            <motion.div 
              className="w-1.5 h-1.5 rounded-full bg-purple-400/50"
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex items-stretch h-screen bg-[#0a0c10] text-gray-200 font-sans overflow-hidden">
      
      {/* Sidebar */}
      <div className="w-[260px] bg-[#0f1116] border-r border-[#1e222b] flex-col hidden md:flex shrink-0">
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-blue-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-mono font-bold text-xs">
              &lt;/&gt;
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-[15px] font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                Neo Coder
              </span>
              <span className="text-[10px] text-gray-500 font-medium">v1 Beta</span>
            </div>
          </div>
          <button className="text-gray-400 hover:text-gray-200 transition-colors p-1.5 rounded-lg hover:bg-[#1a1d24]">
            <PanelLeft size={18} />
          </button>
        </div>

        <div className="px-3">
          <button 
            onClick={createNewChat}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-transparent hover:bg-[#1a1d24] border border-[#2d323e] rounded-xl text-[13px] font-medium transition-colors"
          >
            <Plus size={16} />
            <span>New chat</span>
          </button>
        </div>

        <div className="mt-8 px-3 flex-1 overflow-y-auto">
          <div className="text-[11px] font-medium text-gray-500 tracking-wider mb-2 px-2">RECENT CHATS</div>
          <div className="flex flex-col gap-1">
            {sessions.map((session) => (
              <button
                key={session.id}
                onClick={() => setActiveSessionId(session.id)}
                className={`text-left truncate px-3 py-2 rounded-lg text-[13px] transition-colors ${
                  activeSessionId === session.id 
                    ? 'bg-[#1a1d24] text-gray-200' 
                    : 'text-gray-400 hover:bg-[#1a1d24] hover:text-gray-300'
                }`}
              >
                {session.title}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative h-full min-w-0">
        {/* Header */}
        <header className="h-14 flex shrink-0 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-medium text-gray-200">{activeSession?.title || 'New conversation'}</span>
          </div>
          <button className="p-2 hover:bg-[#1a1d24] rounded-lg text-gray-400 transition-colors">
            <Share size={18} />
          </button>
        </header>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto w-full pb-40">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-6 max-w-3xl mx-auto mt-[-5vh]">
              <div className="h-14 w-14 mb-5 rounded-2xl bg-gradient-to-tr from-blue-500/10 to-purple-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-mono font-bold text-2xl shadow-[0_0_30px_rgba(99,102,241,0.05)]">
                &lt;/&gt;
              </div>
              <h1 className="text-3xl font-bold mb-3 text-white tracking-tight">
                Hi, I'm <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">Neo Coder</span>
              </h1>
              <p className="text-[#a1a1aa] text-[15px] mb-12 text-center max-w-[500px]">
                Your AI coding partner. Ask me to build, debug, explain, or refactor — in any language.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl">
                {suggestions.map((sbg, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(sbg.text)}
                    className="text-left p-4 rounded-xl border border-[#2d323e] bg-transparent hover:bg-[#1a1d24] transition-all hover:border-[#3e4453] text-[13px] text-gray-300"
                  >
                    {sbg.text}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto w-full flex flex-col py-6 px-4 gap-6">
              {messages.filter(m => m.role !== 'system').map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'assistant' && (
                    <div className="h-8 w-8 shrink-0 rounded-lg bg-gradient-to-tr from-blue-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-mono font-bold text-xs mr-4 mt-1">
                      &lt;/&gt;
                    </div>
                  )}
                  <div 
                    className={`px-4 py-3 rounded-2xl max-w-[85%] text-[15px] leading-relaxed ${
                      msg.role === 'user' 
                        ? 'bg-[#252a36] text-gray-100 rounded-tr-sm' 
                        : 'bg-transparent text-gray-200'
                    }`}
                  >
                    {msg.role === 'assistant' ? renderAssistantMessage(msg) : msg.content}
                  </div>
                </div>
              ))}
              <div ref={bottomRef} className="h-4" />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="absolute w-full bottom-0 left-0 bg-gradient-to-t from-[#0a0c10] via-[#0a0c10] to-transparent pt-12 pb-6 px-4">
          <div className="max-w-3xl mx-auto w-full relative">
            <div className="bg-[#181a20] border border-[#2d323e] rounded-2xl shadow-2xl shadow-black/50 flex flex-col p-2 transition-all focus-within:border-[#3e4453] focus-within:bg-[#1a1c22]">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Message Neo Coder..."
                className="w-full bg-transparent text-gray-200 placeholder-gray-500 text-[15px] px-3 py-3 outline-none resize-none min-h-[44px] max-h-40 overflow-y-auto"
                rows={1}
              />
              
              <div className="flex items-center justify-between mt-1 px-1 pb-1">
                <div className="flex gap-2">
                  <button 
                    onClick={() => setIsThinking(!isThinking)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      isThinking ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30' : 'bg-transparent text-[#878c9c] hover:text-gray-300 hover:bg-[#20232a] border border-transparent'
                    }`}
                  >
                    <Lightbulb size={14} className={isThinking ? "text-purple-400" : ""} />
                    <span>Think</span>
                  </button>
                  <button 
                    onClick={() => setIsSearching(!isSearching)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      isSearching ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30' : 'bg-transparent text-[#878c9c] hover:text-gray-300 hover:bg-[#20232a] border border-transparent'
                    }`}
                  >
                    <Search size={14} className={isSearching ? "text-blue-400" : ""} />
                    <span>Search</span>
                  </button>
                </div>
                
                <div className="flex items-center gap-3 pr-1">
                  <button className="text-gray-400 hover:text-gray-300 transition-colors hidden sm:block p-1">
                    <Paperclip size={18} />
                  </button>
                  <button 
                    onClick={() => handleSend()}
                    disabled={!input.trim() || isLoading}
                    className="w-[34px] h-[34px] rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-purple-500/10"
                  >
                    <ArrowUp size={18} strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            </div>
            
            <div className="text-center mt-3 text-[11px] text-[#5e6371] font-medium">
              Neo Coder v1 Beta · May produce inaccurate info — verify critical code.
            </div>
          </div>
        </div>
      </div>

      {memoryPermission === null && (
        <div className="fixed inset-0 bg-[#0a0a0c]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#12141a] border border-[#2d323e] p-6 rounded-2xl max-w-[400px] w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
               <div className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                 <Sparkles size={20} />
               </div>
               <h2 className="text-[17px] font-bold text-gray-100 tracking-tight">Give Neo Memory</h2>
            </div>
            <p className="text-gray-400 text-[14px] mb-8 leading-relaxed">
              Allow Neo to remember details from your previous chats. Neo will summarize and securely store facts about you (like your name or preferences) so you don't have to repeat yourself.
            </p>
            <div className="flex justify-end gap-3 font-medium">
              <button 
                onClick={() => setMemoryPermission(false)}
                className="px-4 py-2 text-[13px] text-gray-400 hover:text-white transition-colors"
              >
                No thanks
              </button>
              <button 
                onClick={() => setMemoryPermission(true)}
                className="px-5 py-2 bg-white text-black hover:bg-gray-200 rounded-lg text-[13px] transition-colors"
              >
                Enable Memory
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
