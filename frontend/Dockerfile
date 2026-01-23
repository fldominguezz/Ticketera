# Usa una imagen base de Node.js
FROM node:20-alpine

# Establece el directorio de trabajo dentro del contenedor
WORKDIR /app

# Copia package.json y package-lock.json (si existe) para instalar dependencias
COPY package*.json ./
RUN npm install

# Copia el resto del código de la aplicación
COPY . .

# Construye la aplicación Next.js
RUN npm run build

# Expone el puerto en el que la aplicación Next.js se ejecutará
EXPOSE 3000

# Comando para ejecutar la aplicación Next.js
CMD ["npm", "start"]
