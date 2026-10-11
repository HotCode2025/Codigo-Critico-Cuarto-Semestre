import pygame
from constantes import SCREEN_WIDTH, SCREEN_HEIGHT

# Se usa la primera fuente que exista en la compu (Bahnschrift viene con Windows)
FUENTES = 'bahnschrift,dejavusanscondensed,dejavusans,liberationsans,arial'

CIAN = (70, 220, 255)
DORADO = (255, 200, 70)
ROJO = (255, 70, 60)
GRIS = (150, 165, 190)


def fuente(tamanio, negrita=True):
    return pygame.font.SysFont(FUENTES, tamanio, bold=negrita)


def texto_espaciado(fuente_, texto, color, espacio=2):
    """Texto con separación extra entre letras."""
    letras = [fuente_.render(letra, True, color) for letra in texto]
    ancho = sum(l.get_width() for l in letras) + espacio * max(0, len(letras) - 1)
    superficie = pygame.Surface((max(1, ancho), fuente_.get_height()), pygame.SRCALPHA)
    x = 0
    for l in letras:
        superficie.blit(l, (x, 0))
        x += l.get_width() + espacio
    return superficie


def texto_con_brillo(fuente_, texto, color, espacio=4, margen=24):
    """Texto con un halo de luz alrededor (se desenfoca achicando y agrandando)."""
    base = texto_espaciado(fuente_, texto, color, espacio)
    w, h = base.get_width() + margen * 2, base.get_height() + margen * 2
    halo = pygame.Surface((w, h), pygame.SRCALPHA)
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
    """Panel translúcido con borde fino, estilo interfaz de cabina."""
    rect = pygame.Rect(rect)
    panel = pygame.Surface(rect.size, pygame.SRCALPHA)
    pygame.draw.rect(panel, (8, 14, 30, 170), panel.get_rect(), border_radius=8)
    pygame.draw.rect(panel, (*acento, 90), panel.get_rect(), 1, border_radius=8)
    pygame.draw.line(panel, (*acento, 255), (10, 0), (46, 0), 2)  # Detalle de color arriba
    screen.blit(panel, rect.topleft)


def centrar(screen, superficie, y):
    screen.blit(superficie, superficie.get_rect(center=(SCREEN_WIDTH // 2, y)))


class HUD:
    def __init__(self):
        self.f_etiqueta = fuente(13)
        self.f_valor = fuente(28)
        self.f_mediana = fuente(20)
        self.f_titulo = fuente(64)
        self.oscuro = pygame.Surface((SCREEN_WIDTH, SCREEN_HEIGHT), pygame.SRCALPHA)
        self.oscuro.fill((0, 0, 8, 170))
        self.cache = {}  # Textos con brillo ya generados (son caros de crear)

    def brillo(self, fuente_, texto, color, espacio=4):
        clave = (id(fuente_), texto, color, espacio)
        if clave not in self.cache:
            self.cache[clave] = texto_con_brillo(fuente_, texto, color, espacio)
        return self.cache[clave]

    # ---------- Durante el juego ----------
    def dibujar(self, screen, energia, puntos_totales, nivel, puntos_nivel, puntos_por_nivel):
        self.dibujar_escudo(screen, energia)
        self.dibujar_puntaje(screen, puntos_totales)
        self.dibujar_nivel(screen, nivel, puntos_nivel / puntos_por_nivel)

    def dibujar_escudo(self, screen, energia):
        dibujar_panel(screen, (12, 12, 250, 58))
        if energia > 50:
            color = CIAN
        elif energia > 25:
            color = DORADO
        else:
            color = ROJO
        screen.blit(texto_espaciado(self.f_etiqueta, 'ESCUDO', GRIS, 3), (24, 20))
        porcentaje = self.f_etiqueta.render(f'{energia}%', True, color)
        screen.blit(porcentaje, (250 - porcentaje.get_width(), 20))

        # Barra segmentada: 20 segmentos de 5% cada uno
        segmentos_llenos = round(energia / 5)
        parpadeo = energia <= 25 and (pygame.time.get_ticks() // 250) % 2 == 0
        for i in range(20):
            rect = pygame.Rect(24 + i * 11, 42, 9, 16)
            if i < segmentos_llenos and not parpadeo:
                pygame.draw.rect(screen, color, rect, border_radius=2)
                pygame.draw.line(screen, (255, 255, 255), rect.topleft, (rect.right - 1, rect.top))
            else:
                pygame.draw.rect(screen, (28, 40, 64), rect, border_radius=2)

    def dibujar_puntaje(self, screen, puntos_totales):
        rect = pygame.Rect(SCREEN_WIDTH - 212, 12, 200, 58)
        dibujar_panel(screen, rect, DORADO)
        screen.blit(texto_espaciado(self.f_etiqueta, 'PUNTOS', GRIS, 3), (rect.x + 12, rect.y + 8))
        valor = texto_espaciado(self.f_valor, f'{puntos_totales:06d}', (255, 255, 255), 2)
        screen.blit(valor, (rect.right - valor.get_width() - 12, rect.y + 22))

    def dibujar_nivel(self, screen, nivel, progreso):
        rect = pygame.Rect(SCREEN_WIDTH // 2 - 70, 12, 140, 44)
        dibujar_panel(screen, rect, DORADO)
        texto = texto_espaciado(self.f_mediana, f'NIVEL {nivel}', DORADO, 3)
        screen.blit(texto, texto.get_rect(center=(rect.centerx, rect.y + 18)))
        # Barra fina de progreso al siguiente nivel
        barra = pygame.Rect(rect.x + 12, rect.bottom - 10, rect.w - 24, 4)
        pygame.draw.rect(screen, (40, 40, 60), barra, border_radius=2)
        pygame.draw.rect(screen, DORADO, (barra.x, barra.y, int(barra.w * min(1, progreso)), barra.h), border_radius=2)

    def cartel_nivel(self, screen, nivel, transcurrido, duracion):
        """Cartel 'NIVEL X' que aparece y desaparece suavemente."""
        t = transcurrido / duracion
        alpha = int(255 * min(1, t * 4, (1 - t) * 4))
        titulo = self.brillo(self.f_titulo, f'NIVEL {nivel}', DORADO, 8).copy()
        subtitulo = self.brillo(self.f_mediana, 'PREPARATE, PILOTO', CIAN, 6).copy()
        titulo.set_alpha(alpha)
        subtitulo.set_alpha(alpha)
        centrar(screen, titulo, SCREEN_HEIGHT // 2 - 20)
        centrar(screen, subtitulo, SCREEN_HEIGHT // 2 + 40)

    # ---------- Pantallas especiales ----------
    def pausa(self, screen):
        screen.blit(self.oscuro, (0, 0))
        dibujar_panel(screen, (SCREEN_WIDTH // 2 - 160, SCREEN_HEIGHT // 2 - 70, 320, 140))
        centrar(screen, self.brillo(self.f_titulo, 'PAUSA', CIAN, 8), SCREEN_HEIGHT // 2 - 15)
        centrar(screen, texto_espaciado(self.f_etiqueta, 'PRESIONA P PARA CONTINUAR', GRIS, 3), SCREEN_HEIGHT // 2 + 40)

    def game_over(self, screen, puntos_totales, nivel):
        screen.blit(self.oscuro, (0, 0))
        cx, cy = SCREEN_WIDTH // 2, SCREEN_HEIGHT // 2
        dibujar_panel(screen, (cx - 250, cy - 150, 500, 300), ROJO)
        centrar(screen, self.brillo(self.f_titulo, 'GAME OVER', ROJO, 2), cy - 95)

        for i, (etiqueta, valor) in enumerate((('PUNTAJE', f'{puntos_totales:06d}'), ('NIVEL', str(nivel)))):
            y = cy - 30 + i * 40
            screen.blit(texto_espaciado(self.f_etiqueta, etiqueta, GRIS, 3), (cx - 170, y + 6))
            v = texto_espaciado(self.f_valor, valor, (255, 255, 255), 2)
            screen.blit(v, (cx + 170 - v.get_width(), y - 4))
            pygame.draw.line(screen, (60, 70, 95), (cx - 170, y + 30), (cx + 170, y + 30))

        centrar(screen, texto_espaciado(self.f_mediana, 'Que la Fuerza te acompañe', DORADO, 1), cy + 75)
        centrar(screen, texto_espaciado(self.f_etiqueta, 'R  JUGAR DE NUEVO      ESC  SALIR', GRIS, 3), cy + 120)
