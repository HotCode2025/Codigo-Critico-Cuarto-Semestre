# Importa el módulo estándar logging para registrar eventos, advertencias y errores
import logging
# Importa la clase pool de la librería psycopg2, la cual permite manejar un grupo (pool) de conexiones a PostgreSQL
from psycopg2 import pool
# Importa la instancia 'logger' desde un módulo personalizado llamado 'logger_base'
from logger_base import logger

# Define la clase Conexion, que se encargará de administrar el pool de conexiones a la base de datos
class Conexion:
    # Atributo de clase privado: define el nombre de la base de datos
    _DATABASE = 'test_db'
    # Atributo de clase privado: define el nombre del usuario de la base de datos
    _USERNAME = 'ariel'
    # Atributo de clase privado: define la contraseña del usuario
    _PASSWORD = 'admin'
    # Atributo de clase privado: define el puerto de PostgreSQL (5432 por defecto)
    _DB_PORT = '5432'
    # Atributo de clase privado: define la dirección del servidor (localhost en este caso)
    _HOST = '127.0.0.1'
    # Atributo de clase privado: número mínimo de conexiones abiertas que mantendrá el pool
    _MIN_CON = 1
    # Atributo de clase privado: número máximo de conexiones concurrentes permitidas en el pool
    _MAX_CON = 5
    # Atributo de clase privado: variable para almacenar la instancia del pool, se inicializa vacía (None)
    _pool = None

    # Decorador que indica que el siguiente método pertenece a la clase y no a una instancia (recibe 'cls' en vez de 'self')
    @classmethod
    # Método para instanciar el pool de conexiones si no existe, o devolverlo si ya fue creado
    def obtenerPool(cls):
        # Verifica si el atributo _pool aún está vacío (patrón Singleton para no crear múltiples pools)
        if cls._pool is None:
            # Inicia un bloque try para manejar posibles errores al intentar conectar a la base de datos
            try:
                # Crea la instancia del pool utilizando SimpleConnectionPool y la asigna a la variable de clase
                cls._pool = pool.SimpleConnectionPool(
                    cls._MIN_CON,           # Pasa el mínimo de conexiones requeridas
                    cls._MAX_CON,           # Pasa el máximo de conexiones permitidas
                    host=cls._HOST,         # Asigna la IP del host
                    user=cls._USERNAME,     # Asigna el usuario
                    password=cls._PASSWORD, # Asigna la contraseña
                    port=cls._DB_PORT,      # Asigna el puerto
                    database=cls._DATABASE  # Asigna el nombre de la base de datos
                )
                # Registra en el log (nivel debug) que el pool se creó de manera exitosa
                logger.debug(f'Pool creado exitosamente: {cls._pool}')
            # Captura cualquier excepción o error que ocurra durante la creación del pool
            except Exception as e:
                # Registra en el log (nivel error) el fallo detallado
                logger.error(f'Error al crear el pool de conexiones: {e}')
                # Vuelve a lanzar el error para que la aplicación no continúe fallando silenciosamente
                raise
        # Devuelve la instancia del pool de conexiones (recién creada o la ya existente)
        return cls._pool

    # Decorador para el método de clase encargado de solicitar una conexión individual
    @classmethod
    # Método que solicita y devuelve una conexión lista para usar desde el pool
    def obtenerConexion(cls):
        # Llama a obtenerPool() y extrae una conexión usando el método getconn()
        conexion = cls.obtenerPool().getconn()
        # Registra en el log que se ha retirado una conexión del pool
        logger.debug(f'Conexión obtenida del pool: {conexion}')
        # Devuelve el objeto de conexión al bloque de código que lo solicitó
        return conexion

    # Decorador para el método de clase encargado de devolver conexiones
    @classmethod
    # Método que recibe una conexión que ya fue utilizada y la reintegra al pool
    def liberarConexion(cls, conexion):
        # Llama al pool actual y devuelve la conexión mediante el método putconn()
        cls.obtenerPool().putconn(conexion)
        # Registra en el log que la conexión se ha liberado y está disponible de nuevo
        logger.debug(f'Conexión regresada al pool: {conexion}')

    # Decorador para el método de clase encargado de la limpieza final
    @classmethod
    # Método para cerrar de forma segura todas las conexiones activas en el pool
    def cerrarConexiones(cls):
        # Llama al pool actual y cierra todas las conexiones abiertas mediante closeall()
        cls.obtenerPool().closeall()
        # Registra en el log que todas las conexiones fueron cerradas
        logger.debug('Todas las conexiones del pool han sido cerradas')