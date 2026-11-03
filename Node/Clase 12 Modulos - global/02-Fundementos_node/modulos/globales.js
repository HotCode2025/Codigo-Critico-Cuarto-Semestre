// this === global = true

//Mostrar algo en consola
//console.log();

//Mostrar un mensaje en forma de error
//console.error();

//Ejecutar un codigo desspues de un intervalo de tiempo
//setTimeout(() => {});

//Ejecutar un codigo cada intervalo de tiempo
//setInterval(() => {});

//Da prioridad de ejecucion a una funcion asincronica
//setImmdiate(() => {}); // solo lo soporta Internet Explorer vesion 10

// Mas documentacion https://developer.mozilla.org/en-US/docs/Web/API/Window/setImmediate

//console.log(setInterval);

let i = 0;
let intervalo = setInterval(() => {
    console.log('Hola');
    if (i === 3){
        clearInterval(intervalo); // detenemos la funcion
    }
    i++;
}, 1000);

setImmediate(() => {
    console.log('Saludo Inmediato');
});

//require();

console.log(__filename);

// RESUMEN: Siempre es lo mejor evitar crear variables globales 

global.miVariable = 'mi variable global';
console.log(miVariable);