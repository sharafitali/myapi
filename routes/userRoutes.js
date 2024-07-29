// routes/user.routes.js
const express = require("express");
const router = express.Router()
const userController = require("../controllers/userController")
const { jwtAuthMiddleware } = require("../config/jwt")
const { createUser, loginUser, forgotPassword, resetPassword, socialSignup,socialLogin, validateOTP } = userController;

router.post("/create", createUser)

router.post("/social-signup",socialSignup)

router.post("/social-login",socialLogin)

router.route("/login").post(loginUser)

router.route("/forgot-password").post(jwtAuthMiddleware,forgotPassword)

router.route("/validateOtp").post(jwtAuthMiddleware,validateOTP)

router.route("/reset-password").post(resetPassword)

module.exports = router
