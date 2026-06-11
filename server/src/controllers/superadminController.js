const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');

// Configure Cloudinary if credentials are set in environment
const isCloudinaryConfigured = 
  process.env.CLOUDINARY_CLOUD_NAME && 
  process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloudinary_cloud_name' &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_KEY !== 'your_cloudinary_api_key' &&
  process.env.CLOUDINARY_API_SECRET &&
  process.env.CLOUDINARY_API_SECRET !== 'your_cloudinary_api_secret';

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
}

// Global upload handler: Uploads to Cloudinary, or falls back to local public/uploads serving
const handleFileUpload = async (file, req, folderName = 'antigravity') => {
  if (isCloudinaryConfigured) {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: folderName },
        (error, result) => {
          if (error) return reject(new Error(`Cloudinary upload failed: ${error.message}`));
          resolve(result.secure_url);
        }
      );
      uploadStream.end(file.buffer);
    });
  } else {
    const uploadsDir = path.join(__dirname, '../../public/uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    const filename = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    const filePath = path.join(uploadsDir, filename);
    
    await fs.promises.writeFile(filePath, file.buffer);
    
    const protocol = req.protocol;
    const host = req.get('host');
    return `${protocol}://${host}/uploads/${filename}`;
  }
};


/**
 * Onboard a new Advocate (Lawyer) and create portal + initial invoice
 */
const createAdvocate = async (req, res, next) => {
  try {
    const { name, email, password, monthlyFee, portalName } = req.body;

    if (!name || !email || !password || monthlyFee === undefined || !portalName) {
      return res.status(400).json({ error: 'All fields (name, email, password, monthlyFee, portalName) are required.' });
    }

    // Verify email uniqueness
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'Email already registered.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const feeValue = parseFloat(monthlyFee);
    const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days due

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create User (ADVOCATE)
      const user = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: 'ADVOCATE',
          isActive: true
        }
      });

      // 2. Create Advocate Portal settings
      const portal = await tx.advocatePortal.create({
        data: {
          advocateId: user.id,
          portalName,
          subscriptionStatus: 'ACTIVE',
          monthlyFee: feeValue,
          nextPaymentDue: dueDate
        }
      });

      // 3. Create initial Payment record
      const payment = await tx.payment.create({
        data: {
          advocateId: user.id,
          amount: feeValue,
          status: 'PENDING',
          dueDate: dueDate
        }
      });

      return { user, portal, payment };
    });

    res.status(201).json({
      message: 'Advocate onboarding completed successfully.',
      advocate: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        role: result.user.role,
        isActive: result.user.isActive,
        portal: result.portal,
        initialPayment: result.payment
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * List all advocates with portals and payments
 */
const listAdvocates = async (req, res, next) => {
  try {
    const advocates = await prisma.user.findMany({
      where: { role: 'ADVOCATE' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        profilePicture: true,
        isActive: true,
        createdAt: true,
        portal: {
          select: {
            id: true,
            portalName: true,
            subscriptionStatus: true,
            monthlyFee: true,
            nextPaymentDue: true
          }
        },
        payments: {
          select: {
            id: true,
            amount: true,
            status: true,
            dueDate: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(advocates);
  } catch (error) {
    next(error);
  }
};

/**
 * Get single advocate details (profile, portal, payments, munshis)
 */
const getAdvocateDetails = async (req, res, next) => {
  try {
    const { id } = req.params;

    const advocate = await prisma.user.findFirst({
      where: { id, role: 'ADVOCATE' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        profilePicture: true,
        isActive: true,
        createdAt: true,
        portal: true,
        payments: {
          orderBy: { dueDate: 'desc' }
        },
        munshis: {
          include: {
            munshi: {
              select: {
                id: true,
                name: true,
                email: true,
                isActive: true
              }
            }
          }
        }
      }
    });

    if (!advocate) {
      return res.status(404).json({ error: 'Advocate not found.' });
    }

    res.json(advocate);
  } catch (error) {
    next(error);
  }
};

/**
 * Update advocate profile, fee, and portal details
 */
const updateAdvocate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, password, monthlyFee, portalName } = req.body;

    const advocate = await prisma.user.findFirst({ where: { id, role: 'ADVOCATE' } });
    if (!advocate) {
      return res.status(404).json({ error: 'Advocate not found.' });
    }

    // Build update parameters
    const userUpdate = {};
    if (name) userUpdate.name = name;
    if (email) {
      if (email !== advocate.email) {
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
          return res.status(400).json({ error: 'Email already registered.' });
        }
      }
      userUpdate.email = email;
    }
    if (password) {
      userUpdate.password = await bcrypt.hash(password, 10);
    }

    const portalUpdate = {};
    if (portalName) portalUpdate.portalName = portalName;
    if (monthlyFee !== undefined) portalUpdate.monthlyFee = parseFloat(monthlyFee);

    const result = await prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id },
        data: userUpdate,
        select: { id: true, name: true, email: true, role: true }
      });

      const updatedPortal = await tx.advocatePortal.update({
        where: { advocateId: id },
        data: portalUpdate
      });

      return { user: updatedUser, portal: updatedPortal };
    });

    res.json({
      message: 'Advocate profile updated successfully.',
      advocate: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Soft delete an advocate (set isActive = false)
 */
const softDeleteAdvocate = async (req, res, next) => {
  try {
    const { id } = req.params;

    const advocate = await prisma.user.findFirst({ where: { id, role: 'ADVOCATE' } });
    if (!advocate) {
      return res.status(404).json({ error: 'Advocate not found.' });
    }

    await prisma.user.update({
      where: { id },
      data: { isActive: false }
    });

    res.json({ message: 'Advocate account soft-deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

/**
 * Pause advocate portal subscription and disable linked Munshi accounts
 */
const pausePortal = async (req, res, next) => {
  try {
    const { id } = req.params;

    const portal = await prisma.advocatePortal.findUnique({ where: { advocateId: id } });
    if (!portal) {
      return res.status(404).json({ error: 'Advocate portal not found.' });
    }

    await prisma.$transaction([
      prisma.advocatePortal.update({
        where: { advocateId: id },
        data: { subscriptionStatus: 'PAUSED' }
      }),
      prisma.munshiAccount.updateMany({
        where: { advocateId: id },
        data: { isActive: false }
      })
    ]);

    res.json({ message: 'Advocate portal subscription paused. Linked Munshi accounts disabled.' });
  } catch (error) {
    next(error);
  }
};

/**
 * Reactivate advocate portal subscription and enable linked Munshi accounts
 */
const activatePortal = async (req, res, next) => {
  try {
    const { id } = req.params;

    const portal = await prisma.advocatePortal.findUnique({ where: { advocateId: id } });
    if (!portal) {
      return res.status(404).json({ error: 'Advocate portal not found.' });
    }

    await prisma.$transaction([
      prisma.advocatePortal.update({
        where: { advocateId: id },
        data: { subscriptionStatus: 'ACTIVE' }
      }),
      prisma.munshiAccount.updateMany({
        where: { advocateId: id },
        data: { isActive: true }
      })
    ]);

    res.json({ message: 'Advocate portal subscription reactivated. Linked Munshi accounts enabled.' });
  } catch (error) {
    next(error);
  }
};

/**
 * Generate a temporary JWT session token for Advocate impersonation
 */
const generateAccessToken = async (req, res, next) => {
  try {
    const { id } = req.params;

    const advocate = await prisma.user.findFirst({ where: { id, role: 'ADVOCATE' } });
    if (!advocate) {
      return res.status(404).json({ error: 'Advocate not found.' });
    }

    // Generate standard Advocate token payload
    const token = jwt.sign(
      { userId: advocate.id, role: advocate.role, advocateId: null },
      process.env.JWT_SECRET || 'your_jwt_secret_key_here',
      { expiresIn: '1h' }
    );

    res.json({ token });
  } catch (error) {
    next(error);
  }
};
/**
 * Retrieve aggregated financial summary metrics
 */
const getFinancialSummary = async (req, res, next) => {
  try {
    const totalAdvocates = await prisma.user.count({ where: { role: 'ADVOCATE' } });
    const activeAdvocates = await prisma.user.count({ 
      where: { role: 'ADVOCATE', isActive: true, portal: { subscriptionStatus: 'ACTIVE' } } 
    });
    const pausedAdvocates = await prisma.user.count({ 
      where: { role: 'ADVOCATE', isActive: true, portal: { subscriptionStatus: 'PAUSED' } } 
    });

    const activePortals = await prisma.advocatePortal.findMany({
      where: { advocate: { isActive: true }, subscriptionStatus: 'ACTIVE' },
      select: { monthlyFee: true }
    });
    const totalMonthlyRevenue = activePortals.reduce((sum, p) => sum + p.monthlyFee, 0);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const collectedPayments = await prisma.payment.findMany({
      where: {
        status: 'PAID',
        paidAt: { gte: startOfMonth, lte: endOfMonth }
      },
      select: { amount: true }
    });
    const collectedThisMonth = collectedPayments.reduce((sum, p) => sum + p.amount, 0);

    const pendingPayments = await prisma.payment.findMany({
      where: {
        status: 'PENDING',
        dueDate: { gte: startOfMonth, lte: endOfMonth }
      },
      select: { amount: true }
    });
    const pendingThisMonth = pendingPayments.reduce((sum, p) => sum + p.amount, 0);

    const overduePaymentsList = await prisma.payment.findMany({
      where: {
        status: 'PENDING',
        dueDate: { lt: now }
      },
      select: { amount: true }
    });
    const overduePayments = overduePaymentsList.reduce((sum, p) => sum + p.amount, 0);

    const next30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const upcomingPaymentsList = await prisma.payment.findMany({
      where: {
        status: 'PENDING',
        dueDate: { gte: now, lte: next30Days }
      },
      include: {
        advocate: { select: { name: true } }
      },
      orderBy: { dueDate: 'asc' }
    });

    const upcomingPayments = upcomingPaymentsList.map(p => ({
      id: p.id,
      advocateName: p.advocate?.name || 'Unknown',
      amount: p.amount,
      dueDate: p.dueDate
    }));

    res.json({
      totalAdvocates,
      activeAdvocates,
      pausedAdvocates,
      totalMonthlyRevenue,
      collectedThisMonth,
      pendingThisMonth,
      overduePayments,
      upcomingPayments
    });
  } catch (error) {
    next(error);
  }
};

/**
 * List all payments with query parameters filters
 */
const listPayments = async (req, res, next) => {
  try {
    const { status, advocateId, month, year } = req.query;

    const where = {};
    if (status) where.status = status;
    if (advocateId) where.advocateId = advocateId;

    if (month && year) {
      const m = parseInt(month) - 1;
      const y = parseInt(year);
      const start = new Date(y, m, 1);
      const end = new Date(y, m + 1, 0, 23, 59, 59, 999);
      where.dueDate = { gte: start, lte: end };
    } else if (year) {
      const y = parseInt(year);
      const start = new Date(y, 0, 1);
      const end = new Date(y, 11, 31, 23, 59, 59, 999);
      where.dueDate = { gte: start, lte: end };
    }

    const payments = await prisma.payment.findMany({
      where,
      include: {
        advocate: { select: { name: true, email: true } }
      },
      orderBy: { dueDate: 'desc' }
    });

    res.json(payments);
  } catch (error) {
    next(error);
  }
};

/**
 * Mark a payment record as PAID and generate the next month invoice
 */
const markPaymentPaid = async (req, res, next) => {
  try {
    const { id } = req.params;

    const payment = await prisma.payment.findUnique({ where: { id } });
    if (!payment) {
      return res.status(404).json({ error: 'Payment invoice not found.' });
    }

    if (payment.status === 'PAID') {
      return res.status(400).json({ error: 'Payment invoice is already paid.' });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Mark as PAID
      const updatedPayment = await tx.payment.update({
        where: { id },
        data: {
          status: 'PAID',
          paidAt: new Date()
        },
        include: {
          advocate: { select: { name: true } }
        }
      });

      // 2. Fetch portal fee settings
      const portal = await tx.advocatePortal.findUnique({
        where: { advocateId: payment.advocateId }
      });
      const nextAmount = portal ? portal.monthlyFee : payment.amount;

      // 3. Calculate next cycle due date (30 days from previous due date)
      const nextDueDate = new Date(payment.dueDate.getTime() + 30 * 24 * 60 * 60 * 1000);

      // 4. Create next month's invoice record
      const nextPayment = await tx.payment.create({
        data: {
          advocateId: payment.advocateId,
          amount: nextAmount,
          status: 'PENDING',
          dueDate: nextDueDate
        }
      });

      return { updatedPayment, nextPayment };
    });

    res.json({
      message: 'Payment marked as paid. Next cycle invoice created successfully.',
      payment: result.updatedPayment,
      nextPayment: result.nextPayment
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieve site settings (logo and name)
 */
const getSiteSettings = async (req, res, next) => {
  try {
    let settings = await prisma.siteSettings.findFirst();
    if (!settings) {
      settings = await prisma.siteSettings.create({
        data: {
          siteName: 'Antigravity Suite',
          logoUrl: ''
        }
      });
    }
    res.json(settings);
  } catch (error) {
    next(error);
  }
};

/**
 * Update site settings siteName
 */
const updateSiteSettings = async (req, res, next) => {
  try {
    const { siteName, logoUrl } = req.body;
    if (!siteName) {
      return res.status(400).json({ error: 'Site brand name is required.' });
    }

    let settings = await prisma.siteSettings.findFirst();
    const dataToUpdate = { siteName };
    if (logoUrl !== undefined) {
      dataToUpdate.logoUrl = logoUrl;
    }

    if (settings) {
      settings = await prisma.siteSettings.update({
        where: { id: settings.id },
        data: dataToUpdate
      });
    } else {
      settings = await prisma.siteSettings.create({
        data: { siteName, logoUrl: logoUrl || '' }
      });
    }
    res.json({ message: 'Site settings updated successfully.', settings });
  } catch (error) {
    next(error);
  }
};

/**
 * Upload site logo and save to settings
 */
const uploadLogo = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No logo file provided.' });
    }

    const logoUrl = await handleFileUpload(req.file, req, 'branding');

    let settings = await prisma.siteSettings.findFirst();
    if (settings) {
      settings = await prisma.siteSettings.update({
        where: { id: settings.id },
        data: { logoUrl }
      });
    } else {
      settings = await prisma.siteSettings.create({
        data: { siteName: 'Antigravity Suite', logoUrl }
      });
    }

    res.json({ message: 'Site logo updated successfully.', logoUrl });
  } catch (error) {
    next(error);
  }
};

/**
 * Update SuperAdmin profile name and email
 */
const updateProfile = async (req, res, next) => {
  try {
    const { name, email } = req.body;
    const userId = req.user.userId;

    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required.' });
    }

    // Verify email uniqueness
    const existing = await prisma.user.findFirst({
      where: {
        email,
        NOT: { id: userId }
      }
    });

    if (existing) {
      return res.status(400).json({ error: 'Email already in use by another account.' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { name, email },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        profilePicture: true,
        isActive: true,
        createdAt: true
      }
    });

    res.json({ message: 'Profile details updated successfully.', user: updatedUser });
  } catch (error) {
    next(error);
  }
};

/**
 * Upload profile picture and update database
 */
const uploadProfilePicture = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided.' });
    }

    const profilePicture = await handleFileUpload(req.file, req, 'profiles');

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { profilePicture },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        profilePicture: true,
        isActive: true,
        createdAt: true
      }
    });

    res.json({ message: 'Profile picture updated successfully.', profilePicture, user: updatedUser });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createAdvocate,
  listAdvocates,
  getAdvocateDetails,
  updateAdvocate,
  softDeleteAdvocate,
  pausePortal,
  activatePortal,
  generateAccessToken,
  getFinancialSummary,
  listPayments,
  markPaymentPaid,
  getSiteSettings,
  updateSiteSettings,
  uploadLogo,
  updateProfile,
  uploadProfilePicture
};

