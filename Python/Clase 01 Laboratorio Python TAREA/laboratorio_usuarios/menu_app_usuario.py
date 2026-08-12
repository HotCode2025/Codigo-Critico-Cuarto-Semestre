# Importamos las herramientas que necesitamos de otros archivos de nuestro proyecto
# 'Usuario' es el molde para crear usuarios, 'UsuarioDao' es el trabajador que habla con la base de datos, y 'logger' es nuestra bitácora
from usuario import Usuario
from usuario_dao import UsuarioDao
from logger_base import logger

# Esta función simplemente dibuja en la pantalla las opciones que tiene el usuario, como un cartel
def mostrar_menu():
    print('\n========== MENÚ DE USUARIOS ==========')
    print('1) Listar usuarios')
    print('2) Agregar usuario')
    print('3) Actualizar usuario')
    print('4) Eliminar usuario')
    print('5) Salir')
    print('=======================================')

# Función para ver todos los usuarios que tenemos guardados
def listar_usuarios():
    print('\n--- Listado de Usuarios ---')
    # Usamos 'try' (intentar) por si algo sale mal al buscar en la base de datos
    try:
        # Le pedimos a nuestro trabajador (UsuarioDao) que traiga a todos los usuarios
        usuarios = UsuarioDao.seleccionar()
        # Si encontró usuarios, los mostramos uno por uno
        if usuarios:
            for usuario in usuarios:
                print(usuario)
        # Si la lista está vacía, avisamos
        else:
            print('No hay usuarios registrados.')
    # Si ocurre un error, lo anotamos en la bitácora (logger) y le avisamos al usuario
    except Exception as e:
        logger.error(f'Error en listar usuarios: {e}')
        print(f'Ocurrió un error al listar: {e}')

# Función para crear y guardar un usuario nuevo
def agregar_usuario():
    print('\n--- Agregar Usuario ---')
    try:
        # Le pedimos al usuario que escriba el nombre y la contraseña
        username = input('Ingrese el username: ')
        password = input('Ingrese el password: ')
        # Creamos un usuario nuevo con los datos que nos dieron
        usuario = Usuario(username=username, password=password)
        # Le decimos al trabajador (UsuarioDao) que lo guarde en la base de datos
        registros = UsuarioDao.insertar(usuario)
        print(f'Usuarios insertados: {registros}')
    except Exception as e:
        logger.error(f'Error en agregar usuario: {e}')
        print(f'Ocurrió un error al agregar: {e}')

# Función para modificar los datos de un usuario que ya existe
def actualizar_usuario():
    print('\n--- Actualizar Usuario ---')
    try:
        # Pedimos el número (ID) del usuario que queremos cambiar
        id_usuario = int(input('Ingrese el id del usuario a actualizar: '))
        # Pedimos los nuevos datos
        username = input('Ingrese el nuevo username: ')
        password = input('Ingrese el nuevo password: ')
        # Armamos el paquete con los datos actualizados
        usuario = Usuario(id_usuario=id_usuario, username=username, password=password)
        # El trabajador (UsuarioDao) hace el cambio en la base de datos
        registros = UsuarioDao.actualizar(usuario)
        print(f'Usuarios actualizados: {registros}')
    # Este 'except ValueError' es un escudo especial por si el usuario escribe letras en lugar de números para el ID
    except ValueError:
        logger.error('El usuario ingresó un id no numérico')
        print('Error: El ID debe ser un número entero.')
    # Escudo general para cualquier otro error
    except Exception as e:
        logger.error(f'Error en actualizar usuario: {e}')
        print(f'Ocurrió un error al actualizar: {e}')

# Función para borrar a un usuario del sistema
def eliminar_usuario():
    print('\n--- Eliminar Usuario ---')
    try:
        # Pedimos el número (ID) del usuario a borrar
        id_usuario = int(input('Ingrese el id del usuario a eliminar: '))
        # Preparamos al usuario indicando solo su ID
        usuario = Usuario(id_usuario=id_usuario)
        # El trabajador (UsuarioDao) lo borra de la base de datos
        registros = UsuarioDao.eliminar(usuario)
        print(f'Usuarios eliminados: {registros}')
    # Escudo para verificar que el ID ingresado sea un número
    except ValueError:
        logger.error('El usuario ingresó un id no numérico')
        print('Error: El ID debe ser un número entero.')
    except Exception as e:
        logger.error(f'Error en eliminar usuario: {e}')
        print(f'Ocurrió un error al eliminar: {e}')

# Esta es la función principal, el "motor" que hace funcionar todo el programa
def main():
    opcion = None
    # Creamos un ciclo que se repetirá una y otra vez MIENTRAS la opción elegida no sea 5 (Salir)
    while opcion != 5:
        try:
            # Mostramos el menú
            mostrar_menu()
            # Leemos la opción que eligió el usuario
            opcion = int(input('Elija una opción (1-5): '))

            # Según el número elegido, llamamos a la función correspondiente
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
                # Si pone un número fuera del 1 al 5, le avisamos
                print('Opción no válida. Intente nuevamente.')
        # Si escribe una letra en el menú principal en lugar de un número, lo atajamos aquí
        except ValueError:
            print('Error: Debe ingresar un número válido.')
            logger.error('El usuario ingresó un valor no numérico en el menú')
        except Exception as e:
            print(f'Ocurrió un error inesperado: {e}')
            logger.error(f'Error inesperado en el menú: {e}')

    # Mensaje de despedida cuando el ciclo termina (eligió 5)
    print('¡Hasta luego!')

# Este pequeño truco le dice a Python que, si ejecutamos este archivo directamente, arranque encendiendo el "motor" (la función main)
if __name__ == '__main__':
    main()