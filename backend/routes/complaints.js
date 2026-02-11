const express = require('express');
const router = express.Router();
const Complaint = require('../models/Complaint');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

const protect = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = await User.findById(decoded.id).select('-password');
            next();
        } catch (error) {
            console.error(error);
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        res.status(401).json({ message: 'Not authorized, no token' });
    }
};

// @desc    Get all complaints
// @route   GET /api/complaints
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        let complaints;
        if (req.user.role === 'official') {
            complaints = await Complaint.find({}).sort({ tpr: -1 }); // Prioritized by TPR
        } else {
            complaints = await Complaint.find({ user: req.user._id }).sort({ createdAt: -1 });
        }
        res.json(complaints);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
});

// @desc    Create a complaint
// @route   POST /api/complaints
// @access  Private
router.post('/', protect, async (req, res) => {
    const { title, description, category, source, sector, city, tpr, evidence } = req.body;

    try {
        const complaint = new Complaint({
            user: req.user._id,
            title,
            description,
            category,
            source,
            sector,
            city,
            tpr: tpr || 50, // Default TPR if not provided
            evidence: evidence || [],
        });

        const createdComplaint = await Complaint.create(complaint);
        res.status(201).json(createdComplaint);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
});

module.exports = router;
