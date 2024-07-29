
const mongoose = require("mongoose");
const { Schema, model } = mongoose;

const userSchema = Schema(
    {
        name: { type: String },
        email: { type: String, required: true }, // Ensure unique index
        password: { type: String },
        isTermsOfService: { type: Boolean },
        isPrivacyPolicy: { type: Boolean },
        resetPasswordToken: String,
        resetPasswordExpires: Date,
        accessToken: String,
        refreshToken: String,
        phone: { type: String },
        createdAt: { type: Date, default: Date.now },
        socialId: { type: String },
        platForm: { type: String }, 
    },
    { timestamps: true }
);

userSchema.index({ email: 1 }, { unique: true }); // Index on the email field

module.exports = {
    User: model("User", userSchema)
};
