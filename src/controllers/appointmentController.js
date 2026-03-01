import Appointment from "../models/Appointment.js";
import User from "../models/User.js";

/**
 * GET /api/appointments
 * - Admin, Receptionist: all appointments
 * - Doctor: only appointments where doctorId = current user
 * - Patient: only appointments where patientId = current user
 */
export const getAppointments = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("role");
    if (!user) return res.status(401).json({ message: "User not found" });

    let query = {};

    switch (user.role) {
      case "admin":
      case "receptionist":
        break; // all
      case "doctor":
        query.doctorId = req.user.userId;
        break;
      case "patient":
        query.patientId = req.user.userId;
        break;
      default:
        return res.status(403).json({ message: "Forbidden" });
    }

    const appointments = await Appointment.find(query)
      .populate("patientId", "email")
      .populate("doctorId", "email")
      .sort({ scheduledAt: -1 })
      .lean();

    res.json({ appointments });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * POST /api/appointments - Patient books appointment (status: pending)
 */
export const createAppointment = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("role");
    if (!user) return res.status(401).json({ message: "User not found" });

    if (user.role !== "patient") {
      return res.status(403).json({ message: "Only patients can book appointments" });
    }

    const { scheduledAt, reason } = req.body;
    if (!scheduledAt) {
      return res.status(400).json({ message: "scheduledAt is required" });
    }

    const appointment = await Appointment.create({
      patientId: req.user.userId,
      doctorId: null,
      scheduledAt: new Date(scheduledAt),
      status: "pending",
      reason: reason || "",
    });

    const populated = await Appointment.findById(appointment._id)
      .populate("patientId", "email")
      .populate("doctorId", "email")
      .lean();

    res.status(201).json({ appointment: populated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * PATCH /api/appointments/:id - Update status (e.g. Doctor confirms)
*/
export const updateAppointment = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("role");
    if (!user) return res.status(401).json({ message: "User not found" });

    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.status(404).json({ message: "Appointment not found" });

    const { status, doctorId } = req.body;

    if (user.role === "doctor") {
      if (appointment.doctorId && appointment.doctorId.toString() !== req.user.userId) {
        return res.status(403).json({ message: "Not your appointment" });
      }
      if (status === "confirmed") {
        appointment.status = "confirmed";
        if (doctorId) appointment.doctorId = doctorId;
        else appointment.doctorId = req.user.userId;
      }
    } else if (user.role === "admin" || user.role === "receptionist") {
      if (status) appointment.status = status;
      if (doctorId !== undefined) appointment.doctorId = doctorId || null;
    } else if (user.role === "patient") {
      if (appointment.patientId.toString() !== req.user.userId) {
        return res.status(403).json({ message: "Not your appointment" });
      }
      if (status === "cancelled") appointment.status = "cancelled";
    } else {
      return res.status(403).json({ message: "Forbidden" });
    }

    await appointment.save();

    const populated = await Appointment.findById(appointment._id)
      .populate("patientId", "email")
      .populate("doctorId", "email")
      .lean();

    res.json({ appointment: populated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
