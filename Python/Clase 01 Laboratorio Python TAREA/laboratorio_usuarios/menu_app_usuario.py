from usuario import Usuario
from usuario_dao import UsuarioDao
from logger_base import logger

def mostrar_menu():
    print('\n========== MENÚ DE USUARIOS ==========')
    print('1) Listar usuarios')
    print('2) Agregar usuario')
    print('3) Actualizar usuario')
    print('4) Eliminar usuario')
    print('5) Salir')
    print('=======================================')

def listar_usuarios():
    print('\n--- Listado de Usuarios ---')
    try:
        usuarios = UsuarioDao.seleccionar()
        if usuarios:
            for usuario in usuarios:
                print(usuario)
        else:
            print('No hay usuarios registrados.')
    except Exception as e:
        logger.error(f'Error en listar usuarios: {e}')
        print(f'Ocurrió un error al listar: {e}')

def agregar_usuario():
    print('\n--- Agregar Usuario ---')
    try:
        username = input('Ingrese el username: ')
        password = input('Ingrese el password: ')
        usuario = Usuario(username=username, password=password)
        registros = UsuarioDao.insertar(usuario)
        print(f'Usuarios insertados: {registros}')
    except Exception as e:
        logger.error(f'Error en agregar usuario: {e}')
        print(f'Ocurrió un error al agregar: {e}')

def actualizar_usuario():
    print('\n--- Actualizar Usuario ---')
    try:
        id_usuario = int(input('Ingrese el id del usuario a actualizar: '))
        username = input('Ingrese el nuevo username: ')
        password = input('Ingrese el nuevo password: ')
        usuario = Usuario(id_usuario=id_usuario, username=username, password=password)
        registros = UsuarioDao.actualizar(usuario)
        print(f'Usuarios actualizados: {registros}')
    except ValueError:
        logger.error('El usuario ingresó un id no numérico')
        print('Error: El ID debe ser un número entero.')
    except Exception as e:
        logger.error(f'Error en actualizar usuario: {e}')
        print(f'Ocurrió un error al actualizar: {e}')

def eliminar_usuario():
    print('\n--- Eliminar Usuario ---')
    try:
        id_usuario = int(input('Ingrese el id del usuario a eliminar: '))
        usuario = Usuario(id_usuario=id_usuario)
        registros = UsuarioDao.eliminar(usuario)
        print(f'Usuarios eliminados: {registros}')
    except ValueError:
        logger.error('El usuario ingresó un id no numérico')
        print('Error: El ID debe ser un número entero.')
    except Exception as e:
        logger.error(f'Error en eliminar usuario: {e}')
        print(f'Ocurrió un error al eliminar: {e}')

def main():
    opcion = None
    while opcion != 5:
        try:
            mostrar_menu()
            opcion = int(input('Elija una opción (1-5): '))

            if opcion == 1:
                listar_usuarios()
            elif opcion == 2:
                agregar_usuario()
            elif opcion == 3:
                actualizar_usuario()
            elif opcion == 4:
                eliminar_usuario()
            elif opcion == 5:
                print('Saliendo del sistema...')
            else:
                print('Opción no válida. Intente nuevamente.')
        except ValueError:
            print('Error: Debe ingresar un número válido.')
            logger.error('El usuario ingresó un valor no numérico en el menú')
        except Exception as e:
            print(f'Ocurrió un error inesperado: {e}')
            logger.error(f'Error inesperado en el menú: {e}')

    print('¡Hasta luego!')

if __name__ == '__main__':
    main()