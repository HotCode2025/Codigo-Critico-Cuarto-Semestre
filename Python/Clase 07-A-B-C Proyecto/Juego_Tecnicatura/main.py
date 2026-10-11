import pygame
import sys
import random
import os

# Importamos las clases y constantes desde otros archivos de tu proyecto
from personaje import Personaje, Enemigo
from explosiones import Explosion
from hud import HUD
from constantes import SCREEN_WIDTH, SCREEN_HEIGHT, ASSETS_PATH

PUNTOS_POR_NIVEL = 250
DURACION_CARTEL_NIVEL = 2200  # ms


def salir():
    pygame.quit()
    sys.exit()


# Tamaño de la ventana en modo ventana (se calcula en crear_ventana)
tamanio_ventana = (SCREEN_WIDTH, SCREEN_HEIGHT)
pantalla_completa = False


def crear_ventana():
    """
    El juego se dibuja siempre en un "lienzo" de 800x600 (SCREEN_WIDTH x SCREEN_HEIGHT)
    y en cada frame ese lienzo se agranda para llenar la ventana real.
    Así la lógica del juego no cambia, sea cual sea el tamaño de la ventana.
    """
    global tamanio_ventana
    ancho_escritorio, alto_escritorio = pygame.display.get_desktop_sizes()[0]
    # La ventana ocupa casi toda la pantalla, manteniendo la proporción 4:3
    escala = max(1, min(ancho_escritorio * 0.9 / SCREEN_WIDTH, alto_escritorio * 0.85 / SCREEN_HEIGHT))
    tamanio_ventana = (int(SCREEN_WIDTH * escala), int(SCREEN_HEIGHT * escala))
    pygame.display.set_mode(tamanio_ventana, pygame.RESIZABLE)
    return pygame.Surface((SCREEN_WIDTH, SCREEN_HEIGHT)).convert()


def presentar(screen):
    """Agranda el lienzo a la ventana (con bandas negras si sobra espacio) y lo muestra."""
    ventana = pygame.display.get_surface()
    ancho, alto = ventana.get_size()
    escala = min(ancho / SCREEN_WIDTH, alto / SCREEN_HEIGHT)
    tamanio = (int(SCREEN_WIDTH * escala), int(SCREEN_HEIGHT * escala))
    ventana.fill((0, 0, 0))
    if tamanio == screen.get_size():
        ventana.blit(screen, ((ancho - tamanio[0]) // 2, (alto - tamanio[1]) // 2))
    else:
        imagen = pygame.transform.smoothscale(screen, tamanio)
        ventana.blit(imagen, ((ancho - tamanio[0]) // 2, (alto - tamanio[1]) // 2))
    pygame.display.flip()


def tecla_global(event, screen):
    """
    F11 activa/desactiva la pantalla completa y, si cambia el tamaño de la
    ventana, se vuelve a dibujar. Devuelve True si el evento ya fue usado.
    """
    global pantalla_completa
    if event.type == pygame.KEYDOWN and event.key == pygame.K_F11:
        pantalla_completa = not pantalla_completa
        if pantalla_completa:
            pygame.display.set_mode((0, 0), pygame.FULLSCREEN)
        else:
            pygame.display.set_mode(tamanio_ventana, pygame.RESIZABLE)
        presentar(screen)
        return True
    if event.type in (pygame.VIDEORESIZE, pygame.WINDOWSIZECHANGED):
        presentar(screen)
        return True
    return False


def mostrar_imagen_inicial(screen, imagen_path, duracion):
    """
    Muestra una pantalla de carga o splash screen con un efecto de desvanecimiento (fade out)
    basado en la reducción de la opacidad (alpha) a lo largo del tiempo.
    Se puede saltear apretando cualquier tecla.
    """
    imagen = pygame.image.load(imagen_path).convert()
    imagen = pygame.transform.scale(imagen, (SCREEN_WIDTH, SCREEN_HEIGHT))

    clock = pygame.time.Clock()
    tiempo_inicial = pygame.time.get_ticks()
    tiempo_total = duracion

    # Mientras no se haya cumplido el tiempo total de la animación...
    while pygame.time.get_ticks() - tiempo_inicial < tiempo_total:
        # Permitir que el usuario cierre la ventana durante la animación
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                salir()
            if tecla_global(event, screen):
                continue
            if event.type == pygame.KEYDOWN:
                return

        tiempo_transcurrido = pygame.time.get_ticks() - tiempo_inicial

        # Regla de tres simple: a medida que pasa el tiempo, el alpha se reduce hacia 0
        alpha = max(0, 255 - (255 * (tiempo_transcurrido / tiempo_total)))

        # Aplica la transparencia calculada a la imagen
        imagen.set_alpha(int(alpha))

        # Dibuja un fondo negro y pone la imagen semi-transparente encima
        screen.fill((0, 0, 0))
        screen.blit(imagen, (0, 0))
        presentar(screen)
        clock.tick(60)


def pantalla_game_over(screen, hud, puntos_totales, nivel):
    """Muestra el Game Over. Retorna True si el jugador quiere jugar otra vez."""
    hud.game_over(screen, puntos_totales, nivel)
    presentar(screen)

    while True:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                salir()
            if tecla_global(event, screen):
                continue
            if event.type == pygame.KEYDOWN:
                if event.key == pygame.K_r:
                    return True
                if event.key == pygame.K_ESCAPE:
                    return False
        pygame.time.wait(20)


def jugar(screen, hud, fondos, sonido_laser, sonido_explosion):
    """Una partida completa. Retorna (puntos_totales, nivel) al perder."""
    personaje = Personaje(SCREEN_WIDTH // 2, SCREEN_HEIGHT - 100)
    enemigos = []
    lasers_enemigos = []
    explosiones = []
    puntos = 0          # Puntos del nivel actual
    puntos_totales = 0  # Puntos de toda la partida
    nivel = 1
    # Estrellas que pasan rápido por delante del fondo: [x, y, velocidad]
    estrellas = [[random.randint(0, SCREEN_WIDTH), random.randint(0, SCREEN_HEIGHT), random.uniform(2, 8)]
                 for _ in range(60)]
    pausado = False
    imagen_pausa = None  # Foto de la pantalla al pausar
    inicio_nivel = pygame.time.get_ticks()

    clock = pygame.time.Clock()

    # ==========================================
    # BUCLE PRINCIPAL DEL JUEGO
    # ==========================================
    while True:
        # A. Captura de eventos (Cerrar el juego y pausa)
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                salir()
            if tecla_global(event, screen):
                continue
            if event.type == pygame.KEYDOWN and event.key == pygame.K_p:
                pausado = not pausado
                imagen_pausa = screen.copy()

        if pausado:
            screen.blit(imagen_pausa, (0, 0))
            hud.pausa(screen)
            presentar(screen)
            clock.tick(15)
            continue

        # B. Controles de movimiento y disparo
        keys = pygame.key.get_pressed()
        dx = (keys[pygame.K_RIGHT] or keys[pygame.K_d]) - (keys[pygame.K_LEFT] or keys[pygame.K_a])
        dy = (keys[pygame.K_DOWN] or keys[pygame.K_s]) - (keys[pygame.K_UP] or keys[pygame.K_w])
        personaje.mover(dx, dy)

        if keys[pygame.K_SPACE] and personaje.lanzar_laser():
            sonido_laser.play()
        personaje.actualizar()

        # C. Lógica de Enemigos y Colisiones
        for enemigo in enemigos[:]:
            enemigo.mover()

            disparo = enemigo.intentar_disparar()
            if disparo:
                lasers_enemigos.append(disparo)

            # Si el enemigo sale por debajo de la pantalla, lo borramos para liberar memoria
            if enemigo.rect.top > SCREEN_HEIGHT:
                enemigos.remove(enemigo)
                continue

            # Colisión: Láser contra Enemigo
            for laser in personaje.lasers[:]:
                if enemigo.rect.colliderect(laser.rect):
                    # Crea una explosión en las coordenadas del enemigo muerto
                    explosiones.append(Explosion(enemigo.rect.centerx, enemigo.rect.centery))
                    enemigos.remove(enemigo)
                    personaje.lasers.remove(laser)
                    sonido_explosion.play()
                    puntos += 10
                    puntos_totales += 10
                    break
            else:
                # Colisión: Enemigo contra Nave (Personaje). El enemigo también explota.
                if enemigo.rect.colliderect(personaje.shape.inflate(-30, -30)):
                    explosiones.append(Explosion(enemigo.rect.centerx, enemigo.rect.centery))
                    enemigos.remove(enemigo)
                    sonido_explosion.play()
                    if not personaje.recibir_dano(20):
                        return puntos_totales, nivel

        # C2. Láseres enemigos
        for laser in lasers_enemigos[:]:
            laser.mover()
            if laser.rect.top > SCREEN_HEIGHT:
                lasers_enemigos.remove(laser)
            elif laser.rect.colliderect(personaje.shape.inflate(-30, -30)):
                lasers_enemigos.remove(laser)
                if not personaje.recibir_dano(10):
                    return puntos_totales, nivel

        # D. Generador aleatorio de enemigos (Spawn)
        # random.random() devuelve un float entre 0.0 y 1.0.
        # La probabilidad de aparición crece con el nivel (2% en el nivel 1).
        if random.random() < 0.015 + nivel * 0.005:
            x = random.randint(0, SCREEN_WIDTH - 80)
            enemigos.append(Enemigo(x, -80, nivel))

        # E. Actualización de animaciones de explosión
        # Mantiene en la lista solo las explosiones cuya animación aún no ha terminado
        explosiones = [explosion for explosion in explosiones if explosion.actualizar()]

        # F. Subida de nivel: cambia el fondo y recupera algo de energía
        if puntos >= PUNTOS_POR_NIVEL:
            nivel += 1
            puntos = 0
            personaje.energia = min(100, personaje.energia + 30)
            inicio_nivel = pygame.time.get_ticks()

        # G. Renderizado (Dibujo) de todos los elementos en pantalla
        screen.blit(fondos[(nivel - 1) % len(fondos)], (0, 0))
        # Las estrellas bajan para dar sensación de avance
        for estrella in estrellas:
            estrella[1] += estrella[2]
            if estrella[1] > SCREEN_HEIGHT:
                estrella[0], estrella[1] = random.randint(0, SCREEN_WIDTH), 0
            largo = int(estrella[2] * 2)
            pygame.draw.line(screen, (200, 200, 255), (estrella[0], estrella[1]), (estrella[0], estrella[1] + largo))

        for enemigo in enemigos:
            enemigo.dibujar(screen)
        for laser in lasers_enemigos:
            laser.dibujar(screen)
        personaje.dibujar(screen)
        for explosion in explosiones:
            explosion.dibujar(screen)

        # H. Interfaz (escudo, puntos, nivel)
        hud.dibujar(screen, personaje.energia, puntos_totales, nivel, puntos, PUNTOS_POR_NIVEL)
        transcurrido = pygame.time.get_ticks() - inicio_nivel
        if transcurrido < DURACION_CARTEL_NIVEL:
            hud.cartel_nivel(screen, nivel, transcurrido, DURACION_CARTEL_NIVEL)

        # J. Refresco de pantalla y FPS
        presentar(screen)
        clock.tick(60)


def main():
    # Inicialización básica del motor de Pygame y la ventana
    pygame.init()
    screen = crear_ventana()
    pygame.display.set_caption('Amenaza Fantasma')

    # 1. Configurar el ícono de la ventana superior
    icon = pygame.image.load(os.path.join(ASSETS_PATH, 'images', 'icono.png'))
    pygame.display.set_icon(icon)

    # 2. Mostrar pantalla de inicio
    imagen_inicial_path = os.path.join(ASSETS_PATH, 'images', 'inicio', 'star.png')
    mostrar_imagen_inicial(screen, imagen_inicial_path, 5000) # Dura 5 segundos

    # 3. Cargar y escalar los fondos del juego (uno distinto por nivel)
    fondos = []
    for nombre in ('fondo2.png', 'fondo3.png', 'fondo4.png'):
        fondo = pygame.image.load(os.path.join(ASSETS_PATH, 'images', nombre)).convert()
        fondos.append(pygame.transform.scale(fondo, (SCREEN_WIDTH, SCREEN_HEIGHT)))

    # 4. Cargar efectos de sonido y música
    sonido_laser = pygame.mixer.Sound(os.path.join(ASSETS_PATH, 'sounds', 'laser.wav'))
    sonido_laser.set_volume(0.4)
    sonido_explosion = pygame.mixer.Sound(os.path.join(ASSETS_PATH, 'sounds', 'explosion.wav'))
    sonido_explosion.set_volume(0.6)

    pygame.mixer.music.load(os.path.join(ASSETS_PATH, 'sounds', 'musica.wav'))
    pygame.mixer.music.set_volume(0.5)
    pygame.mixer.music.play(-1)  # El -1 hace que la música se repita infinitamente

    # 5. Partidas: se repite mientras el jugador apriete R en el Game Over
    hud = HUD()
    while True:
        puntos_totales, nivel = jugar(screen, hud, fondos, sonido_laser, sonido_explosion)
        if not pantalla_game_over(screen, hud, puntos_totales, nivel):
            break

    salir()


if __name__ == '__main__':
    main()
