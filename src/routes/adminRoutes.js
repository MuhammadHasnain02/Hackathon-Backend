import { Router } from "express";
import auth from "../middlewares/auth.js";
import adminAuth from "../middlewares/adminAuth.js";
import {
  getAnalytics,
  getStaff,
  addDoctor,
  addReceptionist,
  removeStaff,
} from "../controllers/adminController.js";

const router = Router();

router.use(auth);
router.use(adminAuth);

router.get("/analytics", getAnalytics);
router.get("/staff", getStaff);
router.post("/staff/doctor", addDoctor);
router.post("/staff/receptionist", addReceptionist);
router.delete("/staff/:id", removeStaff);

export default router;
