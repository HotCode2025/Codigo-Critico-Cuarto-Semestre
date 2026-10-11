"""
explosiones.py
--------------
La clase Explosion representa la animación que aparece cuando destruyo
una nave enemiga. Una animación no es más que una lista de imágenes
(fotogramas) que voy mostrando una después de la otra.
"""
import pygame
import os
from constantes import ASSETS_PATH


class Explosion:
    # Atributo de CLASE (no de instancia): se comparte entre TODAS las explosiones.
    # Lo uso para cargar las 9 imágenes una sola vez. Si las cargara en cada
    # explosión, el juego leería el disco cada vez que muere un enemigo y se trabaría.
    imagenes_precargadas = None

    def __init__(self, x, y):
        """Crea una explosión centrada en la posición (x, y)."""
        # La primera vez que se crea una explosión, cargo las imágenes.
        # Las siguientes veces ya están en memoria y no entra a este if.
        if Explosion.imagenes_precargadas is None:
            Explosion.imagenes_precargadas = [
                # f'{i:02d}' escribe el número con 2 dígitos: 00, 01, ... 08.
                # .convert_alpha() adapta la imagen al formato de la pantalla
                # (con transparencia), lo que hace que dibujarla sea mucho más rápido.
                pygame.image.load(os.path.join(ASSETS_PATH, 'images', f'regularExplosion0{i:02d}.png')).convert_alpha()
                for i in range(9)
            ]

        # Cada explosión apunta a la misma lista de imágenes ya cargada
        self.images = Explosion.imagenes_precargadas
        self.index = 0                      # Qué fotograma estoy mostrando
        self.image = self.images[self.index]
        # El rect guarda la posición y el tamaño. Con center=(x, y) la
        # explosión queda centrada justo donde estaba el enemigo.
        self.rect = self.image.get_rect(center=(x, y))

        # Controles para la velocidad de la animación
        self.frame_rate = 0  # Contador de frames del juego que pasaron
        self.max_frames = 5  # Cuántos frames espero antes de pasar a la siguiente imagen

    def actualizar(self):
        """
        Avanza la animación. Se llama una vez por frame desde el bucle del juego.
        Devuelve True si la explosión sigue activa, o False si ya terminó
        (así en main.py sé que la puedo sacar de la lista).
        """
        self.frame_rate += 1

        # Si pasaron suficientes frames, cambio a la siguiente imagen.
        # Con max_frames = 5 y el juego a 60 FPS, cada imagen dura 5/60 de segundo.
        if self.frame_rate >= self.max_frames:
            self.frame_rate = 0  # Reinicio el contador
            self.index += 1      # Paso a la siguiente imagen

            # Si ya mostré todas las imágenes, la animación terminó
            if self.index >= len(self.images):
                return False

            self.image = self.images[self.index]

        return True

    def dibujar(self, screen):
        """Dibuja el fotograma actual de la explosión en la pantalla."""
        # blit() "pega" una imagen sobre otra en la posición indicada
        screen.blit(self.image, self.rect.topleft)
