import jwt from 'jsonwebtoken';
import { JWT_SECRET, JWT_EXPIRY, API_SHARED_SECRET } from '../config/constants.js';

export class TokenService {
  /**
   * Verify an API shared secret (used by admin backend when requesting tokens).
   */
  verifyApiSecret(secret) {
    if (!API_SHARED_SECRET) return true; // No secret configured = open (dev mode)
    return secret === API_SHARED_SECRET;
  }

  /**
   * Generate a JWT for a meeting participant.
   * @param {{ userId: string, displayName: string, role: 'trainer'|'candidate', roomId: string }} payload
   * @returns {string} signed JWT
   */
  generateToken({ userId, displayName, role, roomId }) {
    return jwt.sign(
      { userId, displayName, role, roomId },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY, subject: userId }
    );
  }

  /**
   * Verify and decode a participant JWT.
   * @param {string} token
   * @returns {{ userId: string, displayName: string, role: 'trainer'|'candidate', roomId: string } | null}
   */
  verifyToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch {
      return null;
    }
  }
}
