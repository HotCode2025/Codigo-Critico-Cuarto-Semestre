"""
personaje.py
------------
Acá están las clases de los objetos que se mueven en el juego:

    Personaje     -> mi nave (el caza TIE que manejo con el teclado)
    Enemigo       -> las naves ala-X que bajan desde arriba
    Laser         -> el disparo verde de mi nave (sube)
    LaserEnemigo  -> el disparo rojo de los enemigos (baja). HEREDA de Laser.

Cada clase tiene sus atributos (posición, imagen, velocidad...) y sus
métodos (mover, dibujar...). Eso es Programación Orientada a Objetos:
cada objeto sabe cómo comportarse y main.py solo le pide que lo haga.
"""
import pygame
import os  # Para armar las rutas a los archivos de imágenes
import random
from constantes import ASSETS_PATH, SCREEN_WIDTH, SCREEN_HEIGHT


def cargar_imagen(nombre, tamanio=None):
    """
    Carga una imagen de la carpeta assets/images y, si le paso un tamaño,
    la escala. La armé como función porque todas las clases la necesitan
    y así no repito el mismo código cuatro veces.
    """
    imagen = pygame.image.load(os.path.join(ASSETS_PATH, 'images', nombre)).convert_alpha()
    if tamanio:
        # smoothscale escala suavizando los bordes (scale a secas los deja pixelados)
        imagen = pygame.transform.smoothscale(imagen, tamanio)
    return imagen


class Personaje:
    """Mi nave. La controla el jugador."""

    def __init__(self, x, y):
        # Imagen de la nave escalada a 95 x 95 píxeles
        self.image = cargar_imagen('personaje1.png', (95, 95))
        # shape es el rectángulo de la nave: lo uso para moverla y para las colisiones
        self.shape = self.image.get_rect(center=(x, y))
        self.lasers = []             # Lista con los láseres que disparé y siguen en pantalla
        self.energia = 100           # Escudo de la nave: si llega a 0 pierdo
        self.velocidad = 6           # Píxeles que se mueve por frame
        self.cooldown_disparo = 250  # Milisegundos que tienen que pasar entre disparo y disparo
        self.ultimo_disparo = 0      # Momento (en ms) del último disparo
        self.invulnerable_hasta = 0  # Hasta qué momento no recibe daño (después de un golpe)

    def mover(self, dx, dy):
        """
        Mueve la nave. dx y dy valen -1, 0 o 1 (la dirección) y los
        multiplico por la velocidad para saber cuántos píxeles moverla.
        """
        self.shape.x += dx * self.velocidad
        self.shape.y += dy * self.velocidad
        # clamp_ip "encierra" el rectángulo dentro de la pantalla:
        # si me paso de un borde, me vuelve a poner adentro.
        self.shape.clamp_ip(pygame.Rect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT))

    def lanzar_laser(self):
        """
        Dispara solo si ya pasó el cooldown. Devuelve True si disparó
        (main.py lo usa para saber si tiene que reproducir el sonido).
        Sin el cooldown, al mantener apretado ESPACIO saldrían 60 láseres por segundo.
        """
        # get_ticks() devuelve los milisegundos que pasaron desde que arrancó el juego
        ahora = pygame.time.get_ticks()
        if ahora - self.ultimo_disparo < self.cooldown_disparo:
            return False
        self.ultimo_disparo = ahora
        # Disparo dos láseres, uno desde cada ala de la nave
        self.lasers.append(Laser(self.shape.centerx - 30, self.shape.top + 20))
        self.lasers.append(Laser(self.shape.centerx + 30, self.shape.top + 20))
        return True

    def recibir_dano(self, cantidad=10):
        """
        Le resta energía a la nave. Devuelve False si la nave fue destruida
        (energía en 0), o True si todavía sigue viva.
        """
        ahora = pygame.time.get_ticks()
        # Si todavía estoy en el tiempo de invulnerabilidad, el golpe no cuenta
        if ahora < self.invulnerable_hasta:
            return True
        # Después de un golpe tengo 1 segundo de invulnerabilidad.
        # Sin esto, si un enemigo me toca pierdo energía en TODOS los frames que dura el choque.
        self.invulnerable_hasta = ahora + 1000
        self.energia -= cantidad
        if self.energia <= 0:
            self.energia = 0
            return False
        return True

    def actualizar(self):
        """Mueve mis láseres y borra los que ya salieron de la pantalla."""
        # Recorro una COPIA de la lista ([:]) porque voy a borrar elementos.
        # Si borro de la misma lista que estoy recorriendo, el for se saltea elementos.
        for laser in self.lasers[:]:
            laser.mover()
            if laser.rect.bottom < 0:  # Salió por arriba de la pantalla
                self.lasers.remove(laser)

    def dibujar(self, screen):
        """Dibuja mis láseres y después la nave (así la nave queda por encima)."""
        for laser in self.lasers:
            laser.dibujar(screen)
        # Mientras soy invulnerable la nave parpadea: cada 100 ms se dibuja y
        # los otros 100 ms no. (ahora // 100) % 2 alterna entre 0 y 1.
        ahora = pygame.time.get_ticks()
        if ahora > self.invulnerable_hasta or (ahora // 100) % 2 == 0:
            screen.blit(self.image, self.shape.topleft)
        # La barra de energía la dibuja el HUD (hud.py), no la nave.


class Enemigo:
    """Nave enemiga que baja desde arriba y dispara."""

    # Igual que en Explosion: la imagen se carga una sola vez y la comparten todos los enemigos
    imagen_precargada = None

    def __init__(self, x, y, nivel=1):
        if Enemigo.imagen_precargada is None:
            Enemigo.imagen_precargada = cargar_imagen('enemigo1.png', (80, 80))
        self.image = Enemigo.imagen_precargada
        self.rect = self.image.get_rect(topleft=(x, y))
        # La dificultad sube con el nivel: los enemigos bajan más rápido,
        # se mueven más hacia los costados y disparan más seguido.
        # random.uniform(a, b) da un número decimal al azar entre a y b,
        # así no todos los enemigos se mueven igual.
        self.velocidad_y = random.uniform(1.5, 2.5) + nivel * 0.5
        # random.choice([-1, 1]) elige si arranca yendo a la izquierda o a la derecha
        self.velocidad_x = random.choice([-1, 1]) * random.uniform(0, 0.5 + nivel * 0.3)
        self.probabilidad_disparo = 0.004 + nivel * 0.002  # Probabilidad de disparar en cada frame

    def mover(self):
        """Baja y se mueve de costado. Si toca un borde, rebota."""
        self.rect.y += self.velocidad_y
        self.rect.x += self.velocidad_x
        # Al multiplicar por -1 la velocidad cambia de signo: si iba a la derecha, ahora va a la izquierda
        if self.rect.left < 0 or self.rect.right > SCREEN_WIDTH:
            self.velocidad_x *= -1

    def intentar_disparar(self):
        """
        Tira un "dado" en cada frame: si sale menor a la probabilidad, dispara.
        Devuelve un LaserEnemigo nuevo, o None si esta vez no disparó.
        """
        if random.random() < self.probabilidad_disparo:
            return LaserEnemigo(self.rect.centerx, self.rect.bottom)
        return None

    def dibujar(self, screen):
        screen.blit(self.image, self.rect.topleft)


class Laser:
    """Disparo de mi nave: sube en línea recta."""

    imagen_precargada = None

    def __init__(self, x, y):
        if Laser.imagen_precargada is None:
            Laser.imagen_precargada = cargar_imagen('laser.png')
        self.image = Laser.imagen_precargada
        self.rect = self.image.get_rect(center=(x, y))
        # En pygame el eje Y crece hacia ABAJO, por eso una velocidad negativa hace que suba
        self.velocidad = -10

    def mover(self):
        self.rect.y += self.velocidad

    def dibujar(self, screen):
        screen.blit(self.image, self.rect.topleft)


class LaserEnemigo(Laser):
    """
    Disparo de los enemigos. HEREDA de Laser: reutiliza los métodos mover()
    y dibujar() tal cual, y solo cambio la imagen y la velocidad.
    """

    # Tiene su propia imagen precargada (roja), distinta a la de Laser (verde)
    imagen_precargada = None

    def __init__(self, x, y):
        if LaserEnemigo.imagen_precargada is None:
            LaserEnemigo.imagen_precargada = cargar_imagen('laser_enemigo.png')
        self.image = LaserEnemigo.imagen_precargada
        self.rect = self.image.get_rect(center=(x, y))
        self.velocidad = 7  # Positiva: baja hacia mi nave
