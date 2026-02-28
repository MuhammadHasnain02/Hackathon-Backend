import User from "../models/User.js";

/**
 * Get analytics: total patients, doctors, monthly appointments, simulated revenue.
 */
export const getAnalytics = async (req, res) => {
  try {
    const [patients, doctors, receptionists] = await Promise.all([
      User.countDocuments({ role: "patient" }),
      User.countDocuments({ role: "doctor" }),
      User.countDocuments({ role: "receptionist" }),
    ]);

    // Simulated monthly appointments (based on patients * 2)
    const monthlyAppointments = Math.max(patients * 2, 50);

    // Simulated revenue: Free users = $0, Pro = $29/mo (simplified)
    const proUsers = await User.countDocuments({ subscriptionPlan: "Pro" });
    const simulatedRevenue = proUsers * 29;

    res.json({
      totalPatients: patients,
      totalDoctors: doctors,
      totalReceptionists: receptionists,
      monthlyAppointments,
      simulatedRevenue,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Get staff list (doctors + receptionists).
 */
export const getStaff = async (req, res) => {
  try {
    const staff = await User.find({ role: { $in: ["doctor", "receptionist"] } })
      .select("email role createdAt")
      .sort({ createdAt: -1 })
      .lean();

    res.json({ staff });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Add a doctor (admin only).
 */
export const addDoctor = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: "Email already in use" });
    }

    const user = await User.create({ email, password, role: "doctor" });

    res.status(201).json({
      message: "Doctor added successfully",
      user: { id: user._id, email: user.email, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Add a receptionist (admin only).
 */
export const addReceptionist = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: "Email already in use" });
    }

    const user = await User.create({ email, password, role: "receptionist" });

    res.status(201).json({
      message: "Receptionist added successfully",
      user: { id: user._id, email: user.email, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Remove staff (doctor or receptionist).
 */
export const removeStaff = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!["doctor", "receptionist"].includes(user.role)) {
      return res.status(403).json({ message: "Can only remove doctors or receptionists" });
    }

    await User.findByIdAndDelete(id);

    res.json({ message: "Staff removed successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
