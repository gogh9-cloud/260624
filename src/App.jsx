import { Routes, Route } from 'react-router-dom';
import StudentSandbox from './StudentSandbox';
import TeacherDashboard from './TeacherDashboard';
import { Analytics } from '@vercel/analytics/react';

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<StudentSandbox />} />
        <Route path="/dashboard" element={<TeacherDashboard />} />
      </Routes>
      <Analytics />
    </>
  );
}

export default App;
