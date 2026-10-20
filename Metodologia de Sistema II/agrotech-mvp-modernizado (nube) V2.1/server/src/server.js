require('dotenv').config();
const app = require('./app');
const { iniciarSchedulerCheques } = require('./jobs/cheques-scheduler');
const { iniciarSchedulerCertificaciones } = require('./jobs/certificaciones-scheduler');
const { iniciarSchedulerClima } = require('./jobs/clima-scheduler');

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`🌾 AgroTech API escuchando en el puerto ${port}`);
  iniciarSchedulerCheques();
  iniciarSchedulerCertificaciones();
  iniciarSchedulerClima();
});
