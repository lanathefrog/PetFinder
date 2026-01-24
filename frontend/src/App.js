import React, { useEffect, useState } from 'react';
import { getAnnouncements } from './services/api';
import Login from './components/Login';
import ReportPetForm from './components/ReportPetForm';
import UserDashboard from './components/UserDashboard';

// Correct paths after moving files to src/styles/
import './styles/base.css';           //
import './styles/auth-about.css';     //
import './styles/dashboard.css';      //
import './styles/responsive.css';     //

function App() {
    const [token, setToken] = useState(localStorage.getItem('access_token'));
    const [announcements, setAnnouncements] = useState([]);
    const [view, setView] = useState('feed');

    const loadFeed = () => {
        getAnnouncements()
            .then(res => setAnnouncements(res.data))
            .catch(err => console.error("Error loading feed:", err));
    };

    useEffect(() => {
        if (token) {
            loadFeed();
        }
    }, [token]);

    const handleLogout = () => {
        localStorage.removeItem('access_token');
        setToken(null);
        setView('feed');
    };

    if (!token) {
        return (
            <div className="login-page"> {/* Applied from auth-about.css */}
                <Login setToken={setToken} />
            </div>
        );
    }

    return (
        <div className="app-main-wrapper">
            <header>
                <nav> {/* Nav styles from base.css */}
                    <button
                        className="logo-btn"
                        onClick={() => setView('feed')}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                    >
                        <span className="logo">🧡 PetFinder</span>
                    </button>

                    <div className="nav-links">
                        <button
                            className={`nav-btn ${view === 'feed' ? 'active' : ''}`}
                            onClick={() => setView('feed')}
                        >
                            All Pets
                        </button>
                        <button
                            className={`nav-btn ${view === 'dashboard' ? 'active' : ''}`}
                            onClick={() => setView('dashboard')}
                        >
                            My Dashboard
                        </button>
                        <button className="btn-secondary logout-btn" onClick={handleLogout}>
                            Logout
                        </button>
                    </div>
                </nav>
            </header>

            <main className="container">
                {view === 'dashboard' ? (
                    <UserDashboard /> // Uses dashboard.css
                ) : (
                    <div className="fade-in">
                        <section className="form-section" style={{ maxWidth: '800px', margin: '2rem auto' }}>
                            <ReportPetForm onRefresh={loadFeed} />
                        </section>

                        <section className="listings-section">
                            <h2 className="section-title">Latest Reports</h2>
                            <div className="announcements-grid"> {/* Grid logic from responsive.css */}
                                {announcements.map(ann => (
                                    <article key={ann.id} className="announcement-card">
                                        <div className="card-content">
                                            <span className={`badge ${ann.status}`}>{ann.status}</span>
                                            <h3>{ann.pet.name} ({ann.pet.gender})</h3>
                                            <p className="description">{ann.description}</p>
                                            <p className="contact-info">📞 {ann.contact_phone}</p>
                                            <div className="card-footer">
                                                <small>Posted by: {ann.owner.first_name} {ann.owner.last_name}</small>
                                            </div>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        </section>
                    </div>
                )}
            </main>
        </div>
    );
}

export default App;