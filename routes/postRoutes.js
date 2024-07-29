const express = require("express");
const router = express.Router()
const { jwtAuthMiddleware } = require("../config/jwt")
const {createPost,getPosts}= require("../controllers/postController")

router.route("/create-post").post(jwtAuthMiddleware,createPost)

router.route("/get-posts").get(jwtAuthMiddleware,getPosts)


module.exports = router