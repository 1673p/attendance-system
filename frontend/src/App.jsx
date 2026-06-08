import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import './App.css';

// นำเข้าหน้าต่างๆ ...
import Login from './pages/Login';
import Attendance from './pages/Attendance';
import AttendanceReport from './pages/AttendanceReport';
import ScoreEntry from './pages/ScoreEntry';
import ScoreReport from './pages/ScoreReport';
import ManageSubjects from './pages/ManageSubjects';
import ManageTeachers from './pages/ManageTeachers';
import ManageStudents from './pages/ManageStudents';
import LineUpAttendance from './pages/LineUpAttendance';

function App() {
  const [user, setUser] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false); // State สำหรับเปิด/ปิดเมนู

  useEffect(() => {
    const loggedInUser = localStorage.getItem('school_user');
    if (loggedInUser) setUser(JSON.parse(loggedInUser));
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('school_user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('school_user');
  };

  if (!user) return <Login onLogin={handleLogin} />;

  return (
    <Router>
      <div className="app-container">
        {/* Top Navigation Bar */}
        <nav className="glass-panel top-navbar">
          <div className="nav-logo">
            <img src="https://asia.thaitec.ac.th/wp-content/uploads/2025/07/banner-copy-1024x190.png" alt="Logo" style={{ height: '40px' }} />
          </div>
          
          {/* ปุ่ม Hamburger */}
          <button className="hamburger" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? '✕' : '☰'}
          </button>
          
          {/* เมนู Link */}
          <div className={`nav-links ${isMenuOpen ? 'active' : ''}`}>
            <Link to="/" className="nav-link" onClick={() => setIsMenuOpen(false)}>เช็คชื่อ</Link>
            <Link to="/report" className="nav-link" onClick={() => setIsMenuOpen(false)}>รายงานเช็คชื่อ</Link>
            <Link to="/score-entry" className="nav-link" onClick={() => setIsMenuOpen(false)}>บันทึกคะแนน</Link>
            <Link to="/score-report" className="nav-link" onClick={() => setIsMenuOpen(false)}>รายงานคะแนน</Link>
            <Link to="/lineup-attendance" className="nav-link" onClick={() => setIsMenuOpen(false)}>เช็คแถว</Link>

            {user.role === 'admin' && (
              <>
                <div className="nav-divider">|</div>
                <Link to="/manage-subjects" className="nav-link admin-link" onClick={() => setIsMenuOpen(false)}>จัดการวิชา</Link>
                <Link to="/manage-teachers" className="nav-link admin-link" onClick={() => setIsMenuOpen(false)}>จัดการอาจารย์</Link>
                <Link to="/manage-students" className="nav-link admin-link" onClick={() => setIsMenuOpen(false)}>จัดการนักเรียน</Link>
              </>
            )}
            
            {/* ย้ายส่วน Logout มาไว้ในเมนูสำหรับมือถือ */}
            <div className="mobile-only" style={{ marginTop: '10px', borderTop: '1px solid #eee', paddingTop: '10px' }}>
                <span style={{ fontSize: '14px', marginRight: '10px' }}>👤 {user.full_name}</span>
                <button onClick={handleLogout} className="btn-danger" style={{ padding: '5px 12px' }}>ออก</button>
            </div>
          </div>

          {/* ส่วน User (สำหรับ Desktop) */}
          <div className="user-section desktop-only">
            <span style={{ fontSize: '14px', marginRight: '15px' }}>👤 {user.full_name}</span>
            <button onClick={handleLogout} className="btn-danger" style={{ padding: '5px 12px' }}>ออก</button>
          </div>
        </nav>

        <main className="main-content">
          <div className="glass-panel" style={{ padding: '30px', minHeight: '80vh' }}>
            <Routes>
              <Route path="/" element={<Attendance user={user} />} />
              <Route path="/report" element={<AttendanceReport user={user} />} />
              <Route path="/score-entry" element={<ScoreEntry user={user} />} />
              <Route path="/score-report" element={<ScoreReport user={user} />} />
              <Route path="/lineup-attendance" element={<LineUpAttendance user={user} />} />
              {user.role === 'admin' && (
                <>
                  <Route path="/manage-subjects" element={<ManageSubjects />} />
                  <Route path="/manage-teachers" element={<ManageTeachers />} />
                  <Route path="/manage-students" element={<ManageStudents />} />
                </>
              )}
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </div>
        </main>
      </div>
    </Router>
  );
}

export default App;