import express from 'express';

const app = express();
const PORT = 3000;

app.use(express.json());

// ---------- In-memory data store ----------
const accounts = [];
let nextId = 1;

// ---------- Helpers ----------
const createError = (status, message) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

const getAccountOrFail = (id, label = 'Account') => {
  const account = accounts.find((a) => a.id === Number(id));
  if (!account) throw createError(404, `${label} not found`);
  return account;
};

const validateAmount = (amount) => {
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
    throw createError(400, 'Amount must be a positive number');
  }
};

// ---------- Routes ----------
app.get('/', (req, res) => {
  res.json({ message: 'Bank API is running' });
});

// Create an account
app.post('/accounts', (req, res) => {
  const { owner, balance = 0 } = req.body ?? {};

  if (typeof owner !== 'string' || !owner.trim()) {
    throw createError(400, 'Owner name is required');
  }
  if (typeof balance !== 'number' || balance < 0) {
    throw createError(400, 'Starting balance must be 0 or more');
  }

  const account = { id: nextId++, owner: owner.trim(), balance };
  accounts.push(account);
  res.status(201).json(account);
});

// List all accounts
app.get('/accounts', (req, res) => {
  res.json(accounts);
});

// Get one account
app.get('/accounts/:id', (req, res) => {
  res.json(getAccountOrFail(req.params.id));
});

// Deposit
app.post('/accounts/:id/deposit', (req, res) => {
  const account = getAccountOrFail(req.params.id);
  const { amount } = req.body ?? {};
  validateAmount(amount);

  account.balance += amount;
  res.json(account);
});

// Withdraw
app.post('/accounts/:id/withdraw', (req, res) => {
  const account = getAccountOrFail(req.params.id);
  const { amount } = req.body ?? {};
  validateAmount(amount);

  if (account.balance < amount) {
    throw createError(400, 'Insufficient funds');
  }

  account.balance -= amount;
  res.json(account);
});

// Transfer between accounts
app.post('/transfer', (req, res) => {
  const { from, to, amount } = req.body ?? {};

  if (from === undefined || to === undefined) {
    throw createError(400, 'Both "from" and "to" account ids are required');
  }
  if (Number(from) === Number(to)) {
    throw createError(400, 'Cannot transfer to the same account');
  }
  validateAmount(amount);

  const sender = getAccountOrFail(from, 'Sender account');
  const receiver = getAccountOrFail(to, 'Receiver account');

  if (sender.balance < amount) {
    throw createError(400, 'Insufficient funds');
  }

  sender.balance -= amount;
  receiver.balance += amount;
  res.json({ message: 'Transfer successful', from: sender, to: receiver });
});

// Delete an account
app.delete('/accounts/:id', (req, res) => {
  const account = getAccountOrFail(req.params.id);
  accounts.splice(accounts.indexOf(account), 1);
  res.json({ message: 'Account deleted' });
});

// ---------- 404 handler ----------
app.use((req, res, next) => {
  next(createError(404, 'Route not found'));
});

// ---------- Error-handling middleware ----------
// Must have exactly 4 parameters so Express treats it as an error handler.
app.use((err, req, res, next) => {
  const status = err.status || 500;
  res.status(status).json({
    error: status === 500 ? 'Internal Server Error' : err.message,
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});