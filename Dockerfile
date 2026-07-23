# Gunakan Node.js versi 22
FROM node:22

# Folder kerja di dalam container
WORKDIR /app

# Copy package.json
COPY package*.json ./

# Install dependency
RUN npm install

# Copy semua source code
COPY . .

# Port backend
EXPOSE 8080

# Jalankan backend
CMD ["npm","start"]
