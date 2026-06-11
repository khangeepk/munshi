const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const { authenticate } = require('../middleware/authMiddleware');
const authController = require('../controllers/authController');

const prisma = new PrismaClient();

/**
 * @route   POST /api/auth/register
 * @desc    Register a new Advocate user
 * @access  Public
 */
router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user with ADVOCATE role
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: 'ADVOCATE',
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    res.status(201).json({
      message: 'Advocate registered successfully.',
      user: newUser,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/auth/login
 * @desc    Log in a user and return a JWT
 * @access  Public
 */
router.post('/login', authController.login);

/**
 * @route   POST /api/auth/change-password
 * @desc    Change password of current logged in user
 * @access  Private
 */
router.post('/change-password', authenticate, authController.changePassword);

/**
 * @route   GET /api/auth/profile
 * @desc    Get current user profile details
 * @access  Private
 */
router.get('/profile', authenticate, authController.getProfile);

module.exports = router;
