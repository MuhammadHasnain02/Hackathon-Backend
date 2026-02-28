import { Router } from "express";
import auth from "../middlewares/auth.js";
import { getAppointments, createAppointment, updateAppointment } from "../controllers/appointmentController.js";

const router = Router();

router.use(auth);

router.get("/", getAppointments);
router.post("/", createAppointment);
router.patch("/:id", updateAppointment);

export default router;
