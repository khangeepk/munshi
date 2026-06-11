const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { authenticate, checkRole } = require('../middleware/authMiddleware');

const prisma = new PrismaClient();

// Secure all routes in this file to Advocate role only
router.use(authenticate, checkRole(['ADVOCATE']));

/**
 * @route   GET /api/advocate/portal
 * @desc    Get advocate portal information
 * @access  Private (Advocate)
 */
router.get('/portal', async (req, res, next) => {
  try {
    const portal = await prisma.advocatePortal.findUnique({
      where: { advocateId: req.user.userId },
    });
    res.json(portal || { message: 'No portal settings created yet.' });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/advocate/portal
 * @desc    Create or update advocate portal information
 * @access  Private (Advocate)
 */
router.post('/portal', async (req, res, next) => {
  try {
    const { portalName } = req.body;
    if (!portalName) {
      return res.status(400).json({ error: 'Portal name is required.' });
    }

    const portal = await prisma.advocatePortal.upsert({
      where: { advocateId: req.user.userId },
      update: { portalName },
      create: {
        advocateId: req.user.userId,
        portalName,
        nextPaymentDue: new Date(Date.now() + 30*24*60*60*1000), // Default 30 days due
      },
    });

    res.json({ message: 'Advocate portal settings saved successfully.', portal });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/advocate/munshis
 * @desc    Get all Munshis hired under this Advocate
 * @access  Private (Advocate)
 */
router.get('/munshis', async (req, res, next) => {
  try {
    const munshis = await prisma.munshiAccount.findMany({
      where: { advocateId: req.user.userId },
      include: {
        munshi: {
          select: {
            id: true,
            name: true,
            email: true,
            isActive: true,
          },
        },
      },
    });
    res.json(munshis);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/advocate/munshis
 * @desc    Add/Hire a new Munshi user under the advocate's account
 * @access  Private (Advocate)
 */
router.post('/munshis', async (req, res, next) => {
  try {
    const { name, email, password, permissions } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    // Check if email already registered
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user and link to MunshiAccount in transaction
    const munshiUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: 'MUNSHI',
        },
      });

      const munshiAcc = await tx.munshiAccount.create({
        data: {
          munshiId: user.id,
          advocateId: req.user.userId,
          permissions: permissions || {},
        },
      });

      return { user, munshiAcc };
    });

    res.status(201).json({
      message: 'Munshi clerk hired successfully.',
      munshi: {
        id: munshiUser.user.id,
        name: munshiUser.user.name,
        email: munshiUser.user.email,
        permissions: munshiUser.munshiAcc.permissions,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/advocate/clients
 * @desc    Get all clients managed by this Advocate
 * @access  Private (Advocate)
 */
router.get('/clients', async (req, res, next) => {
  try {
    const clients = await prisma.client.findMany({
      where: { advocateId: req.user.userId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(clients);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/advocate/clients
 * @desc    Add a new Client case profile
 * @access  Private (Advocate)
 */
router.post('/clients', async (req, res, next) => {
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
        advocateId: req.user.userId,
        addedBy: req.user.userId,
      },
    });

    res.status(201).json({ message: 'Client added successfully.', client });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/advocate/payments
 * @desc    Get payment invoice history for advocate's subscription
 * @access  Private (Advocate)
 */
router.get('/payments', async (req, res, next) => {
  try {
    const payments = await prisma.payment.findMany({
      where: { advocateId: req.user.userId },
      orderBy: { dueDate: 'desc' },
    });
    res.json(payments);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
