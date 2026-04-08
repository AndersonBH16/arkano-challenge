import express from 'express';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req, res) => {
    res.send('Hola hola holaaa');
});

app.listen(PORT, () => {
    console.log(`Server run on http://localhost:${PORT}`);
});