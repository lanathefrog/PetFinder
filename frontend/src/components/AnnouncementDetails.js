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
    const [description, setDescription] = useState(localAnnouncement.description || "");
    const [phone, setPhone] = useState(localAnnouncement.phone_number || "");
    const email = localAnnouncement.email || "";

    const currentUserId = parseInt(localStorage.getItem("user_id"));
    const isOwner = currentUserId === localAnnouncement.owner;
    const [preview, setPreview] = useState(null);
    const [newPhoto, setNewPhoto] = useState(null);

    const lat = localAnnouncement.location?.latitude;
    const lng = localAnnouncement.location?.longitude;
    const [location, setLocation] = useState({
        latitude: lat || null,
        longitude: lng || null,
    });
    const [editingLocation, setEditingLocation] = useState({
        latitude: lat || null,
        longitude: lng || null,
    });
    const [isPickingLocation, setIsPickingLocation] = useState(false);

    const [formData, setFormData] = useState({
        name: localAnnouncement.pet.name,
        pet_type: localAnnouncement.pet.pet_type,
        breed: localAnnouncement.pet.breed,
        color: localAnnouncement.pet.color,
        gender: localAnnouncement.pet.gender,
        description: localAnnouncement.description,
        phone: localAnnouncement.phone_number,
    });


    const hasCoords =
        lat !== null &&
        lat !== undefined &&
        lng !== null &&
        lng !== undefined;

    const handleMapClick = (e) => {
        const { lat: newLat, lng: newLng } = e.latlng;
        setEditingLocation({
            latitude: newLat,
            longitude: newLng,
        });
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
        if (file) {
            setNewPhoto(file);
            setPreview(URL.createObjectURL(file));
        }
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

        if (formData.description)
            payload.append("description", formData.description);

        if (newPhoto)
            payload.append("pet.photo", newPhoto);

        // Add location if it exists
        if (location.latitude && location.longitude) {
            payload.append("location.latitude", location.latitude);
            payload.append("location.longitude", location.longitude);
        }

        try {
            // 🔹 update phone
            await axios.put(
                "http://127.0.0.1:8001/api/users/me/",
                { phone_number: phone },
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            // 🔹 update announcement
            const res = await updateAnnouncement(localAnnouncement.id, payload);

            // 💥 оновлюємо UI БЕЗ перезавантаження
            setLocalAnnouncement(res.data);

            setIsEditing(false);
            setPreview(null);
            setNewPhoto(null);

            showToast("Announcement updated successfully.", "success");

        } catch (err) {
            console.log(err.response?.data);
            showToast("Update failed 😢", "error");
        }
    };


    return (
        <div className="detail-page">
            <div className="detail-container">

                <div className="detail-header-top">
                    <button className="btn-draft" onClick={onBack}>
                        ← Back
                    </button>

                    {isOwner && !isEditing && (
                        <div className="detail-actions-top">
                            <button className="btn-draft" onClick={()=>setIsEditing(true)}>✏️ Edit</button>
                            <button className="btn-draft" onClick={handleDelete}>🗑️ Delete</button>
                        </div>
                    )}
                </div>

                {/* 🐾 HEADER */}
                <section className="pet-header">

                    {/* 🐾 IMAGE */}
                    <div className="pet-image-large photo-edit-wrapper">

                        {preview || localAnnouncement.pet.photo ? (
                            <img
                                src={preview || localAnnouncement.pet.photo}
                                alt="pet"
                            />
                        ) : (
                            <div className="pet-image-placeholder">
                                {localAnnouncement.pet.pet_type === "cat" && "🐱"}
                                {localAnnouncement.pet.pet_type === "dog" && "🐶"}
                                {localAnnouncement.pet.pet_type === "bird" && "🐦"}
                                {localAnnouncement.pet.pet_type === "other" && "🐾"}
                            </div>
                        )}

                        {isEditing && (
                            <div className="photo-overlay">
                                <label className="photo-btn">
                                    Change
                                    <input type="file" hidden onChange={handlePhotoChange} />
                                </label>

                                <button onClick={() => setPreview(null)}>Remove</button>
                            </div>
                        )}

                    </div>

                    {isEditing ? (
                        <input
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

                    {/* 🐾 PET DETAILS */}
                    <div className="info-card">
                        <h2>🐾 Pet Details</h2>

                        <div className="info-row">
                            <span className="info-label" >Pet type</span>
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

                    {/* 📞 CONTACT */}
                    <div className="action-card">
                        <h2>Contact</h2>

                        {email && (
                            <a href={`mailto:${email}`} className="action-btn-large secondary">
                                📧 {email}
                            </a>
                        )}

                        {isEditing ? (
                            <>
                                <input
                                    value={phone}
                                    onChange={(e)=>setPhone(e.target.value)}
                                    className="form-input"
                                />

                                {/* Save moved to the single Save Changes button below to keep the UI clean */}
                            </>
                        ) : (
                            phone && (
                                <a href={`tel:${phone}`} className="action-btn-large">
                                    📞 {phone}
                                </a>
                            )
                        )}

                        {isOwner && !isEditing && (
                            <div style={{marginTop:'1rem'}}>
                                <button
                                    className="action-btn-large secondary"
                                    onClick={()=>setIsEditing(true)}
                                >
                                    ✏️ Edit
                                </button>

                                <button
                                    className="action-btn-large secondary"
                                    onClick={handleDelete}
                                >
                                    🗑️ Delete
                                </button>
                            </div>
                        )}
                    </div>

                    {/* 📝 DESCRIPTION */}
                    {description && (
                        <div className="info-card description-card">
                            <h2>📝 Description</h2>

                            {isEditing ? (
                                <textarea
                                    value={description}
                                    onChange={(e)=>setDescription(e.target.value)}
                                    className="form-input"
                                />
                            ) : (
                                <p className="description-text">{description}</p>
                            )}
                        </div>
                    )}

                </div>

                {/* LOCATION EDIT (moved inside detail-content) */}
                {hasCoords && (
                     <div className="details-map">
                         <MapContainer
                             center={[lat, lng]}
                             zoom={14}
                             style={{ height: "300px", width: "100%" }}
                         >
                             <TileLayer
                                 attribution="&copy; OpenStreetMap"
                                 url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                             />
                             <Marker position={[lat, lng]}>
                                 <Popup>{localAnnouncement.pet.name}</Popup>
                             </Marker>
                         </MapContainer>
                     </div>
                 )}

                {isEditing && (
                    <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-primary" onClick={handleSave}>
                            Save Changes
                        </button>
                        <button className="btn btn-secondary" onClick={() => setIsEditing(false)}>
                            Cancel
                        </button>
                    </div>
                )}

            </div>
        </div>
    );
};

export default AnnouncementDetails;

