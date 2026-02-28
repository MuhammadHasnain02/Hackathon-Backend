import User from "../models/User.js";
import auth from "./auth.js";

/**
 * Requires auth + admin role. Use after auth middleware.
 */
const adminAuth = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId).select("role");
    if (!user || user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }
    next();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export default adminAuth;
