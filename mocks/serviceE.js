const express = require('express');
const app = express();
const port = 3003;

app.use(express.json());
app.use((req, res) => {
    console.log(`[Service E] Received ${req.method} request for ${req.url}`);
    res.status(200).json({
        service: 'E',
        method: req.method,
        path: req.path,
        query: req.query,
        body: req.body
    });
});

app.listen(port, () => {
    console.log(`Service E listening at http://localhost:${port}`);
});
