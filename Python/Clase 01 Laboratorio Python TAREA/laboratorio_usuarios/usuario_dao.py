# Importamos el molde de usuario, el gestor de conexiones automáticas y la bitácora
from usuario import Usuario
from cursor_del_pool import CursorDelPool
from logger_base import logger

# Creamos la clase UsuarioDao (Data Access Object), que es la encargada de hablar con la base de datos
class UsuarioDao:
    # Definimos las consultas en SQL que vamos a usar para cada acción
    _SELECCIONAR = 'SELECT * FROM usuario ORDER BY id_usuario'
    _INSERTAR = 'INSERT INTO usuario(username, password) VALUES(%s, %s) RETURNING id_usuario'
    _ACTUALIZAR = 'UPDATE usuario SET username=%s, password=%s WHERE id_usuario=%s'
    _ELIMINAR = 'DELETE FROM usuario WHERE id_usuario=%s'

    # Método de clase para obtener y listar todos los usuarios de la base de datos
    @classmethod
    def seleccionar(cls):
        usuarios = []
        try:
            # Usamos el gestor de contexto para abrir la conexión y el cursor de forma segura
            with CursorDelPool() as cursor:
                # Ejecutamos la orden SQL para seleccionar a todos
                cursor.execute(cls._SELECCIONAR)
                # Traemos todos los registros encontrados
                registros = cursor.fetchall()
                # Recorremos cada registro para transformarlo en un objeto Usuario y guardarlo en la lista
                for registro in registros:
                    usuario = Usuario(registro[0], registro[1], registro[2])
                    usuarios.append(usuario)
            logger.debug(f'Usuarios seleccionados: {len(usuarios)}')
        except Exception as e:
            logger.error(f'Error al seleccionar usuarios: {e}')
        # Devolvemos la lista con todos los usuarios encontrados
        return usuarios

    # Método de clase para registrar un usuario nuevo en la base de datos
    @classmethod
    def insertar(cls, usuario):
        try:
            with CursorDelPool() as cursor:
                # Preparamos los datos del usuario que vamos a guardar
                valores = (usuario.username, usuario.password)
                # Ejecutamos la orden de inserción
                cursor.execute(cls._INSERTAR, valores)
                # Recuperamos el ID que la base de datos le asignó automáticamente de forma numérica
                id_usuario = cursor.fetchone()[0]
                usuario.id_usuario = id_usuario
                # Guardamos cuántas filas fueron afectadas (normalmente 1)
                rowcount = cursor.rowcount
            logger.debug(f'Usuario insertado: {usuario}')
            return rowcount
        except Exception as e:
            logger.error(f'Error al insertar usuario: {e}')
            return 0

    # Método de clase para actualizar el nombre o contraseña de un usuario existente
    @classmethod
    def actualizar(cls, usuario):
        try:
            with CursorDelPool() as cursor:
                # Preparamos los nuevos datos junto con el ID del usuario a modificar
                valores = (usuario.username, usuario.password, usuario.id_usuario)
                # Ejecutamos la orden de actualización en la base de datos
                cursor.execute(cls._ACTUALIZAR, valores)
                rowcount = cursor.rowcount
            logger.debug(f'Usuario actualizado: {usuario}')
            return rowcount
        except Exception as e:
            logger.error(f'Error al actualizar usuario: {e}')
            return 0

    # Método de clase para borrar un usuario utilizando su ID único
    @classmethod
    def eliminar(cls, usuario):
        try:
            with CursorDelPool() as cursor:
                # Tomamos el ID del usuario que queremos borrar
                valores = (usuario.id_usuario,)
                # Ejecutamos la orden de eliminación
                cursor.execute(cls._ELIMINAR, valores)
                rowcount = cursor.rowcount
            logger.debug(f'Usuario eliminado: {usuario}')
            return rowcount
        except Exception as e:
            logger.error(f'Error al eliminar usuario: {e}')
            return 0