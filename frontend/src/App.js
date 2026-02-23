import React, { useEffect, useState } from 'react';
import {
    getAnnouncement,
    getAnnouncements,
    getChatConversations,
    getNotifications,
    markNotificationsRead
} from './services/api';

import Login from './components/Login';
import UserDashboard from './components/UserDashboard';
import ReportLost from './components/ReportLost';
import ReportFound from './components/ReportFound';
import AnnouncementDetails from './components/AnnouncementDetails';
import Footer from './components/Footer';
import AnnouncementList from './components/AnnouncementList';
import HomePage from './components/HomePage';
import HowItWorks from './components/HowItWorks';
import ProfilePage from './components/ProfilePage';
import MessagesPage from './components/MessagesPage';




import './styles/base.css';
import './styles/auth-about.css';
import './styles/dashboard.css';
import './styles/responsive.css';
import './styles/forms.css';
import './styles/messages.css';

function App() {
    const [token, setToken] = useState(localStorage.getItem('access_token'));
    const [announcements, setAnnouncements] = useState([]);
    const [view, setView] = useState('home');
    const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
    const [activeConversationId, setActiveConversationId] = useState(null);
    const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
    const [notifications, setNotifications] = useState([]);
    const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
    const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);

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

    useEffect(() => {
        if (!token) return;

        const loadUnread = async () => {
            try {
                const res = await getChatConversations({ page: 1, page_size: 50 });
                const total = (res.data?.results || []).reduce(
                    (sum, item) => sum + (item.unread_count || 0),
                    0
                );
                setUnreadMessagesCount(total);
            } catch (e) {
                // ignore navbar badge fetch errors
            }

            try {
                const res = await getNotifications();
                const items = res.data?.results || [];
                setNotifications(items);
                setUnreadNotificationsCount(
                    typeof res.data?.unread_count === "number"
                        ? res.data.unread_count
                        : items.filter((item) => !item.is_read).length
                );
            } catch (e) {
                // ignore notification badge fetch errors
            }
        };

        loadUnread();
        const timer = setInterval(loadUnread, 15000);
        return () => clearInterval(timer);
    }, [token, view]);

    const handleLogout = (e) => {
        e.preventDefault();
        localStorage.removeItem('access_token');
        localStorage.removeItem('user_id');
        setToken(null);
        setView('feed');
    };

    const handleMarkNotificationsRead = async () => {
        try {
            await markNotificationsRead([]);
            setNotifications((prev) => prev.map((item) => ({ ...item, is_read: true })));
            setUnreadNotificationsCount(0);
        } catch (e) {
            // ignore
        }
    };

    if (!token) {
        return <Login setToken={setToken} />;
    }

    return (
        <div className="app-wrapper">
            <header>
                <nav>
                    <a
                        href="/"
                        className="logo"
                        onClick={(e)=>{
                            e.preventDefault();
                            setView('home');
                        }}
                    >

                    🐾 PetFinder
                    </a>

                    <ul className="nav-links">
                        <li>
                            <a
                                href="/"
                                onClick={(e)=>{
                                    e.preventDefault();
                                    setView('home');
                                }}
                            >
                                Home
                            </a>
                        </li>

                        <li><a href="/" onClick={(e)=>{e.preventDefault();setView('dashboard')}}>Dashboard</a></li>
                        <li>
                            <a
                                href="/"
                                onClick={(e)=>{
                                    e.preventDefault();
                                    setView('profile');
                                }}
                            >
                                Profile
                            </a>
                        </li>
                        <li>
                            <a
                                href="/messages"
                                onClick={(e)=>{
                                    e.preventDefault();
                                    setView('messages');
                                }}
                            >
                                Messages {unreadMessagesCount > 0 ? `(${unreadMessagesCount})` : ""}
                            </a>
                        </li>
                        <li className="nav-notifications">
                            <button
                                type="button"
                                className="notification-btn"
                                onClick={() => setShowNotificationsDropdown((prev) => !prev)}
                            >
                                🔔 {unreadNotificationsCount > 0 ? unreadNotificationsCount : ""}
                            </button>
                            {showNotificationsDropdown && (
                                <div className="notifications-dropdown">
                                    <div className="notifications-dropdown-header">
                                        <span>Notifications</span>
                                        <button type="button" onClick={handleMarkNotificationsRead}>
                                            Mark read
                                        </button>
                                    </div>
                                    {notifications.length === 0 ? (
                                        <p className="notifications-empty">No notifications</p>
                                    ) : (
                                        notifications.slice(0, 8).map((item) => (
                                            <div
                                                key={item.id}
                                                className={`notification-item ${item.is_read ? "" : "unread"}`}
                                            >
                                                <strong>{item.title}</strong>
                                                <span>{new Date(item.created_at).toLocaleString()}</span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </li>

                        <li>
                            <a href="/" onClick={(e)=>{e.preventDefault(); setView('listing')}}>
                                Find a Pet
                            </a>
                        </li>
                        <li>
                            <a
                                href="/"
                                onClick={(e)=>{
                                    e.preventDefault();
                                    setView('how');
                                }}
                            >
                                How It Works
                            </a>
                        </li>


                    </ul>


                    <a href="/" onClick={handleLogout}>(Logout)</a>
                </nav>
            </header>

            <main>
                {view === 'dashboard' && (
                    <UserDashboard
                        onNavigate={setView}
                        onSelect={(ann) => {
                            setSelectedAnnouncement(ann);
                            setView('details');
                        }}
                    />
                )}

                {view === 'feed' && (
                    <div className="container">
                        <div className="announcements-grid">
                            {announcements.map(ann => (
                                <div
                                    key={ann.id}
                                    className="announcement-card-dashboard"
                                    onClick={() => {
                                        setSelectedAnnouncement(ann);
                                        setView('details');
                                    }}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <h3>{ann.pet.name}</h3>
                                    <p>{ann.pet.breed}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {view === 'details' && selectedAnnouncement && (
                    <AnnouncementDetails
                        announcement={selectedAnnouncement}
                        onBack={() => setView('dashboard')}
                        onDeleted={() => {
                            loadFeed();
                            setView('dashboard');
                        }}
                        onOpenChat={(conversationId) => {
                            setActiveConversationId(conversationId);
                            setView('messages');
                        }}
                    />
                )}

                {view === 'report_lost' && (
                    <ReportLost
                        onRefresh={() => { loadFeed(); setView('dashboard'); }}
                        onCancel={() => setView('dashboard')}
                    />
                )}

                {view === 'report_found' && (
                    <ReportFound
                        onRefresh={() => { loadFeed(); setView('dashboard'); }}
                        onCancel={() => setView('dashboard')}
                    />
                )}
                {view === 'listing' && (
                    <AnnouncementList
                        onSelect={(ann)=>{
                            setSelectedAnnouncement(ann);
                            setView('details');
                        }}
                    />
                )}
                {view === 'home' && (
                    <HomePage onNavigate={setView} />
                )}
                {view === 'how' && (
                    <HowItWorks onNavigate={setView} />
                )}
                {view === 'profile' && <ProfilePage />}
                {view === 'messages' && (
                    <MessagesPage
                        initialConversationId={activeConversationId}
                        onOpenAnnouncement={async (announcementId) => {
                            try {
                                const res = await getAnnouncement(announcementId);
                                setSelectedAnnouncement(res.data);
                                setView('details');
                            } catch (err) {
                                setView('listing');
                            }
                        }}
                    />
                )}



            </main>

            <Footer />
        </div>
    );
}

export default App;
