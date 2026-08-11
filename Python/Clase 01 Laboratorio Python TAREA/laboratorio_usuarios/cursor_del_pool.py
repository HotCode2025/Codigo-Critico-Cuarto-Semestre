from logger_base import logger
from conexion import Conexion


class CursorDelPool:
    def __init__(self):
        self._conexion = None
        self._cursor = None

    def __enter__(self):
        logger.debug('Inicio del método with (__enter__)')
        self._conexion = Conexion.obtenerConexion()
        self._cursor = self._conexion.cursor()
        return self._cursor

    def __exit__(self, tipo_excepcion, valor_excepcion, detalle_excepcion):
        logger.debug('Inicio del método with (__exit__)')
        if valor_excepcion:
            self._conexion.rollback()
            logger.error(f'Excepción detectada, se hace rollback: {valor_excepcion}')
        else:
            self._conexion.commit()
            logger.debug('Commit de la transacción')

        self._cursor.close()
        Conexion.liberarConexion(self._conexion)
        logger.debug('Cursor cerrado y conexión liberada')

        # No suprimimos la excepción para que el DAO pueda manejarla
        return False