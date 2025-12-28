/**
 * Vercel Serverless Function Entry Point
 * Uses bundled API
 */
import app from './bundled.js';

export default function handler(req, res) {
  return app(req, res);
}
