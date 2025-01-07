const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// Example API route
app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello from the backend!' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
