import User from "../models/User.js";
import jwt from "jsonwebtoken";
import { generateAccessToken, generateRefreshToken } from "../utils/token.js";

export const register = async (req, res) => {
  try {
    const { email, password , role } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "Email already in use" });
    }

    const user = await User.create({ email, password, role });

    const accessToken = generateAccessToken(user._id , user.role);
    const refreshToken = generateRefreshToken(user._id , user.role);

    user.refreshToken = refreshToken;
    await user.save();

    res.status(201).json({
      accessToken,
      refreshToken,
      user: { id: user._id, email: user.email, role: user.role, subscriptionPlan: user.subscriptionPlan },
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ message: err.message, error: "register function error" });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const accessToken = generateAccessToken(user._id , user.role);
    const refreshToken = generateRefreshToken(user._id , user.role);

    user.refreshToken = refreshToken;
    await user.save();

    res.json({
      accessToken,
      refreshToken,
      user: { id: user._id, email: user.email, role: user.role, subscriptionPlan: user.subscriptionPlan },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: err.message, error: "login function error" });
  }
};

export const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ message: "Refresh token is required" });
    }

    let payload;
    try {
      payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    const user = await User.findById(payload.userId);
    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    const newAccessToken = generateAccessToken(user._id , user.role);
    res.json({ accessToken: newAccessToken });
  } catch (err) {
    console.error("Refresh error:", err);
    res.status(500).json({ message: err.message, error: "refresh function error" });
  }
};

export const logout = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (user) {
      user.refreshToken = null;
      await user.save();
    }
    res.json({ message: "Logged out successfully" });
  } catch (err) {
    console.error("Logout error:", err);
    res.status(500).json({ message: err.message });
  }
};

export const me = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({ user: { id: user._id, email: user.email, role: user.role, subscriptionPlan: user.subscriptionPlan } });
  } catch (err) {
    console.error("Me error:", err);
    res.status(500).json({ message: err.message });
  }
};

// Get all users whose role is 'doctor'
export const getDoctors = async (req, res) => {
  try {
    const doctors = await User.find({ role: "doctor" }).select("_id email");
    res.json({ doctors });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};