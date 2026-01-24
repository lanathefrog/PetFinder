import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/auth-about.css';

const Login = ({ setToken }) => {
    const [isRegistering, setIsRegistering] = useState(false);
    const [animate, setAnimate] = useState(false); // Controls the fade effect
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [fullName, setFullName] = useState('');

    // Trigger animation whenever the tab changes
    useEffect(() => {
        setAnimate(true);
        const timer = setTimeout(() => setAnimate(false), 200);
        return () => clearTimeout(timer);
    }, [isRegistering]);

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const response = await axios.post('http://127.0.0.1:8001/api/token/', {
                username, password
            });
            localStorage.setItem('access_token', response.data.access);
            setToken(response.data.access);
        } catch (err) {
            alert("Invalid login details.");
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            alert('Passwords do not match!');
            return;
        }
        const [firstName, ...lastNameParts] = fullName.split(' ');
        try {
            await axios.post('http://127.0.0.1:8001/api/register/', {
                username,
                password,
                first_name: firstName,
                last_name: lastNameParts.join(' ')
            });
            alert("Account created! Please sign in.");
            setIsRegistering(false);
        } catch (err) {
            console.error(err.response?.data);
        }
    };

    return (
        <div className="login-container">
            <div className="login-header">
                <div className="login-logo floating-animation">🧡</div>
                <h1>PetFinder</h1>
                <p>Reuniting pets with their families</p>
            </div>

            <div className="login-card">
                <div className="login-tabs">
                    <button
                        className={`tab-btn ${!isRegistering ? 'active' : ''}`}
                        onClick={() => setIsRegistering(false)}
                    >
                        Sign In
                    </button>
                    <button
                        className={`tab-btn ${isRegistering ? 'active' : ''}`}
                        onClick={() => setIsRegistering(true)}
                    >
                        Create Account
                    </button>
                </div>

                {/* Form container with dynamic animation class */}
                <div className={animate ? 'form-fade-out' : 'form-fade-in'}>
                    {!isRegistering ? (
                        <form className="login-form" onSubmit={handleLogin}>
                            <div className="form-group-login">
                                <label>Username</label>
                                <input type="text" onChange={(e) => setUsername(e.target.value)} required />
                            </div>
                            <div className="form-group-login">
                                <label>Password</label>
                                <input type="password" onChange={(e) => setPassword(e.target.value)} required />
                            </div>
                            {/* Updated with your requested class name */}
                            <button type="submit" className="sign-in-btn">Sign In</button>
                        </form>
                    ) : (
                        <form className="login-form" onSubmit={handleRegister}>
                            <div className="form-group-login">
                                <label>Full Name</label>
                                <input type="text" onChange={(e) => setFullName(e.target.value)} required />
                            </div>
                            <div className="form-group-login">
                                <label>Username</label>
                                <input type="text" onChange={(e) => setUsername(e.target.value)} required />
                            </div>
                            <div className="form-group-login">
                                <label>Password</label>
                                <input type="password" onChange={(e) => setPassword(e.target.value)} required />
                            </div>
                            <div className="form-group-login">
                                <label>Confirm Password</label>
                                <input type="password" onChange={(e) => setConfirmPassword(e.target.value)} required />
                            </div>
                            <button type="submit" className="sign-in-btn">Create Account</button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Login;