FROM silkeh/clang:19 AS build
# RUN apk add --no-cache clang make
WORKDIR /weather-station/
COPY . .
RUN make release

FROM scratch AS final
COPY --from=build --chmod=755 /weather-station/bin/weather-station /bin/weather-station
EXPOSE 8080
ENTRYPOINT ["/bin/weather-station"]
