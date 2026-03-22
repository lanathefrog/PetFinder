import React from "react";
import "../styles/base.css";
import "../styles/responsive.css";
import "../styles/how.css";

const HowItWorks = ({ onNavigate }) => {
    const steps = [
        {
            id: "01",
            title: "Create a Detailed Report",
            text: "Add clear photos, pet traits, and where the pet was last seen so people can recognize them fast.",
            meta: "Photos, color, size, special marks"
        },
        {
            id: "02",
            title: "Show It on the Live Map",
            text: "Your case appears in listings and on the map, helping nearby users respond while info is fresh.",
            meta: "Location pins and smart filters"
        },
        {
            id: "03",
            title: "Coordinate in Messages",
            text: "Keep communication in one secure place to verify details and safely arrange reunions.",
            meta: "Built-in chat and profile context"
        }
    ];

    const strengths = [
        "Live neighborhood map",
        "Fast posting in minutes",
        "Mobile-ready interface",
        "Focused pet-specific filters"
    ];

    const tips = [
        {
            title: "Use recent photos",
            text: "Front and side angles help people identify pets quickly in real conditions."
        },
        {
            title: "Pin exact location",
            text: "Street names and landmarks improve response quality from nearby users."
        },
        {
            title: "Reply quickly",
            text: "Most successful matches happen when owners respond fast to incoming tips."
        }
    ];

    return (
        <div className="how-page">
            <section className="how-hero">
                <div className="how-hero-copy">
                    <span className="how-badge">Simple flow, fast action</span>
                    <h1>How PetFinder Actually Helps Reunite Pets</h1>
                    <p>
                        From first report to final meetup, every step is designed for speed,
                        clarity, and local collaboration.
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
                </div>
                <div className="how-hero-panel">
                    <div className="hero-panel-row">
                        <span>Search Radius</span>
                        <strong>1-5 km</strong>
                    </div>
                    <div className="hero-panel-row">
                        <span>Fast Matching</span>
                        <strong>Map + Filters</strong>
                    </div>
                    <div className="hero-panel-row">
                        <span>Communication</span>
                        <strong>Built-in Chat</strong>
                    </div>
                </div>
            </section>

            <section className="how-steps">
                {steps.map((step, index) => (
                    <article key={step.id} className="step-card" style={{ animationDelay: `${index * 0.12}s` }}>
                        <div className="step-number">{step.id}</div>
                        <h2>{step.title}</h2>
                        <p>{step.text}</p>
                        <span className="step-note">{step.meta}</span>
                    </article>
                ))}
            </section>

            <section className="why-section">
                <h2>Why communities choose PetFinder</h2>
                <div className="why-grid">
                    {strengths.map((item) => (
                        <div key={item} className="why-item">{item}</div>
                    ))}
                </div>
            </section>

            <section className="how-tips">
                <h2>Field-tested tips for better results</h2>
                <div className="tips-grid">
                    {tips.map((tip) => (
                        <div key={tip.title} className="tip-card">
                            <h3>{tip.title}</h3>
                            <p>{tip.text}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section className="how-cta">
                <h2>Ready to make the next reunion happen?</h2>
                <p>Post a case now or browse active reports in your area.</p>
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
