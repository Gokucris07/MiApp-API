import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import storesRoutes from './routes/stores.routes';
import membershipsRoutes from './routes/memberships.routes';
import transactionsRoutes from './routes/transactions.routes';
import ticketsRoutes from './routes/tickets.routes';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Rutas
app.use('/auth', authRoutes);
app.use('/stores', storesRoutes);
app.use('/memberships', membershipsRoutes);
app.use('/transactions', transactionsRoutes);
app.use('/tickets', ticketsRoutes);
// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 ScanEat API corriendo en http://localhost:${PORT}`);
});

export default app;