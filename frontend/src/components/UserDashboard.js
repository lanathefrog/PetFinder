import React, { useEffect, useState } from 'react';
import { getMyAnnouncements, deleteAnnouncement } from '../services/api';

const UserDashboard = ({ onNavigate }) => {
    const [myPets, setMyPets] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadDashboardData = () => {
        setLoading(true);
        getMyAnnouncements()
            .then(res => {
                setMyPets(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Error loading dashboard:", err);
                setLoading(false);
            });
    };

    useEffect(() => {
        loadDashboardData();
    }, []);

    const handleDelete = async (id) => {
        // Використовуємо кастомне вікно підтвердження (простий confirm для швидкості)
        if (window.confirm("Are you sure you want to delete this announcement?")) {
            try {
                await deleteAnnouncement(id);
                // Оновлюємо список після видалення
                setMyPets(myPets.filter(pet => pet.id !== id));
            } catch (err) {
                alert("Failed to delete announcement.");
            }
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Date unknown';
        return new Date(dateString).toLocaleDateString();
    };

    return (
        <div className="dashboard-page">
            <div className="dashboard-header">
                <div className="dashboard-title">
                    <h1>Dashboard</h1>
                    <p>Manage your pet announcements and help reunite families</p>
                </div>
            </div>

            <section className="quick-actions-section">
                <div className="quick-actions-card">
                    <h2>Quick Actions</h2>
                    <div className="quick-actions-buttons">
                        <button className="btn btn-primary" onClick={() => onNavigate('report_lost')}>
                            🔍 Report Lost Pet
                        </button>
                        <button className="btn btn-secondary" onClick={() => onNavigate('report_found')}>
                            🧡 Report Found Pet
                        </button>
                    </div>
                </div>

                <div className="my-pets-grid">
                    <h2 style={{ gridColumn: '1/-1', marginBottom: '1rem' }}>Your Active Posts</h2>

                    {loading ? (
                        <p style={{ textAlign: 'center', gridColumn: '1/-1' }}>Loading your pets...</p>
                    ) : myPets.length > 0 ? (
                        myPets.map(pet => (
                            <div key={pet.id} className="announcement-card-dashboard">
                                <div className="announcement-card-header">
                                    <div className="announcement-thumbnail">
                                        {pet.pet.pet_type === 'Cat' ? '🐈' : '🐕'}
                                    </div>
                                    <div className="announcement-info-dashboard">
                                        <span className={`status-badge ${pet.status.toLowerCase()}`}>{pet.status}</span>
                                        <h3>{pet.pet.name}</h3>
                                        <p className="breed">{pet.pet.breed || 'Unknown Breed'}</p>
                                    </div>
                                </div>

                                <div className="announcement-meta">
                                    <div className="meta-item"><span>📍</span><span>{pet.location?.address || 'Location N/A'}</span></div>
                                    <div className="meta-item"><span>📅</span><span>{formatDate(pet.created_at)}</span></div>
                                </div>

                                <div className="announcement-actions">
                                    <button className="action-btn edit" onClick={() => alert("Edit coming soon!")}>✏️ Edit</button>
                                    <button className="action-btn delete" onClick={() => handleDelete(pet.id)}>🗑️ Delete</button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p style={{ gridColumn: '1/-1', textAlign: 'center', color: '#666', padding: '2rem' }}>
                            You haven't reported any pets yet.
                        </p>
                    )}
                </div>

                <div className="stats-section">
                    <div className="stat-card orange">
                        <div className="stat-card-icon">🔍</div>
                        <div className="stat-number">{myPets.length}</div>
                        <div className="stat-label">My Announcements</div>
                    </div>
                    <div className="stat-card blue">
                        <div className="stat-card-icon">👥</div>
                        <div className="stat-number">42</div>
                        <div className="stat-label">Views</div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default UserDashboard;