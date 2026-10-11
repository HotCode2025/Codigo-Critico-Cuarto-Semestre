import pygame
import os
from constantes import ASSETS_PATH

class Explosion:
    # MEJORA: Atributo de clase para guardar las imágenes.
    # Al estar aquí, se comparten entre TODAS las explosiones, evitando 
    # tener que leer el disco duro cada vez que un enemigo muere.
    imagenes_precargadas = None 

    def __init__(self, x, y):
        # Si es la primera vez que se crea una explosión, cargamos las imágenes.
        if Explosion.imagenes_precargadas is None:
            Explosion.imagenes_precargadas = [
                # Agregamos .convert_alpha() para optimizar el dibujado de transparencias
                pygame.image.load(os.path.join(ASSETS_PATH, 'images', f'regularExplosion0{i:02d}.png')).convert_alpha() 
                for i in range(9)
            ]
        
        # Asignamos la lista precargada a esta instancia
        self.images = Explosion.imagenes_precargadas
        self.index = 0
        self.image = self.images[self.index]
        self.rect = self.image.get_rect(center=(x, y))
        
        # Controles para la velocidad de la animación
        self.frame_rate = 0
        self.max_frames = 5 # Fotogramas que debe esperar antes de cambiar de imagen

    def actualizar(self):
        """
        Gestiona la lógica de la animación.
        Retorna True si la explosión sigue activa, o False si ya terminó.
        """
        self.frame_rate += 1
        
        # Si pasaron suficientes fotogramas de juego, cambiamos la imagen de la explosión
        if self.frame_rate >= self.max_frames:
            self.frame_rate = 0  # Reiniciamos el contador de tiempo
            self.index += 1      # Pasamos a la siguiente imagen
            
            # Si el índice supera la cantidad de imágenes que tenemos, la animación termina
            if self.index >= len(self.images):
                return False 
            
            # Actualizamos la imagen que se mostrará en este fotograma
            self.image = self.images[self.index]
            
        return True

    def dibujar(self, screen):
        """Dibuja el fotograma actual de la explosión en la pantalla."""
        screen.blit(self.image, self.rect.topleft)