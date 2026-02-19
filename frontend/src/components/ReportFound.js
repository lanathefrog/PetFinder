import React, { useState, useEffect } from 'react';
import { createAnnouncement, getAnnouncements } from '../services/api';
import '../styles/forms.css';

const ReportFound = ({ onRefresh, onCancel }) => {
    const [activeTab, setActiveTab] = useState('new'); // 'new' | 'match'
    const [lostPets, setLostPets] = useState([]);
    const [preview, setPreview] = useState(null);

    // Form State
    const [formData, setFormData] = useState({
        pet_type: 'dog',
        breed: '',
        gender: 'unknown',
        size: 'medium',
        color: '',
        location: '',
        date_found: '',
        description: '',
        contact_name: '',
        image: null
    });

    // Fetch Lost Pets when switching to "Match" tab
    useEffect(() => {
        if (activeTab === 'match') {
            getAnnouncements()
                .then(res => {
                    // Filter only 'lost' pets to show to the finder
                    const lost = res.data.filter(ann => ann.status === 'lost');
                    setLostPets(lost);
                })
                .catch(err => console.error("Error fetching lost pets:", err));
        }
    }, [activeTab]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleTypeSelect = (type) => {
        setFormData({ ...formData, pet_type: type });
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
        dataPayload.append('pet.name', 'Unknown');
        dataPayload.append('pet.pet_type', formData.pet_type);
        dataPayload.append('pet.breed', formData.breed);
        dataPayload.append('pet.gender', formData.gender);
        dataPayload.append('pet.color', formData.color);
        if (formData.image) {
            dataPayload.append('pet.photo', formData.image);
        }

        dataPayload.append('status', 'found');
        dataPayload.append('location.address', formData.location);

        const fullDescription = `Found on: ${formData.date_found}\nFinder: ${formData.contact_name}\n\n${formData.description}`;
        dataPayload.append('description', fullDescription);

        try {
            await createAnnouncement(dataPayload);
            alert("Thank you! The pet has been reported as found.");
            if (onRefresh) onRefresh();
        } catch (err) {
            console.error("FULL ERROR OBJECT:", err);
            console.error("STATUS:", err.response?.status);
            console.error("BACKEND DATA:", JSON.stringify(err.response?.data, null, 2));
            console.error("HEADERS:", err.response?.headers);

            alert("Submission failed. Check console.");
        }

    };

    // Helper to format date
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
                    {/* TABS NAVIGATION */}
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
                            📝 Create New Report
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
                            🔍 Check Lost Pets
                        </button>
                    </div>

                    {/* VIEW 1: CREATE NEW REPORT FORM */}
                    {activeTab === 'new' ? (
                        <form onSubmit={handleSubmit}>
                            {/* ... Existing Form Logic ... */}
                            <h3 className="form-section-title" style={{marginBottom: '1rem', color: '#333'}}>1. Pet Details</h3>

                            <div className="form-group">
                                <label>Pet Type</label>
                                <div className="pet-type-selector" style={{display: 'flex', gap: '1rem', flexWrap: 'wrap'}}>
                                    {['Dog', 'Cat', 'Bird', 'Other'].map((type) => (
                                        <button
                                            key={type}
                                            type="button"
                                            onClick={() => handleTypeSelect(type)}
                                            style={{
                                                flex: 1,
                                                padding: '10px',
                                                border: formData.pet_type === type ? '2px solid #FF6B4A' : '2px solid #e0e0e0',
                                                background: formData.pet_type === type ? '#FFF5F2' : 'white',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                fontWeight: '600',
                                                color: '#333'
                                            }}
                                        >
                                            {type === 'Dog' ? '🐕' : type === 'Cat' ? '🐈' : type === 'Bird' ? '🦜' : '🐾'} {type}
                                        </button>
                                    ))}
                                </div>
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

                            <div className="form-group" style={{marginTop: '1.5rem'}}>
                                <label>Upload Photo</label>
                                <div className="upload-area" style={{
                                    border: '2px dashed #e0e0e0',
                                    borderRadius: '12px',
                                    padding: '2rem',
                                    textAlign: 'center',
                                    cursor: 'pointer',
                                    background: '#f9f9f9'
                                }}>
                                    <input type="file" id="found-pet-image" hidden onChange={handleImageChange} accept="image/*" />
                                    <label htmlFor="found-pet-image" style={{cursor: 'pointer', width: '100%', display: 'block'}}>
                                        {preview ? (
                                            <img src={preview} alt="Preview" style={{maxHeight: '200px', borderRadius: '8px'}} />
                                        ) : (
                                            <>
                                                <div style={{fontSize: '2.5rem', marginBottom: '0.5rem'}}>📷</div>
                                                <p>Click to upload photo</p>
                                            </>
                                        )}
                                    </label>
                                </div>
                            </div>

                            <h3 className="form-section-title" style={{margin: '2rem 0 1rem', color: '#333'}}>2. Location & Contact</h3>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Location Found</label>
                                    <input name="location" type="text" className="form-input" required onChange={handleChange} />
                                </div>
                                <div className="form-group">
                                    <label>Date Found</label>
                                    <input name="date_found" type="date" className="form-input" required onChange={handleChange} />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Your Name</label>
                                    <input name="contact_name" type="text" className="form-input" required onChange={handleChange} />
                                </div>

                            </div>

                            <div className="form-group">
                                <label>Description</label>
                                <textarea name="description" className="form-input" rows="3" onChange={handleChange}></textarea>
                            </div>

                            <div className="form-actions" style={{display: 'flex', gap: '1rem', marginTop: '2rem'}}>
                                <button type="button" className="btn-draft" onClick={onCancel} style={{flex: 1}}>Cancel</button>
                                <button type="submit" className="btn btn-primary" style={{flex: 2}}>Submit Report</button>
                            </div>
                        </form>
                    ) : (
                        /* VIEW 2: LIST OF LOST PETS */
                        <div className="lost-pets-list">
                            <h3 style={{marginBottom: '1rem', color: '#333'}}>
                                Is the pet you found in this list?
                            </h3>

                            {lostPets.length === 0 ? (
                                <div style={{textAlign: 'center', padding: '3rem', color: '#666'}}>
                                    <p>No lost pets reported recently.</p>
                                    <button
                                        onClick={() => setActiveTab('new')}
                                        style={{marginTop: '1rem', color: '#FF6B4A', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer'}}
                                    >
                                        Create a new report instead
                                    </button>
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                                    {lostPets.map(pet => (
                                        <div key={pet.id} className="announcement-card-dashboard" style={{padding: '1rem', border: '1px solid #eee', borderRadius: '12px'}}>
                                            <div className="announcement-card-header">
                                                <div className="announcement-thumbnail" style={{width: '60px', height: '60px', fontSize: '1.5rem'}}>
                                                    {pet.pet.pet_type === 'Cat' ? '🐈' : '🐕'}
                                                </div>
                                                <div className="announcement-info-dashboard">
                                                    <h3>{pet.pet.name}</h3>
                                                    <p className="breed" style={{fontSize: '0.9rem'}}>{pet.pet.breed}</p>
                                                </div>
                                            </div>

                                            <div style={{margin: '1rem 0', fontSize: '0.9rem', color: '#555'}}>
                                                <p>📍 {pet.location?.city || 'Unknown'}</p>
                                                <p>📅 Lost: {formatDate(pet.created_at)}</p>
                                            </div>

                                            <button
                                                className="btn btn-primary"
                                                style={{width: '100%', padding: '0.5rem', fontSize: '0.9rem', background: '#FF6B4A', border: 'none'}}
                                                onClick={() =>
                                                    alert(
                                                        `Please contact the owner immediately:\n\n📞 ${pet.phone_number}\n\nThank you for helping!`
                                                    )
                                                }
                                            >
                                                🙌 I Found This Pet!
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