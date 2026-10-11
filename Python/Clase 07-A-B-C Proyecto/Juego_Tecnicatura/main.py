import pygame
import sys
import random
import os
# Asumiendo que tienes constantes.py con estas variables:
from constantes import ASSETS_PATH, SCREEN_WIDTH, SCREEN_HEIGHT
# Asumiendo que tienes tus clases en estos archivos:
from personaje import Personaje, Enemigo, Laser
from explosiones import Explosion

# ---------------------------------------------------------
# FUNCION DEL VIDEO 1
# ---------------------------------------------------------
def mostrar_imagen_inicial(screen, imagen_path, duracion):
    imagen = pygame.image.load(imagen_path).convert()
    imagen = pygame.transform.scale(imagen, (SCREEN_WIDTH, SCREEN_HEIGHT))

    alpha = 255
    clock = pygame.time.Clock()

    tiempo_inicial = pygame.time.get_ticks()
    tiempo_total = duracion
    while pygame.time.get_ticks() - tiempo_inicial < tiempo_total:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit()
                sys.exit()
        
        # Lógica de renderizado de la imagen inicial iría aquí

# ---------------------------------------------------------
# FUNCIÓN MAIN 
# ---------------------------------------------------------
def main():
    # =========================================================
    # CONFIGURACIÓN INICIAL (Faltante en los videos)
    # =========================================================
    pygame.init()
    screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
    pygame.display.set_caption("Juego Código Crítico")
    clock = pygame.time.Clock()

    # Creación del jugador (centro abajo de la pantalla)
    personaje = Personaje(SCREEN_WIDTH // 2, SCREEN_HEIGHT - 100)

    # Variables de estado y listas
    enemigos = []
    explosiones = []
    puntos = 0
    running = True

    # Carga de Fondos (NUEVO: Agregado para que funcione la lógica de niveles)
    # Asume que tienes fondo1.png, fondo2.png, fondo3.png en tus assets
    # fondo1 = pygame.image.load(os.path.join(ASSETS_PATH, 'images', 'fondo1.png')).convert()
    # fondo2 = pygame.image.load(os.path.join(ASSETS_PATH, 'images', 'fondo2.png')).convert()
    # fondo3 = pygame.image.load(os.path.join(ASSETS_PATH, 'images', 'fondo3.png')).convert()
    # fondo_actual = fondo1 # Inicializamos con el primer fondo
    
    # IMPORTANTE: Como no tengo tus imágenes, usaré colores de relleno simulando los fondos
    fondo1 = (0, 0, 0)       # Negro
    fondo2 = (0, 0, 50)      # Azul muy oscuro
    fondo3 = (50, 0, 0)      # Rojo muy oscuro
    fondo_actual = fondo1

    # =========================================================
    # BUCLE PRINCIPAL
    # =========================================================
    while running:
        # 1. EVENTOS
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit()
                sys.exit()

        # 2. CONTROLES DE MOVIMIENTO
        keys = pygame.key.get_pressed()
        dx, dy = 0, 0
        if keys[pygame.K_LEFT]:
            dx = -5
        if keys[pygame.K_RIGHT]:
            dx = 5
        if keys[pygame.K_UP]:
            dy = -5
        if keys[pygame.K_DOWN]:
            dy = 5

        personaje.mover(dx, dy)

        # 3. DISPARO
        if keys[pygame.K_SPACE]:
            personaje.lanzar_laser()

        # 4. ACTUALIZAR POSICIÓN DE ENEMIGOS Y MANEJAR COLISIONES
        for enemigo in enemigos[:]:
            enemigo.mover()
            if enemigo.rect.top > SCREEN_HEIGHT:
                enemigos.remove(enemigo)
                continue 

            # CORRECCIÓN DE LÓGICA: Validar láser contra cada enemigo vivo
            for laser in personaje.lasers[:]:
                if enemigo.rect.colliderect(laser.rect):
                    explosiones.append(Explosion(enemigo.rect.centerx, enemigo.rect.centery))
                    enemigos.remove(enemigo) 
                    personaje.lasers.remove(laser)
                    puntos += 10 
                    break 

            # Colisión entre enemigo y nave principal
            if enemigo.rect.colliderect(personaje.shape):
                if not personaje.recibir_dano():
                    running = False 

        # 5. GENERAR ENEMIGOS DE FORMA ALEATORIA
        if random.randint(1, 10) < 2:
            x = random.randint(0, SCREEN_WIDTH - 80) # Nos asegura de tener el enemigo dentro de la pantalla
            enemigo = Enemigo(x, 0)
            enemigos.append(enemigo)

        # 6. ACTUALIZAR EXPLOSIONES (Nueva lógica del profe)
        explosiones = [explosion for explosion in explosiones if explosion.actualizar()]

        # 7. ACTUALIZAR EL FONDO CADA 250 PUNTOS (Subir de nivel)
        if puntos > 0 and puntos % 250 == 0:
            if fondo_actual == fondo1:
                fondo_actual = fondo2
            else:
                fondo_actual = fondo3
            puntos += 10 # Aumenta puntos y cambia el fondo para no quedar atrapado en el % 250 == 0

        # =========================================================
        # 8. DIBUJAR EL FONDO Y OBJETOS EN LA PANTALLA
        # =========================================================
        
        # En lugar de screen.blit (si usas imágenes), aquí uso fill por el mockup. 
        # Si tienes las imágenes descomenta la línea de abajo y borra el screen.fill
        # screen.blit(fondo_actual, (0, 0))
        screen.fill(fondo_actual)

        personaje.dibujar(screen)
        
        for enemigo in enemigos:
            # Asegúrate que tu clase Enemigo tenga el método dibujar(self, screen)
            enemigo.dibujar(screen)
            
        for explosion in explosiones:
            explosion.dibujar(screen)

        # Refrescar pantalla y controlar FPS
        pygame.display.flip()
        clock.tick(60)

if __name__ == "__main__":
    main()