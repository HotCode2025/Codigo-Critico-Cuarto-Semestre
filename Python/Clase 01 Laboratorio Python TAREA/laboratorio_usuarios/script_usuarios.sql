-- Creación de la base de datos (Opcional, el profesor puede usar una existente)
-- CREATE DATABASE test_db;

-- 1. Creación de la tabla 'usuario'
CREATE TABLE usuario (
    id_usuario SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    password VARCHAR(50) NOT NULL
);

-- 2. Inserción de datos de prueba (Actualizado a tu base actual)
-- Nota: Al usar SERIAL, los IDs se generarán automáticamente como 1, 2, 3, 4, 5
-- al ejecutar el script por primera vez.
INSERT INTO usuario (username, password) VALUES ('dperez', '1235');
INSERT INTO usuario (username, password) VALUES ('arielmazara', 'du35036739');
INSERT INTO usuario (username, password) VALUES ('avzuniga', '013');
INSERT INTO usuario (username, password) VALUES ('lgomez', '456');
INSERT INTO usuario (username, password) VALUES ('arielmaz', '739');