FROM node:20-alpine

WORKDIR /app

# Install dependencies inside the Linux container so host node_modules
# never leak into the image.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

EXPOSE 5000

CMD ["npm", "start"]
