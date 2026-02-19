import React, { useState } from 'react';
import { deleteAnnouncement, updateAnnouncement } from '../services/api';
import '../styles/detail.css';

const AnnouncementDetails = ({ announcement, onBack, onDeleted }) => {

    const [isEditing, setIsEditing] = useState(false);
    const [description, setDescription] = useState(announcement.description);
    const [phone, setPhone] = useState(announcement.contact_phone);

    const currentUserId = parseInt(localStorage.getItem("user_id"));
    const isOwner = currentUserId === announcement.owner;

    const handleDelete = async () => {
        if (window.confirm("Are you sure you want to delete this announcement?")) {
            await deleteAnnouncement(announcement.id);
            onDeleted();
        }
    };

    const handleSave = async () => {
        const payload = {
            pet: announcement.pet,
            location: announcement.location,
            status: announcement.status,
            description: description,
            contact_phone: phone
        };

        await updateAnnouncement(announcement.id, payload);
        setIsEditing(false);
        alert("Updated successfully!");
    };

    return (
        <div className="detail-page">
            <div className="detail-container">

                {/* Back Button */}
                <button className="btn-draft" onClick={onBack} style={{marginBottom:'1rem'}}>
                    ← Back
                </button>

                {/* Pet Header */}
                <section className="pet-header">
                    <div className="pet-image-large">
                        <span className={`status-badge-large ${announcement.status}`}>
                            {announcement.status}
                        </span>
                        {announcement.pet.photo ? (
                            <img src={announcement.pet.photo} alt={announcement.pet.name} />
                        ) : (
                            announcement.pet.pet_type === 'cat' ? '🐈' : '🐕'
                        )}
                    </div>
                    <h1>{announcement.pet.name}</h1>
                    <p className="pet-status-text">{announcement.status} pet</p>
                </section>

                {/* Detail Grid */}
                <div className="detail-content">

                    {/* Pet Details */}
                    <div className="info-card">
                        <h2>🐾 Pet Details</h2>
                        <div className="info-row">
                            <span className="info-label">Pet type</span>
                            <span className="info-value">{announcement.pet.pet_type}</span>
                        </div>
                        <div className="info-row">
                            <span className="info-label">Breed</span>
                            <span className="info-value">{announcement.pet.breed}</span>
                        </div>
                        <div className="info-row">
                            <span className="info-label">Color</span>
                            <span className="info-value">{announcement.pet.color}</span>
                        </div>
                        <div className="info-row">
                            <span className="info-label">Gender</span>
                            <span className="info-value">{announcement.pet.gender}</span>
                        </div>
                    </div>

                    {/* Contact */}
                    <div className="action-card">
                        <h2>Contact</h2>

                        {isEditing ? (
                            <>
                                <input
                                    value={phone}
                                    onChange={(e)=>setPhone(e.target.value)}
                                    className="form-input"
                                />
                                <button className="btn btn-primary" onClick={handleSave}>
                                    Save
                                </button>
                            </>
                        ) : (
                            <>
                                <a
                                    href={`tel:${phone}`}
                                    className="action-btn-large"
                                >
                                    📞 {phone}
                                </a>
                            </>
                        )}

                        {isOwner && !isEditing && (
                            <div style={{marginTop:'1rem'}}>
                                <button className="action-btn-large secondary" onClick={()=>setIsEditing(true)}>
                                    ✏️ Edit
                                </button>
                                <button className="action-btn-large secondary" onClick={handleDelete}>
                                    🗑️ Delete
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Description */}
                    <div className="info-card description-card">
                        <h2>📝 Description</h2>

                        {isEditing ? (
                            <textarea
                                value={description}
                                onChange={(e)=>setDescription(e.target.value)}
                                className="form-input"
                            />
                        ) : (
                            <p className="description-text">
                                {description}
                            </p>
                        )}
                    </div>

                </div>

                {/* Location */}
                <section className="location-card">
                    <h2>📍 Location</h2>
                    <div className="location-info">
                        <h3>{announcement.location?.address}</h3>
                    </div>
                </section>

            </div>
        </div>
    );
};

export default AnnouncementDetails;
