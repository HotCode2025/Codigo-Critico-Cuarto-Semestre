# Importamos la herramienta de Python que nos permite crear un registro o "bitácora" de todo lo que hace nuestro programa
import logging

# Configuramos cómo queremos que se escriba esta bitácora
logging.basicConfig(
    # 'level' define qué tan detallado será el registro. Al usar DEBUG, le pedimos que anote hasta el detalle más mínimo
    level=logging.DEBUG,

    # 'format' es la plantilla de cada anotación. Aquí pedimos que cada línea incluya:
    # la fecha y hora, el nombre del archivo, la gravedad del aviso y el mensaje en sí
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',

    # 'handlers' le dice al programa en dónde queremos guardar o mostrar estos mensajes
    handlers=[
        # El primero guarda todo por escrito en un archivo llamado 'laboratorio_usuarios.log' para revisarlo después
        logging.FileHandler('laboratorio_usuarios.log', encoding='utf-8'),

        # El segundo hace que los mensajes también vayan apareciendo en vivo en la pantalla o consola
        logging.StreamHandler()
    ]
)

# Finalmente, creamos nuestro "anotador" oficial (llamado logger) listo para ser usado en el resto de nuestro código
logger = logging.getLogger(__name__)