# Stage 1: Build the Next.js frontend
FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend
COPY ./frontend/package.json ./frontend/package-lock.json ./
RUN npm install
COPY ./frontend ./
RUN npm run build

# Stage 2: Setup the Python Flask backend
FROM python:3.10-slim AS backend
WORKDIR /app/backend
COPY ./server/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY ./server ./

# Install gunicorn to serve Flask
RUN pip install gunicorn

# Stage 3: Combine and run both frontend and backend
FROM node:18-alpine
WORKDIR /app

# Copy frontend build
COPY --from=frontend-builder /app/frontend/.next /app/frontend/.next
COPY --from=frontend-builder /app/frontend/public /app/frontend/public
COPY --from=frontend-builder /app/frontend/package.json /app/frontend/package.json
COPY --from=frontend-builder /app/frontend/node_modules /app/frontend/node_modules

# Copy backend
COPY --from=backend /app/backend /app/backend

# Install PM2 for managing processes
RUN npm install -g pm2

# Expose ports
EXPOSE 3000 5000

# Command to run both backend and frontend
CMD ["pm2-runtime", "start", "backend/app.py", "--interpreter=python3", "--name=flask-backend", "--", "gunicorn", "-b", "0.0.0.0:5000", "app:app", "--daemon", "--threads=2", "--workers=1", "frontend/package.json", "start"]
