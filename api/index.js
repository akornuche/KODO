/**
 * Vercel Serverless Function
 * Main API entry point for KODO backend
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '.env.production' });

// Import Express app from server
const app = require('../server/app');

module.exports = app;
