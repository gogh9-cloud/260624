import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowLeft, Users, MonitorPlay, MessageSquare, Clock } from 'lucide-react';
import './App.css';

function TeacherDashboard() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
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
  };

  const handleBack = () => {
    navigate('/');
  };

  const formatDate = (dateString) => {
    const d = new Date(dateString);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
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
            {sessions.map(session => (
              <div 
                key={session.id} 
                className={`session-item ${selectedSession?.id === session.id ? 'active' : ''}`}
                onClick={() => setSelectedSession(session)}
                style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                  <img src={`https://ui-avatars.com/api/?name=${session.student_name}&background=random`} alt="avatar" style={{ width: 24, height: 24, borderRadius: '50%' }} />
                  <span className="session-title" style={{ fontWeight: 'bold', color: 'white' }}>{session.student_name}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <MessageSquare size={12} /> {session.title || '새 채팅'}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'gray' }}>
                  <Clock size={12} /> {formatDate(session.updated_at)}
                </div>
              </div>
            ))}
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
                <div className="preview-header">
                  <h3 style={{ fontSize: '1rem', color: 'white', margin: 0 }}>
                    대화 내역 ({selectedSession.student_name})
                  </h3>
                </div>
                <div className="message-list">
                  {selectedSession.messages && selectedSession.messages.map((msg, idx) => (
                    <div key={idx} className={`message ${msg.sender}`}>
                      {msg.text}
                    </div>
                  ))}
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
