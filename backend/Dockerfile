FROM node:18-alpine

# Install OpenSSL and libc compatibility layer required by Prisma
RUN apk add --no-cache openssl libc6-compat

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY prisma ./prisma/
RUN npx prisma generate
COPY . .
EXPOSE 8080
CMD ["npm", "start"]
