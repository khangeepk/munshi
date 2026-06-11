const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate, checkRole } = require('../middleware/authMiddleware');
const { uploadLogo, uploadProfilePicture } = require('../middleware/uploadMiddleware');
const superadminController = require('../controllers/superadminController');

const prisma = new PrismaClient();

// Publicly accessible site settings for login page branding
router.get('/settings/site', superadminController.getSiteSettings);

// Secure all routes below to SuperAdmin role only
router.use(authenticate, checkRole(['SUPERADMIN']));

/**
 * @route   GET /api/superadmin/settings
 * @desc    Get SaaS global application site settings
 * @access  Private (SuperAdmin)
 */
router.get('/settings', async (req, res, next) => {
  try {
    let settings = await prisma.siteSettings.findFirst();
    if (!settings) {
      // Create default settings if not exists
      settings = await prisma.siteSettings.create({
        data: {
          siteName: 'Antigravity Suite',
          logoUrl: '',
        },
      });
    }
    res.json(settings);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/superadmin/settings
 * @desc    Update SaaS global site settings
 * @access  Private (SuperAdmin)
 */
router.put('/settings', async (req, res, next) => {
  try {
    const { siteName, logoUrl } = req.body;
    let settings = await prisma.siteSettings.findFirst();

    if (settings) {
      settings = await prisma.siteSettings.update({
        where: { id: settings.id },
        data: { siteName, logoUrl },
      });
    } else {
      settings = await prisma.siteSettings.create({
        data: { siteName, logoUrl },
      });
    }
    res.json({ message: 'Settings updated successfully.', settings });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/superadmin/portals
 * @desc    Get all Advocate tenant portals and subscription status
 * @access  Private (SuperAdmin)
 */
router.get('/portals', async (req, res, next) => {
  try {
    const portals = await prisma.advocatePortal.findMany({
      include: {
        advocate: {
          select: {
            name: true,
            email: true,
            isActive: true,
          },
        },
      },
    });
    res.json(portals);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/superadmin/users/:id/toggle-active
 * @desc    Activate or deactivate any user account
 * @access  Private (SuperAdmin)
 */
router.post('/users/:id/toggle-active', async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { isActive: !user.isActive },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    res.json({
      message: `User account is now ${updatedUser.isActive ? 'Active' : 'Inactive'}.`,
      user: updatedUser,
    });
  } catch (error) {
    next(error);
  }
});

// Advocate Portal Management Routes
router.post('/advocates', superadminController.createAdvocate);
router.get('/advocates', superadminController.listAdvocates);
router.get('/advocates/:id', superadminController.getAdvocateDetails);
router.put('/advocates/:id', superadminController.updateAdvocate);
router.delete('/advocates/:id', superadminController.softDeleteAdvocate);
router.post('/advocates/:id/pause', superadminController.pausePortal);
router.post('/advocates/:id/activate', superadminController.activatePortal);
router.get('/advocates/:id/access-token', superadminController.generateAccessToken);

// Financial Management Routes
router.get('/financials/summary', superadminController.getFinancialSummary);
router.get('/financials/payments', superadminController.listPayments);
router.post('/financials/payments/:id/mark-paid', superadminController.markPaymentPaid);

// Settings and Profile Management Routes
router.put('/settings/site', superadminController.updateSiteSettings);
router.post('/settings/logo', uploadLogo, superadminController.uploadLogo);
router.put('/settings/profile', superadminController.updateProfile);
router.post('/settings/profile-picture', uploadProfilePicture, superadminController.uploadProfilePicture);

module.exports = router;
