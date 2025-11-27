# Stage 1: Build
FROM maven:3.9.6-eclipse-temurin-17 AS build
WORKDIR /app

# Copy pom and download dependencies
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy source code and build
COPY src ./src
RUN mvn clean package -DskipTests

# Stage 2: Runtime
FROM eclipse-temurin:17-jdk-alpine
WORKDIR /app

# Copy the built jar from the build stage
COPY --from=build /app/target/*.jar ./app.jar

# Copy wait-for-it script
COPY wait-for-it.sh ./wait-for-it.sh
RUN chmod +x wait-for-it.sh

# Start backend only after DB is ready
ENTRYPOINT ["./wait-for-it.sh", "db:5432", "--timeout=60", "--strict", "--", "java", "-jar", "app.jar"]
