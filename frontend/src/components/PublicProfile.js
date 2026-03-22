import React, { useEffect, useState } from 'react';
import { getUser, getAnnouncements, startDirectConversation } from '../services/api';
import { useToast } from './ToastContext';
import '../styles/profile.css';

const PublicProfile = ({ userId }) => {
    const [user, setUser] = useState(null);
    const [announcements, setAnnouncements] = useState([]);

    const { showToast } = useToast();

    useEffect(() => {
        const load = async () => {
            try {
                const res = await getUser(userId);
                setUser(res.data);
            } catch (err) {
                setUser(null);
            }

            try {
                const res2 = await getAnnouncements();
                const items = res2.data || [];
                setAnnouncements(items.filter((a) => a.owner === userId));
            } catch (err) {
                setAnnouncements([]);
            }
        };
        load();
    }, [userId]);

    if (!user) return <div className="profile-page"><p>Loading user...</p></div>;

    return (
        <div className="profile-page">
            <div className="profile-container">
                <div className="profile-header">
                    <div className="profile-avatar-wrapper">
                        <div className="profile-avatar-container">
                            {user.profile_image_url ? (
                                <img src={user.profile_image_url} alt={user.username} className="profile-avatar-image" />
                            ) : (
                                <div className="profile-avatar">{user.username.charAt(0).toUpperCase()}</div>
                            )}
                            {user.presence && (
                                <span
                                    className={`presence-dot ${user.presence.is_online ? 'online' : 'offline'}`}
                                    title={user.presence.is_online ? 'Online' : (user.presence.last_seen ? `Last seen: ${new Date(user.presence.last_seen).toLocaleString()}` : 'Offline')}
                                />
                            )}
                        </div>
                    </div>
                    <h1>{user.username}</h1>
                    <p className="profile-subtitle">Joined: {user.date_joined ? new Date(user.date_joined).toLocaleDateString() : 'N/A'}</p>
                    {user.badges && user.badges.length > 0 && (
                        <div style={{ marginTop: 8 }}>
                            {user.badges.map((b) => (
                                <span key={b.id} style={{ display: 'inline-block', marginRight: 8, padding: '4px 8px', background: '#fff', borderRadius: 8, border: '1px solid #eee' }}>{b.name}</span>
                            ))}
                        </div>
                    )}

                    {}
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'center' }}>
                            <div className="profile-id-badge">#{user.id}</div>
                        </div>

                        {}
                        {user.stats && (
                            <div className="profile-stats-row" aria-label="profile statistics">
                                <div className="stat-item">
                                    <div className="stat-value">{user.stats.announcements_count || 0}</div>
                                    <div className="stat-label">Announcements</div>
                                </div>
                                <div className="stat-item">
                                    <div className="stat-value">{user.stats.active_announcements_count || 0}</div>
                                    <div className="stat-label">Active</div>
                                </div>
                                <div className="stat-item">
                                    <div className="stat-value">{user.stats.reunited_count || 0}</div>
                                    <div className="stat-label">Reunited</div>
                                </div>
                                <div className="stat-item">
                                    <div className="stat-value">{user.stats.views_count || 0}</div>
                                    <div className="stat-label">Views</div>
                                </div>
                            </div>
                        )}

                        <div className="profile-header-actions">
                            <button
                                className="btn btn-primary btn-message-pill"
                                onClick={async () => {
                                    try {
                                        const res = await startDirectConversation(userId);
                                        window.dispatchEvent(new CustomEvent('openConversation', { detail: res.data.id }));
                                        window.dispatchEvent(new CustomEvent('navigate', { detail: 'messages' }));
                                    } catch (err) {
                                        console.error('Start direct conversation error', err);
                                        showToast('Failed to start a conversation', 'error');
                                    }
                                }}
                            >Message</button>
                        </div>
                    </div>
                </div>

                <div className="profile-card">
                    <h2>Active announcements</h2>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                            {announcements.length === 0 ? (
                                <p>No active announcements</p>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
                                    {announcements.map((a) => (
                                        <div
                                            key={a.id}
                                            className="announcement-card-dashboard"
                                            style={{ cursor: 'pointer' }}
                                            onClick={() => window.dispatchEvent(new CustomEvent('openAnnouncement', { detail: a.id }))}
                                        >
                                            <div className="announcement-thumbnail">
                                                {a.pet?.photo ? (
                                                    <img src={a.pet.photo} alt={a.pet?.name} />
                                                ) : (
                                                    a.pet?.pet_type === 'cat' ? '🐈' : '🐕'
                                                )}
                                            </div>
                                            <div className="announcement-info-dashboard">
                                                <span className={`status-badge ${a.status?.toLowerCase()}`}>
                                                    {a.status}
                                                </span>
                                                <h3>{a.pet?.name}</h3>
                                                <p className="breed">{a.pet?.breed || 'Unknown Breed'}</p>
                                            </div>
                                            <div className="announcement-meta">
                                                <div className="meta-item">
                                                    <span>📍</span>
                                                    <span>{(a.location && a.location.address) ? a.location.address.split(',').slice(0,2).join(', ') : 'Location'}</span>
                                                </div>
                                                <div className="meta-item">
                                                    <span>📅</span>
                                                    <span>{a.created_at ? new Date(a.created_at).toLocaleDateString() : ''}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PublicProfile;
