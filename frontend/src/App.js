import React, { useEffect, useState } from 'react';
import { getAnnouncements } from './services/api';

// Components
import Login from './components/Login';
import UserDashboard from './components/UserDashboard';
import ReportLost from './components/ReportLost';
import Footer from './components/Footer';

// Importing Styles - Ensure forms.css is here!
import './styles/base.css';
import './styles/auth-about.css';
import './styles/dashboard.css';
import './styles/responsive.css';
import './styles/forms.css'; // <--- Critical for the new form

function App() {
    const [token, setToken] = useState(localStorage.getItem('access_token'));
    const [announcements, setAnnouncements] = useState([]);
    const [view, setView] = useState('dashboard');

    const loadFeed = () => {
        getAnnouncements()
            .then(res => setAnnouncements(res.data))
            .catch(err => console.error("Error loading feed:", err));
    };

    useEffect(() => {
        if (token) {
            loadFeed();
            setView('dashboard');
        }
    }, [token]);

    const handleLogout = (e) => {
        e.preventDefault();
        localStorage.removeItem('access_token');
        setToken(null);
        setView('feed');
    };

    const handleNavClick = (e, viewName) => {
        e.preventDefault();
        setView(viewName);
    };

    if (!token) {
        return (
            <div className="login-page">
                <Login setToken={setToken} />
            </div>
        );
    }

    return (
        <div className="app-wrapper">
            <header>
                <nav>
                    <a href="/" className="logo" onClick={(e) => handleNavClick(e, 'feed')}>
                        <span className="logo-icon">🐾</span>
                        PetFinder
                    </a>
                    <ul className="nav-links">
                        <li><a href="/" onClick={(e) => handleNavClick(e, 'feed')}>Home</a></li>
                        <li><a href="/" onClick={(e) => e.preventDefault()}>How It Works</a></li>
                        <li><a href="/" onClick={(e) => handleNavClick(e, 'feed')}>Recent Posts</a></li>
                        <li><a href="/" onClick={(e) => handleNavClick(e, 'dashboard')}>Dashboard</a></li>
                    </ul>
                    <div className="user-profile">
                        <button className="notification-btn">
                            🔔<span className="notification-badge">3</span>
                        </button>
                        <div className="user-info">
                            <img src="https://via.placeholder.com/40" alt="User" className="user-avatar" />
                            <span className="user-name">Svitlana</span>
                        </div>
                        <a href="/" onClick={handleLogout} style={{marginLeft:'10px', fontSize:'0.8rem', color:'#666', textDecoration:'none'}}>(Logout)</a>
                    </div>
                </nav>
            </header>

            <main>
                {view === 'dashboard' ? (
                    <UserDashboard onNavigate={setView} />
                ) : view === 'report_lost' ? (
                    <ReportLost
                        onRefresh={() => { loadFeed(); setView('dashboard'); }}
                        onCancel={() => setView('dashboard')} // Fixes the Cancel button
                    />
                ) : (
                    <div className="container" style={{ marginTop: '2rem' }}>
                        {/* Feed View Content */}
                        <div className="announcements-grid">
                            {announcements.map(ann => (
                                <div key={ann.id} className="announcement-card-dashboard">
                                    <div className="announcement-card-header">
                                        <div className="announcement-thumbnail">
                                            {ann.pet.pet_type === 'Cat' ? '🐈' : '🐕'}
                                        </div>
                                        <div className="announcement-info-dashboard">
                                            <span className={`status-badge ${ann.status.toLowerCase()}`}>{ann.status}</span>
                                            <h3>{ann.pet.name}</h3>
                                            <p className="breed">{ann.pet.breed}</p>
                                        </div>
                                    </div>
                                    <div className="announcement-meta">
                                        <div className="meta-item"><span>📍</span><span>{ann.location?.city}</span></div>
                                        <div className="meta-item"><span>📞</span><span>{ann.contact_phone}</span></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </main>

            <Footer />
        </div>
    );
}

export default App;