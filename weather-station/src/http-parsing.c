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
        if (verbLength == 3 && BEGINS_WITH(request, "GET") == 0) {
                return GET;
        } else if (verbLength == 4 && BEGINS_WITH(request, "POST") == 0) {
                return POST;
        } else {
                return UNKNOWN;
        }
}

const char* getHttpUriFromRequest(const char* request) {
        // Assume the URI will be the second space-delimited token
        char* dest = strchr(request, ' ');
        dest = strchr(dest, ' ');
        dest = dest + 1;

        return dest;
}

// void createHttpHeaderDateString(time_t time, char *dest, size_t destLen) {
//         // time_t conforms to time protocol as seen in RFC 868
//         const struct tm tm = *gmtime(&time);
//         // gcc sets the timezone to "GMT", clang uses "UTC"
//         // Explicitly set tm_zone to avoid cross-platform differences
//         memccpy(tm.tm_zone, "UTC", '\0', 3);
//         strftime(dest, destLen, "Date: %a, %d %b %Y %H:%M:%S %Z", &tm);
// }

void createHttpHeaderDateString(time_t time, char* dest, size_t destLen) {
        const struct tm* tm = gmtime(&time);
        strftime(dest, destLen, "Date: %a, %d %b %Y %H:%M:%S GMT", tm);
}

void createContentLengthLine(size_t n, char* dest, size_t destLen) {
        snprintf(dest, destLen, "Content-Length: %zu", n);
}

// void createResponse(response response, char *dest, size_t destLen) {
//         char statusLine[64];
//         memset(statusLine, 0, sizeof(statusLine));
//         char dateLine[64];
//         memset(dateLine, 0, sizeof(dateLine));
//         char contentTypeLine[64];
//         memset(contentTypeLine, 0, sizeof(contentTypeLine));
//         char contentLengthLine[32];
//         memset(contentLengthLine, 0, sizeof(contentLengthLine));

//         if (response.status == 200) {
//                 memccpy(statusLine,
//                         "HTTP/1.1 200 OK",
//                         '\0',
//                         sizeof(statusLine));
//         } else if (response.status == 404) {
//                 memccpy(statusLine,
//                         "HTTP/1.1 404 Not Found",
//                         '\0',
//                         sizeof(statusLine));
//         } else {
//                 memccpy(statusLine,
//                         "HTTP/1.1 500 Internal Server Error",
//                         '\0',
//                         sizeof(statusLine));
//         }

//         createHttpHeaderDateString(response.time, dateLine, sizeof(dateLine));

//         if (response.mime == JSON) {
//                 memccpy(contentTypeLine,
//                         "Content-Type: application/json",
//                         '\0',
//                         sizeof(contentTypeLine));
//         } else if (response.mime == PLAIN_TEXT) {
//                 memccpy(contentTypeLine,
//                         "Content-Type: text/plain; charset=UTF-8",
//                         '\0',
//                         sizeof(contentTypeLine));
//         } else {
//                 memccpy(contentTypeLine,
//                         "Content-Type: application/octet-stream",
//                         '\0',
//                         sizeof(contentTypeLine));
//         }

//         createContentLengthLine(response.bodyContentLen,
//                                 contentLengthLine,
//                                 sizeof(contentLengthLine));

//         snprintf(dest,
//                  destLen,
//                  "%s\r\n%s\r\n%s\r\n%s\r\n%s\r\n\r\n%s",
//                  statusLine,
//                  dateLine,
//                  contentTypeLine,
//                  contentLengthLine,
//                  serverLine,
//                  response.body);
// }


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
