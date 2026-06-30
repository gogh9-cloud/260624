import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Code, Play, LogOut, Trash2, Download, Plus, MessageSquare, PanelLeftClose, PanelLeft, PanelRightClose, PanelRight, Edit2, LayoutDashboard, Copy, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { GoogleLogin, googleLogout } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import './App.css';

function StudentSandbox() {
  const navigate = useNavigate();
  const defaultMessages = [
    {
      id: 1,
      sender: 'ai',
      text: '안녕! 궁금한 게 있으면 편하게 물어봐! 코딩도 도와줄 수 있어.'
    }
  ];
  const defaultHtml = '<div style="text-align: center; padding: 2rem; font-family: sans-serif; color: #333;">\n  <h1>안녕! 여기는 프리뷰 화면이야!</h1>\n  <p>왼쪽에서 대화로 코딩을 시작해봐.</p>\n</div>';

  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [messages, setMessages] = useState(defaultMessages);
  const [input, setInput] = useState('');
  const [htmlCode, setHtmlCode] = useState(defaultHtml);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('튜터가 생각 중이야... 💭');
  const [activeTab, setActiveTab] = useState('preview');
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem('user_profile') ? true : false;
  });
  const [userProfile, setUserProfile] = useState(() => {
    const saved = localStorage.getItem('user_profile');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [violationCount, setViolationCount] = useState(0);
  const [isBanned, setIsBanned] = useState(false);
  const [editTitleValue, setEditTitleValue] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [hasAgreedToGuidelines, setHasAgreedToGuidelines] = useState(false);
  const [guidelineAnswers, setGuidelineAnswers] = useState({
    q1: '', q2: '', q3: '', q4: '', q5: '', q6: ''
  });
  const messagesEndRef = useRef(null);
  const loadingTimerRef = useRef(null);
  const loadingTimer2Ref = useRef(null);
  const abortControllerRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 1. 로그인 성공 후 사용자별 세션 데이터 불러오기
  useEffect(() => {
    if (isLoggedIn && userProfile?.email) {
      const agreed = localStorage.getItem(`agreed_guidelines_${userProfile.email}`);
      if (agreed === 'true') {
        setHasAgreedToGuidelines(true);
      } else {
        setHasAgreedToGuidelines(false);
      }

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
               htmlCode: oldData.savedHtml || defaultHtml,
               violationCount: 0,
               isBanned: false
             }];
             localStorage.removeItem(oldStorageKey);
          }
        } catch {
          // ignore error
        }
      }

      if (loadedSessions.length > 0) {
        setSessions(loadedSessions);
        const current = loadedSessions[0];
        setCurrentSessionId(current.id);
        setMessages(current.messages);
        setHtmlCode(current.htmlCode || defaultHtml);
        setViolationCount(current.violationCount || 0);
        setIsBanned(current.isBanned || false);
      } else {
        const newSessionId = Date.now().toString();
        const initialSession = {
          id: newSessionId,
          title: '새 채팅',
          messages: defaultMessages,
          htmlCode: defaultHtml,
          violationCount: 0,
          isBanned: false
        };
        setSessions([initialSession]);
        setCurrentSessionId(newSessionId);
        setMessages(defaultMessages);
        setHtmlCode(defaultHtml);
        setViolationCount(0);
        setIsBanned(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, userProfile]);

  // 2. 데이터 변경 시 자동 저장 로직
  useEffect(() => {
    if (isLoggedIn && userProfile?.email && currentSessionId) {
       setSessions(prev => {
          let updatedSession = null;
          const updated = prev.map(s => {
             if (s.id === currentSessionId) {
                let newTitle = s.title;
                if (newTitle === '새 채팅' && messages.length > 1) {
                   const firstUserMsg = messages.find(m => m.sender === 'user');
                   if (firstUserMsg) {
                     newTitle = firstUserMsg.text.substring(0, 15) + (firstUserMsg.text.length > 15 ? '...' : '');
                   }
                }
                updatedSession = { 
                  ...s, 
                  title: newTitle, 
                  messages, 
                  htmlCode,
                  violationCount,
                  isBanned
                };
                return updatedSession;
             }
             return s;
          });
          
          // Save to local storage
          localStorage.setItem(`sandbox_sessions_${userProfile.email}`, JSON.stringify(updated));
          
          // Save to Supabase (only if the current session was successfully updated)
          if (updatedSession) {
             supabase.from('student_sessions').upsert({
               session_id: updatedSession.id,
               student_email: userProfile.email,
               student_name: userProfile.name,
               title: updatedSession.title,
               messages: [
                 ...updatedSession.messages,
                 {
                   id: 'metadata',
                   sender: 'metadata',
                   isBanned: isBanned,
                   violationCount: violationCount
                 }
               ],
               html_code: updatedSession.htmlCode,
               updated_at: new Date().toISOString()
             }, { onConflict: 'student_email, session_id' }).then(({ error }) => {
                if (error) console.error("Supabase upsert error:", error);
             });
          }
          
          return updated;
       });
    }
    scrollToBottom();
  }, [messages, htmlCode, currentSessionId, isLoggedIn, userProfile, violationCount, isBanned]);

  // 3. 정지 상태일 때 Supabase를 주기적으로 폴링하여 정지 해제 여부 감지
  useEffect(() => {
    let intervalId;
    if (isBanned && isLoggedIn && userProfile?.email && currentSessionId) {
      intervalId = setInterval(async () => {
        try {
          const { data, error } = await supabase
            .from('student_sessions')
            .select('messages')
            .eq('student_email', userProfile.email)
            .eq('session_id', currentSessionId)
            .maybeSingle();

          if (error) {
            console.error("Polling error fetching session:", error);
            return;
          }

          if (data && data.messages) {
            const metadata = data.messages.find(m => m.sender === 'metadata');
            if (metadata && metadata.isBanned === false) {
              setIsBanned(false);
              setViolationCount(0);
              
              const cleanMessages = data.messages.filter(m => m.sender !== 'metadata');
              setMessages(cleanMessages);
              
              setSessions(prev => {
                const updated = prev.map(s => {
                  if (s.id === currentSessionId) {
                    return {
                      ...s,
                      messages: cleanMessages,
                      isBanned: false,
                      violationCount: 0
                    };
                  }
                  return s;
                });
                localStorage.setItem(`sandbox_sessions_${userProfile.email}`, JSON.stringify(updated));
                return updated;
              });
            }
          }
        } catch (e) {
          console.error("Error in check unban polling:", e);
        }
      }, 3000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isBanned, isLoggedIn, userProfile, currentSessionId]);

  const handleNewChat = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    clearTimeout(loadingTimerRef.current);
    clearTimeout(loadingTimer2Ref.current);
    setIsLoading(false);
    setLoadingText('튜터가 생각 중이야... 💭');

    const newSessionId = Date.now().toString();
    const newSession = {
      id: newSessionId,
      title: '새 채팅',
      messages: defaultMessages,
      htmlCode: defaultHtml,
      violationCount: 0,
      isBanned: false
    };
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSessionId);
    setMessages(defaultMessages);
    setHtmlCode(defaultHtml);
    setViolationCount(0);
    setIsBanned(false);
  };

  const handleSwitchSession = (sessionId) => {
    if (sessionId === currentSessionId) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    clearTimeout(loadingTimerRef.current);
    clearTimeout(loadingTimer2Ref.current);
    setIsLoading(false);
    setLoadingText('튜터가 생각 중이야... 💭');

    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      setCurrentSessionId(sessionId);
      setMessages(session.messages);
      setHtmlCode(session.htmlCode || defaultHtml);
      setViolationCount(session.violationCount || 0);
      setIsBanned(session.isBanned || false);
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
        let updatedSession = null;
        const updated = prev.map(s => {
          if (s.id === sessionId) {
            updatedSession = { ...s, title: editTitleValue.trim() };
            return updatedSession;
          }
          return s;
        });
        
        if (isLoggedIn && userProfile?.email) {
          localStorage.setItem(`sandbox_sessions_${userProfile.email}`, JSON.stringify(updated));
          if (updatedSession) {
             supabase.from('student_sessions').upsert({
               session_id: updatedSession.id,
               student_email: userProfile.email,
               student_name: userProfile.name,
               title: updatedSession.title,
               messages: [
                 ...updatedSession.messages,
                 {
                   id: 'metadata',
                   sender: 'metadata',
                   isBanned: isBanned,
                   violationCount: violationCount
                 }
               ],
               html_code: updatedSession.htmlCode,
               updated_at: new Date().toISOString()
             }, { onConflict: 'student_email, session_id' }).catch(console.error);
          }
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

  const handleCopy = () => {
    navigator.clipboard.writeText(htmlCode).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  const handleDownload = () => {
    const session = sessions.find(s => s.id === currentSessionId);
    let fileName = 'my-app.html';
    
    if (session && session.title) {
      // 윈도우/맥 등에서 파일명으로 쓸 수 없는 특수문자 제거 및 공백을 하이픈으로 변경
      const safeTitle = session.title
        .replace(/[^a-zA-Z0-9가-힣ㄱ-ㅎㅏ-ㅣ\s_-]/g, '')
        .trim()
        .replace(/\s+/g, '-');
        
      if (safeTitle) {
        fileName = `${safeTitle}.html`;
      }
    }

    const blob = new Blob([htmlCode], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSend = async () => {
    if (isBanned) return;
    if (!input.trim() || isLoading) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

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
    setLoadingText('튜터가 생각 중이야... 💭');

    // Timers to update loading text for long tasks
    loadingTimerRef.current = setTimeout(() => {
      setLoadingText('답변을 꼼꼼하게 작성하고 있어요... ✍️');
    }, 8000);
    
    loadingTimer2Ref.current = setTimeout(() => {
      setLoadingText('거의 다 완성되어 가요. 조금만 더 기다려 주세요! 🚀');
    }, 18000);

    let aiMessageId = null;
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          messages: newMessages,
          violationCount: violationCount
        }),
        signal: signal,
      });

      if (!response.ok) {
        const rawText = await response.text();
        console.error("Raw Server Error:", rawText);
        let errorMsg = 'API response was not ok';
        if (response.status === 504) {
          errorMsg = "코드가 조금 길어 AI 튜터가 생각하는 데 시간이 초과(504 Timeout)되었어요. 더 짧은 질문으로 나누어 물어보거나, 기능을 하나씩 나눠서 구현해 달라고 부탁해 보세요!";
        } else {
          try {
            const parsed = JSON.parse(rawText);
            if (parsed.details) {
              errorMsg = parsed.details;
            } else if (parsed.error) {
              errorMsg = typeof parsed.error === 'string' ? parsed.error : JSON.stringify(parsed.error);
            }
          } catch {
            errorMsg = `서버 오류(${response.status}): ${rawText.substring(0, 100)}`;
          }
        }
        throw new Error(errorMsg);
      }

      // Read the stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let aiText = '';
      let hasWarning = false;
      let hasBan = false;
      
      aiMessageId = Date.now() + 1;
      setMessages(prev => [...prev, { id: aiMessageId, sender: 'ai', text: '타이핑 중...' }]);

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) {
          const chunkText = decoder.decode(value, { stream: true });
          if (chunkText.includes('[API_ERROR:')) {
            const errorMatch = chunkText.match(/\[API_ERROR:\s*([\s\S]*?)\]/);
            const errMsg = errorMatch ? errorMatch[1] : "인공지능 서비스 연결 중 내부 문제가 발생했습니다.";
            throw new Error(errMsg);
          }
          aiText += chunkText;

          if (aiText.includes('[VIOLATION: WARNING]')) {
            hasWarning = true;
          }
          if (aiText.includes('[VIOLATION: BAN]')) {
            hasBan = true;
          }

          const displayText = aiText
            .replace(/\[VIOLATION:\s*WARNING\]/g, '')
            .replace(/\[VIOLATION:\s*BAN\]/g, '')
            .trim();

          setMessages(prev => prev.map(msg => 
            msg.id === aiMessageId ? { ...msg, text: displayText || '타이핑 중...' } : msg
          ));
        }
      }

      if (hasWarning) {
        setViolationCount(1);
      }
      if (hasBan) {
        setIsBanned(true);
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
      if (error.name === 'AbortError') {
        console.log("Request aborted.");
        return;
      }
      console.error("Failed to fetch AI response:", error);
      setMessages(prev => {
        const cleanMessages = prev.filter(msg => msg.id !== aiMessageId);
        return [...cleanMessages, {
          id: Date.now() + 1,
          sender: 'ai',
          text: `앗, 오류가 발생했어. (에러 원인: ${error.message})`
        }];
      });
    } finally {
      clearTimeout(loadingTimerRef.current);
      clearTimeout(loadingTimer2Ref.current);
      setIsLoading(false);
    }
  };

  const handleLoginSuccess = (credentialResponse) => {
    try {
      const decoded = jwtDecode(credentialResponse.credential);
      const profile = {
        name: decoded.name,
        picture: decoded.picture,
        email: decoded.email
      };
      localStorage.setItem('user_profile', JSON.stringify(profile));
      setUserProfile(profile);
      setIsLoggedIn(true);
    } catch (error) {
      console.error("Login decoding failed:", error);
    }
  };

  const handleLogout = () => {
    googleLogout();
    localStorage.removeItem('user_profile');
    setIsLoggedIn(false);
    setUserProfile(null);
  };

  if (!isLoggedIn) {
    return (
      <div className="login-container">
        <div className="login-card glass">
          <Sparkles size={48} color="#c084fc" style={{ marginBottom: '20px' }} />
          <h1 className="login-title">우리반 AI</h1>
          <p className="login-subtitle">
            구글 계정으로 로그인하고<br />
            바이브 코딩을 시작해 보세요!
          </p>
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

  const handleAgreeGuidelines = () => {
    localStorage.setItem(`agreed_guidelines_${userProfile.email}`, 'true');
    setHasAgreedToGuidelines(true);
  };

  const handleGuidelineChange = (q, value) => {
    setGuidelineAnswers(prev => ({ ...prev, [q]: value }));
  };

  const isQ1Correct = guidelineAnswers.q1.trim() === '왜';
  const isQ2Correct = guidelineAnswers.q2.trim() === '생각';
  const isQ3Correct = guidelineAnswers.q3.trim() === '틀릴';
  const isQ4Correct = guidelineAnswers.q4.trim().replace(/\s+/g, '') === '내생각';
  const isQ5Correct = guidelineAnswers.q5.trim().replace(/\s+/g, '') === '나의정보';
  const isQ6Correct = guidelineAnswers.q6.trim() === '정직';
  const isAllCorrect = isQ1Correct && isQ2Correct && isQ3Correct && isQ4Correct && isQ5Correct && isQ6Correct;

  return (
    <div className="app-container">
      {/* 가이드라인 모달 */}
      {isLoggedIn && !hasAgreedToGuidelines && (
        <div className="guideline-modal-overlay">
          <div className="guideline-modal-content">
            <h2>생성형 AI 활용 가이드 🌟</h2>
            <p className="guideline-intro">선생님이 보여주시는 화면을 보고 빈칸을 올바르게 채워주세요!</p>
            <ul className="guideline-list">
              <li className={isQ1Correct ? 'correct' : ''}>
                <div className="guideline-item-header">
                  <strong>1. 활용 목적</strong>
                  <input type="checkbox" checked={isQ1Correct} readOnly />
                </div>
                <p>
                  생성형 AI를 쓰기 전, '
                  <input type="text" className="guideline-input" value={guidelineAnswers.q1} onChange={(e) => handleGuidelineChange('q1', e.target.value)} maxLength={5} placeholder="왜" />
                  ' 쓰는지 말할 수 있어야 해요.
                </p>
              </li>
              <li className={isQ2Correct ? 'correct' : ''}>
                <div className="guideline-item-header">
                  <strong>2. 주도적 학습</strong>
                  <input type="checkbox" checked={isQ2Correct} readOnly />
                </div>
                <p>
                  생성형 AI에게 물어보기 전, 내 <input type="text" className="guideline-input" value={guidelineAnswers.q2} onChange={(e) => handleGuidelineChange('q2', e.target.value)} maxLength={5} placeholder="생각" />을(를) 먼저 말해요.
                </p>
              </li>
              <li className={isQ3Correct ? 'correct' : ''}>
                <div className="guideline-item-header">
                  <strong>3. 비판적 검증</strong>
                  <input type="checkbox" checked={isQ3Correct} readOnly />
                </div>
                <p>
                  생성형 AI가 <input type="text" className="guideline-input" value={guidelineAnswers.q3} onChange={(e) => handleGuidelineChange('q3', e.target.value)} maxLength={5} placeholder="틀릴" /> 수 있다는 점을 알아요.
                </p>
              </li>
              <li className={isQ4Correct ? 'correct' : ''}>
                <div className="guideline-item-header">
                  <strong>4. 사고의 확장</strong>
                  <input type="checkbox" checked={isQ4Correct} readOnly />
                </div>
                <p>
                  생성형 AI와 함께 상상하며 <input type="text" className="guideline-input" style={{width: '80px'}} value={guidelineAnswers.q4} onChange={(e) => handleGuidelineChange('q4', e.target.value)} maxLength={6} placeholder="내 생각" />을(를) 더 크게 키워요.
                </p>
              </li>
              <li className={isQ5Correct ? 'correct' : ''}>
                <div className="guideline-item-header">
                  <strong>5. 안전과 관계</strong>
                  <input type="checkbox" checked={isQ5Correct} readOnly />
                </div>
                <p>
                  <input type="text" className="guideline-input" style={{width: '90px'}} value={guidelineAnswers.q5} onChange={(e) => handleGuidelineChange('q5', e.target.value)} maxLength={6} placeholder="나의 정보" />와(과) 비밀을 말하지 않아요.
                </p>
              </li>
              <li className={isQ6Correct ? 'correct' : ''}>
                <div className="guideline-item-header">
                  <strong>6. 투명성·윤리</strong>
                  <input type="checkbox" checked={isQ6Correct} readOnly />
                </div>
                <p>
                  생성형 AI의 도움을 받았다면 숨기지 않고 <input type="text" className="guideline-input" value={guidelineAnswers.q6} onChange={(e) => handleGuidelineChange('q6', e.target.value)} maxLength={5} placeholder="정직" />하게 이야기해요.
                </p>
              </li>
            </ul>
            <button 
              className="guideline-agree-btn" 
              onClick={handleAgreeGuidelines} 
              disabled={!isAllCorrect}
            >
              모두 확인하고 동의하기
            </button>
          </div>
        </div>
      )}

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
            {userProfile.email.includes('gogh9') && (
              <button 
                className="dashboard-button" 
                onClick={() => navigate('/dashboard')}
                title="교사 대시보드"
              >
                <LayoutDashboard size={16} /> 대시보드
              </button>
            )}
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
        {/* Sidebar Panel Overlay for mobile */}
        {isSidebarOpen && (
          <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)} />
        )}
        
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
        <section className={`chat-panel glass ${isChatOpen ? 'open' : 'closed'}`}>
          <div className="chat-top-bar">
            <button className="toggle-panel-btn float-left chat-close-btn" onClick={() => setIsChatOpen(false)} title="대화창 닫기">
              <PanelLeftClose size={18} /> 대화창 닫기
            </button>
            {!isPreviewOpen && (
              <button className="toggle-panel-btn float-right" onClick={() => setIsPreviewOpen(true)}>
                <PanelRight size={18} /> 프리뷰 열기
              </button>
            )}
          </div>
          <div className="message-list">
            {messages.map((msg) => (
              <div key={msg.id} className={`message animate-fade-in ${msg.sender}`}>
                {msg.text}
              </div>
            ))}
            {isLoading && (
              <div className="message ai animate-fade-in">
                {loadingText}
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
              placeholder={isBanned ? "비속어 반복 사용으로 인해 이 채팅방의 대화가 종료되었습니다. 새 채팅을 시작해 주세요." : "튜터에게 궁금한 걸 물어보거나 코딩을 부탁해 봐!"}
              disabled={isLoading || isBanned}
            />
            <button 
              className="send-button" 
              onClick={handleSend}
              disabled={!input.trim() || isLoading || isBanned}
            >
              <Send size={20} />
            </button>
          </div>
        </section>

        {/* Closed panels indicator or floating trigger bar */}
        {(!isChatOpen || !isPreviewOpen) && (
          <div className="collapsed-panels-indicator">
            {!isChatOpen && (
              <button className="toggle-panel-btn float-right open-chat-btn" onClick={() => setIsChatOpen(true)}>
                <MessageSquare size={18} /> 대화창 열기
              </button>
            )}
            {!isPreviewOpen && isChatOpen === false && (
              <button className="toggle-panel-btn float-right open-preview-btn" onClick={() => setIsPreviewOpen(true)}>
                <PanelRight size={18} /> 프리뷰 열기
              </button>
            )}
          </div>
        )}

        {/* Sandbox Preview Panel */}
        <section className={`preview-panel glass ${isPreviewOpen ? 'open' : 'closed'}`}>
          <div className="preview-header">
            <div className="tabs">
              <button className="toggle-panel-btn hide-preview" onClick={() => setIsPreviewOpen(false)} title="프리뷰 닫기">
                <PanelRightClose size={18} />
              </button>
              {!isChatOpen && (
                <button className="toggle-panel-btn show-chat-from-preview" onClick={() => setIsChatOpen(true)} title="대화창 열기">
                  <MessageSquare size={16} /> 대화창 열기
                </button>
              )}
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
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="download-button" onClick={handleCopy} title="코드 복사">
                {isCopied ? <Check size={16} /> : <Copy size={16} />} {isCopied ? '복사됨' : '코드 복사'}
              </button>
              <button className="download-button" onClick={handleDownload} title="HTML 파일로 저장">
                <Download size={16} /> 저장하기
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

export default StudentSandbox;
