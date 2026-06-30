import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowLeft, Users, MonitorPlay, MessageSquare, Clock } from 'lucide-react';
import './App.css';

const getNowTimestamp = () => Date.now();

function TeacherDashboard() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchSessions();
  }, []);

  async function fetchSessions() {
    setLoading(true);
    const { data, error } = await supabase
      .from('student_sessions')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching sessions:', error);
      setSessions([]);
    } else {
      setSessions(data || []);
    }
    setLoading(false);
  }

  const handleBack = () => {
    navigate('/');
  };

  const formatDate = (dateString) => {
    const d = new Date(dateString);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
  };

  const handleUnban = async (session) => {
    if (!window.confirm(`${session.student_name} 학생의 정지를 해제하시겠습니까?`)) return;

    // Filter out the metadata message if it exists
    const cleanMessages = (session.messages || []).filter(m => m.sender !== 'metadata');

    // Append AI unban notice message and the updated metadata
    const updatedMessages = [
      ...cleanMessages,
      {
        id: getNowTimestamp(),
        sender: 'ai',
        text: '선생님께서 대화를 다시 할 수 있도록 허락해주셨어요! 앞으로는 고운 말을 사용해 주세요. 😊'
      },
      {
        id: 'metadata',
        sender: 'metadata',
        isBanned: false,
        violationCount: 0
      }
    ];

    try {
      const { error } = await supabase
        .from('student_sessions')
        .update({
          messages: updatedMessages,
          updated_at: new Date().toISOString()
        })
        .eq('session_id', session.session_id)
        .eq('student_email', session.student_email);

      if (error) {
        console.error('Unban error:', error);
        alert(`정지 해제에 실패했습니다. (에러: ${error.message})`);
      } else {
        alert('정지가 성공적으로 해제되었습니다.');
        
        // Update selectedSession state immediately to reflect in UI
        const updatedSessionObj = {
          ...session,
          messages: updatedMessages,
          updated_at: new Date().toISOString()
        };
        setSelectedSession(updatedSessionObj);
        
        // Refresh session list
        fetchSessions();
      }
    } catch (e) {
      console.error('Unban exception:', e);
      alert('정지 해제 중 오류가 발생했습니다.');
    }
  };

  if (loading) {
    return (
      <div className="login-container">
        <div className="login-card glass">
          <Sparkles size={48} color="#c084fc" className="animate-spin" style={{ marginBottom: '20px' }} />
          <h2>데이터를 불러오는 중입니다...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container dashboard-container">
      <header className="header glass dashboard-header">
        <div className="header-left">
          <button className="toggle-panel-btn" onClick={handleBack} title="학생용 샌드박스로 돌아가기">
            <ArrowLeft size={24} />
          </button>
          <Sparkles size={28} color="#38bdf8" />
          <h1 className="header-title" style={{ background: 'linear-gradient(to right, #38bdf8, #818cf8)', WebkitBackgroundClip: 'text' }}>
            선생님 전용 모니터링 대시보드
          </h1>
        </div>
        <div className="header-right">
          <div className="stat-badge">
            <Users size={16} /> 총 세션 수: {sessions.length}
          </div>
        </div>
      </header>

      <main className="main-content dashboard-main">
        {/* 학생 목록 사이드바 */}
        <aside className="sidebar glass dashboard-sidebar" style={{ width: '300px' }}>
          <h3 className="sidebar-title" style={{ padding: '0 12px', color: 'var(--text-muted)' }}>학생 활동 내역</h3>
          <div className="session-list">
            {sessions.map(session => {
              const metadata = session.messages?.find(m => m.sender === 'metadata');
              let isBanned = metadata ? metadata.isBanned : false;
              
              if (!metadata && session.messages && session.messages.length > 0) {
                const lastAiMessage = [...session.messages].reverse().find(m => m.sender === 'ai');
                if (lastAiMessage && (
                  lastAiMessage.text.includes('영구 중지') || 
                  lastAiMessage.text.includes('중지되었습니다') || 
                  lastAiMessage.text.includes('선생님께 문의')
                )) {
                  isBanned = true;
                }
              }
              return (
                <div 
                  key={session.id} 
                  className={`session-item ${selectedSession?.id === session.id ? 'active' : ''}`}
                  onClick={() => setSelectedSession(session)}
                  style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                    <img src={`https://ui-avatars.com/api/?name=${session.student_name}&background=random`} alt="avatar" style={{ width: 24, height: 24, borderRadius: '50%' }} />
                    <span className="session-title" style={{ fontWeight: 'bold', color: 'white' }}>{session.student_name}</span>
                    {isBanned && (
                      <span style={{ 
                        fontSize: '0.7rem', 
                        backgroundColor: '#ef4444', 
                        color: 'white', 
                        padding: '2px 6px', 
                        borderRadius: '4px', 
                        marginLeft: 'auto',
                        fontWeight: 'bold'
                      }}>정지됨</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <MessageSquare size={12} /> {session.title || '새 채팅'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'gray' }}>
                    <Clock size={12} /> {formatDate(session.updated_at)}
                  </div>
                </div>
              );
            })}
            {sessions.length === 0 && (
              <div style={{ padding: '20px', textAlign: 'center', color: 'gray' }}>
                아직 기록된 학생 데이터가 없습니다.
              </div>
            )}
          </div>
        </aside>

        {/* 선택된 학생 모니터링 패널 */}
        <section className="preview-panel glass dashboard-viewer" style={{ flex: 1, flexDirection: 'row' }}>
          {selectedSession ? (
            <>
              <div className="chat-panel" style={{ flex: 1, borderRight: '1px solid var(--panel-border)', background: 'rgba(0,0,0,0.2)' }}>
                {(() => {
                  const selectedMetadata = selectedSession.messages?.find(m => m.sender === 'metadata');
                  let isSelectedBanned = selectedMetadata ? selectedMetadata.isBanned : false;
                  
                  if (!selectedMetadata && selectedSession.messages && selectedSession.messages.length > 0) {
                    const lastAiMessage = [...selectedSession.messages].reverse().find(m => m.sender === 'ai');
                    if (lastAiMessage && (
                      lastAiMessage.text.includes('영구 중지') || 
                      lastAiMessage.text.includes('중지되었습니다') || 
                      lastAiMessage.text.includes('선생님께 문의')
                    )) {
                      isSelectedBanned = true;
                    }
                  }
                  return (
                    <>
                      <div className="preview-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                        <h3 style={{ fontSize: '1rem', color: 'white', margin: 0 }}>
                          대화 내역 ({selectedSession.student_name})
                        </h3>
                        {isSelectedBanned && (
                          <button 
                            onClick={() => handleUnban(selectedSession)}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: '#ef4444',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '0.8rem',
                              fontWeight: 'bold',
                              transition: 'background-color 0.2s',
                            }}
                            onMouseOver={(e) => e.target.style.backgroundColor = '#dc2626'}
                            onMouseOut={(e) => e.target.style.backgroundColor = '#ef4444'}
                          >
                            정지 해제
                          </button>
                        )}
                      </div>
                      {isSelectedBanned && (
                        <div style={{
                          padding: '10px 16px',
                          backgroundColor: 'rgba(239, 68, 68, 0.15)',
                          borderBottom: '1px solid rgba(239, 68, 68, 0.3)',
                          color: '#fca5a5',
                          fontSize: '0.85rem'
                        }}>
                          ⚠️ 이 학생은 비속어 반복 사용으로 인해 대화가 정지되었습니다.
                        </div>
                      )}
                    </>
                  );
                })()}
                <div className="message-list">
                  {selectedSession.messages && selectedSession.messages
                    .filter(msg => msg.sender !== 'metadata')
                    .map((msg, idx) => (
                      <div key={idx} className={`message ${msg.sender}`}>
                        {msg.text}
                      </div>
                    ))
                  }
                </div>
              </div>
              <div className="iframe-container" style={{ flex: 1.5 }}>
                <div className="preview-header">
                  <h3 style={{ fontSize: '1rem', color: 'white', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <MonitorPlay size={16} /> 결과물(코드) 미리보기
                  </h3>
                </div>
                {selectedSession.html_code ? (
                  <iframe 
                    title="sandbox-preview"
                    srcDoc={selectedSession.html_code}
                    sandbox="allow-scripts"
                    style={{ width: '100%', height: 'calc(100% - 48px)', border: 'none' }}
                  />
                ) : (
                  <div style={{ padding: '20px', textAlign: 'center', color: 'gray' }}>코드가 없습니다.</div>
                )}
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'gray', flexDirection: 'column', gap: '16px' }}>
              <MonitorPlay size={48} opacity={0.5} />
              <p>왼쪽 목록에서 학생을 선택하면 상세 내용을 볼 수 있습니다.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default TeacherDashboard;
