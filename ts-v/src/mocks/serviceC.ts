import express, { Request, Response } from 'express';

const app = express();
const port = 3001;

app.use(express.json());
app.use((req: Request, res: Response) => {
    console.log(`[Service C] Received ${req.method} request for ${req.url}`);
    res.status(200).json({
        service: 'C',
        method: req.method,
        path: req.path,
        query: req.query,
        body: req.body
    });
});

app.listen(port, () => {
    console.log(`Service C listening at http://localhost:${port}`);
});
