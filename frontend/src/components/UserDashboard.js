import React, { useEffect, useState } from 'react';
import { getMyAnnouncements } from '../services/api';

const UserDashboard = ({ onNavigate }) => {
    const [myPets, setMyPets] = useState([]);

    useEffect(() => {
        getMyAnnouncements()
            .then(res => setMyPets(res.data))
            .catch(err => console.error("Error loading dashboard:", err));
    }, []);

    const formatDate = (dateString) => {
        if (!dateString) return 'Date unknown';
        return new Date(dateString).toLocaleDateString();
    };

    return (
        <div className="dashboard-page">
            {/* 1. Dashboard Header */}
            <div className="dashboard-header">
                <div className="dashboard-title">
                    <h1>Dashboard</h1>
                    <p>Manage your pet announcements and help reunite families</p>
                </div>
            </div>

            {/* 2. Quick Actions Section */}
            <section className="quick-actions-section">
                <div className="quick-actions-card">
                    <h2>Quick Actions</h2>
                    <div className="quick-actions-buttons">
                        <button
                            className="btn btn-primary"
                            onClick={() => onNavigate('report_lost')}
                        >
                            🔍 Report Lost Pet
                        </button>
                        <button
                            className="btn btn-secondary"
                            onClick={() => onNavigate('report_found')} // Placeholder for now
                        >
                            🧡 Report Found Pet
                        </button>
                    </div>
                </div>
            </section>

            {/* 3. My Announcements Section */}
            <section className="announcements-section">
                <div className="announcements-header">
                    <h2>My Announcements</h2>
                    <div className="filter-controls">
                        <select className="filter-select">
                            <option>All Status</option>
                            <option>Lost</option>
                            <option>Found</option>
                            <option>Reunited</option>
                        </select>
                        <button className="filter-btn">🔽</button>
                    </div>
                </div>

                {/* Grid: Maps your real data to the "announcement-card-dashboard" structure */}
                <div className="announcements-grid">
                    {myPets.length > 0 ? (
                        myPets.map(ann => (
                            <div key={ann.id} className="announcement-card-dashboard">
                                <div className="announcement-card-header">
                                    <div className="announcement-thumbnail">
                                        {ann.pet.pet_type === 'Cat' ? '🐈' : '🐕'}
                                    </div>
                                    <div className="announcement-info-dashboard">
                                        <span className={`status-badge ${ann.status.toLowerCase()}`}>
                                            {ann.status}
                                        </span>
                                        <h3>{ann.pet.name}</h3>
                                        <p className="breed">{ann.pet.breed || 'Unknown Breed'}</p>
                                    </div>
                                </div>

                                <div className="announcement-meta">
                                    <div className="meta-item">
                                        <span>📍</span>
                                        <span>{ann.location?.city || 'Location N/A'}</span>
                                    </div>
                                    <div className="meta-item">
                                        <span>📅</span>
                                        <span>Posted on {formatDate(ann.created_at)}</span>
                                    </div>
                                </div>

                                <div className="announcement-actions">
                                    <button className="action-btn view">
                                        👁️ View
                                    </button>
                                    <button className="action-btn edit">
                                        ✏️ Edit
                                    </button>
                                    <button className="action-btn delete">
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p style={{ gridColumn: '1/-1', textAlign: 'center', color: '#666', padding: '2rem' }}>
                            You haven't reported any pets yet. Use the "Report Lost Pet" button above!
                        </p>
                    )}
                </div>

                {/* 4. Stats Section */}
                <div className="stats-section">
                    <div className="stat-card orange">
                        <div className="stat-card-icon">🔍</div>
                        <div className="stat-number">{myPets.length}</div>
                        <div className="stat-label">Active Announcements</div>
                    </div>

                    <div className="stat-card green">
                        <div className="stat-card-icon">💚</div>
                        <div className="stat-number">
                            {myPets.filter(p => p.status === 'found').length}
                        </div>
                        <div className="stat-label">Successful Reunions</div>
                    </div>

                    <div className="stat-card blue">
                        <div className="stat-card-icon">👥</div>
                        <div className="stat-number">127</div>
                        <div className="stat-label">Community Views</div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default UserDashboard;