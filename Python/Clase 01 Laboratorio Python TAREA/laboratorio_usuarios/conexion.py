import logging
from psycopg2 import pool
from logger_base import logger

class Conexion:
    _DATABASE = 'test_db'
    _USERNAME = 'ariel'
    _PASSWORD = 'admin'      
    _DB_PORT = '5432'
    _HOST = '127.0.0.1'
    _MIN_CON = 1
    _MAX_CON = 5
    _pool = None

    @classmethod
    def obtenerPool(cls):
        if cls._pool is None:
            try:
                cls._pool = pool.SimpleConnectionPool(
                    cls._MIN_CON,
                    cls._MAX_CON,
                    host=cls._HOST,
                    user=cls._USERNAME,
                    password=cls._PASSWORD,
                    port=cls._DB_PORT,
                    database=cls._DATABASE
                )
                logger.debug(f'Pool creado exitosamente: {cls._pool}')
            except Exception as e:
                logger.error(f'Error al crear el pool de conexiones: {e}')
                raise
        return cls._pool

    @classmethod
    def obtenerConexion(cls):
        conexion = cls.obtenerPool().getconn()
        logger.debug(f'Conexión obtenida del pool: {conexion}')
        return conexion

    @classmethod
    def liberarConexion(cls, conexion):
        cls.obtenerPool().putconn(conexion)
        logger.debug(f'Conexión regresada al pool: {conexion}')

    @classmethod
    def cerrarConexiones(cls):
        cls.obtenerPool().closeall()
        logger.debug('Todas las conexiones del pool han sido cerradas')