const express = require("express");
const router = express.Router()
const { jwtAuthMiddleware } = require("../config/jwt")
const {addCategory, getCategories }= require("../controllers/categoryController")

router.route("/add-category").post(jwtAuthMiddleware,addCategory)

router.route("/get-categories").get(jwtAuthMiddleware,getCategories)


module.exports = router