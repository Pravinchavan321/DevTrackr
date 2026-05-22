FROM node:20-bullseye-slim

WORKDIR /app

# Install dependencies inside the container to ensure native modules
# are built for the container environment.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
