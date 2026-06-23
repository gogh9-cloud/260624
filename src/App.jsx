import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Code, Play, LogOut, Trash2, Download, Plus, MessageSquare, PanelLeftClose, PanelLeft, PanelRightClose, PanelRight, Edit2 } from 'lucide-react';
import { GoogleLogin, googleLogout } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import './App.css';

function App() {
  const defaultMessages = [
    {
      id: 1,
      sender: 'ai',
      text: '안녕! 나는 너의 인공지능 코딩 튜터야. 오늘 어떤 웹페이지를 만들어 볼까? 궁금한 게 있으면 편하게 물어봐!'
    }
  ];
  const defaultHtml = '<div style="text-align: center; padding: 2rem; font-family: sans-serif; color: #333;">\n  <h1>안녕! 여기는 프리뷰 화면이야!</h1>\n  <p>왼쪽에서 대화로 코딩을 시작해봐.</p>\n</div>';

  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [messages, setMessages] = useState(defaultMessages);
  const [input, setInput] = useState('');
  const [htmlCode, setHtmlCode] = useState(defaultHtml);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('preview');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [editTitleValue, setEditTitleValue] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 1. 로그인 성공 후 사용자별 세션 데이터 불러오기
  useEffect(() => {
    if (isLoggedIn && userProfile?.email) {
      const storageKey = `sandbox_sessions_${userProfile.email}`;
      const savedData = localStorage.getItem(storageKey);
      
      let loadedSessions = [];
      if (savedData) {
        try {
          loadedSessions = JSON.parse(savedData);
        } catch (e) {
          console.error("Failed to parse local storage data:", e);
        }
      }
      
      // 마이그레이션: 기존 단일 채팅 데이터가 있으면 세션으로 변환
      const oldStorageKey = `sandbox_data_${userProfile.email}`;
      const oldSavedData = localStorage.getItem(oldStorageKey);
      if (loadedSessions.length === 0 && oldSavedData) {
        try {
          const oldData = JSON.parse(oldSavedData);
          if (oldData.savedMessages && oldData.savedMessages.length > 1) {
             const firstUserMsg = oldData.savedMessages.find(m => m.sender === 'user');
             const title = firstUserMsg ? firstUserMsg.text.substring(0, 15) : '이전 채팅';
             loadedSessions = [{
               id: Date.now().toString(),
               title: title,
               messages: oldData.savedMessages,
               htmlCode: oldData.savedHtml || defaultHtml
             }];
             localStorage.removeItem(oldStorageKey);
          }
        } catch(e) {}
      }

      if (loadedSessions.length > 0) {
        setSessions(loadedSessions);
        const current = loadedSessions[0];
        setCurrentSessionId(current.id);
        setMessages(current.messages);
        setHtmlCode(current.htmlCode || defaultHtml);
      } else {
        const newSessionId = Date.now().toString();
        const initialSession = {
          id: newSessionId,
          title: '새 채팅',
          messages: defaultMessages,
          htmlCode: defaultHtml
        };
        setSessions([initialSession]);
        setCurrentSessionId(newSessionId);
        setMessages(defaultMessages);
        setHtmlCode(defaultHtml);
      }
    }
  }, [isLoggedIn, userProfile]);

  // 2. 데이터 변경 시 자동 저장 로직
  useEffect(() => {
    if (isLoggedIn && userProfile?.email && currentSessionId) {
       setSessions(prev => {
          const updated = prev.map(s => {
             if (s.id === currentSessionId) {
                let newTitle = s.title;
                if (newTitle === '새 채팅' && messages.length > 1) {
                   const firstUserMsg = messages.find(m => m.sender === 'user');
                   if (firstUserMsg) {
                     newTitle = firstUserMsg.text.substring(0, 15) + (firstUserMsg.text.length > 15 ? '...' : '');
                   }
                }
                return { ...s, title: newTitle, messages, htmlCode };
             }
             return s;
          });
          localStorage.setItem(`sandbox_sessions_${userProfile.email}`, JSON.stringify(updated));
          return updated;
       });
    }
    scrollToBottom();
  }, [messages, htmlCode, currentSessionId, isLoggedIn, userProfile]);

  const handleNewChat = () => {
    const newSessionId = Date.now().toString();
    const newSession = {
      id: newSessionId,
      title: '새 채팅',
      messages: defaultMessages,
      htmlCode: defaultHtml
    };
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSessionId);
    setMessages(defaultMessages);
    setHtmlCode(defaultHtml);
  };

  const handleSwitchSession = (sessionId) => {
    if (sessionId === currentSessionId) return;
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      setCurrentSessionId(sessionId);
      setMessages(session.messages);
      setHtmlCode(session.htmlCode || defaultHtml);
    }
  };

  const handleDeleteSession = (e, sessionId) => {
    e.stopPropagation();
    if (window.confirm('이 채팅방을 삭제하시겠습니까?')) {
      setSessions(prev => {
        const updated = prev.filter(s => s.id !== sessionId);
        if (updated.length === 0) {
           const newSessionId = Date.now().toString();
           const newSession = { id: newSessionId, title: '새 채팅', messages: defaultMessages, htmlCode: defaultHtml };
           setCurrentSessionId(newSessionId);
           setMessages(defaultMessages);
           setHtmlCode(defaultHtml);
           return [newSession];
        } else if (currentSessionId === sessionId) {
           const nextSession = updated[0];
           setCurrentSessionId(nextSession.id);
           setMessages(nextSession.messages);
           setHtmlCode(nextSession.htmlCode || defaultHtml);
        }
        return updated;
      });
    }
  };

  const handleRenameStart = (e, session) => {
    e.stopPropagation();
    setEditingSessionId(session.id);
    setEditTitleValue(session.title);
  };

  const handleRenameSave = (sessionId) => {
    if (editTitleValue.trim()) {
      setSessions(prev => {
        const updated = prev.map(s => s.id === sessionId ? { ...s, title: editTitleValue.trim() } : s);
        if (isLoggedIn && userProfile?.email) {
          localStorage.setItem(`sandbox_sessions_${userProfile.email}`, JSON.stringify(updated));
        }
        return updated;
      });
    }
    setEditingSessionId(null);
    setEditTitleValue('');
  };

  const handleRenameCancel = () => {
    setEditingSessionId(null);
    setEditTitleValue('');
  };

  const handleDownload = () => {
    const blob = new Blob([htmlCode], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'my-game.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      sender: 'user',
      text: input.trim()
    };
    
    // Add user message to state
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // Send history excluding the initial welcome message if needed, but sending all is fine
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!response.ok) {
        const rawText = await response.text();
        console.error("Raw Server Error:", rawText);
        let errorMsg = 'API response was not ok';
        try {
          const parsed = JSON.parse(rawText);
          if (parsed.details) {
            errorMsg = parsed.details;
          } else if (parsed.error) {
            errorMsg = typeof parsed.error === 'string' ? parsed.error : JSON.stringify(parsed.error);
          }
        } catch(e) {
          errorMsg = `서버 오류(${response.status}): ${rawText.substring(0, 100)}`;
        }
        throw new Error(errorMsg);
      }

      // Read the stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let aiText = '';
      
      const aiMessageId = Date.now() + 1;
      setMessages(prev => [...prev, { id: aiMessageId, sender: 'ai', text: '타이핑 중...' }]);

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) {
          aiText += decoder.decode(value, { stream: true });
          setMessages(prev => prev.map(msg => 
            msg.id === aiMessageId ? { ...msg, text: aiText } : msg
          ));
        }
      }

      // Parse markdown html block if it exists
      let htmlBlockRegex = /```[a-z]*\s*([\s\S]*?)```/i;
      let match = aiText.match(htmlBlockRegex);
      
      if (!match) {
        // Fallback: AI might have forgotten the closing backticks at the end
        htmlBlockRegex = /```[a-z]*\s*([\s\S]*)$/i;
        match = aiText.match(htmlBlockRegex);
      }

      if (match && match[1]) {
        // Extract the HTML code and update the preview
        setHtmlCode(match[1].trim());
        setIsPreviewOpen(true);
        // Remove the code block from the text shown in the chat
        aiText = aiText.replace(match[0], '').trim();
        if (!aiText) {
          aiText = '오른쪽 프리뷰 화면에 네가 요청한 코드를 만들어 두었어! 확인해 봐.';
        }
        // Update the message one last time without the code block
        setMessages(prev => prev.map(msg => 
            msg.id === aiMessageId ? { ...msg, text: aiText } : msg
        ));
      }

    } catch (error) {
      console.error("Failed to fetch AI response:", error);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        sender: 'ai',
        text: `앗, 오류가 발생했어. (에러 원인: ${error.message})`
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginSuccess = (credentialResponse) => {
    try {
      const decoded = jwtDecode(credentialResponse.credential);
      setUserProfile({
        name: decoded.name,
        picture: decoded.picture,
        email: decoded.email
      });
      setIsLoggedIn(true);
    } catch (error) {
      console.error("Login decoding failed:", error);
    }
  };

  const handleLogout = () => {
    googleLogout();
    setIsLoggedIn(false);
    setUserProfile(null);
  };

  if (!isLoggedIn) {
    return (
      <div className="login-container">
        <div className="login-card glass">
          <Sparkles size={48} color="#c084fc" style={{ marginBottom: '20px' }} />
          <h1 className="login-title">우리반 AI</h1>
          <p className="login-subtitle">구글 계정으로 로그인하고 바이브 코딩을 시작해 보세요!</p>
          <div className="login-button-wrapper">
            <GoogleLogin
              onSuccess={handleLoginSuccess}
              onError={() => console.error('Login Failed')}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="header glass">
        <div className="header-left">
          <button className="toggle-panel-btn" onClick={() => setIsSidebarOpen(!isSidebarOpen)} title="사이드바 열기/닫기">
            {isSidebarOpen ? <PanelLeftClose size={24} /> : <PanelLeft size={24} />}
          </button>
          <Sparkles size={28} color="#c084fc" />
          <h1 className="header-title">우리반 AI</h1>
        </div>
        
        {userProfile && (
          <div className="header-right">
            <div className="user-profile">
              <img src={userProfile.picture} alt={userProfile.name} className="profile-img" />
              <span className="profile-name">{userProfile.name}</span>
            </div>
            <button className="logout-button" onClick={handleLogout} title="로그아웃">
              <LogOut size={18} />
            </button>
          </div>
        )}
      </header>

      <main className="main-content">
        {/* Sidebar Panel */}
        <aside className={`sidebar glass ${isSidebarOpen ? 'open' : 'closed'}`}>
          <button className="new-chat-button" onClick={handleNewChat}>
            <Plus size={18} /> 새 채팅
          </button>
          <div className="session-list">
            {sessions.map(session => (
              <div 
                key={session.id} 
                className={`session-item ${session.id === currentSessionId ? 'active' : ''}`}
                onClick={() => {
                  if (editingSessionId !== session.id) handleSwitchSession(session.id);
                }}
              >
                <MessageSquare size={16} className="session-icon" />
                
                {editingSessionId === session.id ? (
                  <input
                    type="text"
                    className="session-title-edit"
                    value={editTitleValue}
                    onChange={(e) => setEditTitleValue(e.target.value)}
                    onBlur={() => handleRenameSave(session.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRenameSave(session.id);
                      if (e.key === 'Escape') handleRenameCancel();
                    }}
                    autoFocus
                  />
                ) : (
                  <span className="session-title">{session.title}</span>
                )}

                {session.id === currentSessionId && editingSessionId !== session.id && (
                  <div className="session-actions">
                    <button className="icon-action-btn" onClick={(e) => handleRenameStart(e, session)} title="이름 변경">
                      <Edit2 size={14} />
                    </button>
                    <button className="icon-action-btn delete" onClick={(e) => handleDeleteSession(e, session.id)} title="삭제">
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </aside>

        {/* Chat Interface Panel */}
        <section className="chat-panel glass">
          {!isPreviewOpen && (
             <div className="chat-top-bar">
               <button className="toggle-panel-btn float-right" onClick={() => setIsPreviewOpen(true)}>
                 <PanelRight size={18} /> 프리뷰 열기
               </button>
             </div>
          )}
          <div className="message-list">
            {messages.map((msg) => (
              <div key={msg.id} className={`message animate-fade-in ${msg.sender}`}>
                {msg.text}
              </div>
            ))}
            {isLoading && (
              <div className="message ai animate-fade-in">
                튜터가 생각 중이야... 💭
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          
          <div className="input-area">
            <input
              type="text"
              className="chat-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="튜터에게 궁금한 걸 물어보거나 코딩을 부탁해 봐!"
              disabled={isLoading}
            />
            <button 
              className="send-button" 
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
            >
              <Send size={20} />
            </button>
          </div>
        </section>

        {/* Sandbox Preview Panel */}
        <section className={`preview-panel glass ${isPreviewOpen ? 'open' : 'closed'}`}>
          <div className="preview-header">
            <div className="tabs">
              <button className="toggle-panel-btn hide-preview" onClick={() => setIsPreviewOpen(false)} title="프리뷰 닫기">
                <PanelRightClose size={18} />
              </button>
              <button 
                className={`tab-btn ${activeTab === 'preview' ? 'active' : ''}`}
                onClick={() => setActiveTab('preview')}
              >
                <Play size={16} /> 미리보기
              </button>
              <button 
                className={`tab-btn ${activeTab === 'code' ? 'active' : ''}`}
                onClick={() => setActiveTab('code')}
              >
                <Code size={16} /> 코드
              </button>
            </div>
            <button className="download-button" onClick={handleDownload} title="HTML 파일로 저장">
              <Download size={16} /> 저장하기
            </button>
          </div>
          <div className="iframe-container">
            {activeTab === 'preview' ? (
              <iframe 
                title="sandbox-preview"
                srcDoc={htmlCode}
                sandbox="allow-scripts"
              />
            ) : (
              <pre className="code-block">
                <code>{htmlCode}</code>
              </pre>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
