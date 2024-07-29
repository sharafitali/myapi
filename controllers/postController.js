const express = require("express");
const Post = require("../models/postModel");
const { sendResponse } = require("../helpers/response");
const catchAsyncErrors = require("../middlewares/catchAsyncError");
const ErrorHandler = require("../utils/errorHandling");
const helperMessages = require("../helpers/englishMessages");
const {User} = require("../models/userModel")

// Add POST

const createPost = catchAsyncErrors(async (req, res) => {
    try {
        const { media, postDetails, contactInfo } = req.body;
        console.log("Request User Object: ", req.user);
        const userId = req.user.userId;
        console.log("userid: ", userId);
        if (!userId) {
            throw new Error('User ID is required.');
        }  
        // Fetch user data if isPhoneShow is true
        let user = {};
        if (contactInfo.is_phone_show === true) {
            user = await User.findById(userId).select('phone'); 
            if (!user) {
                throw new Error('User not found.');
            }
        }

        const newPost = new Post({
            user: userId,
            media,
            postDetails,
            contactInfo,
        });
        
        // Add phone number to the response if is_phone_show is true
        if (contactInfo.is_phone_show === true) {
            newPost.contactInfo.phone = user.phone;
        }
        await newPost.save();
        let responsePost = newPost.toObject();


        return sendResponse(res, 1, 200, helperMessages.PostAdded, responsePost);
    } catch (error) {
        console.log(error);
        return sendResponse(res, 0, 500, error.message);
    }
});


const getPosts = catchAsyncErrors(async (req, res) => {
    try{
        const posts = await Post.find().lean();
        return sendResponse (res, 1, 200, "posts:", posts);
    }catch(error){
        console.log(error);
        return sendResponse(res, 0, 500, error.message);
    }
})



module.exports = {
    createPost,
    getPosts
}