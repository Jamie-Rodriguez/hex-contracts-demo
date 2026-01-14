FROM silkeh/clang:19 AS build
WORKDIR /weather-station/
COPY weather-station/ .
RUN make release && chmod 755 bin/weather-station

FROM scratch AS final
COPY --from=build /weather-station/bin/weather-station /bin/weather-station
EXPOSE 8080
ENTRYPOINT ["/bin/weather-station"]
