"""
constantes.py
-------------
Acá junto los valores fijos que usan varios archivos del juego.
Si los tengo en un solo lugar, cuando quiero cambiar algo (por ejemplo el
tamaño de la pantalla) lo cambio una vez y se actualiza en todo el proyecto.
Por convención, las constantes en Python se escriben en MAYÚSCULAS.
"""
import os

# Dimensión de la pantalla: el ancho y el alto del "lienzo" donde dibujo el juego.
# Aunque la ventana se agrande (ver crear_ventana() en main.py), toda la lógica
# trabaja siempre con estas medidas de 800 x 600 píxeles.
SCREEN_WIDTH = 800
SCREEN_HEIGHT = 600

# Color del láser en formato RGB (rojo, verde, azul), cada valor de 0 a 255.
# Era el color que usaba cuando el láser se dibujaba como un rectángulo;
# ahora el láser es una imagen (assets/images/laser.png), así que no se usa más.
COLOR_LASER = (0, 0, 255)  # color azul

# Ruta a la carpeta assets.
# __file__ es la ruta de este archivo, y os.path.dirname() me da su carpeta.
# Así el juego encuentra las imágenes y sonidos sin importar desde qué carpeta
# lo ejecute, y os.path.join() arma la ruta con la barra correcta para
# Windows (\) o Linux (/).
ASSETS_PATH = os.path.join(os.path.dirname(__file__), 'assets')
