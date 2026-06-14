# ── Stage 1: Build ──────────────────────────────────────────────
FROM eclipse-temurin:17-jdk-alpine AS builder
WORKDIR /app

# Copy Maven wrapper and pom first (layer-cache dependencies)
COPY pom.xml .
COPY .mvn/ .mvn/
RUN --mount=type=cache,target=/root/.m2 \
    mvn dependency:go-offline -q 2>/dev/null || true

COPY src/ src/
RUN --mount=type=cache,target=/root/.m2 \
    mvn clean package -DskipTests -q && \
    mv target/backend-*.jar target/app.jar

# ── Stage 2: Runtime ─────────────────────────────────────────────
FROM eclipse-temurin:17-jre-alpine AS runtime

# Security: run as non-root
RUN addgroup -S quizhub && adduser -S quizhub -G quizhub
WORKDIR /app

# Copy only the fat jar
COPY --from=builder --chown=quizhub:quizhub /app/target/app.jar app.jar

USER quizhub

# JVM flags: container-aware heap, crash on OOM, fast startup
ENV JAVA_OPTS="-XX:+UseContainerSupport \
  -XX:MaxRAMPercentage=75.0 \
  -XX:+ExitOnOutOfMemoryError \
  -Djava.security.egd=file:/dev/./urandom \
  -Dspring.profiles.active=${SPRING_PROFILES_ACTIVE:-prod}"

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD wget -qO- http://localhost:8080/actuator/health || exit 1

ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar app.jar"]
