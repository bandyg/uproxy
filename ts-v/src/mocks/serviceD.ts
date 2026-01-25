import express, { Request, Response } from 'express';

const app = express();
const port = 3002;

app.use(express.json());
app.use((req: Request, res: Response) => {
    console.log(`[Service D] Received ${req.method} request for ${req.url}`);
    res.status(200).json({
        service: 'D',
        method: req.method,
        path: req.path,
        query: req.query,
        body: req.body
    });
});

app.listen(port, () => {
    console.log(`Service D listening at http://localhost:${port}`);
});
