import crypto from "crypto";

import type { CaptchaChallenge, CaptchaVerifyInput } from "@be-water/shared";

/**
 * Simple slider captcha service
 * In production, this should use a proper captcha service like reCAPTCHA or hCaptcha
 */
export class CaptchaService {
  private static challenges = new Map<string, CaptchaChallenge>();
  private static readonly CHALLENGE_TTL = 5 * 60 * 1000; // 5 minutes
  private static readonly TOLERANCE = 10; // pixels tolerance

  /**
   * Generate a new captcha challenge
   */
  static generateChallenge(): CaptchaChallenge {
    const id = crypto.randomUUID();
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + this.CHALLENGE_TTL).toISOString();

    // Generate random target position accounting for puzzle piece size (32px)
    // Valid range: 16-284 for x (300 - 32 = 268 range, centered at 150)
    // Valid range: 16-84 for y (100 - 32 = 68 range, centered at 50)
    const targetX = Math.floor(Math.random() * 268) + 16;
    const targetY = Math.floor(Math.random() * 68) + 16;

    const challenge: CaptchaChallenge = {
      id,
      token,
      expiresAt,
      targetX,
      targetY,
    };

    this.challenges.set(id, challenge);

    // Clean up expired challenges periodically
    this.cleanupExpiredChallenges();

    return challenge;
  }

  /**
   * Verify captcha response
   */
  static verify(input: CaptchaVerifyInput): boolean {
    const { id, token, x, y } = input;

    const challenge = this.challenges.get(id);

    if (!challenge) {
      return false;
    }

    // Check if challenge is expired
    if (new Date(challenge.expiresAt) < new Date()) {
      this.challenges.delete(id);
      return false;
    }

    // Verify token
    if (challenge.token !== token) {
      this.challenges.delete(id);
      return false;
    }

    // Verify slider position is within tolerance of target
    const xDiff = Math.abs(x - challenge.targetX);
    const yDiff = Math.abs(y - challenge.targetY);

    if (xDiff > this.TOLERANCE || yDiff > this.TOLERANCE) {
      this.challenges.delete(id);
      return false;
    }

    // Remove challenge after successful verification
    this.challenges.delete(id);

    return true;
  }

  /**
   * Clean up expired challenges
   */
  private static cleanupExpiredChallenges(): void {
    const now = new Date();
    for (const [id, challenge] of this.challenges.entries()) {
      if (new Date(challenge.expiresAt) < now) {
        this.challenges.delete(id);
      }
    }
  }

  /**
   * Get challenge by ID (for testing)
   */
  static getChallenge(id: string): CaptchaChallenge | undefined {
    return this.challenges.get(id);
  }

  /**
   * Clear all challenges (for testing)
   */
  static clearChallenges(): void {
    this.challenges.clear();
  }
}
