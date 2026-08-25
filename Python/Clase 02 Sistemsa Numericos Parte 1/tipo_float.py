# Profundizando en el tipo Float
a = 3.0
print(f'a: {a:.2f}') #sirve para achicar numero o agrandar

# Constructor de tipo float -> puede recibir int y str
a = float(10) #Le pasamos un tipo entero (int)
a = float('10')
print(f'a: {a:.2f}')

# Notación exponencial (valores positivos o negativos)
a = 3e5
print(f'a: {a}') #al numero 3 le agregamos 5 ceros
