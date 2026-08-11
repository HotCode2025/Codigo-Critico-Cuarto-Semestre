from usuario import Usuario
from cursor_del_pool import CursorDelPool
from logger_base import logger

class UsuarioDao:
    _SELECCIONAR = 'SELECT * FROM usuario ORDER BY id_usuario'
    _INSERTAR = 'INSERT INTO usuario(username, password) VALUES(%s, %s) RETURNING id_usuario'
    _ACTUALIZAR = 'UPDATE usuario SET username=%s, password=%s WHERE id_usuario=%s'
    _ELIMINAR = 'DELETE FROM usuario WHERE id_usuario=%s'

    @classmethod
    def seleccionar(cls):
        usuarios = []
        try:
            with CursorDelPool() as cursor:
                cursor.execute(cls._SELECCIONAR)
                registros = cursor.fetchall()
                for registro in registros:
                    usuario = Usuario(registro[0], registro[1], registro[2])
                    usuarios.append(usuario)
            logger.debug(f'Usuarios seleccionados: {len(usuarios)}')
        except Exception as e:
            logger.error(f'Error al seleccionar usuarios: {e}')
        return usuarios

    @classmethod
    def insertar(cls, usuario):
        try:
            with CursorDelPool() as cursor:
                valores = (usuario.username, usuario.password)
                cursor.execute(cls._INSERTAR, valores)
                # Recuperamos el id autogenerado por PostgreSQL
                id_usuario = cursor.fetchone()[0]
                usuario.id_usuario = id_usuario
                rowcount = cursor.rowcount
            logger.debug(f'Usuario insertado: {usuario}')
            return rowcount
        except Exception as e:
            logger.error(f'Error al insertar usuario: {e}')
            return 0

    @classmethod
    def actualizar(cls, usuario):
        try:
            with CursorDelPool() as cursor:
                valores = (usuario.username, usuario.password, usuario.id_usuario)
                cursor.execute(cls._ACTUALIZAR, valores)
                rowcount = cursor.rowcount
            logger.debug(f'Usuario actualizado: {usuario}')
            return rowcount
        except Exception as e:
            logger.error(f'Error al actualizar usuario: {e}')
            return 0

    @classmethod
    def eliminar(cls, usuario):
        try:
            with CursorDelPool() as cursor:
                valores = (usuario.id_usuario,)
                cursor.execute(cls._ELIMINAR, valores)
                rowcount = cursor.rowcount
            logger.debug(f'Usuario eliminado: {usuario}')
            return rowcount
        except Exception as e:
            logger.error(f'Error al eliminar usuario: {e}')
            return 0