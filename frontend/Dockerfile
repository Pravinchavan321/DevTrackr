FROM node:20-alpine

WORKDIR /app

# Copy all files including node_modules
COPY . .

# Expose port
EXPOSE 5173

# Run the development server
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
