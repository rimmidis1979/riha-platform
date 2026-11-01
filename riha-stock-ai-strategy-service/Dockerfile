FROM eclipse-temurin:21-jre-alpine
LABEL maintainer="RIHA Software Solutions <dev@rihasoftwaresolutions.com>"
LABEL service="riha-stock-ai-strategy-service"
LABEL version="1.0.0"

RUN apk add --no-cache curl bash && addgroup -S appgroup && adduser -S appuser -G appgroup
WORKDIR /app
COPY target/riha-stock-ai-strategy-service-1.0.0.jar /app/app.jar
RUN chown appuser:appgroup /app/app.jar

USER appuser
EXPOSE 8093
ENV JAVA_OPTS="-Xms128m -Xmx384m -XX:+UseG1GC -Djava.security.egd=file:/dev/./urandom"
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /app/app.jar"]
