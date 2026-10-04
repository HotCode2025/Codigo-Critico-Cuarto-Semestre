
# dar formato a un String

nombre = 'Ariel'
edad = 36
mensaje_con_formato = 'Mi nombre es %s y tengo %d años' %(nombre, edad) #%s posicion string y %d decimales al reves da error

#Creamos una tupla
persona = ('Carla', 'Gomez', 5000.00)
mensaje_con_formato = 'Hola %s %s . Tu sueldo es %.2f'#  %persona #Aqui le pasamos el objeto que es tupla
# print(mensaje_con_formato %persona)

nombre = 'Juan'
edad = 19
sueldo = 3000
#mensaje_con_formato = 'Nombre {}  Edad {} Sueldo {:.2f}'.format(nombre, edad, sueldo)
#print(mensaje_con_formato)

#mensaje = 'Nombre {0} Edad{1} Sueldo {2:.2f}'.format(nombre, edad, sueldo)
#print(mensaje)

mensaje = 'Nombre {n} Edad {e} Sueldo {s:.2f}'.format(n=nombre, e=edad, s=sueldo)
# print(mensaje)

diccionario = {'Nombre': 'Ivan', 'Edad': 35, 'Sueldo': 8000.00}
mensaje = 'Nombre {persona[Nombre]} Edad {persona[Edad]} Sueldo {persona[Sueldo]:.2f}'.format(persona=diccionario)
print(mensaje)






