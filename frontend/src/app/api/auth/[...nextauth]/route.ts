/**
 * NextAuth API Route Handler
 *
 * Handles all /api/auth/* routes (signin, signout, session, csrf, etc.)
 */
import { handlers } from '@/lib/auth';

export const { GET, POST } = handlers;
