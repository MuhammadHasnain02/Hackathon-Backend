import { Router } from "express";
import auth from "../middlewares/auth.js";
import {
  getAppointments,
  createAppointment,
  updateAppointment,
  deleteAppointment,
} from "../controllers/appointmentController.js";

const router = Router();

// All appointment routes require authentication
router.use(auth);

router.get("/", getAppointments);
router.post("/", createAppointment);
router.patch("/:id", updateAppointment);
router.delete("/:id", deleteAppointment);

export default router;
