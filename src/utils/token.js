import jwt from "jsonwebtoken";

export const generateAccessToken = (userId , role) => {
  return jwt.sign({ userId, role }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

export const generateRefreshToken = (userId , role) => {
  return jwt.sign({ userId, role }, process.env.JWT_REFRESH_SECRET, {expiresIn: "7d"});
};
