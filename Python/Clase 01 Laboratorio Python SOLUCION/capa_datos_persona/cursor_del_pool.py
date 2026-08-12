from logger_base import log
from conexion import Conexion


class CursorDelPool:
    def __init__(self):
        self._conexion = None
        self._cursor = None

    def __enter__(self):
        log.debug('Inicio del método with (__enter__)')
        self._conexion = Conexion.obtenerConexion()
        self._cursor = self._conexion.cursor()
        return self._cursor

    def __exit__(self, tipo_excepcion, valor_excepcion, detalle_excepcion):
        log.debug('Inicio del método with (__exit__)')
        if valor_excepcion:
            self._conexion.rollback()
            log.error(f'Excepción detectada, se hace rollback: {valor_excepcion}')
        else:
            self._conexion.commit()
            log.debug('Commit de la transacción')

        self._cursor.close()
        Conexion.liberarConexion(self._conexion)
        log.debug('Cursor cerrado y conexión liberada')

        # No suprimimos la excepción para que el DAO pueda manejarla
        return False