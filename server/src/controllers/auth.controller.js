// server/src/controllers/auth.controller.js
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma.js';
import { config } from '../config/index.js';
import { AppError } from '../middleware/errorHandler.js';
import { validateEmail, validateRequired, validateString } from '../utils/validator.js';

/**
 * Helper to generate JWT token.
 */
function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    config.jwtSecret,
    { expiresIn: '7d' }
  );
}

/**
 * POST /api/auth/login
 * Authenticates user credentials and returns JWT token.
 */
export async function login(req, res, next) {
  try {
    const { email, password } = req.body || {};
    validateRequired(req.body || {}, ['email', 'password']);
    const normalizedEmail = validateEmail(email);

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      throw new AppError('Invalid email or password.', 401);
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new AppError('Invalid email or password.', 401);
    }

    const token = generateToken(user);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/register
 * Self-registration endpoint.
 * STRICT SECURITY: Rejects any attempt to self-assign the EDITOR role.
 */
export async function register(req, res, next) {
  try {
    const { name, email, password, role } = req.body || {};
    validateRequired(req.body || {}, ['name', 'email', 'password']);

    const validName = validateString(name, 'name', 2, 80);
    const normalizedEmail = validateEmail(email);
    const validPassword = validateString(password, 'password', 6, 128);

    // Privilege escalation protection
    if (role && role.toUpperCase() === 'EDITOR') {
      throw new AppError(
        'Privilege Escalation Prohibited: Public registration is restricted to WRITER role. Editor accounts must be provisioned internally.',
        403
      );
    }

    // Check existing email
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      throw new AppError('An account with this email address already exists.', 409);
    }

    const passwordHash = await bcrypt.hash(validPassword, 10);

    const user = await prisma.user.create({
      data: {
        name: validName,
        email: normalizedEmail,
        passwordHash,
        role: 'WRITER', // Strictly enforced
      },
    });

    const token = generateToken(user);

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/auth/me
 * Returns the currently authenticated user's profile and section assignments.
 */
export async function getProfile(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        ownedSections: {
          where: { isArchived: false },
          select: { id: true, name: true, description: true },
        },
        sectionAssignments: {
          include: {
            section: {
              select: { id: true, name: true, description: true, isArchived: true },
            },
          },
        },
      },
    });

    if (!user) {
      throw new AppError('User profile not found.', 404);
    }

    res.json(user);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/auth/demo-accounts
 * Lists seeded demo credentials for reviewers.
 */
export async function getDemoAccounts(req, res, next) {
  try {
    const accounts = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
    });

    res.json({
      accounts,
      defaultPassword: 'password123',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/logout
 * Client-side session termination confirmation.
 */
export function logout(req, res) {
  res.json({ message: 'Session terminated successfully.' });
}
