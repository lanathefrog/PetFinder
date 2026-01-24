import React, { useEffect, useState } from 'react';
import { getMyAnnouncements } from '../services/api';

const UserDashboard = () => {
    const [myPets, setMyPets] = useState([]);

    useEffect(() => {
        getMyAnnouncements()
            .then(res => setMyPets(res.data))
            .catch(err => console.error(err));
    }, []);

    return (
        <div className="dashboard-content">
            <div className="dashboard-header">
                <div className="dashboard-title">
                    <h1>User Dashboard</h1>
                    <p>Manage your reported pets and profile</p>
                </div>
            </div>

            {/* Statistics Section from dashboard.css */}
            <div className="stats-section">
                <div className="stat-card orange">
                    <h3>{myPets.length}</h3>
                    <p>Active Reports</p>
                </div>
                <div className="stat-card green">
                    <h3>{myPets.filter(p => p.status === 'found').length}</h3>
                    <p>Pets Found</p>
                </div>
                <div className="stat-card">
                    <h3>0</h3>
                    <p>Messages</p>
                </div>
            </div>

            <div className="recent-activity" style={{marginTop: '2rem'}}>
                <h2>My Recent Announcements</h2>
                <div className="announcements-grid">
                    {myPets.map(ann => (
                        <div key={ann.id} className="announcement-card">
                            <div className="card-content">
                                <span className={`status-badge ${ann.status}`}>{ann.status}</span>
                                <h3>{ann.pet.name}</h3>
                                <div className="action-buttons" style={{marginTop: '1rem', display: 'flex', gap: '10px'}}>
                                    <button className="action-btn edit">Edit</button>
                                    <button className="action-btn delete">Delete</button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default UserDashboard;