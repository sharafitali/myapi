const mongoose = require("mongoose");
const { Schema, model } = mongoose;

const User = require("./userModel");

const postScema = new Schema(
  {
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,   
    },
    media: {
      videoUrl: [{ type: String }],
      photoUrl: [{ type: String }],
    },
    postDetails: {
      title: { type: String },
      description: { type: String },
      category: { 
        type:Schema.Types.ObjectId,
        ref: 'Category',
        required: true,
       },
      price: { type: Number },
      currency: { type: String },
    },
    contactInfo: {
      name: { type: String },
      location: { type: String },
      is_phone_show: { 
        type: Boolean ,
        default: false,
      },
      phone: { type: String },
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = model("Post", postScema);
