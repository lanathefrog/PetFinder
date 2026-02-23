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
    const [profileImagePreview, setProfileImagePreview] = useState(null);
    const [profileImageFile, setProfileImageFile] = useState(null);

    const [formData, setFormData] = useState({
        username: "",
        email: "",
        first_name: "",
        last_name: "",
        phone_number: ""
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
                email: res.data.email,
                first_name: res.data.first_name || "",
                last_name: res.data.last_name || "",
                phone_number: res.data.phone_number || ""
            });

        } catch (err) {
            console.error("Failed to load user:", err);
        }
    };

    const handleProfileImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setProfileImageFile(file);
            setProfileImagePreview(URL.createObjectURL(file));
        }
    };

    const handleUpdateProfile = async () => {
        try {
            // Validation
            if (!formData.username || !formData.username.trim()) {
                showToast("Username cannot be empty", "error");
                return;
            }
            if (!formData.email || !formData.email.trim()) {
                showToast("Email cannot be empty", "error");
                return;
            }
            if (!formData.first_name || !formData.first_name.trim()) {
                showToast("First name cannot be empty", "error");
                return;
            }
            if (!formData.last_name || !formData.last_name.trim()) {
                showToast("Last name cannot be empty", "error");
                return;
            }

            console.log("📝 Updating profile...");
            console.log("🔹 Data being sent:", {
                username: formData.username,
                email: formData.email,
                first_name: formData.first_name,
                last_name: formData.last_name,
                phone_number: formData.phone_number
            });

            // Update basic profile data
            const updatePayload = {
                username: formData.username,
                email: formData.email,
                first_name: formData.first_name,
                last_name: formData.last_name,
                phone_number: formData.phone_number
            };

            await axios.put(
                "http://127.0.0.1:8001/api/users/me/",
                updatePayload,
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            console.log("✅ Basic profile updated");

            // If profile image changed, upload it separately
            if (profileImageFile) {
                console.log("🖼️ Uploading profile image...");
                console.log("📦 File:", profileImageFile.name);

                const imagePayload = new FormData();
                imagePayload.append('profile_image', profileImageFile);

                console.log("📮 Sending FormData with profile_image...");

                const response = await axios.put(
                    "http://127.0.0.1:8001/api/users/me/",
                    imagePayload,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                            'Content-Type': 'multipart/form-data'
                        }
                    }
                );

                console.log("✅ Profile image uploaded successfully!");
                console.log("📦 Response:", response.data);
                console.log("🖼️ Profile image URL:", response.data.profile_image_url);
            } else {
                console.log("ℹ️ No profile image to upload");
            }

            showToast("Profile updated successfully! 🎉", "success");
            setEditing(false);
            setProfileImageFile(null);
            setProfileImagePreview(null);

            // Reload user data to get updated profile_image_url from backend
            console.log("🔄 Reloading user data...");
            await loadUser();
            console.log("✅ User data reloaded!");

        } catch (err) {
            console.error("❌ Error updating profile:", err);
            console.error("📦 Response data:", err.response?.data);
            showToast(err.response?.data?.error || "Failed to update profile", "error");
        }
    };

    const handleChangePassword = async () => {
        if (!passwordData.old_password || !passwordData.new_password) {
            showToast("Please fill in all password fields", "error");
            return;
        }

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

            showToast("Password changed successfully! 🔐", "success");
            setPasswordData({ old_password: "", new_password: "" });

        } catch (err) {
            console.error(err.response?.data);
            showToast("Failed to change password", "error");
        }
    };

    if (!user) return (
        <div style={{
            padding: "4rem",
            textAlign: "center",
            background: "linear-gradient(135deg, #FFF5F2 0%, #FFE8E0 100%)",
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1.2rem",
            color: "#666"
        }}>
            Loading your profile...
        </div>
    );

    return (
        <div className="profile-page">
            <div className="profile-container">

                <div className="profile-header">
                    <div className="profile-avatar-wrapper">
                        <div className="profile-avatar-container">
                            {profileImagePreview ? (
                                <img src={profileImagePreview} alt="Profile" className="profile-avatar-image" />
                            ) : user.profile_image_url ? (
                                <img src={user.profile_image_url} alt="Profile" className="profile-avatar-image" />
                            ) : (
                                <div className="profile-avatar">
                                    {user.username.charAt(0).toUpperCase()}
                                </div>
                            )}
                            {editing && (
                                <label htmlFor="profile-image-input" className="profile-avatar-edit-btn" title="Change profile picture">
                                    📸
                                </label>
                            )}
                            <input
                                id="profile-image-input"
                                type="file"
                                accept="image/*"
                                hidden
                                onChange={handleProfileImageChange}
                                disabled={!editing}
                            />
                        </div>
                    </div>
                    <h1>👋 Hey, {user.username}!</h1>
                    <p className="profile-subtitle">Manage your pet rescue profile</p>
                </div>

                <div className="profile-card">
                    <div className="profile-card-header">
                        <h2>🎯 Profile Information</h2>
                        {!editing && (
                            <button className="btn btn-secondary" onClick={() => setEditing(true)}>
                                ✏️ Edit Profile
                            </button>
                        )}
                    </div>

                    {editing ? (
                        <div className="profile-form">
                            <div className="profile-info-item">
                                <label className="profile-label">Username</label>
                                <input
                                    className="profile-input"
                                    value={formData.username}
                                    onChange={(e) =>
                                        setFormData({ ...formData, username: e.target.value })
                                    }
                                    placeholder="Enter username"
                                />
                                <p className="profile-hint">Your unique username for the platform</p>
                            </div>

                            <div className="profile-info-item">
                                <label className="profile-label">Email</label>
                                <input
                                    className="profile-input"
                                    value={formData.email}
                                    onChange={(e) =>
                                        setFormData({ ...formData, email: e.target.value })
                                    }
                                    placeholder="Enter email"
                                />
                                <p className="profile-hint">Your email address for notifications</p>
                            </div>

                            <div className="profile-info-item">
                                <label className="profile-label">First Name</label>
                                <input
                                    className="profile-input"
                                    value={formData.first_name}
                                    onChange={(e) =>
                                        setFormData({ ...formData, first_name: e.target.value })
                                    }
                                    placeholder="Enter first name"
                                />
                            </div>

                            <div className="profile-info-item">
                                <label className="profile-label">Last Name</label>
                                <input
                                    className="profile-input"
                                    value={formData.last_name}
                                    onChange={(e) =>
                                        setFormData({ ...formData, last_name: e.target.value })
                                    }
                                    placeholder="Enter last name"
                                />
                            </div>

                            <div className="profile-info-item">
                                <label className="profile-label">Phone Number</label>
                                <input
                                    className="profile-input"
                                    value={formData.phone_number}
                                    onChange={(e) =>
                                        setFormData({ ...formData, phone_number: e.target.value })
                                    }
                                    placeholder="Enter your phone number"
                                />
                            </div>

                            <div className="profile-actions">
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => {
                                        setEditing(false);
                                        setProfileImageFile(null);
                                        setProfileImagePreview(null);
                                    }}
                                >
                                    ✕ Cancel
                                </button>
                                <button className="btn btn-primary" onClick={handleUpdateProfile}>
                                    💾 Save Changes
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="profile-info-display">
                            <div className="profile-info-item">
                                <p className="profile-label">Username</p>
                                <p className="profile-value">{user.username}</p>
                            </div>
                            <div className="profile-info-item">
                                <p className="profile-label">Email</p>
                                <p className="profile-value">{user.email}</p>
                            </div>
                            <div className="profile-info-item">
                                <p className="profile-label">First Name</p>
                                <p className="profile-value">{user.first_name || "Not set"}</p>
                            </div>
                            <div className="profile-info-item">
                                <p className="profile-label">Last Name</p>
                                <p className="profile-value">{user.last_name || "Not set"}</p>
                            </div>
                            <div className="profile-info-item">
                                <p className="profile-label">Phone</p>
                                <p className="profile-value">{user.phone_number || "Not set"}</p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="profile-card">
                    <h2>🔐 Change Password</h2>

                    <div className="profile-form">
                        <div className="profile-info-item">
                            <label className="profile-label">Current Password</label>
                            <input
                                type="password"
                                placeholder="Enter current password"
                                className="profile-input"
                                value={passwordData.old_password}
                                onChange={(e) =>
                                    setPasswordData({ ...passwordData, old_password: e.target.value })
                                }
                            />
                        </div>

                        <div className="profile-info-item">
                            <label className="profile-label">New Password</label>
                            <input
                                type="password"
                                placeholder="Enter new password"
                                className="profile-input"
                                value={passwordData.new_password}
                                onChange={(e) =>
                                    setPasswordData({ ...passwordData, new_password: e.target.value })
                                }
                            />
                        </div>

                        <button className="btn btn-primary" onClick={handleChangePassword}>
                            🔄 Update Password
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default ProfilePage;