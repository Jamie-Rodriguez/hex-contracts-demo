#ifndef HTTP_PARSING_H
#define HTTP_PARSING_H

#include <stddef.h>
#include <time.h>


#define MAX_REQUEST_LEN 0x400

// Only works with string literals
#define MATCHES(runtime_str, len, static_str)                   \
        ((runtime_str) != NULL &&                               \
         strnlen(runtime_str, len) == sizeof(static_str) - 1 && \
         strncmp((runtime_str), (static_str), sizeof(static_str) - 1) == 0)


enum httpVerb { UNKNOWN = 0, GET = 1, POST = 2 };

enum mimeType { JSON = 0, PLAIN_TEXT = 1 };

typedef struct response {
        unsigned int status;
        enum mimeType mime;
        size_t bodyContentLen;
        time_t time;
        const char* body;
} response;


const char* getBodyFromHttpRequest(const char* request);
enum httpVerb getHttpVerbFromRequest(const char* request);
const char* getHttpUriFromRequest(const char* request);

void createHttpHeaderDateString(time_t time, char* dest, size_t destLen);
void createContentLengthLine(size_t, char* dest, size_t destLen);

void createResponse(response response, char* dest, size_t destLen);

#endif
