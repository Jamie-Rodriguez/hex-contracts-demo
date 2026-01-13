FROM silkeh/clang:19 AS build
WORKDIR /weather-station/
COPY weather-station/ .
RUN make release

FROM scratch AS final
COPY --from=build --chmod=755 /weather-station/bin/weather-station /bin/weather-station
EXPOSE 8080
ENTRYPOINT ["/bin/weather-station"]
