import React, { useEffect, useState } from 'react';
import { getAnnouncements } from './services/api';

function App() {
    const [pets, setPets] = useState([]);

    useEffect(() => {
        getAnnouncements().then(res => setPets(res.data));
    }, []);

    return (
        <div style={{ padding: '20px' }}>
            <h1>Lost & Found Pets</h1>
            <div className="grid">
                {pets.map(ann => (
                    <div key={ann.id} className="card">
                        <h3>{ann.pet.name} ({ann.pet.gender})</h3>
                        <p><strong>Status:</strong> {ann.status}</p>
                        <p><strong>Posted by:</strong> {ann.owner.first_name} {ann.owner.last_name}</p>
                        <p><strong>Contact:</strong> {ann.contact_phone}</p>
                        <p>{ann.description}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default App;