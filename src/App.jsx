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
  const [isLoading, setIsLoading] = useState(false);
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
          errorMsg = \`서버 오류(\${response.status}): \${rawText.substring(0, 100)}\`;
        }
        throw new Error(errorMsg);
      }

      const data = await response.json();
      let aiText = data.text;
      
      // Parse markdown html block if it exists
      const htmlBlockRegex = /```(?:html)?\n([\s\S]*?)```/;
      const match = aiText.match(htmlBlockRegex);
      
      if (match && match[1]) {
        // Extract the HTML code and update the preview
        setHtmlCode(match[1].trim());
        // Remove the code block from the text shown in the chat
        aiText = aiText.replace(htmlBlockRegex, '').trim();
        if (!aiText) {
          aiText = '오른쪽 프리뷰 화면에 네가 요청한 코드를 만들어 두었어! 확인해 봐.';
        }
      }

      const aiMessage = {
        id: Date.now() + 1,
        sender: 'ai',
        text: aiText
      };

      setMessages(prev => [...prev, aiMessage]);

    } catch (error) {
      console.error("Failed to fetch AI response:", error);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        sender: 'ai',
        text: \`앗, 오류가 발생했어. (에러 원인: \${error.message})\`
      }]);
    } finally {
      setIsLoading(false);
    }
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
