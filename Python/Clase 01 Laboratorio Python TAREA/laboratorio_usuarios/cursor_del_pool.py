# Importamos la herramienta para registrar eventos (bitácora) y la clase que maneja las conexiones
from logger_base import logger
from conexion import Conexion

# Definimos la clase CursorDelPool, que sirve como un gestor automático (para usar con la orden 'with')
class CursorDelPool:
    # Método constructor que prepara las variables vacías al empezar
    def __init__(self):
        self._conexion = None  # Aquí guardaremos la conexión prestada
        self._cursor = None    # Aquí guardaremos el cursor para ejecutar las consultas SQL

    # Este método se ejecuta automáticamente cuando empieza el bloque 'with'
    def __enter__(self):
        logger.debug('Inicio del método with (__enter__)')
        # Pedimos prestada una conexión del pool
        self._conexion = Conexion.obtenerConexion()
        # Creamos el cursor usando esa conexión para poder hablar con la base de datos
        self._cursor = self._conexion.cursor()
        # Entregamos el cursor listo para usarse
        return self._cursor

    # Este método se ejecuta automáticamente al salir del bloque 'with', ya sea que todo salió bien o hubo un error
    def __exit__(self, tipo_excepcion, valor_excepcion, detalle_excepcion):
        logger.debug('Inicio del método with (__exit__)')

        # Revisamos si ocurrió algún problema o error dentro del bloque
        if valor_excepcion:
            # Si hubo un error, cancelamos los cambios para no dañar nada (hacemos un rollback)
            self._conexion.rollback()
            logger.error(f'Excepción detectada, se hace rollback: {valor_excepcion}')
        else:
            # Si todo salió bien, guardamos los cambios definitivamente en la base de datos (hacemos un commit)
            self._conexion.commit()
            logger.debug('Commit de la transacción')

        # Cerramos el cursor para liberar recursos
        self._cursor.close()
        # Devolvemos la conexión al pool para que otro pueda usarla
        Conexion.liberarConexion(self._conexion)
        logger.debug('Cursor cerrado y conexión liberada')

        # Devolvemos False para que el error no se oculte y pueda ser avisado si es necesario
        return False