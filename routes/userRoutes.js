const express = require("express");
const router = express.Router();

const {
  loginUser,
} = require("../controllers/authController");

const {
  getProfile,
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  resetPassword,
  updateFcmToken,
} = require("../controllers/userController");

router.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "USER ROUTE WORKING"
  });
});

router.post(
  "/login",
  loginUser
);

router.get(
  "/profile/:id",
  getProfile
);

router.get(
  "/",
  getAllUsers
);

router.post(
  "/",
  createUser
);

router.put(
  "/:id",
  updateUser
);

router.delete(
  "/:id",
  deleteUser
);

router.put(
  "/reset-password/:id",
  resetPassword
);

router.post(
  "/fcm-token",
  updateFcmToken
);

module.exports = router;