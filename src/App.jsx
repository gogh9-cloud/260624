import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Code, Play } from 'lucide-react';
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
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage = {
      id: Date.now(),
      sender: 'user',
      text: input.trim()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');

    // Mock AI Response
    setTimeout(() => {
      const isCodingRequest = userMessage.text.includes('만들어') || userMessage.text.includes('버튼') || userMessage.text.includes('색');
      
      const aiResponse = {
        id: Date.now() + 1,
        sender: 'ai',
        text: isCodingRequest 
          ? '좋아! 네가 말한대로 코드를 수정해 봤어. 오른쪽 화면을 확인해 봐!' 
          : '훌륭한 질문이야! 웹페이지는 HTML이라는 뼈대와 CSS라는 예쁜 옷으로 만들어져. 또 궁금한 거 있니?'
      };

      setMessages(prev => [...prev, aiResponse]);

      if (isCodingRequest) {
        setHtmlCode(`
          <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; font-family: 'Comic Sans MS', sans-serif; background: linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%);">
            <h1 style="color: #fff; text-shadow: 2px 2px 4px rgba(0,0,0,0.2);">네가 만든 멋진 웹페이지!</h1>
            <button style="padding: 15px 30px; font-size: 1.2rem; background: #ff758c; color: white; border: none; border-radius: 25px; cursor: pointer; box-shadow: 0 4px 15px rgba(255, 117, 140, 0.4); transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
              나를 눌러봐!
            </button>
          </div>
        `);
      }
    }, 1000);
  };

  return (
    <div className="app-container">
      <header className="header glass">
        <Sparkles size={28} color="#c084fc" />
        <h1 className="header-title">AI 샌드박스 튜터</h1>
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
            />
            <button 
              className="send-button" 
              onClick={handleSend}
              disabled={!input.trim()}
            >
              <Send size={20} />
            </button>
          </div>
        </section>

        {/* Sandbox Preview Panel */}
        <section className="preview-panel glass">
          <div className="preview-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Code size={18} color="#9ba1a6" />
              <span className="preview-title">바이브 코딩 결과물 (미리보기)</span>
            </div>
            <Play size={18} color="#10b981" />
          </div>
          <div className="iframe-container">
            <iframe 
              title="sandbox-preview"
              srcDoc={htmlCode}
              sandbox="allow-scripts"
            />
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
