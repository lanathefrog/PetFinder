import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { createAnnouncement, getAnnouncements, contactAnnouncementOwner } from '../services/api';
import { useToast } from './ToastContext';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import '../styles/forms.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
});

const ReportFound = ({ onRefresh, onCancel }) => {
    const { showToast } = useToast();
    const navigate = useNavigate();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoadingContact, setIsLoadingContact] = useState(true);
    const [activeTab, setActiveTab] = useState('new');
    const [lostPets, setLostPets] = useState([]);
    const [preview, setPreview] = useState(null);
    const [additionalPreviews, setAdditionalPreviews] = useState([]);
    const [position, setPosition] = useState([50.4501, 30.5234]);

    const [suggestions, setSuggestions] = useState([]);

    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const { latitude, longitude } = pos.coords;
                    let shouldSet = false;
                    setPosition((cur) => {
                        if (!cur || (Array.isArray(cur) && cur[0] === 50.4501 && cur[1] === 30.5234)) {
                            shouldSet = true;
                            return [latitude, longitude];
                        }
                        return cur;
                    });
                    if (shouldSet) reverseGeocode({ lat: latitude, lng: longitude });
                },
                () => {},
                { enableHighAccuracy: true, timeout: 5000 }
            );
        }
    }, []);

    const searchLocation = async (query) => {
        if (!query) {
            setSuggestions([]);
            return;
        }

        try {
            const res = await axios.get(
                `https://nominatim.openstreetmap.org/search`,
                {
                    params: {
                        q: query,
                        format: "json",
                        addressdetails: 1,
                        limit: 5,
                    },
                }
            );

            setSuggestions(res.data);
        } catch (err) {
            console.log("Location search error", err);
        }
    };

    const handleLocationInput = (value) => {
        setFormData((prev) => ({ ...prev, location: value }));
        searchLocation(value);
    };
    const [isPickingLocation, setIsPickingLocation] = useState(true);
    const [contactData, setContactData] = useState({
        username: '',
        email: '',
        phone_number: ''
    });
    const [formData, setFormData] = useState({
        name: '',
        pet_type: 'dog',
        breed: '',
        gender: 'unknown',
        size: 'medium',
        color: '',
        location: '',
        date_found: new Date().toISOString().split('T')[0], 
        description: '',
        image: null,
        additionalImages: []
    });
    const token = localStorage.getItem('access_token');

    const reverseGeocode = async ({ lat, lng }) => {
        try {
            const res = await axios.get(
                "http://127.0.0.1:8001/api/reverse-geocode/",
                {
                    params: { lat, lon: lng },
                }
            );

            setFormData((prev) => ({
                ...prev,
                location: res.data.address,
            }));
        } catch (err) {
            console.log("Reverse geocode error", err);
        }
    };

    const LocationPickerMap = () => {
        useMapEvents({
            click(e) {
                const newPosition = [e.latlng.lat, e.latlng.lng];
                setPosition(newPosition);
                reverseGeocode({ lat: e.latlng.lat, lng: e.latlng.lng });
            },
        });

        return position && Array.isArray(position) ? (
            <Marker
                position={position}
                draggable={true}
                eventHandlers={{
                    dragend: (e) => {
                        const latlng = e.target.getLatLng();
                        setPosition([latlng.lat, latlng.lng]);
                        reverseGeocode({ lat: latlng.lat, lng: latlng.lng });
                    },
                }}
            />
        ) : null;
    };

    const RecenterAutomatically = ({ position }) => {
        const map = useMap();
        useEffect(() => {
            if (position && Array.isArray(position)) {
                map.setView(position, map.getZoom());
            }
        }, [position, map]);
        return null;
    };

    useEffect(() => {
        if (activeTab === 'match') {
            getAnnouncements()
                .then((res) => {
                    const lost = res.data.filter((ann) => ann.status === 'lost');
                    setLostPets(lost);
                })
                .catch((err) => console.error('Error fetching lost pets:', err));
        }
    }, [activeTab]);

    useEffect(() => {
        const loadContactData = async () => {
            try {
                const res = await axios.get('http://127.0.0.1:8001/api/users/me/', {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
                setContactData({
                    username: res.data.username || '',
                    email: res.data.email || '',
                    phone_number: res.data.phone_number || ''
                });
            } catch (err) {
                console.error('Failed to load contact data:', err);
                showToast('Could not load your contact information', 'error');
            } finally {
                setIsLoadingContact(false);
            }
        };

        loadContactData();
    }, [token, showToast]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleTypeSelect = (type) => {
        setFormData({ ...formData, pet_type: type.toLowerCase() });
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setFormData({ ...formData, image: file });
            setPreview(URL.createObjectURL(file));
        }
    };

    const handleAdditionalImagesChange = (e) => {
        const files = Array.from(e.target.files || []);
        setFormData((prev) => ({ ...prev, additionalImages: files }));
        setAdditionalPreviews(files.map((file) => URL.createObjectURL(file)));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.pet_type) {
            showToast('Please select the pet type', 'error');
            return;
        }
        if (!formData.location.trim()) {
            showToast('Please enter the location where you found the pet', 'error');
            return;
        }
        if (!formData.date_found) {
            showToast('Please select the date you found the pet', 'error');
            return;
        }
        setIsSubmitting(true);

        const dataPayload = new FormData();
        dataPayload.append('pet.name', formData.name.trim() || 'Unknown');
        dataPayload.append('pet.pet_type', formData.pet_type);
        dataPayload.append('pet.breed', formData.breed || 'Unknown');
        dataPayload.append('pet.gender', formData.gender || 'unknown');
        dataPayload.append('pet.color', formData.color || 'Unknown');
        if (formData.image) {
            dataPayload.append('pet.photo', formData.image);
        }
        if (Array.isArray(formData.additionalImages) && formData.additionalImages.length > 0) {
            formData.additionalImages.forEach((file) => {
                dataPayload.append('photos', file);
            });
        }

        dataPayload.append('status', 'found');
        dataPayload.append('location.address', formData.location);
        if (position) {
            dataPayload.append("location.latitude", position[0]);
            dataPayload.append("location.longitude", position[1]);
        }

        const fullDescription = `Found on: ${formData.date_found}\nFinder: ${contactData.username || 'Unknown user'}\nEmail: ${contactData.email}\nPhone: ${contactData.phone_number}\n\n${formData.description || ''}`;
        dataPayload.append('description', fullDescription);

        try {
            const response = await createAnnouncement(dataPayload);
            const announcementId = response.data?.id;
            showToast('Thank you! The found pet report has been posted! Opening announcement...', 'success');

            if (onRefresh) onRefresh();
            
            // Navigate to the announcement after a short delay
            setTimeout(() => {
                if (announcementId) {
                    navigate(`/announcement/${announcementId}`);
                } else {
                    onCancel?.();
                }
            }, 800);
        } catch (err) {
            console.error('Submission error:', err);
            showToast('Failed to submit report. Please try again.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatDate = (dateString) => new Date(dateString).toLocaleDateString();

    return (
        <div className="form-page">
            <div className="form-container" style={{ maxWidth: activeTab === 'match' ? '900px' : '700px' }}>
                <div className="form-header">
                    <div className="form-icon">🧡</div>
                    <h1>Found a Pet?</h1>
                    <p>Help us reunite this pet with their family.</p>
                </div>

                <div className="form-card">
                    <div className="form-tabs" style={{ display: 'flex', borderBottom: '1px solid #eee', marginBottom: '2rem' }}>
                        <button
                            type="button"
                            onClick={() => setActiveTab('new')}
                            style={{
                                flex: 1,
                                padding: '1rem',
                                background: 'none',
                                border: 'none',
                                borderBottom: activeTab === 'new' ? '3px solid #FF6B4A' : '3px solid transparent',
                                fontWeight: activeTab === 'new' ? 'bold' : 'normal',
                                color: activeTab === 'new' ? '#FF6B4A' : '#666',
                                cursor: 'pointer',
                                fontSize: '1rem'
                            }}
                        >
                            Create New Report
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('match')}
                            style={{
                                flex: 1,
                                padding: '1rem',
                                background: 'none',
                                border: 'none',
                                borderBottom: activeTab === 'match' ? '3px solid #FF6B4A' : '3px solid transparent',
                                fontWeight: activeTab === 'match' ? 'bold' : 'normal',
                                color: activeTab === 'match' ? '#FF6B4A' : '#666',
                                cursor: 'pointer',
                                fontSize: '1rem'
                            }}
                        >
                            Check Lost Pets
                        </button>
                    </div>

                    {activeTab === 'new' ? (
                        <form onSubmit={handleSubmit}>
                            <h3 className="form-section-title" style={{ marginBottom: '1rem', color: '#333' }}>1. Pet Details</h3>

                            <div className="form-group">
                                <label>Pet Type</label>
                                <div className="pet-type-selector" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                    {['Dog', 'Cat', 'Bird', 'Other'].map((type) => (
                                        <button
                                            key={type}
                                            type="button"
                                            onClick={() => handleTypeSelect(type)}
                                            style={{
                                                flex: 1,
                                                padding: '10px',
                                                border: formData.pet_type === type.toLowerCase() ? '2px solid #FF6B4A' : '2px solid #e0e0e0',
                                                background: formData.pet_type === type.toLowerCase() ? '#FFF5F2' : 'white',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                fontWeight: '600',
                                                color: '#333'
                                            }}
                                        >
                                            {type}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Pet Name (optional)</label>
                                <input
                                    name="name"
                                    type="text"
                                    className="form-input"
                                    value={formData.name}
                                    placeholder="If known, enter the pet's name"
                                    onChange={handleChange}
                                />
                                <p className="helper-text">Leave empty if you do not know the name.</p>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Breed</label>
                                    <input name="breed" type="text" className="form-input" placeholder="e.g. Beagle" onChange={handleChange} />
                                </div>
                                <div className="form-group">
                                    <label>Color</label>
                                    <input name="color" type="text" className="form-input" placeholder="e.g. Brown" onChange={handleChange} />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Gender</label>
                                    <select name="gender" className="form-input" onChange={handleChange}>
                                        <option value="unknown">Unknown</option>
                                        <option value="male">Male</option>
                                        <option value="female">Female</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Size</label>
                                    <select name="size" className="form-input" onChange={handleChange}>
                                        <option value="medium">Medium</option>
                                        <option value="small">Small</option>
                                        <option value="large">Large</option>
                                    </select>
                                </div>
                            </div>

                            <div className="form-group" style={{ marginTop: '1.5rem' }}>
                                <label>Main Photo</label>
                                <div
                                    className="upload-area"
                                    style={{
                                        border: '2px dashed #e0e0e0',
                                        borderRadius: '12px',
                                        padding: '2rem',
                                        textAlign: 'center',
                                        cursor: 'pointer',
                                        background: '#f9f9f9'
                                    }}
                                >
                                    <input type="file" id="found-pet-image" hidden onChange={handleImageChange} accept="image/*" />
                                    <label htmlFor="found-pet-image" style={{ cursor: 'pointer', width: '100%', display: 'block' }}>
                                        {preview ? (
                                            <img src={preview} alt="Preview" style={{ maxHeight: '200px', borderRadius: '8px' }} />
                                        ) : (
                                            <>
                                                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📷</div>
                                                <p>Click to upload main photo</p>
                                            </>
                                        )}
                                    </label>
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Additional Photos</label>
                                <label htmlFor="additional-photos-found" className="file-input-label">
                                    Add Extra Photos
                                    {formData.additionalImages.length > 0 && (
                                        <span className="file-count">{formData.additionalImages.length}</span>
                                    )}
                                </label>
                                <input
                                    id="additional-photos-found"
                                    type="file"
                                    className="form-input"
                                    multiple
                                    accept="image/*"
                                    onChange={handleAdditionalImagesChange}
                                />
                                <p className="helper-text">Attach extra photos (optional) to improve matching.</p>
                                {additionalPreviews.length > 0 && (
                                    <div className="extra-photos-preview-grid">
                                        {additionalPreviews.map((src, idx) => (
                                            <img key={`${src}-${idx}`} src={src} alt={`Additional ${idx + 1}`} className="extra-photo-preview" />
                                        ))}
                                    </div>
                                )}
                            </div>

                            <h3 className="form-section-title" style={{ margin: '2rem 0 1rem', color: '#333' }}>2. Location & Contact</h3>

                            <div className="form-group">
                                <label>📍 Location Found</label>
                                {!isPickingLocation ? (
                                    <div>
                                        <button
                                            type="button"
                                            className="btn btn-primary btn-location"
                                            onClick={() => setIsPickingLocation(true)}
                                        >
                                            🗺️ Pick Location on Map
                                        </button>

                                        <input
                                            name="location"
                                            type="text"
                                            className="form-input"
                                            value={formData.location}
                                            onChange={(e) => handleLocationInput(e.target.value)}
                                            placeholder="Search for a place or pick on the map"
                                            style={{ marginTop: '1rem' }}
                                        />

                                        {suggestions && suggestions.length > 0 && (
                                            <div className="location-suggestions">
                                                {suggestions.map((s) => (
                                                    <div key={s.place_id} className="location-suggestion-item" onClick={() => {
                                                        setFormData((prev) => ({ ...prev, location: s.display_name }));
                                                        setPosition([parseFloat(s.lat), parseFloat(s.lon)]);
                                                        setSuggestions([]);
                                                    }}>{s.display_name}</div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="location-picker-wrapper">
                                        <MapContainer
                                            center={position}
                                            zoom={13}
                                            style={{ height: "500px", width: "100%", borderRadius: "16px" }}
                                        >
                                            <TileLayer
                                                attribution="&copy; OpenStreetMap"
                                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                            />
                                                <RecenterAutomatically position={position} />
                                                <LocationPickerMap />
                                        </MapContainer>
                                        <div className="location-picker-controls" style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                            <button
                                                type="button"
                                                className="btn btn-success"
                                                onClick={() => setIsPickingLocation(false)}
                                            >
                                                ✓ Confirm
                                            </button>
                                            <button
                                                type="button"
                                                className="btn btn-secondary"
                                                onClick={() => setIsPickingLocation(false)}
                                            >
                                                ✕ Cancel
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Date Found</label>
                                    <input
                                        name="date_found"
                                        type="date"
                                        className="form-input"
                                        value={formData.date_found}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Finder Nickname</label>
                                    <input
                                        type="text"
                                        className="form-input form-input-readonly"
                                        value={contactData.username}
                                        placeholder={isLoadingContact ? 'Loading...' : 'Nickname from your profile'}
                                        readOnly
                                    />
                                    <p className="helper-text locked-field-note">Taken automatically from your profile.</p>
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Email</label>
                                    <input
                                        type="email"
                                        className="form-input form-input-readonly"
                                        value={contactData.email}
                                        placeholder={isLoadingContact ? "Loading..." : "your@email.com"}
                                        readOnly
                                    />
                                    <p className="helper-text locked-field-note">Update this in Profile to change it.</p>
                                </div>
                                <div className="form-group">
                                    <label>Phone Number</label>
                                    <input
                                        type="tel"
                                        className="form-input form-input-readonly"
                                        value={contactData.phone_number}
                                        placeholder={isLoadingContact ? "Loading..." : "+1 (555) 000-0000"}
                                        readOnly
                                    />
                                    <p className="helper-text locked-field-note">Update this in Profile to change it.</p>
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Description</label>
                                <textarea name="description" className="form-input" rows="3" onChange={handleChange}></textarea>
                            </div>

                            <div className="form-actions" style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                                <button type="button" className="btn-draft" onClick={onCancel} disabled={isSubmitting}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={isSubmitting} style={{ opacity: isSubmitting ? 0.7 : 1 }}>
                                    {isSubmitting ? '⏳ Submitting...' : '✓ Submit Report'}
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div className="lost-pets-list">
                            <h3 style={{ marginBottom: '1rem', color: '#333' }}>
                                Is the pet you found in this list?
                            </h3>

                            {lostPets.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '3rem', color: '#666' }}>
                                    <p>No lost pets reported recently.</p>
                                    <button
                                        onClick={() => setActiveTab('new')}
                                        style={{ marginTop: '1rem', color: '#FF6B4A', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}
                                    >
                                        Create a new report instead
                                    </button>
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                                    {lostPets.map((pet) => (
                                        <div key={pet.id} className="announcement-card-dashboard" style={{ padding: '1rem', border: '1px solid #eee', borderRadius: '12px' }}>
                                            <div className="announcement-card-header">
                                                <div className="announcement-thumbnail" style={{ width: '60px', height: '60px', fontSize: '1.5rem' }}>
                                                    {pet.pet.pet_type === 'cat' ? '🐈' : '🐕'}
                                                </div>
                                                <div className="announcement-info-dashboard">
                                                    <h3>{pet.pet.name}</h3>
                                                    <p className="breed" style={{ fontSize: '0.9rem' }}>{pet.pet.breed}</p>
                                                </div>
                                            </div>

                                            <div style={{ margin: '1rem 0', fontSize: '0.9rem', color: '#555' }}>
                                                <p>📍 {pet.location?.city || 'Unknown'}</p>
                                                <p>📅 Lost: {formatDate(pet.created_at)}</p>
                                            </div>

                                            <button
                                                className="btn btn-primary"
                                                style={{ width: '100%', padding: '0.5rem', fontSize: '0.9rem', background: '#FF6B4A', border: 'none' }}
                                                onClick={async () => {
                                                        try {
                                                            await contactAnnouncementOwner(pet.id);
                                                            showToast('Owner has been notified in-app', 'success');
                                                        } catch (err) {
                                                            console.error('Notify owner error', err);
                                                            showToast('Failed to notify owner', 'error');
                                                        }
                                                        window.location.href = `/announcements/${pet.id}`;
                                                    }}
                                            >
                                                I Found This Pet!
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ReportFound;
