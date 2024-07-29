// models/otpModel.js

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const otpSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  otp: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['valid', 'expired'],
    default: 'valid',
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 60, // TTL (Time To Live) in seconds (1 minute)
  },
});

module.exports = mongoose.model('OTP', otpSchema);
