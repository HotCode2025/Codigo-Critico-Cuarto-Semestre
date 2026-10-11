"""
generar_assets.py
-----------------
Genera la carpeta assets/ del juego (imágenes y sonidos) sin descargar nada.
Las imágenes se dibujan con pygame y los sonidos se sintetizan con matemática pura.
No hace falta correrlo para jugar: los assets ya están en el repositorio.
Sirve para volver a crearlos o para modificar el diseño.

Técnicas usadas para que se vea "profesional":
  - Supersampling: las naves se dibujan a 4x y se reducen -> bordes suaves.
  - Degradados en las chapas para simular metal.
  - Planetas con iluminación 3D calculada píxel por píxel (luz difusa,
    brillo especular, luz de borde y luces nocturnas).
  - Ruido (value noise) para nebulosas, nubes y texturas de planetas.
  - Desenfoque (achicar y volver a agrandar) para brillos y fuego.

Uso:  python generar_assets.py   (tarda unos segundos)
Si después querés usar tus propias imágenes/sonidos, reemplazá los archivos
manteniendo el mismo nombre.
"""
import math
import os
import random
import struct
import wave

# Le digo a pygame que use un "video falso": así puedo dibujar y guardar imágenes
# sin que se abra ninguna ventana. Tiene que ir ANTES de importar pygame.
os.environ.setdefault('SDL_VIDEODRIVER', 'dummy')
import pygame

from constantes import ASSETS_PATH, SCREEN_WIDTH, SCREEN_HEIGHT

IMAGES = os.path.join(ASSETS_PATH, 'images')
SOUNDS = os.path.join(ASSETS_PATH, 'sounds')
SAMPLE_RATE = 22050  # Muestras de sonido por segundo (calidad del audio)
TAMANIO = (SCREEN_WIDTH, SCREEN_HEIGHT)
FUENTE = 'dejavusans,liberationsans,arial'


# =========================================================
# HERRAMIENTAS GENERALES
# =========================================================
def rgba(color):
    """Si el color viene como (r, g, b) le agrego alpha 255 (opaco)."""
    return tuple(color) if len(color) == 4 else (*color, 255)


def mezclar(c1, c2, t):
    """
    Mezcla dos colores. t = 0 da c1, t = 1 da c2 y t = 0.5 da el color del medio.
    Es interpolación lineal: inicio + (fin - inicio) * t, aplicada a cada canal.
    """
    return tuple(int(a + (b - a) * t) for a, b in zip(c1, c2))


def paleta(colores, t):
    """
    Interpola una lista de colores. t va de 0 a 1.
    Ejemplo: con [negro, rojo, amarillo], t = 0.25 da un rojo oscuro.
    Primero busco entre qué dos colores cae t (k) y después los mezclo.
    """
    t = max(0.0, min(1.0, t))  # Me aseguro de que t quede entre 0 y 1
    n = len(colores) - 1
    k = min(int(t * n), n - 1)
    return mezclar(colores[k], colores[k + 1], t * n - k)


def contraste(t, fuerza):
    """Aleja los valores del 0.5: los oscuros se oscurecen y los claros se aclaran."""
    return max(0.0, min(1.0, (t - 0.5) * fuerza + 0.5))


def degradado(tamanio, paradas, vertical=True):
    """
    Superficie con un degradado entre varios colores (RGB o RGBA).
    Truco: pinto una tira de 1 píxel de ancho píxel por píxel (rápido porque es chica)
    y después la estiro al tamaño final con scale.
    """
    largo = max(2, tamanio[1] if vertical else tamanio[0])
    tira = pygame.Surface((1, largo) if vertical else (largo, 1), pygame.SRCALPHA)
    for i in range(largo):
        color = rgba(paleta([rgba(c) for c in paradas], i / (largo - 1)))
        tira.set_at((0, i) if vertical else (i, 0), color)
    return pygame.transform.scale(tira, (max(1, tamanio[0]), max(1, tamanio[1])))


def poligono_relleno(destino, puntos, relleno):
    """
    Dibuja un polígono rellenándolo con la superficie que devuelve relleno(tamanio).
    pygame solo rellena polígonos con un color liso, así que uso una MÁSCARA:
      1. Creo el relleno (por ejemplo un degradado) del tamaño del polígono.
      2. Dibujo el polígono en blanco sobre una superficie transparente (la máscara).
      3. Multiplico relleno x máscara (BLEND_RGBA_MULT): donde la máscara es
         blanca el relleno queda igual y donde es transparente desaparece.
    """
    xs, ys = [p[0] for p in puntos], [p[1] for p in puntos]
    rect = pygame.Rect(int(min(xs)), int(min(ys)), int(max(xs) - min(xs)) + 2, int(max(ys) - min(ys)) + 2)
    capa = relleno(rect.size)
    mascara = pygame.Surface(rect.size, pygame.SRCALPHA)
    pygame.draw.polygon(mascara, (255, 255, 255, 255), [(x - rect.x, y - rect.y) for x, y in puntos])
    capa.blit(mascara, (0, 0), special_flags=pygame.BLEND_RGBA_MULT)
    destino.blit(capa, rect.topleft)


def poligono_degradado(destino, puntos, paradas, vertical=True):
    """Polígono relleno con un degradado (lambda crea una función chiquita en una línea)."""
    poligono_relleno(destino, puntos, lambda t: degradado(t, paradas, vertical))


def rect_degradado(destino, rect, paradas, vertical=True, radio=0):
    """Rectángulo (con bordes redondeados opcionales) relleno con un degradado. Usa la misma idea de la máscara."""
    rect = pygame.Rect(rect)
    capa = degradado(rect.size, paradas, vertical)
    mascara = pygame.Surface(rect.size, pygame.SRCALPHA)
    pygame.draw.rect(mascara, (255, 255, 255, 255), (0, 0, *rect.size), border_radius=radio)
    capa.blit(mascara, (0, 0), special_flags=pygame.BLEND_RGBA_MULT)
    destino.blit(capa, rect.topleft)


def desenfocar(superficie, factor):
    """
    Desenfoque barato: achico la imagen y la vuelvo a agrandar con smoothscale.
    Al agrandar, pygame promedia los píxeles y la imagen queda borrosa.
    Cuanto más grande el factor, más borroso. Hago 2 pasadas para que quede más suave.
    """
    w, h = superficie.get_size()
    for _ in range(2):
        chica = pygame.transform.smoothscale(superficie, (max(1, w // factor), max(1, h // factor)))
        superficie = pygame.transform.smoothscale(chica, (w, h))
    return superficie


def reducir(superficie, tamanio):
    """
    Reduce una imagen en pasos de a la mitad (512 -> 256 -> 128).
    Dibujar en grande y achicar se llama SUPERSAMPLING: los bordes quedan suaves
    en vez de escalonados. Achicar de a pasos da mejor resultado que un solo salto.
    """
    while superficie.get_width() // 2 >= tamanio[0]:
        superficie = pygame.transform.smoothscale(
            superficie, (superficie.get_width() // 2, superficie.get_height() // 2))
    return pygame.transform.smoothscale(superficie, tamanio)


def brillo_radial(radio, color, alpha_max=255, potencia=2.0, aditivo=False):
    """
    Círculo de luz que se desvanece hacia afuera (brillo de estrellas, motores, etc.).
    Dibujo círculos concéntricos desde el más grande al más chico, cada uno
    un poco más intenso, y así queda un degradado radial.
    potencia controla qué tan rápido se apaga hacia afuera.
    aditivo=True -> fondo negro opaco, para usar con BLEND_RGB_ADD
    (la luz se SUMA al fondo, como pasa con la luz de verdad).
    """
    radio = max(1, int(radio))
    if aditivo:
        s = pygame.Surface((radio * 2, radio * 2))
        s.fill((0, 0, 0))
    else:
        s = pygame.Surface((radio * 2, radio * 2), pygame.SRCALPHA)
        s.fill((*color, 0))
    for r in range(radio, 0, -1):
        intensidad = (1 - r / radio) ** potencia
        if aditivo:
            c = tuple(int(v * intensidad * alpha_max / 255) for v in color)
            pygame.draw.circle(s, c, (radio, radio), r)
        else:
            pygame.draw.circle(s, (*color, int(alpha_max * intensidad)), (radio, radio), r)
    return s


def sumar_luz(destino, luz, centro):
    """Pega una luz centrada en 'centro' sumando colores (BLEND_RGB_ADD): ilumina lo que hay abajo."""
    destino.blit(luz, (centro[0] - luz.get_width() // 2, centro[1] - luz.get_height() // 2),
                 special_flags=pygame.BLEND_RGB_ADD)


def ruido(tamanio, celdas, semilla, octavas=4):
    """
    Value noise en escala de grises: textura "natural" para nubes, gas y planetas.
    Cómo funciona:
      - Creo una imagen chiquita con píxeles grises al azar y la agrando con
        smoothscale: quedan manchas suaves (una "octava").
      - Repito con imágenes cada vez más grandes (más detalle) pero con menos peso.
      - Sumo todas las octavas: manchas grandes + detalles chicos = aspecto natural.
    La semilla hace que el azar sea siempre igual: mismo resultado cada vez que lo corro.
    """
    rnd = random.Random(semilla)
    resultado = pygame.Surface(tamanio)
    resultado.fill((0, 0, 0))
    pesos = [0.55 ** i for i in range(octavas)]
    total = sum(pesos)
    for o in range(octavas):
        cw, ch = max(2, int(celdas[0] * 2 ** o)), max(2, int(celdas[1] * 2 ** o))
        chica = pygame.Surface((cw, ch))
        for x in range(cw):
            for y in range(ch):
                v = int(rnd.random() * 255 * pesos[o] / total)
                chica.set_at((x, y), (v, v, v))
        resultado.blit(pygame.transform.smoothscale(chica, tamanio), (0, 0), special_flags=pygame.BLEND_RGB_ADD)
    return resultado


def texto_espaciado(fuente, texto, color, espacio):
    """Renderiza un texto con separación extra entre letras (estilo cine)."""
    letras = [fuente.render(letra, True, color) for letra in texto]
    ancho = sum(l.get_width() for l in letras) + espacio * (len(letras) - 1)
    s = pygame.Surface((ancho, fuente.get_height()), pygame.SRCALPHA)
    x = 0
    for l in letras:
        s.blit(l, (x, 0))
        x += l.get_width() + espacio
    return s


# =========================================================
# PLANETAS (iluminación 3D por píxel)
# =========================================================
def esfera(radio, color_fn, textura=None, luz=(-0.55, -0.5, 0.67), especular=0.0,
           color_borde=None, emisiva=None, ambiente=0.04):
    """
    Dibuja una esfera iluminada. La textura se "envuelve" sobre la esfera
    usando latitud/longitud, así los detalles se curvan con la superficie.
    """
    # Normalizo la dirección de la luz (la dejo de largo 1) para que el cálculo de luz dé entre -1 y 1
    largo = math.sqrt(sum(v * v for v in luz))
    lx, ly, lz = (v / largo for v in luz)
    lado = radio * 2
    s = pygame.Surface((lado, lado), pygame.SRCALPHA)
    if textura:
        tw, th = textura.get_size()
        textura.lock()
    if emisiva:
        emisiva.lock()
    # lock() bloquea las superficies en memoria: hace mucho más rápido leer y escribir píxel por píxel
    s.lock()
    # Recorro cada píxel del cuadrado que contiene a la esfera
    for py in range(lado):
        dy = (py + 0.5 - radio) / radio
        anillo = math.sqrt(max(0.0, 1 - dy * dy))
        lat = math.asin(max(-1.0, min(1.0, dy)))
        for px in range(lado):
            # dx y dy van de -1 a 1: la posición del píxel respecto del centro
            dx = (px + 0.5 - radio) / radio
            d2 = dx * dx + dy * dy
            if d2 >= 1:
                continue  # El píxel está fuera del círculo: queda transparente
            # Por Pitágoras (x² + y² + z² = 1) calculo cuánto "sobresale" la esfera
            # hacia mí en ese punto. (dx, dy, z) es la NORMAL: hacia dónde mira la superficie.
            z = math.sqrt(1 - d2)
            # Producto escalar entre la normal y la dirección de la luz (ley de Lambert):
            # 1 = la superficie mira de frente a la luz, 0 o menos = está en sombra.
            lam = dx * lx + dy * ly + z * lz
            u = v = 0
            t = 0.5
            if textura or emisiva:
                lon = math.asin(max(-1.0, min(1.0, dx / anillo))) if anillo > 1e-6 else 0
                u = int((lon / math.pi + 0.5) * (tw - 1)) if textura else 0
                v = int((lat / math.pi + 0.5) * (th - 1)) if textura else 0
            if textura:
                t = textura.get_at((u, v))[0] / 255  # Valor de la textura de 0 a 1
            # color_fn convierte ese valor en un color (cada planeta tiene su paleta)
            base = color_fn(t)
            difusa = max(0.0, (lam + 0.08) / 1.08) ** 0.9
            luzv = ambiente + (1 - ambiente) * difusa
            r, g, b = base[0] * luzv, base[1] * luzv, base[2] * luzv
            # Brillo especular: el reflejo blanco de las superficies brillantes.
            # Elevar a la 30 hace que solo se vea donde la luz pega casi de frente.
            if especular and lam > 0:
                brillo = (lam ** 30) * especular * 255
                r, g, b = r + brillo, g + brillo, b + brillo
            # Luz de borde: los bordes de la esfera (z chico) se iluminan como una atmósfera
            if color_borde:
                f = (1 - z) ** 2.5 * max(0.0, lam + 0.4)
                r, g, b = r + color_borde[0] * f, g + color_borde[1] * f, b + color_borde[2] * f
            # Luces propias (ciudades, ventanas): solo se ven del lado oscuro
            if emisiva and lam < 0.15:
                e = emisiva.get_at((u, v))[0] / 255 * min(1.0, (0.15 - lam) * 5)
                r, g, b = r + 255 * e, g + 190 * e, b + 120 * e
            # El borde se va haciendo transparente en el último píxel: borde suave (antialiasing)
            alpha = min(1.0, (1 - math.sqrt(d2)) * radio * 1.5)
            s.set_at((px, py), (min(255, int(r)), min(255, int(g)), min(255, int(b)), int(255 * alpha)))
    s.unlock()
    if textura:
        textura.unlock()
    if emisiva:
        emisiva.unlock()
    return s


def poner_planeta(destino, esfera_sup, centro, color_atmosfera=None, intensidad=120):
    """Pega un planeta en el fondo, con un halo de atmósfera detrás si le paso un color."""
    radio = esfera_sup.get_width() // 2
    if color_atmosfera:
        sumar_luz(destino, brillo_radial(radio * 1.18, color_atmosfera, intensidad, 1.6, aditivo=True), centro)
    destino.blit(esfera_sup, (centro[0] - radio, centro[1] - radio))


def textura_gigante_gaseoso(semilla):
    """
    Textura de bandas horizontales (como Júpiter): una columna de 48 grises al azar
    estirada a lo ancho, más un poco de ruido encima para que parezca gas en movimiento.
    """
    rnd = random.Random(semilla)
    bandas = pygame.Surface((1, 48))
    v = 128
    for y in range(48):
        v = max(0, min(255, v + rnd.randint(-70, 70)))
        bandas.set_at((0, y), (v, v, v))
    tex = pygame.transform.smoothscale(bandas, (512, 256))
    turbulencia = ruido((512, 256), (10, 3), semilla + 1, 5)
    turbulencia.set_alpha(90)
    tex.blit(turbulencia, (0, 0))
    return tex


def textura_estacion(semilla):
    """
    Textura de la estación espacial: paneles grises al azar, líneas, la trinchera
    del ecuador y el plato. Devuelve también un mapa de luces (puntos blancos) para
    las ventanitas que se ven en el lado oscuro.
    """
    rnd = random.Random(semilla)
    w, h = 512, 256
    tex = pygame.Surface((w, h))
    tex.fill((128, 128, 128))
    for _ in range(2600):  # Paneles de distintos tonos
        v = rnd.randint(92, 165)
        pygame.draw.rect(tex, (v, v, v), (rnd.randint(0, w), rnd.randint(0, h), rnd.randint(4, 28), rnd.randint(2, 7)))
    for y in range(0, h, 9):  # Líneas de latitud
        pygame.draw.line(tex, (98, 98, 98), (0, y), (w, y))
    pygame.draw.rect(tex, (35, 35, 35), (0, h // 2 - 3, w, 6))  # Trinchera ecuatorial
    pygame.draw.line(tex, (185, 185, 185), (0, h // 2 + 3), (w, h // 2 + 3))
    # Plato cóncavo (en la textura es una elipse: al envolver la esfera queda redondo)
    cx, cy = int(w * 0.36), int(h * 0.30)
    for r in range(44, 0, -1):
        v = int(55 + (r / 44) * 85)
        pygame.draw.ellipse(tex, (v, v, v), (cx - r, cy - r // 2, r * 2, r))
    pygame.draw.ellipse(tex, (190, 190, 190), (cx - 44, cy - 22, 88, 44), 2)
    pygame.draw.ellipse(tex, (220, 220, 220), (cx - 4, cy - 2, 8, 4))
    luces = pygame.Surface((w, h))
    luces.fill((0, 0, 0))
    for _ in range(1400):
        y = rnd.choice([rnd.randint(0, h - 1), h // 2 + rnd.randint(-6, 6)])
        b = rnd.randint(120, 255)
        luces.set_at((rnd.randint(0, w - 1), y), (b, b, b))
    return tex, luces


# =========================================================
# FONDOS
# =========================================================
def fondo_espacio(color_arriba, color_abajo):
    """Base de cada fondo: un degradado vertical muy oscuro."""
    return degradado(TAMANIO, [color_arriba, color_abajo]).convert()


def agregar_nebulosa(fondo, colores, semilla, manchas=14, intensidad=1):
    """
    Nebulosa = color (manchas muy desenfocadas) x densidad (ruido con mucho contraste).
    El ruido elevado al cubo deja solo las "hilachas" más densas del gas.
    """
    rnd = random.Random(semilla)
    chica = pygame.Surface((40, 30))
    chica.fill((0, 0, 0))
    for _ in range(manchas):
        pygame.draw.circle(chica, rnd.choice(colores), (rnd.randint(0, 40), rnd.randint(0, 30)), rnd.randint(5, 12))
    color = desenfocar(pygame.transform.smoothscale(chica, TAMANIO), 25)
    densidad = ruido(TAMANIO, (3, 2), semilla + 100, 7)
    copia = densidad.copy()
    densidad.blit(copia, (0, 0), special_flags=pygame.BLEND_RGB_MULT)
    densidad.blit(copia, (0, 0), special_flags=pygame.BLEND_RGB_MULT)
    for _ in range(2):  # Recuperar brillo después de elevar al cubo
        densidad.blit(densidad.copy(), (0, 0), special_flags=pygame.BLEND_RGB_ADD)
    color.blit(densidad, (0, 0), special_flags=pygame.BLEND_RGB_MULT)
    for _ in range(intensidad):
        fondo.blit(color, (0, 0), special_flags=pygame.BLEND_RGB_ADD)


def agregar_estrellas(fondo, cantidad, semilla, brillantes=10):
    """
    Agrega estrellas chicas (un píxel) y algunas brillantes con halo y destello en cruz.
    random() ** 3 hace que la mayoría sean tenues y pocas muy brillantes, como en el cielo real.
    """
    rnd = random.Random(semilla)
    tintes = [(255, 255, 255), (170, 200, 255), (255, 230, 190), (200, 220, 255)]
    w, h = fondo.get_size()
    for _ in range(cantidad):
        b = 0.15 + 0.85 * rnd.random() ** 3
        c = tuple(int(v * b) for v in rnd.choice(tintes))
        x, y = rnd.randint(0, w - 1), rnd.randint(0, h - 1)
        actual = fondo.get_at((x, y))
        fondo.set_at((x, y), tuple(min(255, a + v) for a, v in zip(actual[:3], c)))
    for _ in range(brillantes):
        x, y = rnd.randint(0, w - 1), rnd.randint(0, h - 1)
        tinte = rnd.choice(tintes)
        sumar_luz(fondo, brillo_radial(rnd.randint(8, 16), tinte, 220, 3.5, aditivo=True), (x, y))
        largo = rnd.randint(14, 34)  # Destello en cruz
        for i in range(-largo, largo + 1):
            k = (1 - abs(i) / largo) ** 2
            c = tuple(int(v * k * 0.8) for v in tinte)
            for px, py in ((x + i, y), (x, y + i)):
                if 0 <= px < w and 0 <= py < h:
                    actual = fondo.get_at((px, py))
                    fondo.set_at((px, py), tuple(min(255, a + v) for a, v in zip(actual[:3], c)))


def agregar_vineta(fondo, fuerza=0.65):
    """
    Viñeta: oscurece los bordes para centrar la atención (se usa mucho en cine y juegos).
    La calculo en una imagen chica de 80x60 (rápido) y después la agrando.
    """
    chica = pygame.Surface((80, 60), pygame.SRCALPHA)
    for x in range(80):
        for y in range(60):
            d = math.hypot((x - 40) / 40, (y - 30) / 30) / 1.414
            chica.set_at((x, y), (0, 0, 0, int(255 * fuerza * max(0.0, (d - 0.35) / 0.65) ** 1.5)))
    fondo.blit(pygame.transform.smoothscale(chica, TAMANIO), (0, 0))


def crear_fondo2():
    """Nivel 1: estación de batalla en una nebulosa azul/violeta."""
    s = fondo_espacio((3, 4, 16), (10, 6, 26))
    agregar_nebulosa(s, [(60, 35, 140), (25, 60, 150), (120, 35, 105)], 1)
    agregar_estrellas(s, 900, 10, 12)
    rojo = esfera(34, lambda t: paleta([(70, 25, 20), (150, 70, 45), (210, 130, 90)], contraste(t, 2.2)),
                  ruido((256, 128), (6, 3), 77, 4), color_borde=(255, 140, 90))
    poner_planeta(s, rojo, (130, 140), (255, 110, 60), 90)
    tex, luces = textura_estacion(3)
    estacion = esfera(165, lambda t: (int(38 + 175 * t), int(40 + 178 * t), int(46 + 188 * t)), tex,
                      especular=0.25, color_borde=(120, 160, 255), emisiva=luces)
    poner_planeta(s, estacion, (560, 225), (90, 130, 255), 70)
    agregar_vineta(s)
    return s


def crear_fondo3():
    """Nivel 2: gigante gaseoso naranja con una luna helada."""
    s = fondo_espacio((8, 4, 10), (20, 8, 10))
    agregar_nebulosa(s, [(170, 70, 30), (120, 30, 60), (60, 30, 120)], 4)
    agregar_estrellas(s, 900, 20, 10)
    gigante = esfera(330, lambda t: paleta([(60, 22, 10), (140, 60, 25), (200, 115, 55), (225, 170, 115),
                                            (235, 205, 170)], contraste(t, 2.0)),
                     textura_gigante_gaseoso(8), luz=(0.75, -0.45, 0.5), color_borde=(255, 170, 90))
    poner_planeta(s, gigante, (60, 360), (255, 140, 60), 110)
    luna = esfera(80, lambda t: paleta([(10, 30, 80), (30, 80, 160), (90, 160, 220), (225, 242, 255)],
                                       contraste(t, 2.2)),
                  ruido((256, 128), (8, 4), 9, 5), luz=(-0.7, 0.2, 0.7), especular=0.4, color_borde=(140, 200, 255))
    poner_planeta(s, luna, (680, 115), (80, 160, 255), 120)
    agregar_vineta(s)
    return s


def crear_fondo4():
    """Nivel 3: sistema con una estrella brillante y un planeta a contraluz."""
    s = fondo_espacio((2, 10, 14), (4, 18, 20))
    agregar_nebulosa(s, [(15, 90, 90), (20, 60, 120), (50, 100, 40)], 12)
    agregar_estrellas(s, 900, 30, 8)
    sumar_luz(s, brillo_radial(380, (255, 200, 140), 170, 2.4, aditivo=True), (620, 90))
    sumar_luz(s, brillo_radial(90, (255, 250, 230), 255, 1.2, aditivo=True), (620, 90))
    for i in range(-300, 301):  # Destello horizontal de la estrella
        k = (1 - abs(i) / 300) ** 3
        x = 620 + i
        if 0 <= x < SCREEN_WIDTH:
            for dy in (-1, 0, 1):
                actual = s.get_at((x, 90 + dy))
                add = (int(180 * k), int(200 * k), int(255 * k))
                s.set_at((x, 90 + dy), tuple(min(255, a + v) for a, v in zip(actual[:3], add)))
    contraluz = esfera(260, lambda t: paleta([(20, 30, 30), (50, 70, 60), (90, 110, 90)], contraste(t, 2)),
                       ruido((512, 256), (8, 4), 31, 5), luz=(0.35, -0.85, -0.35),
                       color_borde=(255, 210, 150), ambiente=0.03)
    poner_planeta(s, contraluz, (230, 720), (255, 200, 140), 80)
    agregar_vineta(s)
    return s


def crear_splash():
    """Pantalla de inicio: fondo espacial con el título dorado y las instrucciones."""
    s = fondo_espacio((2, 3, 12), (6, 4, 20))
    agregar_nebulosa(s, [(50, 60, 170), (110, 40, 140)], 40, intensidad=1)
    agregar_estrellas(s, 1000, 41, 14)
    agregar_vineta(s, 0.8)

    fuente_titulo = pygame.font.SysFont(FUENTE, 92, bold=True)
    fuente_chica = pygame.font.SysFont(FUENTE, 20)
    fuente_ayuda = pygame.font.SysFont(FUENTE, 16, bold=True)

    intro = texto_espaciado(fuente_chica, 'Hace mucho tiempo, en una galaxia muy, muy lejana...', (90, 180, 255), 1)
    s.blit(intro, intro.get_rect(center=(SCREEN_WIDTH // 2, 120)))

    for i, palabra in enumerate(['AMENAZA', 'FANTASMA']):
        y = 255 + i * 105
        mascara = texto_espaciado(fuente_titulo, palabra, (255, 255, 255), 10)
        rect = mascara.get_rect(center=(SCREEN_WIDTH // 2, y))
        # Resplandor dorado detrás del texto
        glow = pygame.Surface((rect.w + 80, rect.h + 80), pygame.SRCALPHA)
        glow.fill((255, 160, 30, 0))
        glow.blit(texto_espaciado(fuente_titulo, palabra, (255, 160, 30), 10), (40, 40))
        glow = desenfocar(glow, 10)
        for _ in range(2):
            s.blit(glow, (rect.x - 40, rect.y - 40))
        # Sombra y relleno con degradado metálico dorado
        s.blit(texto_espaciado(fuente_titulo, palabra, (40, 18, 0), 10), (rect.x + 3, rect.y + 4))
        relleno = degradado(rect.size, [(255, 250, 200), (255, 215, 80), (230, 140, 20), (255, 200, 90)])
        relleno.blit(mascara, (0, 0), special_flags=pygame.BLEND_RGBA_MULT)
        s.blit(relleno, rect.topleft)

    # Líneas doradas que se desvanecen a los costados
    for y in (190, 430):
        linea = degradado((520, 2), [(255, 200, 80, 0), (255, 200, 80, 220), (255, 200, 80, 0)], vertical=False)
        s.blit(linea, linea.get_rect(center=(SCREEN_WIDTH // 2, y)))

    renglones = ['FLECHAS / WASD  MOVER      ESPACIO  DISPARAR',
                 'P  PAUSA      F11  PANTALLA COMPLETA']
    for i, renglon in enumerate(renglones):
        ayuda = texto_espaciado(fuente_ayuda, renglon, (170, 180, 200), 3)
        s.blit(ayuda, ayuda.get_rect(center=(SCREEN_WIDTH // 2, 482 + i * 26)))
    tecla = texto_espaciado(fuente_ayuda, 'PRESIONA CUALQUIER TECLA', (255, 210, 90), 6)
    s.blit(tecla, tecla.get_rect(center=(SCREEN_WIDTH // 2, 555)))
    return s


# =========================================================
# NAVES (se dibujan a 512 px y se reducen)
# =========================================================
def crear_caza_tie(tam=128):
    """Nave del jugador: cabina esférica y dos alas hexagonales con paneles solares."""
    S = 512
    c = S // 2
    s = pygame.Surface((S, S), pygame.SRCALPHA)
    W, H = 74, 240

    # Brazos que unen la cabina con las alas
    rect_degradado(s, (c - 200, c - 22, 400, 44), [(175, 182, 195), (100, 106, 120), (45, 48, 56)], radio=10)
    for lado in (-1, 1):
        cx = c + lado * 196
        hexagono = [(cx, c - H), (cx + W, c - H * 0.52), (cx + W, c + H * 0.52),
                    (cx, c + H), (cx - W, c + H * 0.52), (cx - W, c - H * 0.52)]
        poligono_degradado(s, hexagono, [(78, 86, 102), (38, 42, 52), (20, 22, 28)])
        # Paneles solares: triángulos con leve variación de tono + grilla fina
        for i in range(6):
            a, b = hexagono[i], hexagono[(i + 1) % 6]
            tono = 1.0 + (0.18 if i in (0, 5) else -0.05 * i)
            arriba = tuple(min(255, int(v * tono)) for v in (62, 70, 86))
            abajo = tuple(min(255, int(v * tono)) for v in (24, 27, 34))

            def relleno_panel(tamanio, arriba=arriba, abajo=abajo):
                panel = degradado(tamanio, [arriba, abajo])
                for y in range(0, tamanio[1], 12):
                    pygame.draw.line(panel, (15, 17, 22), (0, y), (tamanio[0], y), 2)
                return panel
            interior = [(cx + (p[0] - cx) * 0.92, c + (p[1] - c) * 0.92) for p in ((cx, c), a, b)]
            poligono_relleno(s, interior, relleno_panel)
        for p in hexagono:  # Rayos de la estructura
            pygame.draw.line(s, (110, 118, 132), (cx, c), p, 9)
            pygame.draw.line(s, (170, 178, 190), (cx - 2, c - 2), (p[0] - 2, p[1] - 2), 2)
        pygame.draw.polygon(s, (130, 138, 152), hexagono, 14)
        pygame.draw.polygon(s, (205, 212, 222), [(x - lado * 2, y - 3) for x, y in hexagono], 3)
        # Eje central del ala
        pygame.draw.circle(s, (60, 64, 74), (cx, c), 34)
        rect_degradado(s, (cx - 26, c - 26, 52, 52), [(190, 196, 208), (80, 86, 98)], radio=26)
        pygame.draw.circle(s, (40, 44, 52), (cx, c), 12)

    # Cabina esférica con luz 3D
    bola = esfera(88, lambda t: (150, 156, 170), especular=0.45, color_borde=(110, 150, 255))
    s.blit(bola, (c - 88, c - 88))
    # Ventana octogonal
    pygame.draw.circle(s, (55, 58, 66), (c, c), 56)
    vidrio = brillo_radial(48, (40, 120, 90), 255, 0.6)
    pygame.draw.circle(s, (8, 14, 14), (c, c), 48)
    s.blit(vidrio, (c - 48, c - 48))
    for ang in range(0, 360, 45):
        x = c + math.cos(math.radians(ang)) * 48
        y = c + math.sin(math.radians(ang)) * 48
        pygame.draw.line(s, (70, 74, 84), (c, c), (x, y), 5)
    pygame.draw.circle(s, (70, 74, 84), (c, c), 16)
    pygame.draw.circle(s, (120, 126, 138), (c, c), 56, 6)
    reflejo = pygame.Surface((S, S), pygame.SRCALPHA)
    pygame.draw.arc(reflejo, (220, 255, 240, 130), (c - 40, c - 40, 80, 80), math.radians(100), math.radians(170), 6)
    s.blit(reflejo, (0, 0))
    # Cañones verdes debajo de la ventana
    for lado in (-1, 1):
        pygame.draw.circle(s, (30, 32, 36), (c + lado * 24, c + 70), 9)
        s.blit(brillo_radial(14, (90, 255, 120), 230, 1.2), (c + lado * 24 - 14, c + 56))
    return reducir(s, (tam, tam))


def crear_ala_x(tam=128):
    """Nave enemiga vista desde arriba, con la nariz apuntando hacia abajo."""
    S = 512
    c = S // 2
    s = pygame.Surface((S, S), pygame.SRCALPHA)
    blanco = [(238, 238, 232), (205, 205, 200), (170, 170, 168)]
    gris_cilindro = [(70, 70, 74), (215, 215, 210), (235, 235, 230), (110, 110, 112)]

    def ala(lado, dy=0, oscura=False):
        puntos = [(c + lado * 26, 150 + dy), (c + lado * 244, 112 + dy),
                  (c + lado * 244, 166 + dy), (c + lado * 26, 236 + dy)]
        colores = [(130, 130, 128), (95, 95, 95)] if oscura else blanco
        poligono_degradado(s, puntos, colores if lado > 0 else colores[::-1], vertical=False)
        if not oscura:
            # Franjas rojas (interpolando entre los bordes del ala)
            for desde, hasta, ancho in ((0.58, 0.74, 1), (0.80, 0.84, 1)):
                def borde(f, arriba):
                    a, b = (puntos[0], puntos[1]) if arriba else (puntos[3], puntos[2])
                    return (a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f)
                franja = [borde(desde, True), borde(hasta, True), borde(hasta, False), borde(desde, False)]
                poligono_degradado(s, franja, [(225, 60, 50), (160, 30, 30)])
            for f in (0.3, 0.45):  # Líneas de paneles
                x = c + lado * (26 + 218 * f)
                y1 = 150 + (112 - 150) * f
                y2 = 236 + (166 - 236) * f
                pygame.draw.line(s, (150, 150, 148), (x, y1 + 4), (x, y2 - 4), 2)
            pygame.draw.polygon(s, (120, 120, 118), puntos, 2)

    for lado in (-1, 1):
        ala(lado, dy=26, oscura=True)  # Ala inferior (más atrás y en sombra)
    for lado in (-1, 1):
        # Motores
        x = c + lado * 80
        rect_degradado(s, (x - 25, 34, 50, 190), gris_cilindro, vertical=False, radio=14)
        for y in (80, 130, 175):
            pygame.draw.line(s, (120, 120, 118), (x - 22, y), (x + 22, y), 2)
        pygame.draw.ellipse(s, (40, 30, 30), (x - 20, 26, 40, 22))
        s.blit(brillo_radial(44, (255, 120, 90), 220, 1.4), (x - 44, 37 - 44))
        s.blit(brillo_radial(16, (255, 230, 210), 255, 0.8), (x - 16, 37 - 16))
    for lado in (-1, 1):
        ala(lado)
        # Cañón láser en la punta del ala
        x = c + lado * 238
        rect_degradado(s, (x - 9, 110, 18, 110), gris_cilindro, vertical=False, radio=5)
        rect_degradado(s, (x - 5, 210, 10, 150), gris_cilindro, vertical=False, radio=3)
        rect_degradado(s, (x - 8, 340, 16, 28), [(90, 90, 92), (180, 180, 176), (70, 70, 72)], vertical=False, radio=4)
        pygame.draw.circle(s, (220, 60, 50), (x, 370), 5)

    # Fuselaje
    fuselaje = [(c - 26, 28), (c + 26, 28), (c + 31, 200), (c + 25, 330), (c + 15, 448),
                (c + 6, 502), (c - 6, 502), (c - 15, 448), (c - 25, 330), (c - 31, 200)]
    poligono_degradado(s, fuselaje, gris_cilindro, vertical=False)
    for y in (200, 330, 395):
        ancho = 30 if y < 300 else 22 if y < 360 else 18
        pygame.draw.line(s, (140, 140, 138), (c - ancho, y), (c + ancho, y), 2)
    franja = [(c - 20, 405), (c + 20, 405), (c + 17, 428), (c - 17, 428)]
    poligono_degradado(s, franja, [(150, 30, 30), (230, 70, 55), (150, 30, 30)], vertical=False)
    pygame.draw.polygon(s, (110, 110, 110), fuselaje, 2)
    # Cabina de vidrio
    cabina = [(c - 14, 220), (c + 14, 220), (c + 17, 270), (c + 10, 305), (c - 10, 305), (c - 17, 270)]
    poligono_degradado(s, cabina, [(70, 95, 130), (25, 35, 55), (10, 14, 22)])
    pygame.draw.polygon(s, (60, 62, 66), cabina, 3)
    pygame.draw.line(s, (60, 62, 66), (c - 16, 262), (c + 16, 262), 3)
    pygame.draw.line(s, (200, 225, 255), (c - 8, 228), (c - 11, 258), 3)
    # Droide astromecánico
    rect_degradado(s, (c - 15, 160, 30, 30), [(235, 240, 250), (150, 160, 180)], radio=15)
    pygame.draw.rect(s, (40, 90, 200), (c - 9, 168, 18, 6))
    pygame.draw.circle(s, (220, 40, 40), (c, 182), 3)
    return reducir(s, (tam, tam))


def crear_laser(color, tam):
    """Rayo láser: halo de color desenfocado + núcleo blanco."""
    w, h = tam[0] * 4, tam[1] * 4
    s = pygame.Surface((w, h), pygame.SRCALPHA)
    s.fill((*color, 0))
    pygame.draw.rect(s, (*color, 255), (w * 0.22, h * 0.08, w * 0.56, h * 0.84), border_radius=w // 3)
    s = desenfocar(s, 5)
    medio = tuple(min(255, v + 90) for v in color)
    pygame.draw.rect(s, (*medio, 255), (w * 0.33, h * 0.12, w * 0.34, h * 0.76), border_radius=w // 5)
    pygame.draw.rect(s, (255, 255, 255, 255), (w * 0.42, h * 0.16, w * 0.16, h * 0.68), border_radius=w // 10)
    return reducir(s, tam)


def crear_explosiones(cantidad=9, tam=128):
    """Bola de fuego + destello + onda expansiva + chispas + humo."""
    S = tam * 2
    c = S // 2
    rnd = random.Random(42)
    nubes = sorted([(rnd.uniform(0, 2 * math.pi), rnd.uniform(0, 1), rnd.uniform(0.28, 0.6))
                    for _ in range(22)], key=lambda n: -n[1])
    chispas = [(rnd.uniform(0, 2 * math.pi), rnd.uniform(0.7, 1.4), rnd.uniform(10, 30)) for _ in range(20)]
    calor = [(70, 60, 60), (190, 50, 20), (255, 120, 30), (255, 200, 70), (255, 250, 225)]
    frames = []
    for f in range(cantidad):
        t = f / (cantidad - 1)
        expansion = 1 - (1 - t) ** 2.2
        R = S * 0.30 * expansion + S * 0.07
        s = pygame.Surface((S, S), pygame.SRCALPHA)

        # Halo de luz anaranjada
        halo = brillo_radial(R * 1.35, (255, 140, 40), int(200 * (1 - t) ** 1.4), 1.8)
        s.blit(halo, halo.get_rect(center=(c, c)))

        # Bola de fuego: nubes que se enfrían (blanco -> amarillo -> rojo -> humo)
        fuego = pygame.Surface((S, S), pygame.SRCALPHA)
        fuego.fill((255, 120, 30, 0))
        for ang, dist, tam_nube in nubes:
            temperatura = (1 - t) ** 0.9 * (1 - dist * 0.45)
            color = paleta(calor, temperatura)
            alpha = int(255 * (1 - t) ** 0.7) if temperatura > 0.15 else int(170 * (1 - t))
            pos = (c + math.cos(ang) * dist * R * 0.75, c + math.sin(ang) * dist * R * 0.75 - t * 10)
            pygame.draw.circle(fuego, (*color, alpha), pos, max(2, tam_nube * R * (1 - 0.25 * t)))
        s.blit(desenfocar(fuego, 7), (0, 0))

        # Destello blanco inicial
        if t < 0.4:
            flash = brillo_radial(R * 0.7, (255, 255, 240), int(255 * (1 - t / 0.4)), 1.0)
            s.blit(flash, flash.get_rect(center=(c, c)))

        # Onda expansiva
        anillo = pygame.Surface((S, S), pygame.SRCALPHA)
        anillo.fill((255, 220, 180, 0))
        radio_anillo = min(S // 2 - 6, R * 1.45)
        pygame.draw.circle(anillo, (255, 220, 180, int(220 * (1 - t) ** 2.5)), (c, c), radio_anillo,
                           max(2, int(10 * (1 - t))))
        s.blit(desenfocar(anillo, 3), (0, 0))

        # Chispas que salen disparadas
        for ang, vel, largo in chispas:
            d = R * vel * 1.05
            largo_actual = largo * (1 - t) + 2
            p1 = (c + math.cos(ang) * d, c + math.sin(ang) * d)
            p2 = (c + math.cos(ang) * (d + largo_actual), c + math.sin(ang) * (d + largo_actual))
            pygame.draw.line(s, (255, 230, 150, int(255 * (1 - t) ** 1.5)), p1, p2, 4)
        frames.append(reducir(s, (tam, tam)))
    return frames


# =========================================================
# SONIDOS (WAV mono 16 bits)
# =========================================================
def guardar_wav(ruta, muestras):
    """
    Guarda una lista de muestras (números de -1 a 1) como archivo WAV.
    Un sonido digital es una lista de números que indican la posición de la
    membrana del parlante en cada instante (22050 números por segundo).
    struct.pack('<h', ...) convierte cada número en 2 bytes (entero de 16 bits).
    """
    with wave.open(ruta, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SAMPLE_RATE)
        datos = b''.join(struct.pack('<h', int(max(-1.0, min(1.0, m)) * 32000)) for m in muestras)
        w.writeframes(datos)


def sonido_laser():
    """
    "Piuu": una onda senoidal cuya frecuencia baja rápido (de agudo a grave)
    y cuyo volumen se apaga. La fase acumula cuánto avanzó la onda.
    """
    dur = 0.22
    n = int(SAMPLE_RATE * dur)
    fase, out = 0.0, []
    for i in range(n):
        t = i / n
        freq = 1400 * (1 - t) ** 2 + 180  # barrido descendente: "piuu"
        fase += 2 * math.pi * freq / SAMPLE_RATE
        onda = 0.6 * math.sin(fase) + 0.25 * math.sin(fase * 2.01)
        out.append(onda * (1 - t) ** 1.5 * 0.7)
    return out


def sonido_explosion():
    """
    Explosión: ruido blanco (números al azar = "shhh") que se va filtrando
    para sonar cada vez más grave, más un retumbe de baja frecuencia.
    math.exp(-4 * t) hace que el volumen caiga rápido, como un estallido.
    """
    rnd = random.Random(1)
    dur = 0.9
    n = int(SAMPLE_RATE * dur)
    out, filtro = [], 0.0
    for i in range(n):
        t = i / n
        ruido = rnd.uniform(-1, 1)
        filtro += (ruido - filtro) * (0.35 * (1 - t) + 0.03)  # filtro pasa bajos que se cierra
        grave = math.sin(2 * math.pi * (60 - 30 * t) * i / SAMPLE_RATE)
        out.append((filtro * 1.6 + grave * 0.5) * math.exp(-4 * t))
    return out


def musica_ambiente():
    """Loop de 16 segundos: colchón grave en modo menor + pulsos tipo timbal."""
    rnd = random.Random(5)
    compas = 2.0
    acordes = [(98.0, 116.5, 146.8), (87.3, 103.8, 130.8),
               (77.8, 98.0, 116.5), (73.4, 92.5, 110.0)]  # Sol m, Fa m, Mib, Re
    n_total = int(SAMPLE_RATE * compas * 8)
    out = []
    for i in range(n_total):
        seg = i / SAMPLE_RATE
        idx = int(seg // compas) % len(acordes)
        en_compas = seg % compas
        muestra = 0.0
        for f in acordes[idx]:
            muestra += math.sin(2 * math.pi * f * seg) * 0.12
            muestra += math.sin(2 * math.pi * f * 2 * seg + 0.3) * 0.04
        # Pulso de timbal en cada tiempo (marcha)
        tiempo = en_compas % 0.5
        muestra += math.sin(2 * math.pi * 55 * tiempo) * math.exp(-9 * tiempo) * 0.35
        # Shimmer agudo suave
        muestra += math.sin(2 * math.pi * acordes[idx][2] * 4 * seg) * 0.015 * (0.5 + 0.5 * math.sin(seg))
        muestra += rnd.uniform(-1, 1) * 0.004
        # Fundido para que el loop no haga "clic"
        borde = min(1.0, i / 2000, (n_total - i) / 2000)
        out.append(muestra * borde * 0.8)
    return out


def main():
    pygame.init()
    # Necesito una "pantalla" (aunque sea de 1x1 y falsa) para usar convert() y las fuentes
    pygame.display.set_mode((1, 1))
    os.makedirs(os.path.join(IMAGES, 'inicio'), exist_ok=True)
    os.makedirs(SOUNDS, exist_ok=True)

    # Función interna para guardar y mostrar en consola qué archivo se creó.
    # *ruta recibe cualquier cantidad de partes de la ruta ('inicio', 'star.png').
    def guardar(superficie, *ruta):
        pygame.image.save(superficie, os.path.join(IMAGES, *ruta))
        print('  imagen:', os.path.join(*ruta))

    guardar(crear_splash(), 'inicio', 'star.png')
    guardar(crear_fondo2(), 'fondo2.png')
    guardar(crear_fondo3(), 'fondo3.png')
    guardar(crear_fondo4(), 'fondo4.png')
    guardar(crear_caza_tie(), 'personaje1.png')
    guardar(crear_caza_tie(32), 'icono.png')
    guardar(crear_ala_x(), 'enemigo1.png')
    guardar(crear_laser((60, 255, 90), (14, 48)), 'laser.png')
    guardar(crear_laser((255, 50, 50), (12, 36)), 'laser_enemigo.png')
    for i, frame in enumerate(crear_explosiones()):
        guardar(frame, f'regularExplosion0{i:02d}.png')

    guardar_wav(os.path.join(SOUNDS, 'laser.wav'), sonido_laser())
    guardar_wav(os.path.join(SOUNDS, 'explosion.wav'), sonido_explosion())
    guardar_wav(os.path.join(SOUNDS, 'musica.wav'), musica_ambiente())

    pygame.quit()
    print(f'Assets generados en: {ASSETS_PATH}')


if __name__ == '__main__':
    main()
