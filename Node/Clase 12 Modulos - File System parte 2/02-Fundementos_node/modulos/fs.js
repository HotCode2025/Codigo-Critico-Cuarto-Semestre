const fs = require('fs');

// 1. Función para leer un archivo
function leer(ruta, cb){
    fs.readFile(ruta, (err, data) => {
        // Validamos si hay un error al leer
        if (err) {
            console.error("Hubo un error al leer el archivo:", err);
            return;
        }
        cb(data.toString());
    });
}

// 2. Función para escribir un archivo
function escribir(ruta, contenido, cb){
    fs.writeFile(ruta, contenido, function (err) {
        if (err) {
            console.log('No se ha podido escribir', err);
        } else {
            console.log('Se ha escrito correctamente');
        }
    });
}

//Tercero eliminamos el archivo1.txt
function borrar(ruta, cb){
    fs.unlink(ruta, cb); // eliminar de manera asincrona
}

borrar(`${__dirname}/archivo1.txt`, console.log);
//escribir(`${__dirname}/archivo1.txt`, 'Reescribimos el archivo', console.log); // si utilizo un archivo usado se borra lo viejo y coloca lo nuevo
//leer(`${__dirname}/archivo1.txt`, console.log);//Sintaxis ES6
