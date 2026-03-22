import React, { useEffect, useState } from "react";
import "../styles/base.css";
import "../styles/responsive.css";
import "../styles/home.css";
import { getAnnouncements } from '../services/api';
import { useToast } from './ToastContext';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
    iconUrl: require('leaflet/dist/images/marker-icon.png'),
    shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const PET_ICON = (type) => type === 'cat' ? '🐈' : type === 'dog' ? '🐕' : '🐾';

const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const HomePage = ({ onNavigate }) => {
    const { showToast } = useToast();
    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                setLoading(true);
                const res = await getAnnouncements();
                setAnnouncements(res.data || []);
            } catch (err) {
                showToast && showToast('Could not load posts', 'error');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const recent = announcements.slice(0, 6);
    const lostCount = announcements.filter(a => a.status === 'lost').length;
    const foundCount = announcements.filter(a => a.status === 'found').length;
    const reunitedCount = announcements.filter(a => a.is_reunited).length;
    const withCoords = announcements.filter(a => a.location?.latitude && a.location?.longitude);
    const mapCenter = withCoords.length > 0
        ? [withCoords[0].location.latitude, withCoords[0].location.longitude]
        : [50.45, 30.52];

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
                            <button className="btn btn-primary" onClick={() => onNavigate("report_lost")}>
                                🔍 Report Lost Pet
                            </button>
                            <button className="btn btn-secondary" onClick={() => onNavigate("report_found")}>
                                🧡 Report Found Pet
                            </button>
                        </div>
                        <div className="hero-stats">
                            <div>
                                <strong>{loading ? '…' : announcements.length}</strong>
                                <span>Total Posts</span>
                            </div>
                            <div>
                                <strong>{loading ? '…' : lostCount}</strong>
                                <span>Lost</span>
                            </div>
                            <div>
                                <strong>{loading ? '…' : foundCount}</strong>
                                <span>Found</span>
                            </div>
                            <div>
                                <strong>{loading ? '…' : reunitedCount}</strong>
                                <span>Reunited</span>
                            </div>
                        </div>
                    </div>

                    <div className="hero-right">
                        <div className="hero-paw-illustration">
                            <div className="paw-circle">
                                <span className="paw-big">🐾</span>
                                <div className="floating-pet pet-dog">🐕</div>
                                <div className="floating-pet pet-cat">🐈</div>
                            </div>
                            <div className="hero-badge-card lost-card">
                                <span className="hbc-icon">😿</span>
                                <div>
                                    <strong>{loading ? '…' : lostCount}</strong>
                                    <small>Lost pets</small>
                                </div>
                            </div>
                            <div className="hero-badge-card found-card">
                                <span className="hbc-icon">🏠</span>
                                <div>
                                    <strong>{loading ? '…' : reunitedCount}</strong>
                                    <small>Reunited</small>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </section>

            {/* LIVE MAP */}
            <section className="map-preview-section">
                <div className="section-label">Interactive Map</div>
                <h2>Lost & Found Pets Near You</h2>
                <p>Real-time community reports — click any pin for details</p>
                <div className="map-preview-card">
                    <MapContainer
                        center={mapCenter}
                        zoom={withCoords.length > 0 ? 12 : 6}
                        style={{ height: '420px', width: '100%', borderRadius: '16px 16px 0 0' }}
                        scrollWheelZoom={false}
                    >
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        {withCoords.map(ann => (
                            <Marker
                                key={ann.id}
                                position={[ann.location.latitude, ann.location.longitude]}
                            >
                                <Popup>
                                    <div className="map-popup">
                                        {ann.pet.photo && (
                                            <img src={ann.pet.photo} alt={ann.pet.name} className="map-popup-img" />
                                        )}
                                        <div className="map-popup-name">
                                            {PET_ICON(ann.pet.pet_type)} {ann.pet.name || (ann.pet.pet_type === 'cat' ? 'Cat' : 'Dog')}
                                        </div>
                                        <div className={`map-popup-status ${ann.status}`}>{ann.status.toUpperCase()}</div>
                                        {ann.location.address && (
                                            <div className="map-popup-addr">📍 {ann.location.address}</div>
                                        )}
                                        <button
                                            className="map-popup-btn"
                                            onClick={() => onNavigate('details', { announcement: ann })}
                                        >View Details</button>
                                    </div>
                                </Popup>
                            </Marker>
                        ))}
                    </MapContainer>
                    <div className="map-footer-bar">
                        <span>{withCoords.length} active reports on map</span>
                        <button className="view-map-btn" onClick={() => onNavigate("listing")}>
                            Open Full Map with Filters →
                        </button>
                    </div>
                </div>
            </section>

            {/* HOW IT WORKS */}
            <section className="how-section">
                <div className="section-label">Simple Process</div>
                <h2>How It Works</h2>
                <div className="how-grid">
                    <div className="how-card">
                        <div className="how-icon">📷</div>
                        <h3>1. Post Details</h3>
                        <p>Upload a photo and describe your pet — color, breed, size, and where they were last seen.</p>
                    </div>
                    <div className="how-card">
                        <div className="how-icon blue">📍</div>
                        <h3>2. Share Location</h3>
                        <p>Pin the exact spot on our map. Your post is instantly visible to people nearby.</p>
                    </div>
                    <div className="how-card">
                        <div className="how-icon green">💬</div>
                        <h3>3. Connect & Reunite</h3>
                        <p>Chat directly with owners or finders through our built-in messaging system.</p>
                    </div>
                </div>
            </section>

            {/* RECENT POSTS */}
            <section className="recent-section">
                <div className="recent-header">
                    <div>
                        <div className="section-label">Latest Activity</div>
                        <h2>Recent Posts</h2>
                    </div>
                    <button className="btn btn-secondary" onClick={() => onNavigate("listing")}>
                        View All{!loading && announcements.length > 0 ? ` (${announcements.length})` : ''} →
                    </button>
                </div>

                {loading ? (
                    <div className="recent-grid">
                        {[1, 2, 3, 4].map(i => <div key={i} className="recent-card skeleton-card" />)}
                    </div>
                ) : recent.length === 0 ? (
                    <div className="no-posts-placeholder">
                        <span>🐾</span>
                        <p>No posts yet — be the first to help!</p>
                        <button className="btn btn-primary" onClick={() => onNavigate('report_lost')}>
                            Report Lost Pet
                        </button>
                    </div>
                ) : (
                    <div className="recent-grid">
                        {recent.map((r) => (
                            <div
                                key={r.id}
                                className="recent-card"
                                onClick={() => onNavigate('details', { announcement: r })}
                            >
                                <div className="recent-img">
                                    {r.pet.photo
                                        ? <img src={r.pet.photo} alt={r.pet.name || 'pet'} />
                                        : <span className="pet-placeholder">{PET_ICON(r.pet.pet_type)}</span>
                                    }
                                    <span className={`status-overlay ${r.status}`}>{r.status}</span>
                                    {r.is_reunited && <span className="reunited-overlay">✅ Reunited</span>}
                                </div>
                                <div className="recent-content">
                                    <h3>{r.pet.name || (r.pet.pet_type === 'cat' ? 'Unknown Cat' : r.pet.pet_type === 'dog' ? 'Unknown Dog' : 'Unknown Pet')}</h3>
                                    {r.pet.breed && <p className="pet-breed">{r.pet.breed}</p>}
                                    <p className="pet-location">📍 {r.location?.address || 'Location not provided'}</p>
                                    <p className="pet-date">📅 {formatDate(r.created_at)}</p>
                                    <button
                                        className="btn btn-primary small"
                                        onClick={(e) => { e.stopPropagation(); onNavigate('details', { announcement: r }); }}
                                    >
                                        View Details
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* CTA */}
            <section className="cta-section">
                <div className="cta-content">
                    <div className="cta-paw">🐾</div>
                    <h2>Every Pet Deserves to Come Home</h2>
                    <p>Join our community of pet lovers and help reunite lost pets with their families.</p>
                    <div className="cta-buttons">
                        <button className="cta-btn-outline" onClick={() => onNavigate('report_lost')}>
                            🔍 Report Lost Pet
                        </button>
                        <button className="cta-btn-solid" onClick={() => onNavigate('report_found')}>
                            🧡 Report Found Pet
                        </button>
                    </div>
                </div>
            </section>

        </div>
    );
};

export default HomePage;
