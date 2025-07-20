#include "http-parsing.h"
#include <stdbool.h>
#include <stdio.h>
#include <string.h>

static const char* serverLine = "Server: Jamie's Server (1.0.0)";

const char* getBodyFromHttpRequest(const char* request) {
        if (request == NULL) return NULL;

        // HTTP body starts after the first occurrence of \r\n\r\n
        const char* bodyStart = strstr(request, "\r\n\r\n");
        if (bodyStart != NULL) return bodyStart + 4;

        // Some non-standard implementations might use just \n\n
        bodyStart = strstr(request, "\n\n");
        if (bodyStart != NULL) return bodyStart + 2;

        return NULL;
}

enum httpVerb getHttpVerbFromRequest(const char* request) {
        // Find the first space to determine verb length
        const char* firstSpace = strchr(request, ' ');
        if (firstSpace == NULL) { return UNKNOWN; }

        const size_t verbLength = (size_t) (firstSpace - request);

        // Check each verb by comparing only the prefix
        if (MATCHES(request, verbLength, "GET"))
                return GET;
        else if (MATCHES(request, verbLength, "POST"))
                return POST;
        else
                return UNKNOWN;
}

const char* getHttpUriFromRequest(const char* request) {
        // Assume the URI will be the second space-delimited token
        char* dest = strchr(request, ' ');
        dest = strchr(dest, ' ');
        dest = dest + 1;

        return dest;
}

void createHttpHeaderDateString(time_t time, char* dest, size_t destLen) {
        const struct tm* tm = gmtime(&time);
        strftime(dest, destLen, "Date: %a, %d %b %Y %H:%M:%S GMT", tm);
}

void createContentLengthLine(size_t n, char* dest, size_t destLen) {
        snprintf(dest, destLen, "Content-Length: %zu", n);
}

void createResponse(response response, char* dest, size_t destLen) {
        const char* statusLine;
        switch (response.status) {
                case 200:
                        statusLine = "HTTP/1.1 200 OK";
                        break;
                case 404:
                        statusLine = "HTTP/1.1 404 Not Found";
                        break;
                default:
                        statusLine = "HTTP/1.1 500 Internal Server Error";
                        break;
        }

        const char* contentType;
        switch (response.mime) {
                case JSON:
                        contentType = "application/json";
                        break;
                case PLAIN_TEXT:
                        contentType = "text/plain; charset=UTF-8";
                        break;
                default:
                        contentType = "application/octet-stream";
                        break;
        }

        char dateLine[64];
        createHttpHeaderDateString(response.time, dateLine, sizeof(dateLine));

        snprintf(dest,
                 destLen,
                 "%s\r\n"
                 "%s\r\n"
                 "Content-Type: %s\r\n"
                 "Content-Length: %zu\r\n"
                 "%s\r\n"
                 "\r\n"
                 "%s",
                 statusLine,
                 dateLine,
                 contentType,
                 response.bodyContentLen,
                 serverLine,
                 response.body);
}
