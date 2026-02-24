import React, { useEffect, useState } from "react";
import "../styles/base.css";
import "../styles/responsive.css";
import "../styles/home.css";
import { getAnnouncements } from '../services/api';
import { useToast } from './ToastContext';

const HomePage = ({ onNavigate }) => {
    const [recent, setRecent] = useState([]);
    const { showToast } = useToast();

    useEffect(() => {
        const load = async () => {
            try {
                const res = await getAnnouncements();
                // show latest 4
                setRecent(res.data.slice(0, 4));
            } catch (err) {
                console.error('Failed to load recent posts', err);
                showToast && showToast('Could not load recent posts', 'error');
            }
        };
        load();
    }, [showToast]);

    return (
        <div className="home-page">

            {/* HERO */}
            <section className="hero-section">
                <div className="hero-container">

                    <div className="hero-left">
                        <span className="hero-badge">🐾 Reuniting Families</span>

                        <h1>
                            Helping pets <br />
                            <span className="accent">find their way home</span>
                        </h1>

                        <p>
                            Report lost or found pets in your community.
                            Together, we can bring them back to where they belong.
                        </p>

                        <div className="hero-buttons">
                            <button
                                className="btn btn-primary"
                                onClick={() => onNavigate("report_lost")}
                            >
                                🔍 Report Lost Pet
                            </button>

                            <button
                                className="btn btn-secondary"
                                onClick={() => onNavigate("report_found")}
                            >
                                🧡 Report Found Pet
                            </button>
                        </div>

                        <div className="hero-stats">
                            <div>
                                <strong>2,847</strong>
                                <span>Pets Reunited</span>
                            </div>
                            <div>
                                <strong>12,500+</strong>
                                <span>Active Members</span>
                            </div>
                        </div>
                    </div>

                    <div className="hero-right">
                        <div className="hero-image-placeholder" aria-hidden>
                            <div className="floating-pet pet-dog">🐕</div>
                            <div className="floating-pet pet-cat">🐈</div>
                        </div>
                    </div>

                </div>
            </section>

            {/* MAP PREVIEW */}
            <section className="map-preview-section">
                <h2>Lost & Found Pets Near You</h2>
                <p>Explore recent reports on our interactive map</p>

                <div className="map-preview-card">
                    <div className="map-fake">
                        🗺 Map Preview
                        <button
                            className="view-map-btn"
                            onClick={() => onNavigate("listing")}
                        >
                            View Full Map
                        </button>
                    </div>
                </div>
            </section>

            {/* HOW IT WORKS */}
            <section className="how-section">
                <h2>How It Works</h2>

                <div className="how-grid">
                    <div className="how-card">
                        <div className="how-icon">📷</div>
                        <h3>1. Post Details</h3>
                        <p>Upload a photo and provide details about your pet.</p>
                    </div>

                    <div className="how-card">
                        <div className="how-icon blue">📍</div>
                        <h3>2. Share Location</h3>
                        <p>Your post appears on the interactive map instantly.</p>
                    </div>

                    <div className="how-card">
                        <div className="how-icon green">💬</div>
                        <h3>3. Connect & Reunite</h3>
                        <p>Contact owners and help bring pets home.</p>
                    </div>
                </div>
            </section>

            {/* RECENT POSTS */}
            <section className="recent-section">
                <div className="recent-header">
                    <h2>Recent Posts</h2>
                    <button
                        className="btn btn-secondary"
                        onClick={() => onNavigate("listing")}
                    >
                        View All Posts →
                    </button>
                </div>

                <div className="recent-grid">
                    {recent.length === 0 && (
                        <div className="recent-card">
                            <div className="recent-img">🐾</div>
                            <div className="recent-content">
                                <h3>No recent posts</h3>
                                <p>Be the first to report a pet!</p>
                            </div>
                        </div>
                    )}

                    {recent.map((r) => (
                        <div key={r.id} className="recent-card" onClick={()=>onNavigate('details', r.id)} style={{cursor:'pointer'}}>
                            <div className="recent-img">
                                {r.pet.photo ? <img src={r.pet.photo} alt={r.pet.name} /> : (r.pet.pet_type==='cat' ? '🐈' : '🐕')}
                            </div>
                            <div className="recent-content">
                                <span className="lost-badge">{r.status}</span>
                                <h3>{r.pet.name || (r.pet.pet_type === 'cat' ? 'Cat' : 'Dog')}</h3>
                                <p>📍 {r.location?.address || 'Unknown'}</p>
                                <button className="btn btn-primary small">
                                    Contact Owner
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* BIG CTA */}
            <section className="cta-section">
                <h2>Every Pet Deserves to Come Home</h2>
                <p>
                    Join our community of pet lovers and help reunite lost pets with their families.
                </p>

                <div className="cta-buttons">
                    <button className="btn btn-secondary">
                        Post a Report
                    </button>
                    <button className="btn btn-primary">
                        Join Community
                    </button>
                </div>
            </section>

        </div>
    );
};

export default HomePage;
