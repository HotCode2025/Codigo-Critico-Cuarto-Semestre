require('dotenv').config();
const app = require('./app');

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`🌾 AgroTech API escuchando en el puerto ${port}`));
