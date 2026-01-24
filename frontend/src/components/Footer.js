import React from 'react';

const Footer = () => {
    // This helper function stops the page from reloading when clicking placeholder links
    const handleMockClick = (e) => {
        e.preventDefault();
    };

    return (
        <footer>
            <div className="footer-content">
                <div className="footer-brand">
                    <h2>🧡 PetFinder</h2>
                    <p>We are dedicated to reuniting pets with their families through community effort and technology.</p>
                    <div className="social-links">
                        {/* Replaced href="#" with href="/" and added the click handler */}
                        <a href="/" className="social-link" onClick={handleMockClick}>f</a>
                        <a href="/" className="social-link" onClick={handleMockClick}>t</a>
                        <a href="/" className="social-link" onClick={handleMockClick}>in</a>
                    </div>
                </div>

                <div className="footer-section">
                    <h3>Quick Links</h3>
                    <ul className="footer-links">
                        <li><a href="/" onClick={handleMockClick}>Find Your Lost Pet</a></li>
                        <li><a href="/" onClick={handleMockClick}>Report Lost Pet</a></li>
                        <li><a href="/" onClick={handleMockClick}>Report Found Pet</a></li>
                        <li><a href="/" onClick={handleMockClick}>Browse Lost Pets</a></li>
                        <li><a href="/" onClick={handleMockClick}>Success Stories</a></li>
                    </ul>
                </div>

                <div className="footer-section">
                    <h3>Support</h3>
                    <ul className="footer-links">
                        <li><a href="/" onClick={handleMockClick}>Help Center</a></li>
                        <li><a href="/" onClick={handleMockClick}>Contact Us</a></li>
                        <li><a href="/" onClick={handleMockClick}>Safety Tips</a></li>
                        <li><a href="/" onClick={handleMockClick}>Privacy Policy</a></li>
                    </ul>
                </div>

                <div className="footer-section">
                    <h3>Connect</h3>
                    <div className="social-links" style={{ marginTop: '0.5rem' }}>
                        <a href="/" className="social-link" onClick={handleMockClick}>f</a>
                        <a href="/" className="social-link" onClick={handleMockClick}>t</a>
                        <a href="/" className="social-link" onClick={handleMockClick}>in</a>
                    </div>
                </div>
            </div>

            <div className="footer-bottom">
                <p>&copy; 2026 PetFinder. All rights reserved. Made with ❤️ for pets and their families.</p>
            </div>
        </footer>
    );
};

export default Footer;