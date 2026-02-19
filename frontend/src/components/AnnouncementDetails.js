import React from 'react';

const AnnouncementDetails = ({ announcement, onBack }) => {
    if (!announcement) return null;

    // Форматування дати
    const date = new Date(announcement.created_at).toLocaleDateString();

    return (
        <div className="details-container" style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
            <button
                onClick={onBack}
                className="btn-draft"
                style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
                ← Back to list
            </button>

            <div className="details-card" style={{ background: 'white', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
                <div className="details-image" style={{ height: '400px', background: '#f0f0f0', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    {announcement.pet.photo ? (
                        <img src={announcement.pet.photo} alt={announcement.pet.name} style={{ width: '100%', height: '100%', objectCover: 'cover' }} />
                    ) : (
                        <span style={{ fontSize: '5rem' }}>{announcement.pet.pet_type === 'Cat' ? '🐈' : '🐕'}</span>
                    )}
                </div>

                <div className="details-content" style={{ padding: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                        <div>
                            <span className={`status-badge ${announcement.status.toLowerCase()}`} style={{ fontSize: '0.8rem' }}>
                                {announcement.status.toUpperCase()}
                            </span>
                            <h1 style={{ fontSize: '2.5rem', margin: '0.5rem 0' }}>{announcement.pet.name}</h1>
                            <p style={{ color: '#666', fontSize: '1.2rem' }}>{announcement.pet.breed || 'Mixed Breed'}</p>
                        </div>
                        <p style={{ color: '#999' }}>Posted on {date}</p>
                    </div>

                    <hr style={{ margin: '1.5rem 0', border: 'none', borderTop: '1px solid #eee' }} />

                    <div className="details-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                        <div className="info-item">
                            <label style={{ display: 'block', color: '#999', fontSize: '0.8rem', fontWeight: 'bold' }}>GENDER</label>
                            <span style={{ fontWeight: 'bold' }}>{announcement.pet.gender}</span>
                        </div>
                        <div className="info-item">
                            <label style={{ display: 'block', color: '#999', fontSize: '0.8rem', fontWeight: 'bold' }}>COLOR</label>
                            <span style={{ fontWeight: 'bold' }}>{announcement.pet.color || 'N/A'}</span>
                        </div>
                        <div className="info-item">
                            <label style={{ display: 'block', color: '#999', fontSize: '0.8rem', fontWeight: 'bold' }}>LOCATION</label>
                            <span style={{ fontWeight: 'bold' }}>📍 {announcement.location?.address || 'Unknown'}</span>
                        </div>
                    </div>

                    <div className="description-box" style={{ marginBottom: '2rem' }}>
                        <h3 style={{ marginBottom: '0.5rem' }}>Description</h3>
                        <p style={{ color: '#444', lineHeight: '1.6' }}>{announcement.description || 'No additional details provided by the owner.'}</p>
                    </div>

                    <div className="contact-box" style={{ background: '#FFF5F2', padding: '1.5rem', borderRadius: '15px', border: '1px solid #FFE0D6' }}>
                        <h3 style={{ color: '#FF6B4A', marginBottom: '1rem' }}>Contact Information</h3>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '1.5rem', fontWeight: 'bold', fontFamily: 'monospace' }}>{announcement.contact_phone}</span>
                            <a href={`tel:${announcement.contact_phone}`} className="btn btn-primary" style={{ textDecoration: 'none' }}>Call Now</a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnnouncementDetails;