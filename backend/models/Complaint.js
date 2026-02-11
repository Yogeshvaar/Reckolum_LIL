const mongoose = require('mongoose');

const ComplaintSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    title: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    category: {
        type: String,
        required: true,
    },
    source: {
        type: String,
        enum: ['Form', 'Voice', 'API'],
        default: 'Form',
    },
    sector: {
        type: String,
    },
    city: {
        type: String,
    },
    tpr: {
        type: Number,
        default: 0,
    },
    status: {
        type: String,
        enum: ['New', 'Triaged', 'Ongoing', 'Closed'],
        default: 'New',
    },
    evidence: [
        {
            filename: String,
            path: String,
            hash: String,
        },
    ],
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('Complaint', ComplaintSchema);
