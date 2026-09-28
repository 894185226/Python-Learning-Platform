# ===================================================
# Python 基础学习平台 - Docker 镜像
# 技术栈：Node.js 20 + MySQL 8
# ===================================================

# ---- 构建阶段 ----
FROM node:20-alpine AS builder

WORKDIR /app

# 复制依赖文件（利用 Docker 层缓存）
COPY package.json package-lock.json ./

# 仅安装生产依赖
RUN npm ci --omit=dev && npm cache clean --force

# ---- 运行阶段 ----
FROM node:20-alpine

# 创建非 root 用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

WORKDIR /app

# 从构建阶段复制 node_modules
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules

# 复制应用代码
COPY --chown=nodejs:nodejs . .

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# 使用非 root 用户运行
USER nodejs

# 启动命令
CMD ["node", "server.js"]