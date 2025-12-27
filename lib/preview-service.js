import { logger } from '@/lib/errors';

/**
 * Simplified preview service - stores sprite state in memory
 * Works without database setup while migration is being prepared
 */
class PreviewService {
  constructor() {
    this.sprites = new Map(); // In-memory sprite tracking
  }

  /**
   * Create preview session
   */
  createSession(userId, projectId) {
    const sessionId = `${userId}-${projectId}-${Date.now()}`;
    
    this.sprites.set(sessionId, {
      id: sessionId,
      userId,
      projectId,
      status: 'provisioning',
      createdAt: new Date(),
      previewUrl: null,
      port: null,
      error: null,
    });

    logger.info('[PreviewService] Created session', { sessionId });
    return sessionId;
  }

  /**
   * Get session
   */
  getSession(sessionId) {
    return this.sprites.get(sessionId);
  }

  /**
   * Update session
   */
  updateSession(sessionId, updates) {
    const session = this.sprites.get(sessionId);
    if (session) {
      Object.assign(session, updates);
      logger.info('[PreviewService] Updated session', { sessionId, updates });
    }
    return session;
  }

  /**
   * Destroy session
   */
  destroySession(sessionId) {
    this.sprites.delete(sessionId);
    logger.info('[PreviewService] Destroyed session', { sessionId });
  }

  /**
   * List user sessions
   */
  listSessions(userId) {
    return Array.from(this.sprites.values())
      .filter(s => s.userId === userId);
  }
}

const previewService = new PreviewService();
export default previewService;
