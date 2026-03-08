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
    // const user = await User.findById(req.user.userId).select("role");

    // if (!user || !user.id) {
    //   return res.status(401).json({ message: "User not authenticated" });
    // }

    // if (user.role !== "patient") {
    //   return res.status(403).json({ message: "Only patients can book appointments" });
    // }

    const { scheduledAt, reason , doctorId , patientId } = req.body;
    if (!scheduledAt) {
      return res.status(400).json({ message: "scheduledAt is required" });
    }

    // Agar receptionist hai to body se patientId le, warna login user ki ID le
    const finalPatientId = req.user.role === 'receptionist' ? patientId : req.user.userId;
    console.log(finalPatientId)

    const appointment = await Appointment.create({
      patientId: finalPatientId,
      // patientId: req.user.userId,
      doctorId: doctorId || null,
      scheduledAt: new Date(scheduledAt),
      status: "pending",
      reason: reason || "",
    });

    const populated = await Appointment.findById(appointment._id)
      .populate("patientId", "email")
      .populate("doctorId", "email")
      .lean();

    // await appointment.save();
    res.status(201).json({ appointment: populated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * PATCH /api/appointments/:id - Update appointment with role-based permissions.
 * - Admin: can update status, doctorId, scheduledAt, reason for any appointment
 * - Receptionist: no write access (read-only via GET)
 * - Doctor: can accept or decline their own appointments
 *          (accept = confirmed, decline = cancelled)
 * - Patient: can manage ONLY their own appointments
 *            - cancel (status: cancelled)
 *            - optionally reschedule (scheduledAt) and update reason
 */
export const updateAppointment = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("role");
    if (!user) return res.status(401).json({ message: "User not found" });

    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.status(404).json({ message: "Appointment not found" });

    const { status, doctorId, scheduledAt, reason } = req.body;

    if (user.role === "doctor") {
      // Doctor: can only accept or decline appointments assigned to them
      if (
        appointment.doctorId &&
        appointment.doctorId.toString() !== req.user.userId
      ) {
        return res.status(403).json({ message: "Not your appointment" });
      }

      if (status === "confirmed") {
        // Accept = confirmed
        appointment.status = "confirmed";
        appointment.doctorId = doctorId || req.user.userId;
      } else if (status === "cancelled") {
        // Decline = cancelled
        appointment.status = "cancelled";
        // Optionally unassign doctor when declining
        appointment.doctorId = null;
      }
    } else if (user.role === "admin") {
      // Admin: full control over status, doctor assignment, and basic fields
      if (status) {
        appointment.status = status;
      }
      if (doctorId !== undefined) {
        appointment.doctorId = doctorId || null;
      }
      if (scheduledAt) {
        appointment.scheduledAt = new Date(scheduledAt);
      }
      if (typeof reason === "string") {
        appointment.reason = reason;
      }
    } else if (user.role === "receptionist") {
      // Receptionist: read-only, cannot modify appointments
      return res.status(403).json({ message: "Receptionist cannot modify appointments" });
    } else if (user.role === "patient") {
      // Patient: can only manage their own appointments
      if (appointment.patientId.toString() !== req.user.userId) {
        return res.status(403).json({ message: "Not your appointment" });
      }

      // Allow cancelling their own appointment
      if (status === "cancelled") {
        appointment.status = "cancelled";
      }

      // Allow basic updates (e.g. reschedule / change reason)
      if (scheduledAt) {
        appointment.scheduledAt = new Date(scheduledAt);
      }
      if (typeof reason === "string") {
        appointment.reason = reason;
      }
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

/**
 * DELETE /api/appointments/:id
 * - Admin: can delete any appointment
 * - Patient: can delete ONLY their own appointments
 * - Other roles: forbidden
 */
export const deleteAppointment = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("role");
    if (!user) return res.status(401).json({ message: "User not found" });

    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.status(404).json({ message: "Appointment not found" });

    if (user.role === "admin") {
      // Admin can delete anything
      await appointment.deleteOne();
      return res.status(204).send();
    }

    if (user.role === "patient") {
      if (appointment.patientId.toString() !== req.user.userId) {
        return res.status(403).json({ message: "Not your appointment" });
      }
      await appointment.deleteOne();
      return res.status(204).send();
    }

    return res.status(403).json({ message: "Forbidden" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
