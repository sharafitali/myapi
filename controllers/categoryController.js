const express = require("express");
const Category  = require("../models/categoryModel");
const { sendResponse } = require("../helpers/response");
const catchAsyncErrors = require("../middlewares/catchAsyncError");
const ErrorHandler = require("../utils/errorHandling");
const helperMessages = require("../helpers/englishMessages");



const addCategory = catchAsyncErrors(async (req, res) => {
    try{
        const {category} = req.body;
        const newCategory = new Category({
            name: category
        });
        await newCategory.save();
        return sendResponse (res, 1, 200, helperMessages.CategoryAdded, newCategory);
    }catch(error){
        console.log(error);
        return sendResponse(res, 0, 500, error.message);
    }
})


const getCategories = catchAsyncErrors(async (req, res) => {
    try{
        const categories = await Category.find();
        return sendResponse (res, 1, 200, "categories:", categories);
    }catch(error){
        console.log(error);
        return sendResponse(res, 0, 500, error.message);
    }
})


module.exports = {
    addCategory,
    getCategories
}

