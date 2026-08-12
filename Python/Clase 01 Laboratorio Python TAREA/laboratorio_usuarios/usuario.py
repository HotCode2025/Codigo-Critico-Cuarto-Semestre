# Importamos nuestra herramienta de bitácora, por si en el futuro necesitamos anotar errores aquí
from logger_base import logger

# Creamos el "molde" o plantilla para fabricar usuarios en nuestro sistema
class Usuario:
    # Este es el constructor, la función que se ejecuta automáticamente al crear un nuevo usuario
    # Le podemos pasar el id, el nombre (username) y la contraseña (password), o dejarlos vacíos (None) por defecto
    def __init__(self, id_usuario=None, username=None, password=None):
        # Guardamos los datos que nos pasaron dentro del usuario
        # El guion bajo (_) al principio le avisa a otros programadores que son datos "privados" o protegidos
        self._id_usuario = id_usuario
        self._username = username
        self._password = password

    # El decorador @property actúa como un "visor"
    # Nos permite leer el valor del ID protegido desde afuera del molde
    @property
    def id_usuario(self):
        return self._id_usuario

    # El decorador .setter actúa como un "modificador"
    # Nos permite cambiar o actualizar el ID protegido de forma segura
    @id_usuario.setter
    def id_usuario(self, id_usuario):
        self._id_usuario = id_usuario

    # Visor para ver el nombre de usuario (username)
    @property
    def username(self):
        return self._username

    # Modificador para cambiar el nombre de usuario
    @username.setter
    def username(self, username):
        self._username = username

    # Visor para ver la contraseña (password)
    @property
    def password(self):
        return self._password

    # Modificador para cambiar la contraseña
    @password.setter
    def password(self, password):
        self._password = password

    # Esta función especial define cómo se va a mostrar nuestro usuario si usamos la función print()
    # Devuelve un texto ordenado con todos los datos del usuario para que sea muy fácil de leer en la pantalla
    def __str__(self):
        return f'Usuario [id_usuario: {self._id_usuario}, username: {self._username}, password: {self._password}]'