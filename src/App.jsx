import { Routes, Route } from 'react-router-dom';
import StudentSandbox from './StudentSandbox';
import TeacherDashboard from './TeacherDashboard';

function App() {
  return (
    <Routes>
      <Route path="/" element={<StudentSandbox />} />
      <Route path="/dashboard" element={<TeacherDashboard />} />
    </Routes>
  );
}

export default App;
