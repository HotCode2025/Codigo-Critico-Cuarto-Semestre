"""
hud.py
------
HUD significa "Heads-Up Display": es la información que se dibuja encima
del juego (escudo, puntos, nivel) y las pantallas de pausa y Game Over.

Lo separé en su propio archivo para que main.py se ocupe solo de la lógica
del juego y este archivo solo de cómo se VE la información.
"""
import pygame
from constantes import SCREEN_WIDTH, SCREEN_HEIGHT

# SysFont recibe varias fuentes separadas por coma y usa la primera que encuentre
# instalada. Bahnschrift viene con Windows y DejaVu con Linux; arial es el último recurso.
FUENTES = 'bahnschrift,dejavusanscondensed,dejavusans,liberationsans,arial'

# Colores de la interfaz (RGB)
CIAN = (70, 220, 255)
DORADO = (255, 200, 70)
ROJO = (255, 70, 60)
GRIS = (150, 165, 190)


def fuente(tamanio, negrita=True):
    """Crea una fuente del tamaño pedido usando la lista FUENTES."""
    return pygame.font.SysFont(FUENTES, tamanio, bold=negrita)


def texto_espaciado(fuente_, texto, color, espacio=2):
    """
    Renderiza un texto con separación extra entre letras (queda más "moderno").
    pygame no trae esta opción, así que dibujo letra por letra y las voy
    pegando con un espacio entre cada una.
    (Le puse fuente_ con guion bajo para no tapar la función fuente() de arriba.)
    """
    letras = [fuente_.render(letra, True, color) for letra in texto]
    ancho = sum(l.get_width() for l in letras) + espacio * max(0, len(letras) - 1)
    # SRCALPHA crea una superficie con transparencia: solo se ven las letras
    superficie = pygame.Surface((max(1, ancho), fuente_.get_height()), pygame.SRCALPHA)
    x = 0
    for l in letras:
        superficie.blit(l, (x, 0))
        x += l.get_width() + espacio
    return superficie


def texto_con_brillo(fuente_, texto, color, espacio=4, margen=24):
    """
    Texto con un halo de luz alrededor (efecto "glow").
    Truco para desenfocar sin librerías extra: achico la imagen 8 veces y la
    vuelvo a agrandar con smoothscale; al agrandarla se suaviza y queda borrosa.
    Después pego el halo borroso dos veces (más intenso) y el texto nítido encima.
    """
    base = texto_espaciado(fuente_, texto, color, espacio)
    # Dejo un margen alrededor para que el brillo no quede cortado
    w, h = base.get_width() + margen * 2, base.get_height() + margen * 2
    halo = pygame.Surface((w, h), pygame.SRCALPHA)
    # Relleno con el mismo color pero transparente (alpha 0) para que al
    # desenfocar los bordes no se oscurezcan mezclándose con negro
    halo.fill((*color, 0))
    halo.blit(base, (margen, margen))
    for _ in range(2):
        chico = pygame.transform.smoothscale(halo, (max(1, w // 8), max(1, h // 8)))
        halo = pygame.transform.smoothscale(chico, (w, h))
    resultado = pygame.Surface((w, h), pygame.SRCALPHA)
    resultado.blit(halo, (0, 0))
    resultado.blit(halo, (0, 0))
    resultado.blit(base, (margen, margen))
    return resultado


def dibujar_panel(screen, rect, acento=CIAN):
    """Panel semitransparente con borde fino y una rayita de color arriba (estilo cabina de nave)."""
    rect = pygame.Rect(rect)
    panel = pygame.Surface(rect.size, pygame.SRCALPHA)
    # El cuarto número del color es el alpha: 170 de 255 = se ve el juego por detrás
    pygame.draw.rect(panel, (8, 14, 30, 170), panel.get_rect(), border_radius=8)
    pygame.draw.rect(panel, (*acento, 90), panel.get_rect(), 1, border_radius=8)  # Borde de 1 px
    pygame.draw.line(panel, (*acento, 255), (10, 0), (46, 0), 2)  # Detalle de color arriba
    screen.blit(panel, rect.topleft)


def centrar(screen, superficie, y):
    """Dibuja una superficie centrada horizontalmente a la altura y."""
    screen.blit(superficie, superficie.get_rect(center=(SCREEN_WIDTH // 2, y)))


class HUD:
    """Dibuja toda la interfaz. main.py crea un solo HUD y lo usa en todo el juego."""

    def __init__(self):
        # Cargo las fuentes una sola vez: crearlas en cada frame haría lento el juego
        self.f_etiqueta = fuente(13)  # Textos chicos: "ESCUDO", "PUNTOS"
        self.f_valor = fuente(28)     # Números grandes del puntaje
        self.f_mediana = fuente(20)
        self.f_titulo = fuente(64)    # "NIVEL 2", "PAUSA", "GAME OVER"
        # Capa negra semitransparente para oscurecer el juego en pausa y Game Over
        self.oscuro = pygame.Surface((SCREEN_WIDTH, SCREEN_HEIGHT), pygame.SRCALPHA)
        self.oscuro.fill((0, 0, 8, 170))
        # Caché (diccionario) de los textos con brillo: son lentos de generar,
        # así que los creo una vez y después los reutilizo.
        self.cache = {}

    def brillo(self, fuente_, texto, color, espacio=4):
        """Devuelve el texto con brillo desde la caché, o lo crea si es la primera vez."""
        clave = (id(fuente_), texto, color, espacio)  # La tupla identifica a cada texto
        if clave not in self.cache:
            self.cache[clave] = texto_con_brillo(fuente_, texto, color, espacio)
        return self.cache[clave]

    # ---------- Durante el juego ----------
    def dibujar(self, screen, energia, puntos_totales, nivel, puntos_nivel, puntos_por_nivel):
        """Dibuja los tres paneles de arriba. Se llama en cada frame."""
        self.dibujar_escudo(screen, energia)
        self.dibujar_puntaje(screen, puntos_totales)
        # puntos_nivel / puntos_por_nivel da un número de 0 a 1 (el % de avance del nivel)
        self.dibujar_nivel(screen, nivel, puntos_nivel / puntos_por_nivel)

    def dibujar_escudo(self, screen, energia):
        """Panel de arriba a la izquierda con la barra de escudo."""
        dibujar_panel(screen, (12, 12, 250, 58))
        # El color avisa el peligro: cian = bien, dorado = cuidado, rojo = peligro
        if energia > 50:
            color = CIAN
        elif energia > 25:
            color = DORADO
        else:
            color = ROJO
        screen.blit(texto_espaciado(self.f_etiqueta, 'ESCUDO', GRIS, 3), (24, 20))
        porcentaje = self.f_etiqueta.render(f'{energia}%', True, color)
        screen.blit(porcentaje, (250 - porcentaje.get_width(), 20))  # Alineado a la derecha

        # Barra segmentada: 20 segmentos de 5% cada uno
        segmentos_llenos = round(energia / 5)
        # Con poca energía la barra parpadea: cada 250 ms se apaga y se prende
        parpadeo = energia <= 25 and (pygame.time.get_ticks() // 250) % 2 == 0
        for i in range(20):
            rect = pygame.Rect(24 + i * 11, 42, 9, 16)  # 9 px de ancho + 2 px de separación
            if i < segmentos_llenos and not parpadeo:
                pygame.draw.rect(screen, color, rect, border_radius=2)
                # Línea blanca arriba de cada segmento: simula un reflejo de luz
                pygame.draw.line(screen, (255, 255, 255), rect.topleft, (rect.right - 1, rect.top))
            else:
                pygame.draw.rect(screen, (28, 40, 64), rect, border_radius=2)  # Segmento vacío

    def dibujar_puntaje(self, screen, puntos_totales):
        """Panel de arriba a la derecha con los puntos."""
        rect = pygame.Rect(SCREEN_WIDTH - 212, 12, 200, 58)
        dibujar_panel(screen, rect, DORADO)
        screen.blit(texto_espaciado(self.f_etiqueta, 'PUNTOS', GRIS, 3), (rect.x + 12, rect.y + 8))
        # :06d completa con ceros a la izquierda hasta 6 dígitos (40 -> 000040), estilo arcade
        valor = texto_espaciado(self.f_valor, f'{puntos_totales:06d}', (255, 255, 255), 2)
        screen.blit(valor, (rect.right - valor.get_width() - 12, rect.y + 22))

    def dibujar_nivel(self, screen, nivel, progreso):
        """Panel del centro con el nivel y una barrita de progreso hacia el siguiente."""
        rect = pygame.Rect(SCREEN_WIDTH // 2 - 70, 12, 140, 44)
        dibujar_panel(screen, rect, DORADO)
        texto = texto_espaciado(self.f_mediana, f'NIVEL {nivel}', DORADO, 3)
        screen.blit(texto, texto.get_rect(center=(rect.centerx, rect.y + 18)))
        # Barra fina de progreso: el ancho de la parte llena es proporcional al progreso
        barra = pygame.Rect(rect.x + 12, rect.bottom - 10, rect.w - 24, 4)
        pygame.draw.rect(screen, (40, 40, 60), barra, border_radius=2)
        pygame.draw.rect(screen, DORADO, (barra.x, barra.y, int(barra.w * min(1, progreso)), barra.h), border_radius=2)

    def cartel_nivel(self, screen, nivel, transcurrido, duracion):
        """
        Cartel 'NIVEL X' que aparece y desaparece suavemente.
        t va de 0 (recién empieza) a 1 (terminó). Con min(1, t*4, (1-t)*4) el
        alpha sube rápido al principio, se queda en 255 y baja rápido al final.
        """
        t = transcurrido / duracion
        alpha = int(255 * min(1, t * 4, (1 - t) * 4))
        # .copy() porque set_alpha modificaría la imagen guardada en la caché
        titulo = self.brillo(self.f_titulo, f'NIVEL {nivel}', DORADO, 8).copy()
        subtitulo = self.brillo(self.f_mediana, 'PREPARATE, PILOTO', CIAN, 6).copy()
        titulo.set_alpha(alpha)
        subtitulo.set_alpha(alpha)
        centrar(screen, titulo, SCREEN_HEIGHT // 2 - 20)
        centrar(screen, subtitulo, SCREEN_HEIGHT // 2 + 40)

    # ---------- Pantallas especiales ----------
    def pausa(self, screen):
        """Oscurece el juego y muestra el cartel de PAUSA."""
        screen.blit(self.oscuro, (0, 0))
        dibujar_panel(screen, (SCREEN_WIDTH // 2 - 160, SCREEN_HEIGHT // 2 - 70, 320, 140))
        centrar(screen, self.brillo(self.f_titulo, 'PAUSA', CIAN, 8), SCREEN_HEIGHT // 2 - 15)
        centrar(screen, texto_espaciado(self.f_etiqueta, 'PRESIONA P PARA CONTINUAR', GRIS, 3), SCREEN_HEIGHT // 2 + 40)

    def game_over(self, screen, puntos_totales, nivel):
        """Oscurece el juego y muestra el resumen de la partida."""
        screen.blit(self.oscuro, (0, 0))
        cx, cy = SCREEN_WIDTH // 2, SCREEN_HEIGHT // 2  # Centro de la pantalla
        dibujar_panel(screen, (cx - 250, cy - 150, 500, 300), ROJO)
        centrar(screen, self.brillo(self.f_titulo, 'GAME OVER', ROJO, 2), cy - 95)

        # enumerate() me da el número de fila (i) para calcular la altura de cada renglón
        for i, (etiqueta, valor) in enumerate((('PUNTAJE', f'{puntos_totales:06d}'), ('NIVEL', str(nivel)))):
            y = cy - 30 + i * 40
            screen.blit(texto_espaciado(self.f_etiqueta, etiqueta, GRIS, 3), (cx - 170, y + 6))
            v = texto_espaciado(self.f_valor, valor, (255, 255, 255), 2)
            screen.blit(v, (cx + 170 - v.get_width(), y - 4))
            pygame.draw.line(screen, (60, 70, 95), (cx - 170, y + 30), (cx + 170, y + 30))

        centrar(screen, texto_espaciado(self.f_mediana, 'Que la Fuerza te acompañe', DORADO, 1), cy + 75)
        centrar(screen, texto_espaciado(self.f_etiqueta, 'R  JUGAR DE NUEVO      ESC  SALIR', GRIS, 3), cy + 120)
