import pygame
import sys
import random
import os
from personaje import Personaje, Enemigo, Explosion
from constantes import 



# Incializa el juego

def nostrar_imagen_inicial(screen, imagen_path, duracion):
    imagen = pygame.image.load(imagen_path).bonvert()
    imagen = pygame.transform.scale(image, (SCREEN_WIDTH, SCREEN_HEIGHT))

    # Bucle para mostra la imagen princial con una opacidad
    alpha = 255 # transparencia incial completa
    Clock = pygame.time.Clock()

    tiempo_incial = pygame.time.get_ticks()
    tiempo_total = duracion # Duracion en milisegundos de (8000 milisegundos para  8 segundos)
    while pygame.time.get_ticks() - tiempo_incial < tiempo_total:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit
                sys.exit()
