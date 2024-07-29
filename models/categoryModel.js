const mongoose = require("mongoose");
const { Schema, model } = mongoose;

const categorySchema = new Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    description: {
        type: String
    }
}, { timestamps: true });

module.exports = model("Category", categorySchema);
