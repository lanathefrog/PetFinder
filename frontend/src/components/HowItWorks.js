import React from "react";
import "../styles/base.css";
import "../styles/responsive.css";
import "../styles/how.css";

const HowItWorks = ({ onNavigate }) => {
    return (
        <div className="how-page">
            <section className="how-hero">
                <span className="how-badge">Simple process, real results</span>
                <h1>How PetFinder works</h1>
                <p>
                    Report, share, and connect in minutes. Every post helps your
                    neighborhood spot and return pets faster.
                </p>
                <div className="how-hero-actions">
                    <button
                        className="btn btn-primary"
                        onClick={() => onNavigate("report_lost")}
                    >
                        Report Lost Pet
                    </button>
                    <button
                        className="btn btn-secondary"
                        onClick={() => onNavigate("report_found")}
                    >
                        Report Found Pet
                    </button>
                </div>
            </section>

            <section className="how-steps">
                <div className="step-card">
                    <div className="step-number">1</div>
                    <h2>Post an Announcement</h2>
                    <p>
                        Create a clear report with photos, pet details, and the
                        last seen location. The more specific your post is, the
                        easier it is for others to identify your pet.
                    </p>
                    <span className="step-note">
                        Include: color, size, collar, and time last seen
                    </span>
                </div>

                <div className="step-card">
                    <div className="step-number">2</div>
                    <h2>Community Visibility</h2>
                    <p>
                        Your post appears in the map and listing feed so nearby
                        users can react quickly. Active visibility in the first
                        hours often improves outcomes.
                    </p>
                    <span className="step-note">
                        Nearby users can filter by location and pet type
                    </span>
                </div>

                <div className="step-card">
                    <div className="step-number">3</div>
                    <h2>Connect and Reunite</h2>
                    <p>
                        Use direct messages to coordinate safely, verify details,
                        and arrange pickup. You can keep communication in one place
                        until the pet is home.
                    </p>
                    <span className="step-note">
                        Confirm unique marks before final handoff
                    </span>
                </div>
            </section>

            <section className="why-section">
                <h2>Why people choose PetFinder</h2>
                <div className="why-grid">
                    <div className="why-item">Interactive map visibility</div>
                    <div className="why-item">Secure user accounts</div>
                    <div className="why-item">Fast, mobile-friendly posting</div>
                    <div className="why-item">Local community collaboration</div>
                </div>
            </section>

            <section className="how-tips">
                <h2>Quick tips for better results</h2>
                <div className="tips-grid">
                    <div className="tip-card">
                        <h3>Use recent photos</h3>
                        <p>Clear photos from different angles improve recognition.</p>
                    </div>
                    <div className="tip-card">
                        <h3>Be precise with location</h3>
                        <p>Street names, landmarks, and time windows help searchers.</p>
                    </div>
                    <div className="tip-card">
                        <h3>Reply quickly</h3>
                        <p>Fast responses to messages increase successful reunions.</p>
                    </div>
                </div>
            </section>

            <section className="how-cta">
                <h2>Ready to help?</h2>
                <p>Start a report now or browse recent cases in your area.</p>
                <div className="how-cta-actions">
                    <button
                        className="btn btn-secondary"
                        onClick={() => onNavigate("listing")}
                    >
                        Browse Reports
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={() => onNavigate("report_lost")}
                    >
                        Start Now
                    </button>
                </div>
            </section>
        </div>
    );
};

export default HowItWorks;
