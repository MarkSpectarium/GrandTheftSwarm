/**
 * Vercel Serverless Function Entry Point
 * Uses pre-compiled API from packages/api/dist
 */
import app from '../packages/api/dist/packages/api/src/index.js';

export default function handler(req, res) {
  return app(req, res);
}
