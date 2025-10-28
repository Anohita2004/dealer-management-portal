const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.static(path.join(__dirname, 'webapp')));

app.listen(PORT, () => {
    console.log(`Frontend server is running on port ${PORT}`);
    console.log(`Open http://localhost:${PORT} to access the Dealer Management Portal`);
});

module.exports = app;
