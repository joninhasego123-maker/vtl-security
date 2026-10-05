const express = require('express');

const app = express();

app.get('/', (req, res) => {
    res.send('VTL Security Bot online!');
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌐 Keep Alive ativo na porta ${PORT}`);
});