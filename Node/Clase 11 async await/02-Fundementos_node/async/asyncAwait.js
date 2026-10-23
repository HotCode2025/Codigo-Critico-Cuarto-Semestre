// La palabra async no es necesaria en las funciones, porque ya son asincronas
//Igual proyectan una sincronia visual
function hola(nombre){ 
    return new Promise(function (resolve, reject) {
        setTimeout(function () {
            console.log('Hola '+nombre);
            resolve(nombre);
        }, 1000);
    });
}

function hablar(nombre){
    return new Promise( (resolve, reject) => { 
        setTimeout(function(){
            console.log('bla bla bla bla');
            resolve(nombre);
         }, 1000);
    });
}

function adios(nombre){
    return new Promise((resolve, reject) =>{
        setTimeout(function(){
            console.log('Adios ' + nombre);
            resolve(); // Habilitamos el resolve para que la promesa termine con éxito
            // reject('Hay un error'); // Comentamos el error
        },1000);
    });
}

async function main(){
    let nombre = await hola('Ariel');
    await hablar();
    await hablar();
    await hablar();
    await adios(nombre);
    console.log('Terminar el proceso...'); // Ahora esta línea se ejecutará correctamente
}

//console.log('Empezamos el proceso...');
//main();
//console.log('Esta va a ser la segunda instrucción');


// Código en ingles
// Es asincrono y retorna una promesa
function sayHello(name) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            console.log("Hello " + name);
            resolve(name);
        }, 1000);
    });
}

function talk(name) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            console.log("Bla bla bla bla");
            resolve(name);
        }, 1000);
    });
}

function sayBye(name) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            console.log("Goodbye " + name);
            resolve(name);
        }, 1000);
    });
}

async function conversation(name) {
    console.log('Code in english');
    console.log("Starting async process...");
    await sayHello(name);
    await talk();
    await talk();
    await talk();
    await sayBye(name);
    console.log("Process completed");
}

conversation("Ariel");