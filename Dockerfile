# ---------------- STAGE 1: Build cms-auth-frontend ----------------
FROM node:22-alpine AS auth-builder
WORKDIR /app
COPY cms-auth-frontend/package*.json ./
RUN npm install --no-audit --no-fund --legacy-peer-deps
COPY cms-auth-frontend/ ./
RUN touch .env && sed -i '/VITE_API_URL/d' .env || true
RUN echo "VITE_API_URL=/auth-api" >> .env
RUN npm run build

# ---------------- STAGE 2: Build solarkits-admin-panel-frontend ----------------
FROM node:22-alpine AS admin-builder
WORKDIR /app
COPY solarkits-admin-panel-frontend/package*.json ./
RUN npm install --no-audit --no-fund --legacy-peer-deps
COPY solarkits-admin-panel-frontend/ ./
RUN touch .env && sed -i '/VITE_API_URL/d' .env || true
RUN sed -i '/VITE_AUTH_API_URL/d' .env || true
RUN echo "VITE_API_URL=/admin-api" >> .env
RUN echo "VITE_AUTH_API_URL=/auth-api" >> .env
RUN npm run build

# ---------------- STAGE 3: Build solarkits-developer-panel-frontend ----------------
FROM node:22-alpine AS developer-builder
WORKDIR /app
COPY solarkits-developer-panel-frontend/package*.json ./
RUN npm install --no-audit --no-fund --legacy-peer-deps
COPY solarkits-developer-panel-frontend/ ./
RUN touch .env && sed -i '/VITE_API_URL/d' .env || true
RUN echo "VITE_API_URL=/developer-api" >> .env
RUN npm run build

# ---------------- STAGE 4: Build solarkits-operation-management-panel-frontend ----------------
FROM node:22-alpine AS operation-builder
WORKDIR /app
COPY solarkits-operation-management-panel-frontend/package*.json ./
RUN npm install --no-audit --no-fund --legacy-peer-deps
COPY solarkits-operation-management-panel-frontend/ ./
RUN touch .env && sed -i '/VITE_API_URL/d' .env || true
RUN echo "VITE_API_URL=/operation-management-api" >> .env
RUN npm run build

# ---------------- STAGE 5: Build solarkits-warehouse-panel-frontend ----------------
FROM node:22-alpine AS warehouse-builder
WORKDIR /app
COPY solarkits-warehouse-panel-frontend/package*.json ./
RUN npm install --no-audit --no-fund --legacy-peer-deps
COPY solarkits-warehouse-panel-frontend/ ./
RUN touch .env && sed -i '/VITE_API_URL/d' .env || true
RUN echo "VITE_API_URL=/warehouse-api" >> .env
RUN npm run build -- --base=/warehouse-management-panel/

# ---------------- STAGE 6: Build solarkits-account-panel-frontend ----------------
FROM node:22-alpine AS account-builder
WORKDIR /app
COPY solarkits-account-panel-frontend/package*.json ./
RUN npm install --no-audit --no-fund --legacy-peer-deps
COPY solarkits-account-panel-frontend/ ./
RUN touch .env && sed -i '/VITE_API_URL/d' .env || true
RUN echo "VITE_API_URL=/account-api" >> .env
RUN npm run build

# ---------------- STAGE 7: Build solarkits-epc-panel-frontend ----------------
FROM node:22-alpine AS epc-builder
WORKDIR /app
COPY solarkits-epc-panel-frontend/package*.json ./
RUN npm install --no-audit --no-fund --legacy-peer-deps
COPY solarkits-epc-panel-frontend/ ./
RUN touch .env && sed -i '/VITE_API_URL/d' .env || true
RUN echo "VITE_API_URL=/api" >> .env
RUN npm run build

# ---------------- STAGE 8: Build solarkits-solarshop-india-frontend ----------------
FROM node:22-alpine AS solarshop-builder
WORKDIR /app
COPY solarkits-solarshop-india-frontend/package*.json ./
RUN npm install --no-audit --no-fund --legacy-peer-deps
COPY solarkits-solarshop-india-frontend/ ./
RUN touch .env && sed -i '/VITE_API_URL/d' .env || true
RUN echo "VITE_API_URL=/api" >> .env
RUN npm run build -- --base=/solarshop-india/

# ---------------- STAGE 9: Build supplier-panel-frontend ----------------
FROM node:22-alpine AS supplier-builder
WORKDIR /app
COPY supplier-panel-frontend/package*.json ./
RUN npm install --no-audit --no-fund --legacy-peer-deps
COPY supplier-panel-frontend/ ./
RUN touch .env && sed -i '/VITE_API_URL/d' .env || true
RUN echo "VITE_API_URL=/supplier-api" >> .env
RUN npm run build -- --base=/supplier-panel/


# ---------------- STAGE 10: Runner (Nginx + Node.js backend) ----------------
FROM nginx:alpine
RUN apk add --no-cache nodejs npm

WORKDIR /app

# Copy and install backend dependencies
COPY solarkits-central-backend/package*.json ./
RUN npm install --production --no-audit --no-fund --legacy-peer-deps

# Copy backend source
COPY solarkits-central-backend/ ./

# Copy built frontend assets from builder stages to Nginx directories
COPY --from=auth-builder /app/dist /usr/share/nginx/html/auth
COPY --from=admin-builder /app/dist /usr/share/nginx/html/admin-panel
COPY --from=developer-builder /app/dist /usr/share/nginx/html/developer-panel
COPY --from=operation-builder /app/dist /usr/share/nginx/html/operation-management-panel
COPY --from=warehouse-builder /app/dist /usr/share/nginx/html/warehouse-management-panel
COPY --from=account-builder /app/dist /usr/share/nginx/html/account-panel
COPY --from=epc-builder /app/dist /usr/share/nginx/html/epc-panel
COPY --from=solarshop-builder /app/dist /usr/share/nginx/html/solarshop-india
COPY --from=supplier-builder /app/dist /usr/share/nginx/html/supplier-panel

# Copy nginx template configuration
COPY nginx.prod.conf.template /etc/nginx/templates/default.conf.template

# Copy startup script
COPY start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 80
CMD ["/start.sh"]
