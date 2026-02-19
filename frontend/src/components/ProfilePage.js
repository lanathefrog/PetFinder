import React, { useEffect, useState } from "react";
import axios from "axios";
import "../styles/base.css";
import "../styles/responsive.css";
import "../styles/profile.css";
import { useToast } from "./ToastContext";


const ProfilePage = () => {
    const { showToast } = useToast();


    const [user, setUser] = useState(null);
    const [editing, setEditing] = useState(false);
    const [formData, setFormData] = useState({
        username: "",
        email: ""
    });

    const [passwordData, setPasswordData] = useState({
        old_password: "",
        new_password: ""
    });

    const token = localStorage.getItem("access_token");

    useEffect(() => {
        loadUser();
    }, []);

    const loadUser = async () => {
        try {
            const res = await axios.get("http://127.0.0.1:8001/api/users/me/", {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            setUser(res.data);
            setFormData({
                username: res.data.username,
                email: res.data.email
            });
        } catch (err) {
            console.error("Failed to load user:", err);
        }
    };

    const handleUpdateProfile = async () => {
        try {
            await axios.put(
                "http://127.0.0.1:8001/api/users/me/",
                formData,
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );
            showToast("Profile updated successfully", "success");

            setEditing(false);
            loadUser();
        } catch (err) {
            console.error(err.response?.data);
            showToast("Failed to update profile", "error");

        }
    };

    const handleChangePassword = async () => {
        try {
            await axios.post(
                "http://127.0.0.1:8001/api/users/change-password/",
                passwordData,
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );
            alert("Password changed successfully");
            setPasswordData({ old_password: "", new_password: "" });
        } catch (err) {
            console.error(err.response?.data);
            alert("Failed to change password");
        }
    };

    if (!user) return <div style={{padding:"4rem"}}>Loading...</div>;

    return (
        <div className="profile-page">

            <div className="profile-container">

                <div className="profile-header">
                    <div className="profile-avatar">
                        {user.username.charAt(0).toUpperCase()}
                    </div>
                    <h1>{user.username}</h1>
                    <p>{user.email}</p>
                </div>

                {/* PROFILE INFO */}
                <div className="profile-card">
                    <h2>Profile Information</h2>

                    {editing ? (
                        <>
                            <input
                                className="profile-input"
                                value={formData.username}
                                onChange={(e)=>setFormData({...formData, username:e.target.value})}
                            />
                            <input
                                className="profile-input"
                                value={formData.email}
                                onChange={(e)=>setFormData({...formData, email:e.target.value})}
                            />
                            <button className="btn btn-primary" onClick={handleUpdateProfile}>
                                Save Changes
                            </button>
                        </>
                    ) : (
                        <>
                            <p><strong>Username:</strong> {user.username}</p>
                            <p><strong>Email:</strong> {user.email}</p>
                            <button className="btn btn-secondary" onClick={()=>setEditing(true)}>
                                Edit Profile
                            </button>
                        </>
                    )}
                </div>

                {/* PASSWORD */}
                <div className="profile-card">
                    <h2>Change Password</h2>

                    <input
                        type="password"
                        placeholder="Current Password"
                        className="profile-input"
                        value={passwordData.old_password}
                        onChange={(e)=>setPasswordData({...passwordData, old_password:e.target.value})}
                    />

                    <input
                        type="password"
                        placeholder="New Password"
                        className="profile-input"
                        value={passwordData.new_password}
                        onChange={(e)=>setPasswordData({...passwordData, new_password:e.target.value})}
                    />

                    <button className="btn btn-primary" onClick={handleChangePassword}>
                        Update Password
                    </button>
                </div>

            </div>
        </div>
    );
};

export default ProfilePage;
