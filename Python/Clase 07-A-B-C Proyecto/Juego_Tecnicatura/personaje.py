import pygame
import os # Proporciona funcionalidades para interactuar con el sistema
import random
from constantes import ASSETS_PATH, SCREEN_WIDTH, SCREEN_HEIGHT


def cargar_imagen(nombre, tamanio=None):
    """Carga una imagen de assets/images y opcionalmente la escala."""
    imagen = pygame.image.load(os.path.join(ASSETS_PATH, 'images', nombre)).convert_alpha()
    if tamanio:
        imagen = pygame.transform.smoothscale(imagen, tamanio)
    return imagen


class Personaje:
    def __init__(self, x, y):
        # Construye la ruta a la imagen del personaje
        self.image = cargar_imagen('personaje1.png', (95, 95))
        self.shape = self.image.get_rect(center=(x, y))
        self.lasers = []
        self.energia = 100 # Barra de energia
        self.velocidad = 6
        self.cooldown_disparo = 250  # Milisegundos entre disparo y disparo
        self.ultimo_disparo = 0
        self.invulnerable_hasta = 0  # Parpadeo despues de recibir un golpe

    def mover(self, dx, dy):
        self.shape.x += dx * self.velocidad
        self.shape.y += dy * self.velocidad
        # Evita que la nave se salga de la pantalla
        self.shape.clamp_ip(pygame.Rect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT))

    def lanzar_laser(self):
        """Dispara solo si paso el cooldown. Retorna True si efectivamente disparo."""
        ahora = pygame.time.get_ticks()
        if ahora - self.ultimo_disparo < self.cooldown_disparo:
            return False
        self.ultimo_disparo = ahora
        # Dos laseres, uno por cada panel de la nave
        self.lasers.append(Laser(self.shape.centerx - 30, self.shape.top + 20))
        self.lasers.append(Laser(self.shape.centerx + 30, self.shape.top + 20))
        return True

    def recibir_dano(self, cantidad=10):
        """Resta energia. Retorna False si la nave fue destruida."""
        ahora = pygame.time.get_ticks()
        if ahora < self.invulnerable_hasta:
            return True
        self.invulnerable_hasta = ahora + 1000  # 1 segundo de invulnerabilidad
        self.energia -= cantidad
        if self.energia <= 0:
            self.energia = 0
            return False
        return True

    def actualizar(self):
        for laser in self.lasers[:]:
            laser.mover()
            if laser.rect.bottom < 0:  # Salio de la pantalla
                self.lasers.remove(laser)

    def dibujar(self, screen):
        for laser in self.lasers:
            laser.dibujar(screen)
        # Mientras es invulnerable la nave parpadea
        ahora = pygame.time.get_ticks()
        if ahora > self.invulnerable_hasta or (ahora // 100) % 2 == 0:
            screen.blit(self.image, self.shape.topleft)
        # La barra de energía ahora la dibuja el HUD (hud.py)


class Enemigo:
    imagen_precargada = None  # Compartida por todos los enemigos

    def __init__(self, x, y, nivel=1):
        if Enemigo.imagen_precargada is None:
            Enemigo.imagen_precargada = cargar_imagen('enemigo1.png', (80, 80))
        self.image = Enemigo.imagen_precargada
        self.rect = self.image.get_rect(topleft=(x, y))
        # Cuanto mas alto el nivel, mas rapido bajan y se mueven de costado
        self.velocidad_y = random.uniform(1.5, 2.5) + nivel * 0.5
        self.velocidad_x = random.choice([-1, 1]) * random.uniform(0, 0.5 + nivel * 0.3)
        self.probabilidad_disparo = 0.004 + nivel * 0.002

    def mover(self):
        self.rect.y += self.velocidad_y
        self.rect.x += self.velocidad_x
        # Rebota contra los bordes laterales
        if self.rect.left < 0 or self.rect.right > SCREEN_WIDTH:
            self.velocidad_x *= -1

    def intentar_disparar(self):
        """Devuelve un LaserEnemigo o None."""
        if random.random() < self.probabilidad_disparo:
            return LaserEnemigo(self.rect.centerx, self.rect.bottom)
        return None

    def dibujar(self, screen):
        screen.blit(self.image, self.rect.topleft)


class Laser:
    imagen_precargada = None

    def __init__(self, x, y):
        if Laser.imagen_precargada is None:
            Laser.imagen_precargada = cargar_imagen('laser.png')
        self.image = Laser.imagen_precargada
        self.rect = self.image.get_rect(center=(x, y))
        self.velocidad = -10  # Negativo: sube

    def mover(self):
        self.rect.y += self.velocidad

    def dibujar(self, screen):
        screen.blit(self.image, self.rect.topleft)


class LaserEnemigo(Laser):
    imagen_precargada = None

    def __init__(self, x, y):
        if LaserEnemigo.imagen_precargada is None:
            LaserEnemigo.imagen_precargada = cargar_imagen('laser_enemigo.png')
        self.image = LaserEnemigo.imagen_precargada
        self.rect = self.image.get_rect(center=(x, y))
        self.velocidad = 7  # Positivo: baja
