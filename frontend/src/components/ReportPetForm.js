import React, { useState } from 'react';
import { createAnnouncement } from '../services/api';

const ReportPetForm = ({ onRefresh }) => {
    const [formData, setFormData] = useState({
        name: '',
        pet_type: 'dog',
        gender: 'unknown',
        status: 'lost',
        description: '',
        contact_phone: ''
    });

    const handleSubmit = async (e) => {
        e.preventDefault();

        const payload = {
            pet: { 
                name: formData.name,
                pet_type: formData.pet_type,
                gender: formData.gender,
                breed: "", 
                color: ""
            },
            status: formData.status,
            contact_phone: formData.contact_phone,
            description: formData.description,
            owner: 1 
        };

        try {
            await createAnnouncement(payload);
            alert("Pet Reported Successfully!");
            onRefresh();
        } catch (err) {
            console.error("Validation Errors:", err.response?.data);
        }
    };

    return (
        <form onSubmit={handleSubmit} style={{ padding: '20px', border: '1px solid #ccc', marginBottom: '20px' }}>
            <h3>Report a Pet</h3>
            <input placeholder="Pet Name" onChange={e => setFormData({...formData, name: e.target.value})} required />
            <select onChange={e => setFormData({...formData, pet_type: e.target.value})}>
                <option value="dog">Dog</option>
                <option value="cat">Cat</option>
                <option value="other">Other</option>
            </select>
            <select onChange={e => setFormData({...formData, gender: e.target.value})}>
                <option value="unknown">Unknown</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
            </select>
            <select onChange={e => setFormData({...formData, status: e.target.value})}>
                <option value="lost">Lost</option>
                <option value="found">Found</option>
            </select>
            <input placeholder="Phone" onChange={e => setFormData({...formData, contact_phone: e.target.value})} required />
            <textarea placeholder="Description" onChange={e => setFormData({...formData, description: e.target.value})} />
            <button type="submit">Submit Report</button>
        </form>
    );
};

export default ReportPetForm;