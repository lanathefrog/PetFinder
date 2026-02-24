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
import PublicProfile from './components/PublicProfile';
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
    const [selectedUserId, setSelectedUserId] = useState(null);
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

    // Simple in-app navigation that pushes pretty paths and updates state
    const navigateTo = (targetView, opts = {}) => {
        let path = '/';
        if (targetView === 'details') {
            const id = opts.announcement?.id || opts.announcementId;
            path = id ? `/announcements/${id}` : '/announcements';
        } else if (targetView === 'public_profile') {
            const uid = opts.userId;
            path = uid ? `/users/${uid}` : '/users';
        } else if (targetView === 'dashboard') path = '/dashboard';
        else if (targetView === 'messages') path = '/messages';
        else if (targetView === 'listing') path = '/announcements';
        else if (targetView === 'home') path = '/';
        else if (targetView === 'profile') path = '/users/me';
        else if (targetView === 'how') path = '/how';
        else if (targetView === 'report_lost') path = '/report/lost';
        else if (targetView === 'report_found') path = '/report/found';

        window.history.pushState({ view: targetView, opts }, '', path);

        // apply view and params
        setView(targetView);
        if (opts.announcement) setSelectedAnnouncement(opts.announcement);
        if (opts.announcementId) {
            const found = announcements.find(a => a.id === opts.announcementId);
            if (found) setSelectedAnnouncement(found);
            else setSelectedAnnouncement(null);
        }
        if (opts.userId) setSelectedUserId(opts.userId);
    };

    const parseLocationAndNavigate = async () => {
        const p = window.location.pathname || '/';
        // /announcements/123
        const annMatch = p.match(/^\/announcements\/(\d+)/);
        if (annMatch) {
            const id = parseInt(annMatch[1], 10);
            if (!isNaN(id)) {
                try {
                    const res = await getAnnouncement(id);
                    setSelectedAnnouncement(res.data);
                    setView('details');
                } catch (err) {
                    setView('listing');
                }
            }
            return;
        }

        const userMatch = p.match(/^\/users\/(\d+)/);
        if (userMatch) {
            const id = parseInt(userMatch[1], 10);
            if (!isNaN(id)) {
                setSelectedUserId(id);
                setView('public_profile');
            }
            return;
        }

        if (p === '/dashboard') {
            setView('dashboard');
            return;
        }
        if (p === '/messages') {
            setView('messages');
            return;
        }
        if (p === '/' || p === '/home') {
            setView('home');
            return;
        }
        if (p === '/announcements') {
            setView('listing');
            return;
        }
        if (p === '/users/me') {
            setView('profile');
            return;
        }

        // fallback
        setView('home');
    };

    useEffect(() => {
        const handleOpenUser = (e) => {
            const userId = e.detail;
            if (!userId) return;
            const me = Number(localStorage.getItem('user_id'));
            if (me && Number(userId) === me) {
                navigateTo('profile');
            } else {
                navigateTo('public_profile', { userId });
            }
        };
        window.addEventListener('openUserProfile', handleOpenUser);
        const handleOpenAnnouncement = async (e) => {
            const id = e.detail;
            if (!id) return;
            try {
                const res = await getAnnouncement(id);
                setSelectedAnnouncement(res.data);
                navigateTo('details', { announcement: res.data });
            } catch (err) {
                navigateTo('listing');
            }
        };
        window.addEventListener('openAnnouncement', handleOpenAnnouncement);

        // popstate -> sync UI
        const onPop = () => {
            parseLocationAndNavigate();
        };
        window.addEventListener('popstate', onPop);

        return () => {
            window.removeEventListener('openUserProfile', handleOpenUser);
            window.removeEventListener('openAnnouncement', handleOpenAnnouncement);
            window.removeEventListener('popstate', onPop);
        };
    }, []);

    // On first load, reflect current path
    useEffect(() => {
        parseLocationAndNavigate();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (token) {
            loadFeed();
            navigateTo('dashboard');
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
                            navigateTo('home');
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
                                    navigateTo('home');
                                }}
                            >
                                Home
                            </a>
                        </li>

                        <li><a href="/" onClick={(e)=>{e.preventDefault();navigateTo('dashboard')}}>Dashboard</a></li>
                        <li>
                            <a
                                href="/"
                                onClick={(e)=>{
                                    e.preventDefault();
                                    navigateTo('profile');
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
                                    navigateTo('messages');
                                }}
                            >
                                Messages {unreadMessagesCount > 0 ? `(${unreadMessagesCount})` : ""}
                            </a>
                        </li>
                        <li className="nav-notifications">
                            <button
                                type="button"
                                className="notification-btn"
                                onClick={async () => {
                                    const next = !showNotificationsDropdown;
                                    setShowNotificationsDropdown(next);
                                    // when opening the dropdown, mark all notifications read
                                    if (next) {
                                        try {
                                            await handleMarkNotificationsRead();
                                        } catch (e) {
                                            // ignore
                                        }
                                    }
                                }}
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
                                                style={{ cursor: 'pointer' }}
                                                onClick={async () => {
                                                    try {
                                                        // mark this notification read
                                                        await markNotificationsRead([item.id]);
                                                        setNotifications((prev) => prev.map(n => n.id === item.id ? { ...n, is_read: true } : n));
                                                        setUnreadNotificationsCount((c) => Math.max(0, c - (item.is_read ? 0 : 1)));
                                                    } catch (e) {
                                                        // ignore error
                                                    }

                                                    // navigate: prefer announcement -> actor/profile
                                                    if (item.related_announcement) {
                                                        try {
                                                            const res = await getAnnouncement(item.related_announcement);
                                                            setSelectedAnnouncement(res.data);
                                                            navigateTo('details', { announcement: res.data });
                                                        } catch (err) {
                                                            navigateTo('listing');
                                                        }
                                                    } else if (item.actor && item.actor.id) {
                                                        const me = Number(localStorage.getItem('user_id'));
                                                        if (me && Number(item.actor.id) === me) navigateTo('profile');
                                                        else navigateTo('public_profile', { userId: item.actor.id });
                                                    }
                                                    setShowNotificationsDropdown(false);
                                                }}
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
                            <a href="/" onClick={(e)=>{e.preventDefault(); navigateTo('listing')}}>
                                Find a Pet
                            </a>
                        </li>
                        <li>
                            <a
                                href="/"
                                onClick={(e)=>{
                                    e.preventDefault();
                                    navigateTo('how');
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
                        onNavigate={navigateTo}
                        onSelect={(ann) => {
                            setSelectedAnnouncement(ann);
                            navigateTo('details', { announcement: ann });
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
                                        navigateTo('details', { announcement: ann });
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
                        onBack={() => window.history.back()}
                        onDeleted={() => {
                            loadFeed();
                            navigateTo('dashboard');
                        }}
                        onOpenChat={(conversationId) => {
                            setActiveConversationId(conversationId);
                            navigateTo('messages');
                        }}
                    />
                )}

                {view === 'report_lost' && (
                    <ReportLost
                        onRefresh={() => { loadFeed(); navigateTo('dashboard'); }}
                        onCancel={() => navigateTo('dashboard')}
                    />
                )}

                {view === 'report_found' && (
                    <ReportFound
                        onRefresh={() => { loadFeed(); navigateTo('dashboard'); }}
                        onCancel={() => navigateTo('dashboard')}
                    />
                )}
                {view === 'listing' && (
                    <AnnouncementList
                        onSelect={(ann)=>{
                            setSelectedAnnouncement(ann);
                            navigateTo('details', { announcement: ann });
                        }}
                    />
                )}
                {view === 'home' && (
                    <HomePage onNavigate={navigateTo} />
                )}
                {view === 'how' && (
                    <HowItWorks onNavigate={navigateTo} />
                )}
                {view === 'profile' && <ProfilePage />}
                {view === 'public_profile' && selectedUserId && (
                    <div className="container">
                        <PublicProfile userId={selectedUserId} />
                    </div>
                )}
                {view === 'messages' && (
                    <MessagesPage
                        initialConversationId={activeConversationId}
                        onOpenAnnouncement={async (announcementId) => {
                            try {
                                const res = await getAnnouncement(announcementId);
                                setSelectedAnnouncement(res.data);
                                navigateTo('details', { announcement: res.data });
                            } catch (err) {
                                navigateTo('listing');
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
