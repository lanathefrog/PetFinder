import React, { useEffect, useState } from 'react';
import { getMyAnnouncements, deleteAnnouncement } from '../services/api';

const UserDashboard = ({ onNavigate, onSelect }) => {
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

    const handleDelete = async (e, id) => {
        e.stopPropagation(); 
        if (window.confirm("Are you sure you want to delete this announcement?")) {
            try {
                await deleteAnnouncement(id);
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

    const formatShortAddress = (address) => {
        if (!address) return 'Location N/A';
        const parts = address.split(',').map(p => p.trim()).filter(Boolean);
        if (parts.length === 0) return 'Location N/A';

        const street = parts[0];
        const country = parts[parts.length - 1];
        const city = parts.length >= 2 ? parts[parts.length - 2] : (parts[1] || '');

        const elems = [];
        if (street) elems.push(street);
        if (city && city !== street && city !== country) elems.push(city);
        if (country && country !== city) elems.push(country);

        return elems.join(', ');
    };

    const petIcon = (type) => (type === 'cat' ? '🐈' : type === 'dog' ? '🐕' : '🐾');

    const activeCount = myPets.length;
    const lostCount = myPets.filter(p => p.status === 'lost').length;
    const foundCount = myPets.filter(p => p.status === 'found').length;

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
                    <h2 style={{ gridColumn: '1/-1', marginBottom: '1rem' }}>
                        Your Active Posts
                    </h2>

                    {loading ? (
                        <p style={{ textAlign: 'center', gridColumn: '1/-1' }}>
                            Loading your pets...
                        </p>
                    ) : myPets.length > 0 ? (
                        myPets.map(pet => (
                            <div
                                key={pet.id}
                                className="announcement-card-dashboard"
                                onClick={() => onSelect && onSelect(pet)} 
                            >
                                <div className="announcement-thumbnail">
                                    {pet.pet.photo ? (
                                        <img src={pet.pet.photo} alt={pet.pet.name} />
                                    ) : (
                                        <span className="announcement-thumbnail-fallback">{petIcon(pet.pet.pet_type)}</span>
                                    )}
                                    <span className={`status-overlay-dashboard ${pet.status.toLowerCase()}`}>
                                        {pet.status}
                                    </span>
                                    {pet.is_reunited && (
                                        <span className="reunited-overlay-dashboard">✅ Reunited</span>
                                    )}
                                </div>

                                    <div className="announcement-info-dashboard">
                                        <h3>{pet.pet.name || (pet.pet.pet_type === 'cat' ? 'Unknown Cat' : 'Unknown Dog')}</h3>
                                        <p className="breed">
                                            {pet.pet.breed || 'Unknown Breed'}
                                        </p>
                                    </div>

                                <div className="announcement-meta">
                                    <div className="meta-item">
                                        <span>📍</span>
                                        <span>{formatShortAddress(pet.location?.address)}</span>
                                    </div>
                                    <div className="meta-item">
                                        <span>📅</span>
                                        <span>{formatDate(pet.created_at)}</span>
                                    </div>
                                </div>

                                <div className="announcement-actions">
                                    <button
                                        className="action-btn edit"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onSelect && onSelect(pet);
                                        }}
                                    >
                                        ✏️ Edit
                                    </button>

                                    <button
                                        className="action-btn delete"
                                        onClick={(e) => handleDelete(e, pet.id)}
                                    >
                                        🗑️ Delete
                                    </button>
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
                        <div className="stat-card-icon">📢</div>
                        <div className="stat-number">{activeCount}</div>
                        <div className="stat-label">Active Announcements</div>
                    </div>

                    <div className="stat-card green">
                        <div className="stat-card-icon">🔍</div>
                        <div className="stat-number">{lostCount}</div>
                        <div className="stat-label">Lost Posts</div>
                    </div>

                    <div className="stat-card blue">
                        <div className="stat-card-icon">❤️</div>
                        <div className="stat-number">{foundCount}</div>
                        <div className="stat-label">Found Posts</div>
                    </div>

                </div>

            </section>
        </div>
    );
};

export default UserDashboard;
