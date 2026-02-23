import React, { useState } from 'react';
import axios from "axios";
import { deleteAnnouncement, updateAnnouncement } from '../services/api';
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { useToast } from "./ToastContext";
import 'leaflet/dist/leaflet.css';
import '../styles/detail.css';

// FIX leaflet icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
});

const AnnouncementDetails = ({ announcement, onBack, onDeleted }) => {
    const { showToast } = useToast();
    const token = localStorage.getItem("access_token");
    const [localAnnouncement, setLocalAnnouncement] = useState(announcement);

    const [isEditing, setIsEditing] = useState(false);
    const [phone, setPhone] = useState(announcement.phone_number || "");
    const [email, setEmail] = useState(announcement.email || "");
    const [preview, setPreview] = useState(null);
    const [newPhoto, setNewPhoto] = useState(null);

    const currentUserId = parseInt(localStorage.getItem("user_id"), 10);
    const isOwner = currentUserId === localAnnouncement.owner;

    const initialLat = announcement.location?.latitude ?? null;
    const initialLng = announcement.location?.longitude ?? null;

    const [location, setLocation] = useState({
        latitude: initialLat,
        longitude: initialLng,
    });
    const [editingLocation, setEditingLocation] = useState({
        latitude: initialLat,
        longitude: initialLng,
    });
    const [isPickingLocation, setIsPickingLocation] = useState(false);

    const [formData, setFormData] = useState({
        name: announcement.pet.name || "",
        pet_type: announcement.pet.pet_type || "other",
        breed: announcement.pet.breed || "",
        color: announcement.pet.color || "",
        gender: announcement.pet.gender || "unknown",
        description: announcement.description || "",
    });

    const hasCoords =
        location.latitude !== null &&
        location.latitude !== undefined &&
        location.longitude !== null &&
        location.longitude !== undefined;

    const handleMapClick = (e) => {
        const { lat, lng } = e.latlng;
        setEditingLocation({ latitude: lat, longitude: lng });
    };

    const handleConfirmLocation = () => {
        setLocation(editingLocation);
        setIsPickingLocation(false);
        showToast("Location updated!", "success");
    };

    const handleCancelLocationPick = () => {
        setEditingLocation(location);
        setIsPickingLocation(false);
    };

    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setNewPhoto(file);
        setPreview(URL.createObjectURL(file));
    };

    const handlePhotoRemove = () => {
        setPreview(null);
        setNewPhoto(null);
    };

    const handleDelete = async () => {
        if (window.confirm("Are you sure you want to delete this announcement?")) {
            await deleteAnnouncement(localAnnouncement.id);
            onDeleted();
        }
    };

    const handleSave = async () => {
        const payload = new FormData();

        payload.append("pet.name", formData.name);
        payload.append("pet.breed", formData.breed);
        payload.append("pet.color", formData.color);
        payload.append("pet.gender", formData.gender);
        payload.append("pet.pet_type", formData.pet_type);
        payload.append("description", formData.description || "");

        if (newPhoto) {
            payload.append("pet.photo", newPhoto);
        }

        if (location.latitude !== null && location.longitude !== null) {
            payload.append("location.latitude", location.latitude);
            payload.append("location.longitude", location.longitude);
        }

        try {
            await axios.put(
                "http://127.0.0.1:8001/api/users/me/",
                {
                    phone_number: phone,
                    email,
                },
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            const res = await updateAnnouncement(localAnnouncement.id, payload);
            const updated = res.data || {};
            const resolvedPhoto = updated.pet?.photo || preview || localAnnouncement.pet.photo || null;

            setLocalAnnouncement((prev) => ({
                ...prev,
                ...updated,
                phone_number: phone,
                email,
                description: updated.description ?? formData.description ?? prev.description,
                location: updated.location ?? location,
                pet: {
                    ...prev.pet,
                    ...updated.pet,
                    photo: resolvedPhoto,
                },
            }));

            if (updated.pet?.photo) {
                setPreview(null);
            }
            setNewPhoto(null);
            setIsEditing(false);

            showToast("Announcement updated successfully.", "success");
        } catch (err) {
            console.log(err.response?.data);
            showToast("Update failed", "error");
        }
    };

    return (
        <div className="detail-page">
            <div className="detail-container">

                <div className="detail-header-top">
                    <button className="btn-draft" onClick={onBack}>
                        Back
                    </button>

                    {isOwner && !isEditing && (
                        <div className="detail-actions-top">
                            <button className="btn-draft" onClick={() => setIsEditing(true)}>Edit</button>
                            <button className="btn-draft" onClick={handleDelete}>Delete</button>
                        </div>
                    )}
                </div>

                <section className="pet-header">
                    <div className="pet-image-large photo-edit-wrapper">
                        {preview || localAnnouncement.pet.photo ? (
                            <img
                                src={preview || localAnnouncement.pet.photo}
                                alt="pet"
                            />
                        ) : (
                            <div className="pet-image-placeholder">
                                {localAnnouncement.pet.pet_type === "cat" && "Cat"}
                                {localAnnouncement.pet.pet_type === "dog" && "Dog"}
                                {localAnnouncement.pet.pet_type === "bird" && "Bird"}
                                {localAnnouncement.pet.pet_type === "other" && "Pet"}
                            </div>
                        )}

                        {isEditing && (
                            <div className="photo-overlay">
                                <label className="photo-btn">
                                    Change
                                    <input type="file" hidden onChange={handlePhotoChange} accept="image/*" />
                                </label>

                                <button onClick={handlePhotoRemove}>Remove</button>
                            </div>
                        )}
                    </div>

                    {isEditing ? (
                        <input
                            type="text"
                            className="pet-name-input"
                            value={formData.name}
                            onChange={(e) =>
                                setFormData({ ...formData, name: e.target.value })
                            }
                        />
                    ) : (
                        <h1>{localAnnouncement.pet.name}</h1>
                    )}

                    <p className="pet-status-text">{localAnnouncement.status} pet</p>
                </section>

                <div className="detail-content">
                    <div className="info-card">
                        <h2>Pet Details</h2>

                        <div className="info-row">
                            <span className="info-label">Pet type</span>
                            {isEditing ? (
                                <select
                                    value={formData.pet_type}
                                    onChange={(e) =>
                                        setFormData({ ...formData, pet_type: e.target.value })
                                    }
                                >
                                    <option value="dog">Dog</option>
                                    <option value="cat">Cat</option>
                                    <option value="bird">Bird</option>
                                    <option value="other">Other</option>
                                </select>
                            ) : (
                                <span className="info-value">{localAnnouncement.pet.pet_type}</span>
                            )}
                        </div>

                        <div className="info-row">
                            <span className="info-label">Breed</span>
                            {isEditing ? (
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.breed}
                                    onChange={(e) =>
                                        setFormData({ ...formData, breed: e.target.value })
                                    }
                                />
                            ) : (
                                <span className="info-value">{localAnnouncement.pet.breed}</span>
                            )}
                        </div>

                        <div className="info-row">
                            <span className="info-label">Color</span>
                            {isEditing ? (
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.color}
                                    onChange={(e) =>
                                        setFormData({ ...formData, color: e.target.value })
                                    }
                                />
                            ) : (
                                <span className="info-value">{localAnnouncement.pet.color}</span>
                            )}
                        </div>

                        <div className="info-row">
                            <span className="info-label">Gender</span>
                            {isEditing ? (
                                <select
                                    value={formData.gender || "unknown"}
                                    onChange={(e) =>
                                        setFormData({ ...formData, gender: e.target.value })
                                    }
                                >
                                    <option value="male">Male</option>
                                    <option value="female">Female</option>
                                    <option value="unknown">Unknown</option>
                                </select>
                            ) : (
                                <span className="info-value">{localAnnouncement.pet.gender}</span>
                            )}
                        </div>
                    </div>

                    <div className="action-card">
                        <h2>Contact</h2>

                        {!isEditing && email && (
                            <a href={`mailto:${email}`} className="action-btn-large secondary">
                                {email}
                            </a>
                        )}

                        {isEditing ? (
                            <>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="form-input"
                                    placeholder="Email"
                                />

                                <input
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    className="form-input"
                                    placeholder="Phone number"
                                />

                                <button className="btn btn-primary" onClick={handleSave}>
                                    Save
                                </button>
                            </>
                        ) : (
                            phone && (
                                <a href={`tel:${phone}`} className="action-btn-large">
                                    {phone}
                                </a>
                            )
                        )}

                        {isOwner && !isEditing && (
                            <div style={{ marginTop: '1rem' }}>
                                <button
                                    className="action-btn-large secondary"
                                    onClick={() => setIsEditing(true)}
                                >
                                    Edit
                                </button>

                                <button
                                    className="action-btn-large secondary"
                                    onClick={handleDelete}
                                >
                                    Delete
                                </button>
                            </div>
                        )}
                    </div>

                    {(localAnnouncement.description || isEditing) && (
                        <div className="info-card description-card">
                            <h2>Description</h2>

                            {isEditing ? (
                                <textarea
                                    value={formData.description || ""}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="form-input"
                                />
                            ) : (
                                <p className="description-text">{localAnnouncement.description}</p>
                            )}
                        </div>
                    )}
                </div>

                {isEditing && (
                    <button className="btn btn-primary" onClick={handleSave}>
                        Save Changes
                    </button>
                )}

                {hasCoords && (
                    <div className="details-map">
                        <MapContainer
                            center={[location.latitude, location.longitude]}
                            zoom={14}
                            style={{ height: "300px", width: "100%" }}
                        >
                            <TileLayer
                                attribution="&copy; OpenStreetMap"
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />
                            <Marker position={[location.latitude, location.longitude]}>
                                <Popup>{localAnnouncement.pet.name}</Popup>
                            </Marker>
                        </MapContainer>
                    </div>
                )}

                {isEditing && (
                    <div className="location-edit-section">
                        <h3>Edit Location</h3>
                        {!isPickingLocation ? (
                            <button
                                className="btn btn-primary btn-location"
                                onClick={() => {
                                    setIsPickingLocation(true);
                                    setEditingLocation(location);
                                }}
                            >
                                Pick Location on Map
                            </button>
                        ) : (
                            <div className="location-picker-wrapper">
                                <MapContainer
                                    center={[editingLocation.latitude || 50.4501, editingLocation.longitude || 30.5234]}
                                    zoom={14}
                                    style={{ height: "400px", width: "100%" }}
                                    onClick={handleMapClick}
                                >
                                    <TileLayer
                                        attribution="&copy; OpenStreetMap"
                                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                    />
                                    {editingLocation.latitude && editingLocation.longitude && (
                                        <Marker position={[editingLocation.latitude, editingLocation.longitude]}>
                                            <Popup>New Location</Popup>
                                        </Marker>
                                    )}
                                </MapContainer>
                                <div className="location-picker-controls">
                                    <button
                                        className="btn btn-success"
                                        onClick={handleConfirmLocation}
                                    >
                                        Confirm
                                    </button>
                                    <button
                                        className="btn btn-secondary"
                                        onClick={handleCancelLocationPick}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

            </div>
        </div>
    );
};

export default AnnouncementDetails;
