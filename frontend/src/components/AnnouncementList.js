import React, { useEffect, useState, useMemo } from 'react';
import { getAnnouncements } from '../services/api';
import { useToast } from './ToastContext';
import '../styles/base.css';
import '../styles/listing.css';
import '../styles/responsive.css';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
    iconRetinaUrl:
        require('leaflet/dist/images/marker-icon-2x.png'),
    iconUrl:
        require('leaflet/dist/images/marker-icon.png'),
    shadowUrl:
        require('leaflet/dist/images/marker-shadow.png'),
});

const AnnouncementList = ({ onSelect }) => {

    const [announcements, setAnnouncements] = useState([]);
    const [statusFilter, setStatusFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');
    const [genderFilter, setGenderFilter] = useState('all');
    const [breedFilter, setBreedFilter] = useState('');
    const [colorFilter, setColorFilter] = useState('');
    const [sizeFilter, setSizeFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [sortBy, setSortBy] = useState('newest');
    const [currentPage, setCurrentPage] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const { showToast } = useToast();

    const itemsPerPage = 6;

    useEffect(() => {
        loadAnnouncements();
    }, []);

    // debounce search input for performance
    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 250);
        return () => clearTimeout(t);
    }, [searchTerm]);

    const loadAnnouncements = async () => {
        setIsLoading(true);
        try {
            const res = await getAnnouncements();
            setAnnouncements(res.data);
        } catch (err) {
            console.error("Error loading announcements:", err);
            showToast && showToast('Failed to load announcements', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    // 🔥 FILTERING + SEARCH
    const filtered = useMemo(() => {
        return announcements
            .filter(a => {

                const statusMatch =
                    statusFilter === 'all' || a.status === statusFilter;

                const typeMatch =
                    typeFilter === 'all' || a.pet.pet_type === typeFilter;

                const genderMatch =
                    genderFilter === 'all' || a.pet.gender === genderFilter;

                const sizeMatch =
                    sizeFilter === 'all' || (a.pet.size || 'medium') === sizeFilter;

                const breedMatch =
                    !breedFilter || (a.pet.breed || '').toLowerCase().includes(breedFilter.toLowerCase());

                const colorMatch =
                    !colorFilter || (a.pet.color || '').toLowerCase().includes(colorFilter.toLowerCase());

                const dateFromMatch = !dateFrom || new Date(a.created_at) >= new Date(dateFrom);
                const dateToMatch = !dateTo || new Date(a.created_at) <= new Date(dateTo);

                const searchTermLower = debouncedSearch.toLowerCase();
                const searchMatch =
                    !searchTermLower ||
                    (a.pet.name || '').toLowerCase().includes(searchTermLower) ||
                    (a.pet.breed || '').toLowerCase().includes(searchTermLower) ||
                    (a.pet.color || '').toLowerCase().includes(searchTermLower) ||
                    (a.description || '').toLowerCase().includes(searchTermLower) ||
                    (a.location?.address || '').toLowerCase().includes(searchTermLower);

                return (
                    statusMatch && typeMatch && genderMatch && sizeMatch && breedMatch && colorMatch && dateFromMatch && dateToMatch && searchMatch
                );
            })
            .sort((a, b) => {
                if (sortBy === 'newest') {
                    return new Date(b.created_at) - new Date(a.created_at);
                }
                if (sortBy === 'oldest') {
                    return new Date(a.created_at) - new Date(b.created_at);
                }
                return 0;
            });
    }, [announcements, statusFilter, typeFilter, genderFilter, sizeFilter, breedFilter, colorFilter, dateFrom, dateTo, debouncedSearch, sortBy]);

    const totalPages = Math.ceil(filtered.length / itemsPerPage);

    const paginated = filtered.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    useEffect(() => {
        setCurrentPage(1);
    }, [statusFilter, typeFilter, genderFilter, searchTerm]);

    return (
        <div className="find-pet-page">

            <div className="find-pet-header">
                <h1>Find a Pet</h1>
                <p>Help reunite lost pets with their families</p>
            </div>

            <div className="find-pet-content">

                {/* FILTER SIDEBAR */}
                <aside className="filters-sidebar">

                    <h2>Filters</h2>

                    <div className="filter-group">
                        <h3>Search</h3>
                        <input
                            type="text"
                            placeholder="Search by name or location..."
                            className="distance-select"
                            value={searchTerm}
                            onChange={(e)=>setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="filter-group">
                        <h3>Status</h3>
                        <div className="filter-buttons">
                            <button
                                className={`filter-btn-option ${statusFilter==='lost'?'active':''}`}
                                onClick={()=>setStatusFilter('lost')}
                            >
                                🔍 Lost
                            </button>
                            <button
                                className={`filter-btn-option found ${statusFilter==='found'?'active':''}`}
                                onClick={()=>setStatusFilter('found')}
                            >
                                🧡 Found
                            </button>
                            <button
                                className={`filter-btn-option ${statusFilter==='all'?'active':''}`}
                                onClick={()=>setStatusFilter('all')}
                            >
                                All
                            </button>
                        </div>
                    </div>

                    <div className="filter-group">
                        <h3>Pet Type</h3>
                        <div className="filter-buttons">
                            <button
                                className={`filter-btn-option ${typeFilter==='dog'?'active':''}`}
                                onClick={()=>setTypeFilter('dog')}
                            >
                                🐕 Dog
                            </button>
                            <button
                                className={`filter-btn-option ${typeFilter==='cat'?'active':''}`}
                                onClick={()=>setTypeFilter('cat')}
                            >
                                🐈 Cat
                            </button>
                            <button
                                className={`filter-btn-option ${typeFilter==='all'?'active':''}`}
                                onClick={()=>setTypeFilter('all')}
                            >
                                All
                            </button>
                        </div>
                    </div>

                    <div className="filter-group">
                        <h3>Gender</h3>
                        <div className="filter-buttons">
                            <button
                                className={`filter-btn-option ${genderFilter==='male'?'active':''}`}
                                onClick={()=>setGenderFilter('male')}
                            >
                                Male
                            </button>
                            <button
                                className={`filter-btn-option ${genderFilter==='female'?'active':''}`}
                                onClick={()=>setGenderFilter('female')}
                            >
                                Female
                            </button>
                            <button
                                className={`filter-btn-option ${genderFilter==='all'?'active':''}`}
                                onClick={()=>setGenderFilter('all')}
                            >
                                All
                            </button>
                        </div>
                    </div>

                    <div className="filter-group">
                        <h3>Breed</h3>
                        <input className="distance-select" placeholder="e.g. Beagle" value={breedFilter} onChange={e=>setBreedFilter(e.target.value)} />
                    </div>

                    <div className="filter-group">
                        <h3>Color</h3>
                        <input className="distance-select" placeholder="e.g. Brown" value={colorFilter} onChange={e=>setColorFilter(e.target.value)} />
                    </div>

                    <div className="filter-group">
                        <h3>Size</h3>
                        <div style={{display:'flex', gap:'0.5rem'}}>
                            <button className={`filter-btn-option ${sizeFilter==='small'?'active':''}`} onClick={()=>setSizeFilter('small')}>Small</button>
                            <button className={`filter-btn-option ${sizeFilter==='medium'?'active':''}`} onClick={()=>setSizeFilter('medium')}>Medium</button>
                            <button className={`filter-btn-option ${sizeFilter==='large'?'active':''}`} onClick={()=>setSizeFilter('large')}>Large</button>
                            <button className={`filter-btn-option ${sizeFilter==='all'?'active':''}`} onClick={()=>setSizeFilter('all')}>Any</button>
                        </div>
                    </div>

                    <div className="filter-group">
                        <h3>Date Range</h3>
                        <div style={{display:'flex', gap:'0.5rem'}}>
                            <input type="date" className="distance-select" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} />
                            <input type="date" className="distance-select" value={dateTo} onChange={e=>setDateTo(e.target.value)} />
                        </div>
                    </div>

                    <div className="filter-group">
                        <h3>Sort By</h3>
                        <select
                            className="distance-select"
                            value={sortBy}
                            onChange={(e)=>setSortBy(e.target.value)}
                        >
                            <option value="newest">Newest First</option>
                            <option value="oldest">Oldest First</option>
                        </select>
                    </div>

                    <div className="filter-group">
                        <button className="filter-btn-option" onClick={()=>{
                            setStatusFilter('all'); setTypeFilter('all'); setGenderFilter('all'); setBreedFilter(''); setColorFilter(''); setSizeFilter('all'); setSearchTerm(''); setDateFrom(''); setDateTo('');
                            showToast && showToast('Filters cleared', 'info');
                        }}>Clear Filters</button>
                    </div>

                </aside>

                {/* RESULTS */}
                <div className="map-results-area">

                    <div className="map-container-large" style={{padding:0}}>

                        <MapContainer
                            center={[51.505, -0.09]}
                            zoom={12}
                            style={{ height: "100%", width: "100%" }}
                        >
                            <TileLayer
                                attribution='&copy; OpenStreetMap contributors'
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />

                            {filtered.map(pet => (
                                <Marker
                                    key={pet.id}
                                    position={[
                                        pet.location?.latitude || 51.505,
                                        pet.location?.longitude || -0.09
                                    ]}
                                >
                                    <Popup>
                                        <strong>{pet.pet.name}</strong><br/>
                                        {pet.status}<br/>
                                        {pet.location?.address}
                                    </Popup>
                                </Marker>
                            ))}

                        </MapContainer>

                    </div>


                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.5rem'}}>
                        <div style={{fontSize:'0.95rem', color:'#666'}}>{filtered.length} results</div>
                        {isLoading ? <div style={{fontSize:'0.9rem', color:'#666'}}>Loading...</div> : null}
                    </div>

                    <div className="results-list">

                        {paginated.map((pet, index) => (
                            <div
                                key={pet.id}
                                className="result-card"
                                onClick={()=>onSelect(pet)}
                                style={{
                                    cursor:'pointer',
                                    animation: `smoothFade 0.4s ease forwards`,
                                    animationDelay: `${index * 0.08}s`
                                }}
                            >
                                <div className="result-thumbnail">
  {pet.pet.photo ? (
    <img src={pet.pet.photo} alt={pet.pet.name} />
  ) : (
    pet.pet.pet_type === 'cat' ? '🐈' : '🐕'
  )}
</div>

                                <div className="result-info">
                                    <div className="result-header">
                                        <h3>{pet.pet.name}</h3>

                                        <span
                                            style={{
                                                background: pet.status === 'lost' ? '#FF6B4A' : '#4CAF50',
                                                color: 'white',
                                                padding: '6px 14px',
                                                borderRadius: '20px',
                                                fontSize: '0.75rem',
                                                fontWeight: '700',
                                                textTransform: 'uppercase'
                                            }}
                                        >
                                            {pet.status}
                                        </span>
                                    </div>

                                    <div className="result-details">
                                        <div className="result-detail">
                                            <span>📍</span>
                                            <span>{pet.location?.address}</span>
                                        </div>
                                        <div className="result-detail">
                                            <span>📅</span>
                                            <span>
                                                {new Date(pet.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="result-actions">
                                        <button className="view-details-btn">
                                            View Details
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {filtered.length === 0 && (
                            <p style={{textAlign:'center', padding:'2rem'}}>
                                No pets match your filters.
                            </p>
                        )}

                    </div>

                    {/* PAGINATION */}
                    {totalPages > 1 && (
                        <div style={{display:'flex', justifyContent:'center', gap:'1rem', marginTop:'1rem'}}>
                            {Array.from({length: totalPages}, (_, i) => (
                                <button
                                    key={i}
                                    className="filter-btn-option"
                                    style={{
                                        background: currentPage===i+1 ? '#FF6B4A' : 'white',
                                        color: currentPage===i+1 ? 'white' : '#666'
                                    }}
                                    onClick={()=>setCurrentPage(i+1)}
                                >
                                    {i+1}
                                </button>
                            ))}
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default AnnouncementList;
