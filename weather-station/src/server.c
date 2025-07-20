#include "http-parsing.h"
#include <netinet/in.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/param.h>
#include <sys/socket.h>
#include <time.h>
#include <unistd.h>


#define PORT 8080
#define RESPONSE_BODY_SIZE 64
#define OUTPUT_BUFFER_SIZE 500


char request_buffer[MAX_REQUEST_LEN] = { 0 };
char response_body[RESPONSE_BODY_SIZE] = { 0 };
char output_buffer[OUTPUT_BUFFER_SIZE] = { 0 };

int main(const int argc, char const* argv[]) {
        srand((unsigned int) time(NULL));

        const int server_fd = socket(AF_INET, SOCK_STREAM, 0);

        if (server_fd < 0) {
                perror("In socket");
                exit(EXIT_FAILURE);
        }

        const struct sockaddr_in address = { .sin_family = AF_INET,
                                             .sin_addr.s_addr = INADDR_ANY,
                                             .sin_port = htons(PORT) };
        memset((void*) address.sin_zero, '\0', sizeof address.sin_zero);

        const socklen_t addr_len = sizeof(address);

        if (bind(server_fd, (struct sockaddr*) &address, addr_len) < 0) {
                perror("In bind");
                exit(EXIT_FAILURE);
        }

        const int backlog_size = 10;
        if (listen(server_fd, backlog_size) < 0) {
                perror("In listen");
                exit(EXIT_FAILURE);
        }

        while (1) {
                printf(
                    "\n++++++++++ Waiting for new connection ++++++++++++\n\n");

                // accept() blocks thread and waits for an incoming connection
                const int socket = accept(server_fd,
                                          (struct sockaddr*) &address,
                                          (socklen_t*) &addr_len);

                if (socket < 0) {
                        perror("In accept");
                        exit(EXIT_FAILURE);
                }

                const ssize_t bytes_read =
                    read(socket, request_buffer, sizeof(request_buffer));
                if (bytes_read < 0) {
                        perror("Read error");
                        close(socket);
                        continue;
                }
                // Without this, the buffer may not be null-terminated if the request is too long!
                // This will cause a buffer overflow in the printf() below!
                request_buffer[MIN((size_t) bytes_read,
                                   sizeof(request_buffer) - 1)] = '\0';

                printf("Incoming request: \n\n");
                printf("%s\n", request_buffer);

                const enum httpVerb verb =
                    getHttpVerbFromRequest(request_buffer);
                const char* path = getHttpUriFromRequest(request_buffer);
                const size_t pathLen =
                    (size_t) strchr(path, ' ') - (size_t) path;

                unsigned int statusCode = 0;
                enum mimeType mime = 0;

                // Kubernetes readiness probe & healthcheck endpoints
                if (verb == GET && (MATCHES(path, pathLen, "/readyz") ||
                                    MATCHES(path, pathLen, "/healthz"))) {
                        statusCode = 200;
                        mime = JSON;
                        strcpy(response_body, "{\"success\":\"true\"}");
                } else if (verb == GET && MATCHES(path, pathLen, "/weather")) {
                        const int tempMin = -20;
                        const int tempMax = 50;

                        const int temperature =
                            tempMin + rand() % (tempMax - tempMin + 1);

                        statusCode = 200;
                        mime = JSON;
                        snprintf(response_body,
                                 sizeof(response_body),
                                 "{\"temperature\":%d,\"units\":\"celsius\"}",
                                 temperature);
                } else {
                        statusCode = 404;
                        mime = PLAIN_TEXT;
                        strcpy(response_body, "Not found.");
                }

                const response response = { .status = statusCode,
                                            .body = response_body,
                                            .bodyContentLen =
                                                strnlen(response_body,
                                                        RESPONSE_BODY_SIZE),
                                            .time = time(0),
                                            .mime = mime };

                createResponse(response, output_buffer, sizeof(output_buffer));

                printf("Response: \n\n");
                printf("%s\n", output_buffer);

                write(socket,
                      output_buffer,
                      strnlen(output_buffer, OUTPUT_BUFFER_SIZE));

                printf("------------------Response sent-------------------\n");

                close(socket);
        }
}
