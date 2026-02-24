import React, { useEffect, useState } from 'react';
import { getUser, getAnnouncements } from '../services/api';
import '../styles/profile.css';

const PublicProfile = ({ userId }) => {
    const [user, setUser] = useState(null);
    const [announcements, setAnnouncements] = useState([]);

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
                </div>

                <div className="profile-card">
                    <h2>Active announcements</h2>
                    {announcements.length === 0 ? (
                        <p>No active announcements</p>
                    ) : (
                        <ul>
                            {announcements.map((a) => (
                                <li key={a.id}>{a.pet?.name} — {a.status}</li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PublicProfile;
