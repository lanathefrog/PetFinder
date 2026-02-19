import React from "react";
import "../styles/base.css";
import "../styles/responsive.css";
import "../styles/how.css";

const HowItWorks = ({ onNavigate }) => {

    return (
        <div className="how-page">

            {/* HERO */}
            <section className="how-hero">
                <h1>How PetFinder Works</h1>
                <p>Three simple steps to reunite pets with their families</p>
            </section>

            {/* STEPS */}
            <section className="how-steps">

                <div className="step-card">
                    <div className="step-number">1</div>
                    <h2>Post an Announcement</h2>
                    <p>
                        If your pet is lost or you’ve found one, create a detailed post.
                        Add photos, location, and description.
                    </p>
                </div>

                <div className="step-card">
                    <div className="step-number">2</div>
                    <h2>Community Visibility</h2>
                    <p>
                        Your post instantly appears on the interactive map and in the
                        listing feed so others can help.
                    </p>
                </div>

                <div className="step-card">
                    <div className="step-number">3</div>
                    <h2>Connect & Reunite</h2>
                    <p>
                        Users can contact the owner or finder directly and help bring pets home safely.
                    </p>
                </div>

            </section>

            {/* WHY SECTION */}
            <section className="why-section">
                <h2>Why Choose PetFinder?</h2>

                <div className="why-grid">
                    <div className="why-item">
                        🗺 Interactive Map
                    </div>
                    <div className="why-item">
                        🔒 Secure Authentication
                    </div>
                    <div className="why-item">
                        ⚡ Fast Posting
                    </div>
                    <div className="why-item">
                        ❤️ Community Driven
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="how-cta">
                <h2>Ready to Help?</h2>
                <button
                    className="btn btn-primary"
                    onClick={()=>onNavigate("report_lost")}
                >
                    Start Now
                </button>
            </section>

        </div>
    );
};

export default HowItWorks;
