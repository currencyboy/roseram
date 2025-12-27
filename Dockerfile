# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy application code
COPY . .

# Create public directory if it doesn't exist
RUN mkdir -p /app/public

# Build the Next.js application with dummy Supabase values to allow build to complete
RUN NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co \
    NEXT_PUBLIC_SUPABASE_PROJECT_URL=https://placeholder.supabase.co \
    SUPABASE_SERVICE_ROLE=placeholder-key \
    NEXT_PUBLIC_SUPABASE_ANON=placeholder-key \
    npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --only=production

# Copy built application from builder
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.js ./next.config.js

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3001/ || exit 1

# Start the application
EXPOSE 3001
CMD ["npm", "run", "start"]
