const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const protectedRoutes = require('./routes/protected');


const app = express();
app.use(cors());
app.use(express.json()); // <-- VERY IMPORTANT

app.use('/api/auth', authRoutes); // <-- Route for /api/auth/*
app.use('/api', protectedRoutes); // 👈 this line mounts /api/dashboard etc.

app.get('/', (req, res) => res.send('Kodo API running'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
