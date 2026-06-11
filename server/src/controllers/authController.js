const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Handle User Login
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    // 1. Check if user exists in database
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    // 2. Check if user account is active
    if (!user.isActive) {
      return res.status(403).json({ error: 'Account is paused. Please contact your administrator.' });
    }

    // 3. Verify password (bcrypt)
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    let advocateId = null;

    // 4. If Munshi, perform additional subscription check on their Advocate
    if (user.role === 'MUNSHI') {
      const munshiAccount = await prisma.munshiAccount.findUnique({
        where: { munshiId: user.id },
      });

      if (!munshiAccount) {
        return res.status(403).json({ error: 'Munshi clerk profile not found.' });
      }

      if (!munshiAccount.isActive) {
        return res.status(403).json({ error: 'Munshi clerk account is deactivated.' });
      }

      // Check hiring advocate subscription status
      const advocatePortal = await prisma.advocatePortal.findUnique({
        where: { advocateId: munshiAccount.advocateId },
      });

      if (!advocatePortal || advocatePortal.subscriptionStatus !== 'ACTIVE') {
        return res.status(403).json({ error: "Your advocate's subscription is paused." });
      }

      advocateId = munshiAccount.advocateId;
    }

    // 5. Generate JWT token with payload { userId, role, advocateId }
    const token = jwt.sign(
      { userId: user.id, role: user.role, advocateId },
      process.env.JWT_SECRET || 'your_jwt_secret_key_here',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // 6. Map loginAs text for login display
    let loginAs = '';
    if (user.role === 'SUPERADMIN') loginAs = 'SuperAdmin';
    else if (user.role === 'ADVOCATE') loginAs = 'Advocate';
    else if (user.role === 'MUNSHI') loginAs = 'Munshi';

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        profilePicture: user.profilePicture,
      },
      loginAs,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle Password Change
 */
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.userId;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required.' });
    }

    // Get user from database to check password
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Current password does not match.' });
    }

    // Hash and save new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    res.json({ message: 'Password updated successfully.' });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieve User Profile
 */
const getProfile = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        profilePicture: true,
        isActive: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User profile not found.' });
    }

    res.json({ user });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  login,
  changePassword,
  getProfile,
};
