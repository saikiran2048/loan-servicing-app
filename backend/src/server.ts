import express from 'express';
import cors from 'cors';
import { env } from './config/env';

import registrationRouter from './routes/registration';
import authRouter from './routes/auth';
import dashboardRouter from './routes/dashboard';
import paymentRouter from './routes/payment';
import dueDateChangeRouter from './routes/dueDateChange';

const app = express();

app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(express.json());

// Render's free tier spins down on inactivity; this is a cheap target for a
// CI warm-up ping in Stage 7 to avoid the first real request timing out.
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use('/api/registration', registrationRouter);
app.use('/api/auth', authRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/payment', paymentRouter);
app.use('/api/due-date-change', dueDateChangeRouter);

// Centralized error handler — catches anything thrown/rejected in route
// handlers above (e.g. unexpected DB errors) so the process doesn't crash
// and the client gets a consistent JSON error shape instead of a raw stack.
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  // eslint-disable-next-line no-console
  console.error(err);
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
});

const port = Number(env.PORT);
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Backend listening on port ${port}`);
});

export default app;
