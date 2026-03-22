import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { getAnnouncements } from '../services/api';
import { useToast } from './ToastContext';
import '../styles/base.css';
import '../styles/listing.css';
import '../styles/responsive.css';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
    iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
    iconUrl: require('leaflet/dist/images/marker-icon.png'),
    shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const AnnouncementList = ({ onSelect }) => {
    const { showToast } = useToast();

    const [announcements, setAnnouncements] = useState([]);
    const [searchCenter, setSearchCenter] = useState(null);
    const [searchRadius, setSearchRadius] = useState(null); 
    const [isPickingCenter, setIsPickingCenter] = useState(false);
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

    const itemsPerPage = 9;

    const MapPicker = ({ onPick }) => {
        useMapEvents({
            click(e) {
                const lat = e.latlng.lat;
                const lng = e.latlng.lng;
                onPick({ lat, lng });
            }
        });
        return null;
    };

    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 250);
        return () => clearTimeout(t);
    }, [searchTerm]);

    const loadAnnouncements = useCallback(async (params = {}) => {
        setIsLoading(true);
        try {
            const res = await getAnnouncements(params);
            setAnnouncements(res.data || []);
        } catch (err) {
            console.error('Error loading announcements:', err);
            showToast && showToast('Failed to load announcements', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [showToast]);

    useEffect(() => {
        loadAnnouncements();
    }, [loadAnnouncements]);

    useEffect(() => {
        const params = {};
        if (searchCenter && searchRadius) {
            params.lat = searchCenter.lat;
            params.lng = searchCenter.lng;
            params.radius = searchRadius; 
        }
        loadAnnouncements(params);
    }, [searchCenter, searchRadius, loadAnnouncements]);

    const filtered = useMemo(() => {
        return announcements
            .filter(a => {
                const statusMatch = statusFilter === 'all' || a.status === statusFilter;
                const typeMatch = typeFilter === 'all' || a.pet.pet_type === typeFilter;
                const genderMatch = genderFilter === 'all' || a.pet.gender === genderFilter;
                const sizeMatch = sizeFilter === 'all' || (a.pet.size || 'medium') === sizeFilter;
                const breedMatch = !breedFilter || (a.pet.breed || '').toLowerCase().includes(breedFilter.toLowerCase());
                const colorMatch = !colorFilter || (a.pet.color || '').toLowerCase().includes(colorFilter.toLowerCase());
                const dateFromMatch = !dateFrom || new Date(a.created_at) >= new Date(dateFrom);
                const dateToMatch = !dateTo || new Date(a.created_at) <= new Date(dateTo);

                const s = debouncedSearch.toLowerCase();
                const searchMatch =
                    !s ||
                    (a.pet.name || '').toLowerCase().includes(s) ||
                    (a.pet.breed || '').toLowerCase().includes(s) ||
                    (a.pet.color || '').toLowerCase().includes(s) ||
                    (a.description || '').toLowerCase().includes(s) ||
                    (a.location?.address || '').toLowerCase().includes(s);

                return (
                    statusMatch && typeMatch && genderMatch && sizeMatch && breedMatch && colorMatch && dateFromMatch && dateToMatch && searchMatch
                );
            })
            .sort((a, b) => {
                if (sortBy === 'newest') return new Date(b.created_at) - new Date(a.created_at);
                if (sortBy === 'oldest') return new Date(a.created_at) - new Date(b.created_at);
                return 0;
            });
    }, [announcements, statusFilter, typeFilter, genderFilter, sizeFilter, breedFilter, colorFilter, dateFrom, dateTo, debouncedSearch, sortBy]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));

    useEffect(() => setCurrentPage(1), [statusFilter, typeFilter, genderFilter, breedFilter, colorFilter, sizeFilter, debouncedSearch, dateFrom, dateTo, sortBy]);

    const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const pagesToShow = useMemo(() => {
        const maxButtons = 5;
        let start = Math.max(1, currentPage - Math.floor(maxButtons / 2));
        const end = Math.min(totalPages, start + maxButtons - 1);
        start = Math.max(1, end - maxButtons + 1);
        return Array.from({ length: end - start + 1 }, (_, i) => start + i);
    }, [currentPage, totalPages]);

    const mapCenter = useMemo(() => {
        if (searchCenter?.lat && searchCenter?.lng) {
            return [searchCenter.lat, searchCenter.lng];
        }

        const firstWithCoords = filtered.find((pet) => pet.location?.latitude && pet.location?.longitude);
        if (firstWithCoords) {
            return [firstWithCoords.location.latitude, firstWithCoords.location.longitude];
        }

        const fallbackFromAll = announcements.find((pet) => pet.location?.latitude && pet.location?.longitude);
        if (fallbackFromAll) {
            return [fallbackFromAll.location.latitude, fallbackFromAll.location.longitude];
        }

        return [50.45, 30.52];
    }, [searchCenter, filtered, announcements]);

    const mapZoom = useMemo(() => {
        if (searchCenter?.lat && searchCenter?.lng) {
            return 12;
        }
        return filtered.some((pet) => pet.location?.latitude && pet.location?.longitude) ? 11 : 6;
    }, [searchCenter, filtered]);

    const clearFilters = () => {
        setStatusFilter('all');
        setTypeFilter('all');
        setGenderFilter('all');
        setBreedFilter('');
        setColorFilter('');
        setSizeFilter('all');
        setSearchTerm('');
        setDateFrom('');
        setDateTo('');
        setSearchCenter(null);
        setSearchRadius(null);
        setSortBy('newest');
        showToast && showToast('Filters cleared', 'info');
    };

    return (
        <div className="find-pet-page">

            <div className="find-pet-header">
                <h1>Find a Pet</h1>
                <p>Help reunite lost pets with their families</p>
            </div>

            <div className="find-pet-content">

                <div className="filters-top">
                    <input
                        type="text"
                        placeholder="Search by name, breed, color, description or location..."
                        className="distance-select top-search"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <div className="filters-row">

                        <div className="inline-filters">
                            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="distance-select">
                                <option value="all">All</option>
                                <option value="lost">Lost</option>
                                <option value="found">Found</option>
                            </select>

                            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="distance-select">
                                <option value="all">All types</option>
                                <option value="dog">Dog</option>
                                <option value="cat">Cat</option>
                            </select>

                            <select value={genderFilter} onChange={e => setGenderFilter(e.target.value)} className="distance-select">
                                <option value="all">Any gender</option>
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                            </select>

                            <input placeholder="Breed" value={breedFilter} onChange={e => setBreedFilter(e.target.value)} className="distance-select" />
                            <input placeholder="Color" value={colorFilter} onChange={e => setColorFilter(e.target.value)} className="distance-select" />

                            <select value={sizeFilter} onChange={e => setSizeFilter(e.target.value)} className="distance-select">
                                <option value="all">Any size</option>
                                <option value="small">Small</option>
                                <option value="medium">Medium</option>
                                <option value="large">Large</option>
                            </select>

                            <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="distance-select">
                                <option value="newest">Newest first</option>
                                <option value="oldest">Oldest first</option>
                            </select>

                            <div className="date-range-inline">
                                <span className="date-range-text">Date range</span>
                                <label className="date-mini">
                                    <span>From</span>
                                    <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="date-input" aria-label="Date from" />
                                </label>
                                <label className="date-mini">
                                    <span>To</span>
                                    <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="date-input" aria-label="Date to" />
                                </label>
                            </div>

                            <button className="filter-btn-option filter-clear" onClick={clearFilters}>Clear Filters</button>
                        </div>

                        <div className="filter-radius-row">
                            <button className="filter-btn-option radius-btn" onClick={() => setIsPickingCenter((s) => !s)}>{isPickingCenter ? 'Cancel pick' : 'Pick center on map'}</button>
                            <label>Radius</label>
                            <input
                                type="range"
                                min={0}
                                max={5000}
                                step={100}
                                value={searchRadius || 0}
                                onChange={(e) => {
                                    const v = Number(e.target.value || 0);
                                    setSearchRadius(v === 0 ? null : v);
                                }}
                            />
                            <div className="radius-value">
                                {searchRadius ? (searchRadius >= 1000 ? `${(searchRadius/1000).toFixed(1)} km` : `${searchRadius} m`) : 'No radius'}
                            </div>
                            {searchCenter && searchRadius && (
                                <button className="filter-btn-option radius-btn" onClick={() => { setSearchCenter(null); setSearchRadius(null); }}>Clear radius</button>
                            )}
                        </div>

                    </div>
                </div>

                <div className="map-results-area">

                    <div className="map-container-large">
                        <MapContainer key={`${mapCenter[0]}-${mapCenter[1]}-${mapZoom}`} center={mapCenter} zoom={mapZoom} style={{ height: '100%', width: '100%' }}>
                            <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                            {isPickingCenter && <MapPicker onPick={(latlng) => { setSearchCenter(latlng); setIsPickingCenter(false); }} />}

                            {searchCenter && searchRadius && (
                                <Circle center={[searchCenter.lat, searchCenter.lng]} radius={Number(searchRadius)} pathOptions={{ color: '#ff6b4a', fillOpacity: 0.08 }} />
                            )}

                            {filtered.map(pet => (
                                <Marker
                                    key={pet.id}
                                    position={[pet.location?.latitude || 51.505, pet.location?.longitude || -0.09]}
                                    eventHandlers={{ click: () => onSelect?.(pet) }}
                                >
                                    <Popup>
                                        <strong>{pet.pet.name}</strong><br />
                                        {pet.status}<br />
                                        {pet.location?.address}<br />
                                        <button onClick={() => onSelect?.(pet)} style={{ marginTop: '6px' }}>View details</button>
                                    </Popup>
                                </Marker>
                            ))}

                        </MapContainer>
                    </div>

                    <div className="results-topbar">
                        <div className="results-meta">{filtered.length} results</div>
                        <div className="results-meta">
                            Page {currentPage} / {totalPages}
                        </div>
                        {isLoading ? <div className="results-meta">Loading...</div> : null}
                    </div>

                    <div className="results-grid">
                        {paginated.map((pet, index) => (
                            <div key={pet.id} className="result-card" onClick={() => onSelect(pet)} style={{ animationDelay: `${index * 0.08}s` }}>
                                <div className="result-thumbnail">
                                    {pet.pet.photo ? (<img src={pet.pet.photo} alt={pet.pet.name} />) : (pet.pet.pet_type === 'cat' ? '🐈' : '🐕')}
                                </div>

                                <div className="result-info">
                                    <div className="result-header">
                                        <h3>{pet.pet.name}</h3>

                                        <span className={`status-pill ${pet.status}`}>{pet.status}</span>
                                    </div>

                                    <div className="result-details">
                                        <div className="result-detail"><span>📍</span><span>{pet.location?.address}</span></div>
                                        <div className="result-detail"><span>📅</span><span>{new Date(pet.created_at).toLocaleDateString()}</span></div>
                                    </div>

                                    <div className="result-actions">
                                        <button className="view-details-btn">View Details</button>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {filtered.length === 0 && !isLoading && (
                            <p className="empty-state">No pets match your filters.</p>
                        )}

                    </div>

                    {totalPages > 1 && (
                        <div className="pagination-wrap">
                            <button
                                className="pagination-btn nav"
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            >
                                Previous
                            </button>

                            <div className="pagination-pages">
                                {pagesToShow.map((page) => (
                                    <button
                                        key={page}
                                        className={`pagination-btn page ${currentPage === page ? 'active' : ''}`}
                                        onClick={() => setCurrentPage(page)}
                                    >
                                        {page}
                                    </button>
                                ))}
                            </div>

                            <button
                                className="pagination-btn nav"
                                disabled={currentPage === totalPages}
                                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            >
                                Next
                            </button>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default AnnouncementList;
