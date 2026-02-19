import React, { useState } from 'react';
import { createAnnouncement } from '../services/api';
import '../styles/forms.css'; // Make sure this path is correct

const ReportLost = ({ onRefresh, onCancel }) => { // Added onCancel prop
    const [preview, setPreview] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        pet_type: 'dog',
        breed: '',
        gender: 'male',
        size: 'medium', // Added based on typical forms
        color: '',
        location: '',
        date_lost: '',
        description: '',
        image: null
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setFormData({ ...formData, image: file });
            setPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const dataPayload = new FormData();
        // Mapping form fields to backend expectations
        dataPayload.append('pet.name', formData.name);
        dataPayload.append('pet.pet_type', formData.pet_type);
        dataPayload.append('pet.breed', formData.breed);
        dataPayload.append('pet.gender', formData.gender);
        dataPayload.append('pet.color', formData.color);
        if (formData.image) {
            dataPayload.append('pet.photo', formData.image);
        }

        dataPayload.append('status', 'lost');
        dataPayload.append('description', formData.description);
        dataPayload.append('location.address', formData.location);

        try {
            const response = await createAnnouncement(dataPayload);

            console.log("SUCCESS RESPONSE:", response);
            alert("Report submitted successfully!");

            if (onRefresh) onRefresh();

        } catch (err) {
            console.error("FULL ERROR OBJECT:", err);
            console.error("STATUS:", err.response?.status);
            console.error("FULL BACKEND DATA:", JSON.stringify(err.response?.data, null, 2));
            console.error("HEADERS:", err.response?.headers);

            alert("Submission failed. Check console for details.");
        }
    };

    return (
        <div className="form-page">
            <div className="form-container">
                {/* Header from report_lost.html */}
                <div className="form-header">
                    <div className="form-icon">🧡</div>
                    <h1>Report Your Lost Pet</h1>
                    <p>Help the community reunite you with your best friend.</p>
                </div>

                <div className="form-card">
                    {/* Visual Progress Steps (Static for now, matching mockup) */}
                    <div className="form-progress" style={{display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', borderBottom: '1px solid #eee', paddingBottom: '1rem'}}>
                        <span style={{fontWeight: 'bold', color: '#FF6B4A'}}>1. Pet Details</span>
                        <span style={{color: '#999'}}>2. Location & Time</span>
                        <span style={{color: '#999'}}>3. Contact Info</span>
                    </div>

                    <form onSubmit={handleSubmit}>
                        {/* Section 1: Pet Details */}
                        <h3 className="form-section-title" style={{marginBottom: '1.5rem', color: '#333'}}>1. Pet Details</h3>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Pet Name</label>
                                <input
                                    name="name"
                                    type="text"
                                    className="form-input"
                                    placeholder="e.g. Buddy"
                                    required
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="form-group">
                                <label>Pet Type</label>
                                <select name="pet_type" className="form-input" onChange={handleChange}>
                                    <option value="dog">Dog</option>
                                    <option value="cat">Cat</option>
                                    <option value="bird">Bird</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Breed</label>
                                <input name="breed" type="text" className="form-input" placeholder="e.g. Labrador" onChange={handleChange} />
                            </div>
                            <div className="form-group">
                                <label>Color / Markings</label>
                                <input name="color" type="text" className="form-input" placeholder="e.g. Black with white paws" onChange={handleChange} />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Gender</label>
                                <select name="gender" className="form-input" onChange={handleChange}>
                                    <option value="male">Male</option>
                                    <option value="female">Female</option>
                                    <option value="unknown">Unknown</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Size</label>
                                <select name="size" className="form-input" onChange={handleChange}>
                                    <option value="Small">Small</option>
                                    <option value="Medium">Medium</option>
                                    <option value="Large">Large</option>
                                </select>
                            </div>
                        </div>

                        {/* Upload Area matching forms.css */}
                        <div className="form-group" style={{marginTop: '1.5rem'}}>
                            <label>Upload Photo</label>
                            <div className="upload-area" style={{
                                border: '2px dashed #e0e0e0',
                                borderRadius: '12px',
                                padding: '2rem',
                                textAlign: 'center',
                                cursor: 'pointer',
                                background: '#f9f9f9',
                                transition: 'all 0.3s'
                            }}>
                                <input type="file" id="pet-image" hidden onChange={handleImageChange} accept="image/*" />
                                <label htmlFor="pet-image" style={{cursor: 'pointer', width: '100%', display: 'block'}}>
                                    {preview ? (
                                        <div style={{position: 'relative'}}>
                                            <img src={preview} alt="Preview" style={{maxHeight: '200px', borderRadius: '8px', maxWidth: '100%'}} />
                                            <p style={{marginTop: '10px', fontSize: '0.9rem', color: '#666'}}>Click to change photo</p>
                                        </div>
                                    ) : (
                                        <>
                                            <div style={{fontSize: '2.5rem', marginBottom: '0.5rem'}}>📷</div>
                                            <p style={{fontWeight: '600', color: '#333'}}>Click to upload a photo</p>
                                            <p style={{fontSize: '0.85rem', color: '#999'}}>JPG or PNG, max 5MB</p>
                                        </>
                                    )}
                                </label>
                            </div>
                        </div>

                        <hr style={{margin: '2rem 0', border: 'none', borderTop: '1px solid #eee'}} />

                        {/* Section 2: Location */}
                        <h3 className="form-section-title" style={{marginBottom: '1.5rem', color: '#333'}}>2. Location & Time</h3>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Last Seen Location</label>
                                <input name="location" type="text" className="form-input" placeholder="e.g. Central Park near the lake" required onChange={handleChange} />
                            </div>
                            <div className="form-group">
                                <label>Date Lost</label>
                                <input name="date_lost" type="date" className="form-input" required onChange={handleChange} />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Description</label>
                            <textarea
                                name="description"
                                className="form-input"
                                rows="4"
                                placeholder="Please describe the incident and any distinctive features of your pet..."
                                onChange={handleChange}
                            ></textarea>
                        </div>

                        <hr style={{margin: '2rem 0', border: 'none', borderTop: '1px solid #eee'}} />

                        {/* Section 3: Contact */}
                        <h3 className="form-section-title" style={{marginBottom: '1.5rem', color: '#333'}}>3. Contact Information</h3>



                        {/* Form Actions */}
                        <div className="form-actions" style={{display: 'flex', gap: '1rem', marginTop: '2rem'}}>
                            <button
                                type="button"
                                className="btn-draft"
                                onClick={onCancel}
                                style={{
                                    flex: 1,
                                    padding: '12px',
                                    background: 'white',
                                    border: '1px solid #ccc',
                                    borderRadius: '8px',
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="submit-btn"
                                style={{flex: 2, cursor: 'pointer'}}
                            >
                                Submit Report
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ReportLost;