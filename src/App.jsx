import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Code, Play, LogOut } from 'lucide-react';
import { GoogleLogin, googleLogout } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import './App.css';

function App() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'ai',
      text: '안녕! 나는 너의 인공지능 코딩 튜터야. 오늘 어떤 웹페이지를 만들어 볼까? 궁금한 게 있으면 편하게 물어봐!'
    }
  ]);
  const [input, setInput] = useState('');
  const [htmlCode, setHtmlCode] = useState('<div style="text-align: center; padding: 2rem; font-family: sans-serif; color: #333;">\n  <h1>안녕! 여기는 프리뷰 화면이야!</h1>\n  <p>왼쪽에서 대화로 코딩을 시작해봐.</p>\n</div>');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('preview');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
          <h1 className="login-title">AI 샌드박스 튜터</h1>
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
          <Sparkles size={28} color="#c084fc" />
          <h1 className="header-title">AI 샌드박스 튜터</h1>
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
        {/* Chat Interface Panel */}
        <section className="chat-panel glass">
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
        <section className="preview-panel glass">
          <div className="preview-header">
            <div className="tabs">
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
