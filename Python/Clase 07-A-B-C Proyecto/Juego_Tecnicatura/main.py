"""
main.py
-------
Archivo principal del juego "Amenaza Fantasma". Es el que ejecuto:

    python main.py

Orden en que pasan las cosas:
    1. main() inicia pygame, crea la ventana y carga imágenes y sonidos.
    2. Se muestra la pantalla de inicio (mostrar_imagen_inicial).
    3. jugar() corre el BUCLE DEL JUEGO hasta que me quedo sin escudo.
    4. pantalla_game_over() pregunta si quiero jugar de nuevo (R) o salir (ESC).

El bucle del juego se repite 60 veces por segundo y en cada vuelta hace
siempre lo mismo: leer el teclado -> actualizar posiciones -> revisar
choques -> dibujar todo -> mostrar la pantalla.
"""
import pygame
import sys
import random
import os

# Importo las clases y constantes de los otros archivos del proyecto
from personaje import Personaje, Enemigo
from explosiones import Explosion
from hud import HUD
from constantes import SCREEN_WIDTH, SCREEN_HEIGHT, ASSETS_PATH

PUNTOS_POR_NIVEL = 250        # Puntos que necesito para pasar de nivel (cada enemigo da 10)
DURACION_CARTEL_NIVEL = 2200  # Milisegundos que se muestra el cartel "NIVEL X"


def salir():
    """Cierra pygame y termina el programa."""
    pygame.quit()
    sys.exit()


# ==========================================
# VENTANA ESCALADA Y PANTALLA COMPLETA
# ==========================================
# Variables globales (las comparten varias funciones).
# tamanio_ventana guarda el tamaño de la ventana para volver a él al salir de pantalla completa.
tamanio_ventana = (SCREEN_WIDTH, SCREEN_HEIGHT)
pantalla_completa = False


def crear_ventana():
    """
    El juego se dibuja siempre en un "lienzo" de 800x600 (SCREEN_WIDTH x SCREEN_HEIGHT)
    y en cada frame ese lienzo se agranda para llenar la ventana real.
    Así la lógica del juego no cambia, sea cual sea el tamaño de la ventana.
    Devuelve el lienzo: es la superficie donde se dibuja TODO el juego.
    """
    # global me deja modificar la variable de afuera de la función (si no, Python crea una nueva local)
    global tamanio_ventana
    # Tamaño del monitor (por ejemplo 1920 x 1080)
    ancho_escritorio, alto_escritorio = pygame.display.get_desktop_sizes()[0]
    # Calculo cuánto puedo agrandar la ventana para que ocupe el 90% del ancho
    # o el 85% del alto (lo que se alcance primero), manteniendo la proporción 4:3.
    # max(1, ...) evita que en un monitor chico la ventana quede menor a 800x600.
    escala = max(1, min(ancho_escritorio * 0.9 / SCREEN_WIDTH, alto_escritorio * 0.85 / SCREEN_HEIGHT))
    tamanio_ventana = (int(SCREEN_WIDTH * escala), int(SCREEN_HEIGHT * escala))
    # RESIZABLE permite estirar o maximizar la ventana con el mouse
    pygame.display.set_mode(tamanio_ventana, pygame.RESIZABLE)
    return pygame.Surface((SCREEN_WIDTH, SCREEN_HEIGHT)).convert()


def presentar(screen):
    """
    Reemplaza a pygame.display.flip(): agranda el lienzo al tamaño de la
    ventana (dejando bandas negras si sobra espacio) y lo muestra.
    """
    ventana = pygame.display.get_surface()
    ancho, alto = ventana.get_size()
    # Uso la escala más chica de las dos para que el lienzo entre entero sin deformarse
    escala = min(ancho / SCREEN_WIDTH, alto / SCREEN_HEIGHT)
    tamanio = (int(SCREEN_WIDTH * escala), int(SCREEN_HEIGHT * escala))
    # Posición para que quede centrado
    posicion = ((ancho - tamanio[0]) // 2, (alto - tamanio[1]) // 2)
    ventana.fill((0, 0, 0))
    if tamanio == screen.get_size():
        ventana.blit(screen, posicion)  # Mismo tamaño: no hace falta escalar
    else:
        imagen = pygame.transform.smoothscale(screen, tamanio)
        ventana.blit(imagen, posicion)
    # flip() es lo que realmente muestra en el monitor todo lo que dibujé
    pygame.display.flip()


def tecla_global(event, screen):
    """
    Eventos que funcionan en cualquier pantalla del juego (inicio, partida, game over):
      - F11: activa o desactiva la pantalla completa.
      - Si la ventana cambia de tamaño, vuelvo a dibujar.
    Devuelve True si el evento ya fue usado, para que el que llama lo ignore.
    """
    global pantalla_completa
    if event.type == pygame.KEYDOWN and event.key == pygame.K_F11:
        pantalla_completa = not pantalla_completa  # not invierte el valor: True <-> False
        if pantalla_completa:
            # (0, 0) significa "usá la resolución del monitor"
            pygame.display.set_mode((0, 0), pygame.FULLSCREEN)
        else:
            pygame.display.set_mode(tamanio_ventana, pygame.RESIZABLE)
        presentar(screen)
        return True
    if event.type in (pygame.VIDEORESIZE, pygame.WINDOWSIZECHANGED):
        presentar(screen)
        return True
    return False


# ==========================================
# PANTALLAS DE INICIO Y GAME OVER
# ==========================================
def mostrar_imagen_inicial(screen, imagen_path, duracion):
    """
    Muestra la pantalla de inicio con un efecto de desvanecimiento (fade out):
    la imagen va perdiendo opacidad (alpha) a medida que pasa el tiempo.
    Se puede saltear apretando cualquier tecla.
    """
    imagen = pygame.image.load(imagen_path).convert()
    imagen = pygame.transform.scale(imagen, (SCREEN_WIDTH, SCREEN_HEIGHT))

    clock = pygame.time.Clock()
    tiempo_inicial = pygame.time.get_ticks()
    tiempo_total = duracion

    # Mientras no se haya cumplido el tiempo total de la animación...
    while pygame.time.get_ticks() - tiempo_inicial < tiempo_total:
        # Reviso los eventos para poder cerrar la ventana o saltear la intro
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                salir()
            if tecla_global(event, screen):
                continue
            if event.type == pygame.KEYDOWN:
                return  # Cualquier tecla saltea la pantalla de inicio

        tiempo_transcurrido = pygame.time.get_ticks() - tiempo_inicial

        # Regla de tres simple: al principio alpha = 255 (opaco) y al final 0 (invisible)
        alpha = max(0, 255 - (255 * (tiempo_transcurrido / tiempo_total)))

        # Le aplico la transparencia calculada a la imagen
        imagen.set_alpha(int(alpha))

        # Fondo negro y la imagen semitransparente encima: así se ve que "se apaga"
        screen.fill((0, 0, 0))
        screen.blit(imagen, (0, 0))
        presentar(screen)
        clock.tick(60)


def pantalla_game_over(screen, hud, puntos_totales, nivel):
    """Muestra el Game Over. Devuelve True si quiero jugar otra vez (R) o False para salir (ESC)."""
    hud.game_over(screen, puntos_totales, nivel)
    presentar(screen)

    # Espero hasta que el jugador apriete R o ESC
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
        pygame.time.wait(20)  # Pausa cortita para no usar el 100% del procesador


# ==========================================
# LA PARTIDA
# ==========================================
def jugar(screen, hud, fondos, sonido_laser, sonido_explosion):
    """Juega una partida completa. Cuando pierdo, devuelve (puntos_totales, nivel)."""
    # Creo mi nave abajo en el centro de la pantalla (// es división entera)
    personaje = Personaje(SCREEN_WIDTH // 2, SCREEN_HEIGHT - 100)
    enemigos = []        # Enemigos que hay en pantalla
    lasers_enemigos = [] # Disparos de los enemigos
    explosiones = []     # Explosiones que se están animando
    puntos = 0           # Puntos del nivel actual (vuelve a 0 al subir de nivel)
    puntos_totales = 0   # Puntos de toda la partida (los que se muestran)
    nivel = 1
    # Estrellas que pasan rápido por delante del fondo para dar sensación de velocidad.
    # Cada estrella es una lista [x, y, velocidad]. Uso listas y no tuplas porque las voy a modificar.
    estrellas = [[random.randint(0, SCREEN_WIDTH), random.randint(0, SCREEN_HEIGHT), random.uniform(2, 8)]
                 for _ in range(60)]
    pausado = False
    imagen_pausa = None  # "Foto" de la pantalla en el momento de pausar
    inicio_nivel = pygame.time.get_ticks()  # Para saber cuánto mostrar el cartel "NIVEL X"

    # El Clock controla los FPS (frames por segundo)
    clock = pygame.time.Clock()

    # ==========================================
    # BUCLE PRINCIPAL DEL JUEGO
    # ==========================================
    while True:
        # A. Eventos: cerrar el juego, pantalla completa y pausa
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                salir()
            if tecla_global(event, screen):
                continue
            if event.type == pygame.KEYDOWN and event.key == pygame.K_p:
                pausado = not pausado
                imagen_pausa = screen.copy()

        # En pausa no actualizo nada: dibujo la foto guardada con el cartel encima.
        # continue salta directo a la siguiente vuelta del while.
        if pausado:
            screen.blit(imagen_pausa, (0, 0))
            hud.pausa(screen)
            presentar(screen)
            clock.tick(15)  # En pausa no hace falta ir a 60 FPS
            continue

        # B. Controles de movimiento y disparo
        # get_pressed() dice qué teclas están apretadas AHORA (sirve para mantener apretado)
        keys = pygame.key.get_pressed()
        # True vale 1 y False vale 0, entonces derecha - izquierda da 1, -1 o 0
        dx = (keys[pygame.K_RIGHT] or keys[pygame.K_d]) - (keys[pygame.K_LEFT] or keys[pygame.K_a])
        dy = (keys[pygame.K_DOWN] or keys[pygame.K_s]) - (keys[pygame.K_UP] or keys[pygame.K_w])
        personaje.mover(dx, dy)

        # El sonido solo suena si lanzar_laser() devolvió True (o sea, si de verdad disparó)
        if keys[pygame.K_SPACE] and personaje.lanzar_laser():
            sonido_laser.play()
        personaje.actualizar()

        # C. Enemigos y colisiones
        # Recorro una copia de la lista ([:]) porque adentro puedo borrar enemigos
        for enemigo in enemigos[:]:
            enemigo.mover()

            disparo = enemigo.intentar_disparar()
            if disparo:
                lasers_enemigos.append(disparo)

            # Si el enemigo salió por abajo, lo borro para no ocupar memoria.
            # continue pasa al siguiente enemigo (este ya no existe).
            if enemigo.rect.top > SCREEN_HEIGHT:
                enemigos.remove(enemigo)
                continue

            # Colisión: mi láser contra el enemigo.
            # colliderect() devuelve True si dos rectángulos se superponen.
            for laser in personaje.lasers[:]:
                if enemigo.rect.colliderect(laser.rect):
                    # Creo una explosión donde estaba el enemigo
                    explosiones.append(Explosion(enemigo.rect.centerx, enemigo.rect.centery))
                    enemigos.remove(enemigo)
                    personaje.lasers.remove(laser)
                    sonido_explosion.play()
                    puntos += 10
                    puntos_totales += 10
                    break  # El enemigo ya murió: no reviso más láseres contra él
            else:
                # El else de un for se ejecuta solo si el for terminó SIN break,
                # es decir, si el enemigo sigue vivo. Ahí reviso si chocó con mi nave.
                # inflate(-30, -30) achica el rectángulo de la nave 30 píxeles
                # para que el choque se sienta justo (la imagen tiene bordes vacíos).
                if enemigo.rect.colliderect(personaje.shape.inflate(-30, -30)):
                    explosiones.append(Explosion(enemigo.rect.centerx, enemigo.rect.centery))
                    enemigos.remove(enemigo)
                    sonido_explosion.play()
                    if not personaje.recibir_dano(20):
                        return puntos_totales, nivel  # Me quedé sin escudo: termina la partida

        # C2. Láseres de los enemigos: los muevo y reviso si me pegan
        for laser in lasers_enemigos[:]:
            laser.mover()
            if laser.rect.top > SCREEN_HEIGHT:
                lasers_enemigos.remove(laser)
            elif laser.rect.colliderect(personaje.shape.inflate(-30, -30)):
                lasers_enemigos.remove(laser)
                if not personaje.recibir_dano(10):
                    return puntos_totales, nivel

        # D. Aparición de enemigos (spawn)
        # random.random() devuelve un decimal entre 0.0 y 1.0. Si es menor a 0.02
        # (nivel 1) aparece un enemigo: es un 2% de probabilidad en cada frame,
        # que a 60 FPS da más o menos un enemigo por segundo. Crece con el nivel.
        if random.random() < 0.015 + nivel * 0.005:
            x = random.randint(0, SCREEN_WIDTH - 80)  # - 80 para que no aparezca cortado a la derecha
            enemigos.append(Enemigo(x, -80, nivel))   # y = -80: nace arriba, fuera de la pantalla

        # E. Animación de las explosiones
        # List comprehension: me quedo solo con las explosiones que siguen activas
        # (actualizar() devuelve False cuando la animación terminó).
        explosiones = [explosion for explosion in explosiones if explosion.actualizar()]

        # F. Subida de nivel: cambia el fondo y recupero algo de escudo
        if puntos >= PUNTOS_POR_NIVEL:
            nivel += 1
            puntos = 0
            personaje.energia = min(100, personaje.energia + 30)  # min() para no pasar de 100
            inicio_nivel = pygame.time.get_ticks()

        # G. Dibujo. El ORDEN importa: lo último que dibujo queda por encima.
        # El operador % (resto) hace que los fondos se repitan: nivel 1, 2, 3, 1, 2, 3...
        screen.blit(fondos[(nivel - 1) % len(fondos)], (0, 0))
        # Las estrellas bajan; cuando salen por abajo las vuelvo a poner arriba
        for estrella in estrellas:
            estrella[1] += estrella[2]
            if estrella[1] > SCREEN_HEIGHT:
                estrella[0], estrella[1] = random.randint(0, SCREEN_WIDTH), 0
            largo = int(estrella[2] * 2)  # Las más rápidas dejan una estela más larga
            pygame.draw.line(screen, (200, 200, 255), (estrella[0], estrella[1]), (estrella[0], estrella[1] + largo))

        for enemigo in enemigos:
            enemigo.dibujar(screen)
        for laser in lasers_enemigos:
            laser.dibujar(screen)
        personaje.dibujar(screen)
        for explosion in explosiones:
            explosion.dibujar(screen)

        # H. Interfaz (escudo, puntos, nivel). Va al final para que quede arriba de todo.
        hud.dibujar(screen, personaje.energia, puntos_totales, nivel, puntos, PUNTOS_POR_NIVEL)
        transcurrido = pygame.time.get_ticks() - inicio_nivel
        if transcurrido < DURACION_CARTEL_NIVEL:
            hud.cartel_nivel(screen, nivel, transcurrido, DURACION_CARTEL_NIVEL)

        # I. Muestro la pantalla y limito a 60 FPS
        # (tick espera lo necesario para que cada vuelta dure 1/60 de segundo)
        presentar(screen)
        clock.tick(60)


def main():
    # Inicio pygame (video, sonido, teclado...) y creo la ventana
    pygame.init()
    screen = crear_ventana()
    pygame.display.set_caption('Amenaza Fantasma')  # Título de la ventana

    # 1. Ícono de la ventana (el que aparece en la barra de tareas)
    icon = pygame.image.load(os.path.join(ASSETS_PATH, 'images', 'icono.png'))
    pygame.display.set_icon(icon)

    # 2. Pantalla de inicio
    imagen_inicial_path = os.path.join(ASSETS_PATH, 'images', 'inicio', 'star.png')
    mostrar_imagen_inicial(screen, imagen_inicial_path, 5000)  # Dura 5 segundos

    # 3. Cargo los fondos (uno distinto por nivel).
    # .convert() los pasa al formato de la pantalla para que dibujarlos sea más rápido.
    fondos = []
    for nombre in ('fondo2.png', 'fondo3.png', 'fondo4.png'):
        fondo = pygame.image.load(os.path.join(ASSETS_PATH, 'images', nombre)).convert()
        fondos.append(pygame.transform.scale(fondo, (SCREEN_WIDTH, SCREEN_HEIGHT)))

    # 4. Efectos de sonido (Sound) y música de fondo (music).
    # El volumen va de 0.0 (mudo) a 1.0 (máximo).
    sonido_laser = pygame.mixer.Sound(os.path.join(ASSETS_PATH, 'sounds', 'laser.wav'))
    sonido_laser.set_volume(0.4)
    sonido_explosion = pygame.mixer.Sound(os.path.join(ASSETS_PATH, 'sounds', 'explosion.wav'))
    sonido_explosion.set_volume(0.6)

    pygame.mixer.music.load(os.path.join(ASSETS_PATH, 'sounds', 'musica.wav'))
    pygame.mixer.music.set_volume(0.5)
    pygame.mixer.music.play(-1)  # El -1 hace que la música se repita infinitamente

    # 5. Partidas: se repiten mientras el jugador apriete R en el Game Over.
    # El HUD se crea una sola vez porque carga fuentes y eso es lento.
    hud = HUD()
    while True:
        puntos_totales, nivel = jugar(screen, hud, fondos, sonido_laser, sonido_explosion)
        if not pantalla_game_over(screen, hud, puntos_totales, nivel):
            break

    salir()


# Este if hace que main() se ejecute solo si corro este archivo directamente
# (python main.py), y no si otro archivo lo importa.
if __name__ == '__main__':
    main()
