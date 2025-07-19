FROM alpine:3.22.0 AS build
RUN apk add --no-cache zig
WORKDIR /weather-report/
COPY build.zig ./
COPY src/ ./src/
RUN zig build --release=fast

FROM scratch AS final
COPY template.html /template.html
COPY --from=build --chmod=755 /weather-report/zig-out/bin/weather-report /bin/weather-report
EXPOSE 8080
ENTRYPOINT ["/bin/weather-report"]
