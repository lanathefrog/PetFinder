import React, { useState } from 'react';
import axios from "axios";
import {
    deleteAnnouncement,
    getAnnouncement,
    saveAnnouncement,
    startChatConversation,
    unsaveAnnouncement,
    updateAnnouncement
} from '../services/api';
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { useToast } from "./ToastContext";
import 'leaflet/dist/leaflet.css';
import '../styles/detail.css';
import { getComments, createComment, deleteComment, updateComment, toggleCommentReaction } from '../services/api';
import { toggleReaction } from '../services/api';

// FIX leaflet icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
});

const AnnouncementDetails = ({ announcement, onBack, onDeleted, onOpenChat }) => {
    const { showToast } = useToast();
    const token = localStorage.getItem("access_token");
    const [localAnnouncement, setLocalAnnouncement] = useState(announcement);
    const [saveLoading, setSaveLoading] = useState(false);

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

    // Comments
    const [comments, setComments] = useState([]);
    const [commentsLoading, setCommentsLoading] = useState(false);
    const [newCommentText, setNewCommentText] = useState("");
    const [editingCommentId, setEditingCommentId] = useState(null);
    const [editingCommentText, setEditingCommentText] = useState("");
    const [reactionsState, setReactionsState] = useState(localAnnouncement.reactions || { kinds: [], user_reaction: null });

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

    React.useEffect(() => {
        setLocalAnnouncement(announcement);
    }, [announcement]);

    React.useEffect(() => {
        const loadFreshDetails = async () => {
            try {
                const res = await getAnnouncement(announcement.id);
                setLocalAnnouncement(res.data);
            } catch (err) {
                // fallback to provided props
            }
        };
        loadFreshDetails();
    }, [announcement.id]);

    React.useEffect(() => {
        const loadComments = async () => {
            setCommentsLoading(true);
            try {
                const res = await getComments(announcement.id);
                setComments(res.data || []);
            } catch (err) {
                // ignore
            } finally {
                setCommentsLoading(false);
            }
        };
        loadComments();
        // initialize reactions from announcement
        setReactionsState(localAnnouncement.reactions || { counts: {}, user_reaction: null });
    }, [announcement.id]);

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

    const handleContactOwner = async () => {
        try {
            const res = await startChatConversation(localAnnouncement.id);
            const conversationId = res.data?.id;
            if (!conversationId) {
                showToast("Failed to open chat", "error");
                return;
            }
            onOpenChat?.(conversationId);
        } catch (err) {
            const detail = err.response?.data?.detail;
            showToast(detail || "Failed to start chat", "error");
        }
    };

    const handleToggleSave = async () => {
        if (saveLoading) return;
        setSaveLoading(true);
        try {
            const isSaved = Boolean(localAnnouncement.is_saved);
            if (isSaved) {
                await unsaveAnnouncement(localAnnouncement.id);
            } else {
                await saveAnnouncement(localAnnouncement.id);
            }
            setLocalAnnouncement((prev) => ({
                ...prev,
                is_saved: !isSaved,
            }));
            showToast(isSaved ? "Removed from saved" : "Saved", "success");
        } catch (err) {
            showToast("Failed to update save status", "error");
        } finally {
            setSaveLoading(false);
        }
    };

    const handleCreateComment = async () => {
        const text = newCommentText.trim();
        if (!text) return;
        try {
            const res = await createComment(localAnnouncement.id, { text });
            setComments((prev) => [...prev, res.data]);
            setNewCommentText("");
            // optimistic update of comments_count
            setLocalAnnouncement((prev) => ({ ...prev, comments_count: (prev.comments_count || 0) + 1 }));
            showToast("Comment posted", "success");
        } catch (err) {
            showToast("Failed to post comment", "error");
        }
    };

    const handleDeleteComment = async (commentId) => {
        if (!window.confirm("Delete comment?")) return;
        try {
            await deleteComment(commentId);
            setComments((prev) => prev.filter((c) => c.id !== commentId));
            setLocalAnnouncement((prev) => ({ ...prev, comments_count: Math.max(0, (prev.comments_count || 1) - 1) }));
            showToast("Comment deleted", "success");
        } catch (err) {
            showToast("Failed to delete comment", "error");
        }
    };

    const openUserProfile = (userId) => {
        showToast("Opening profile...", "info");
        window.dispatchEvent(new CustomEvent('openUserProfile', { detail: userId }));
    };

    const handleStartEdit = (comment) => {
        setEditingCommentId(comment.id);
        setEditingCommentText(comment.text || "");
    };

    const handleCancelEdit = () => {
        setEditingCommentId(null);
        setEditingCommentText("");
    };

    const handleSaveEdit = async () => {
        const text = editingCommentText.trim();
        if (!text || !editingCommentId) return;
        try {
            const res = await updateComment(editingCommentId, { text });
            setComments((prev) => prev.map((c) => (c.id === editingCommentId ? res.data : c)));
            setEditingCommentId(null);
            setEditingCommentText("");
            showToast("Comment updated", "success");
        } catch (err) {
            showToast("Failed to update comment", "error");
        }
    };

    const handleToggleReaction = async (kind) => {
        try {
            await toggleReaction(localAnnouncement.id, kind);
            // re-fetch announcement to get fresh reaction kinds + icons from backend serializer
            const res = await getAnnouncement(localAnnouncement.id);
            setLocalAnnouncement(res.data);
            setReactionsState(res.data.reactions || { kinds: [], user_reaction: null });
            showToast('Reaction updated', 'success');
        } catch (err) {
            showToast('Failed to toggle reaction', 'error');
        }
    };

    const handleToggleCommentReaction = async (commentId, kind) => {
        try {
            await toggleCommentReaction(commentId, kind);
            // refresh comments
            const res = await getComments(localAnnouncement.id);
            setComments(res.data || []);
            showToast('Reaction updated', 'success');
        } catch (err) {
            showToast('Failed to update reaction', 'error');
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
                    <div className="pet-social-row">
                        <span className="pet-views">👁 {localAnnouncement.views_count || 0} views</span>
                        {!isOwner && (
                            <button
                                type="button"
                                className={`save-toggle-btn ${localAnnouncement.is_saved ? "saved" : ""}`}
                                onClick={handleToggleSave}
                                disabled={saveLoading}
                            >
                                {localAnnouncement.is_saved ? "★ Saved" : "☆ Save"}
                            </button>
                        )}
                    </div>
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

                        {!isEditing && !isOwner && (
                            <button className="action-btn-large" onClick={handleContactOwner}>
                                Contact owner
                            </button>
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

                <div className="comments-section info-card">
                    <h2>Comments ({localAnnouncement.comments_count || comments.length})</h2>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                        {(localAnnouncement.reactions?.kinds || reactionsState.kinds || []).map((k) => (
                            <button
                                key={k.kind}
                                className={`reaction-btn ${reactionsState.user_reaction === k.kind ? 'reacted' : ''}`}
                                onClick={() => handleToggleReaction(k.kind)}
                                title={k.label}
                            >
                                <span style={{ fontSize: 18 }}>{k.icon || '•'}</span>
                                <span style={{ marginLeft: 6 }}>{k.count || 0}</span>
                            </button>
                        ))}
                    </div>

                        {commentsLoading ? (
                        <p>Loading comments...</p>
                    ) : comments.length === 0 ? (
                        <p className="messages-muted">No comments yet</p>
                    ) : (
                        <div className="comments-list">
                            {comments.map((c) => (
                                <div className="comment-item" key={c.id}>
                                    <div className="comment-avatar" onClick={() => openUserProfile(c.user?.id)} style={{ cursor: 'pointer' }}>
                                        {c.user_profile_image ? (
                                            <img src={c.user_profile_image} alt={c.user?.username} />
                                        ) : (
                                            <div className="avatar-placeholder">{(c.user?.username || 'U').charAt(0).toUpperCase()}</div>
                                        )}
                                    </div>
                                    <div className="comment-body">
                                        <div className="comment-meta">
                                            <strong className="comment-username" onClick={() => openUserProfile(c.user?.id)} style={{ cursor: 'pointer' }}>{c.user?.username}</strong>
                                            {c.user_badges && c.user_badges.length > 0 && (
                                                <span style={{ marginLeft: 8, padding: '2px 6px', background: '#fff', borderRadius: 6, border: '1px solid #eee', fontSize: 12 }}>{c.user_badges[0].name}</span>
                                            )}
                                            <span className="comment-time">{new Date(c.created_at).toLocaleString()}</span>
                                            {Number(c.user?.id) === Number(localStorage.getItem('user_id')) && (
                                                <>
                                                    <button className="comment-delete" onClick={() => handleDeleteComment(c.id)}>Delete</button>
                                                    <button className="comment-delete" onClick={() => handleStartEdit(c)}>Edit</button>
                                                </>
                                            )}
                                        </div>
                                        {editingCommentId === c.id ? (
                                            <div>
                                                <input value={editingCommentText} onChange={(e) => setEditingCommentText(e.target.value)} />
                                                <div style={{ marginTop: 6 }}>
                                                    <button className="btn btn-secondary" onClick={handleCancelEdit}>Cancel</button>
                                                    <button className="btn btn-primary" onClick={handleSaveEdit} style={{ marginLeft: 8 }}>Save</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="comment-text">{c.text}</p>
                                        )}
                                        {/* Comment reactions: show present reactions */}
                                        {c.reactions && c.reactions.counts && Object.keys(c.reactions.counts).length > 0 && (
                                            <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
                                                {Object.entries(c.reactions.counts).map(([k, info]) => (
                                                    <div key={k} className={`comment-reaction-chip ${c.reactions.user_reaction === k ? 'reacted' : ''}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 8px', borderRadius: 12, background: '#f2f2f2' }}>
                                                        <span style={{ fontSize: 14 }}>{info.icon || '•'}</span>
                                                        <span style={{ fontSize: 13 }}>{info.count}</span>
                                                    </div>
                                                ))}
                                                <div style={{ marginLeft: 8 }}>
                                                    <button className="btn btn-sm" onClick={() => handleToggleCommentReaction(c.id, 'like')}>👍</button>
                                                    <button className="btn btn-sm" style={{ marginLeft: 6 }} onClick={() => handleToggleCommentReaction(c.id, 'helpful')}>👍</button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {token ? (
                        <div className="comment-input-row">
                            <input
                                type="text"
                                placeholder="Write a comment..."
                                value={newCommentText}
                                onChange={(e) => setNewCommentText(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') handleCreateComment(); }}
                            />
                            <button onClick={handleCreateComment}>Post</button>
                        </div>
                    ) : (
                        <p className="messages-muted">Log in to post comments</p>
                    )}
                </div>

            </div>
        </div>
    );
};

export default AnnouncementDetails;
