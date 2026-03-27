import dotenv from 'dotenv';

// Load environment variables first
dotenv.config();

import express from 'express';
import cors from 'cors';
import productRoutes from './routes/products.ts';
import woocommerceRoutes from './routes/woocommerce.ts';
import imagesRoutes from './routes/images.ts';
import recommendationsRoutes from './routes/recommendations.ts';
import storeRoutes from './routes/store.ts';
import analyticsRoutes from './routes/analytics.ts';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

console.log('Registering routes...');
app.use('/api', productRoutes);
console.log('✓ Product routes registered');
app.use('/api', woocommerceRoutes);
console.log('✓ Woocommerce routes registered');
app.use('/api', imagesRoutes);
console.log('✓ Images routes registered');
app.use('/api', recommendationsRoutes);
console.log('✓ Recommendations routes registered');
app.use('/api', storeRoutes);
console.log('✓ Store routes registered');
app.use('/api', analyticsRoutes);
console.log('✓ Analytics routes registered');

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Stylique Virtual Try-On API is running',
    timestamp: new Date().toISOString(),
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
});

// Handle server errors
server.on('error', (error: any) => {
  console.error('Server error:', error);
  process.exit(1);
});

process.on('uncaughtException', (error: any) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason: any) => {
  console.error('Unhandled rejection:', reason);
  process.exit(1);
});
