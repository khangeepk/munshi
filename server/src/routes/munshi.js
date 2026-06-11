const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate, checkRole } = require('../middleware/authMiddleware');

const prisma = new PrismaClient();

// Secure all routes in this file to Munshi role only
router.use(authenticate, checkRole(['MUNSHI']));

/**
 * Helper middleware to check if Munshi account is active and attach advocateId to req
 */
const verifyMunshiTenancy = async (req, res, next) => {
  try {
    const munshiAcc = await prisma.munshiAccount.findUnique({
      where: { munshiId: req.user.userId },
    });

    if (!munshiAcc || !munshiAcc.isActive) {
      return res.status(403).json({ error: 'Access denied. Munshi clerk profile is inactive.' });
    }

    // Attach hiring advocate tenant ID
    req.advocateId = munshiAcc.advocateId;
    req.permissions = munshiAcc.permissions;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/munshi/permissions
 * @desc    Get clerk permissions and dashboard access rights
 * @access  Private (Munshi)
 */
router.get('/permissions', verifyMunshiTenancy, (req, res) => {
  res.json({ permissions: req.permissions });
});

/**
 * @route   GET /api/munshi/clients
 * @desc    Get all clients managed by the Munshi's hiring Advocate
 * @access  Private (Munshi)
 */
router.get('/clients', verifyMunshiTenancy, async (req, res, next) => {
  try {
    // Check permission if needed (e.g., if permissions object has viewClients flag)
    // For now, load all clients associated with hiring advocate
    const clients = await prisma.client.findMany({
      where: { advocateId: req.advocateId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(clients);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/munshi/clients
 * @desc    Add a Client case profile under the hiring Advocate's tenant ID
 * @access  Private (Munshi)
 */
router.post('/clients', verifyMunshiTenancy, async (req, res, next) => {
  try {
    const { name, cnic, phone, email, address } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ error: 'Client name and phone number are required.' });
    }

    const client = await prisma.client.create({
      data: {
        name,
        cnic,
        phone,
        email,
        address,
        advocateId: req.advocateId,
        addedBy: req.user.userId, // Hired Munshi clerk who registered it
      },
    });

    res.status(201).json({ message: 'Client registered successfully by Munshi clerk.', client });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
