const fs = require('fs');

// Primero leemos el archivo.txt
function leer(ruta, cb){
    fs.readFile(ruta, (err, data) => {
        // Validamos si hay un error
        if (err) {
            console.error("Hubo un error al leer el archivo:", err);
            return;
        }
        cb(data.toString());
    });
}

leer(`${__dirname}/archivo.txt`, console.log); //Sintaxis ES6