/**
 * Vercel Serverless Function - Main API entry point for KODO backend
 */

// Load environment variables first
require('dotenv').config();

// Import and export the Express app from server
const app = require('../server/app');

module.exports = app;
