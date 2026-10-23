async function hola(nombre){  // convertimos la funcion hola en asincronza declarada
    return new Promise(function (resolve, reject) {
        setTimeout(function () {
            console.log('Hola '+nombre);
            resolve(nombre);
        }, 1000);
    });
    
}

function hablar(nombre){
    return new Promise( (resolve, reject) => { // usamos la sintaxis ES6
        setTimeout(function(){
            console.log('bla bla bla bla');
            resolve(nombre);
         }, 1000);
    });
    
}

function adios(nombre){
    return new Promise((resolve, reject) =>{
        setTimeout(function(){
            console.log('Adios ' +nombre);
            // resolve();
            reject('Hay un error');
        },1000);
    })
    
}


//await hola('Ariel');  // ESTO ES UNA MALA SINTAXIS

async function main(){
    await hola('Ariel');

}

main();