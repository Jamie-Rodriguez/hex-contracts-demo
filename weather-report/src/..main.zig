const std = @import("std");

const RequestData = struct {
    temperature: f16,
    units: []const u8,
    comment: []const u8,
};

fn handleConnection(allocator: std.mem.Allocator, conn: std.net.Server.Connection) !void {
    defer conn.stream.close();

    // Disable Nagle's algorithm for immediate packet sending
    if (builtin.os.tag != .windows) {
        const sockfd = conn.stream.handle;
        const tcp_nodelay: c_int = 1;
        _ = std.posix.setsockopt(
            sockfd,
            std.posix.IPPROTO.TCP,
            std.posix.TCP.NODELAY,
            std.mem.asBytes(&tcp_nodelay),
        ) catch |err| {
            std.debug.print("Warning: Failed to set TCP_NODELAY: {}\n", .{err});
        };
    }

    var buffer: [0xA00]u8 = undefined;
    var httpServer = std.http.Server.init(conn, &buffer);

    // Handle exactly one request per connection
    if (httpServer.state == .ready) {
        var req = httpServer.receiveHead() catch |err| switch (err) {
            error.HttpConnectionClosing => return,
            else => return err,
        };

        // Simple response for testing
        const response_options = std.http.Server.Request.RespondOptions{
            .status = .ok,
            .keep_alive = false,
            .version = .@"HTTP/1.0", // Force HTTP/1.0 to ensure connection close
            .extra_headers = &[_]std.http.Header{
                .{ .name = "connection", .value = "close" },
                .{ .name = "content-type", .value = "text/plain" },
            },
        };

        switch (req.head.method) {
            .GET => {
                if (std.mem.eql(u8, req.head.target, "/readyz") or
                    std.mem.eql(u8, req.head.target, "/healthz"))
                {
                    try req.respond("OK\n", response_options);
                } else {
                    var not_found_opts = response_options;
                    not_found_opts.status = .not_found;
                    try req.respond("Not Found\n", not_found_opts);
                }
            },
            .POST => {
                if (std.mem.eql(u8, req.head.target, "/report") and
                    req.head.content_type != null and
                    std.mem.startsWith(u8, req.head.content_type.?, "application/json"))
                {
                    const contentLength = req.head.content_length orelse {
                        var bad_req_opts = response_options;
                        bad_req_opts.status = .bad_request;
                        try req.respond("No content\n", bad_req_opts);
                        return;
                    };

                    const body = try allocator.alloc(u8, contentLength);
                    defer allocator.free(body);

                    const reader = try req.reader();
                    _ = try reader.readAll(body);

                    // For now, just return a simple success response
                    try req.respond("Success\n", response_options);
                } else {
                    var bad_req_opts = response_options;
                    bad_req_opts.status = .bad_request;
                    try req.respond("Bad Request\n", bad_req_opts);
                }
            },
            else => {
                var method_opts = response_options;
                method_opts.status = .method_not_allowed;
                try req.respond("Method Not Allowed\n", method_opts);
            },
        }
    }
}

pub fn main() !void {
    const port_str = std.posix.getenv("PORT") orelse "8080";
    const port_number = std.fmt.parseInt(u16, port_str, 10) catch 8080;

    std.debug.print("Starting minimal server on port: {d}\n", .{port_number});

    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    const address = try std.net.Address.parseIp4("0.0.0.0", port_number);
    var server = try address.listen(.{ .reuse_address = true });
    defer server.deinit();

    while (true) {
        const conn = try server.accept();
        handleConnection(allocator, conn) catch |err| {
            std.debug.print("Connection error: {}\n", .{err});
        };
    }
}

const builtin = @import("builtin");