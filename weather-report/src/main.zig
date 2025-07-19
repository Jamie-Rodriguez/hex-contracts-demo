const std = @import("std");
const builtin = @import("builtin");

const RequestData = struct {
    temperature: f16,
    units: []const u8,
    comment: []const u8,
};

fn handleConnection(allocator: std.mem.Allocator, conn: std.net.Server.Connection) !void {
    defer conn.stream.close();

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

    if (httpServer.state == .ready) {
        var req = httpServer.receiveHead() catch |err| switch (err) {
            error.HttpConnectionClosing => return,
            else => return err,
        };

        switch (req.head.method) {
            .GET => {
                if (std.mem.eql(u8, req.head.target, "/readyz") or
                    std.mem.eql(u8, req.head.target, "/healthz"))
                {
                    try req.respond("", .{ .status = .ok });
                } else {
                    try req.respond("", .{ .status = .not_found });
                }
            },
            .POST => {
                if (std.mem.eql(u8, req.head.target, "/report")) {
                    if (req.head.content_type != null and
                        std.mem.startsWith(u8, req.head.content_type.?, "application/json"))
                    {
                        const contentLength = req.head.content_length orelse {
                            try req.respond("No content", .{ .status = .bad_request });
                            return;
                        };

                        const body = try allocator.alloc(u8, contentLength);
                        defer allocator.free(body);

                        const reader = try req.reader();
                        const bytesRead = try reader.readAll(body);
                        if (bytesRead != contentLength) {
                            try req.respond("Incomplete body", .{ .status = .bad_request });
                            return;
                        }

                        const parsed = std.json.parseFromSlice(RequestData, allocator, body, .{}) catch {
                            try req.respond("Invalid JSON in body", .{ .status = .bad_request, .extra_headers = &[_]std.http.Header{.{ .name = "content-type", .value = "text/plain; charset=utf-8" }} });
                            return;
                        };
                        defer parsed.deinit();

                        if (parsed.value.temperature < -30 or parsed.value.temperature > 50) {
                            try req.respond("Invalid temperature", .{ .status = .bad_request, .extra_headers = &[_]std.http.Header{.{ .name = "content-type", .value = "text/plain; charset=utf-8" }} });
                            return;
                        }

                        if (!std.mem.eql(u8, parsed.value.units, "celsius") and !std.mem.eql(u8, parsed.value.units, "fahrenheit")) {
                            try req.respond("Invalid units", .{ .status = .bad_request, .extra_headers = &[_]std.http.Header{.{ .name = "content-type", .value = "text/plain; charset=utf-8" }} });
                            return;
                        }

                        // Handle template file not found gracefully
                        const templateFile = std.fs.cwd().openFile("template.html", .{}) catch |err| {
                            std.debug.print("Failed to open template.html: {}\n", .{err});
                            try req.respond("Template not found", .{ .status = .internal_server_error, .extra_headers = &[_]std.http.Header{.{ .name = "content-type", .value = "text/plain; charset=utf-8" }} });
                            return;
                        };
                        defer templateFile.close();

                        const templateContent = templateFile.reader().readAllAlloc(allocator, 0x800) catch |err| {
                            std.debug.print("Failed to read template.html: {}\n", .{err});
                            try req.respond("Template read error", .{ .status = .internal_server_error, .extra_headers = &[_]std.http.Header{.{ .name = "content-type", .value = "text/plain; charset=utf-8" }} });
                            return;
                        };
                        defer allocator.free(templateContent);

                        const now = std.time.timestamp();
                        const epochSeconds = std.time.epoch.EpochSeconds{ .secs = @as(u64, @intCast(now)) };
                        const yearDay = epochSeconds.getEpochDay().calculateYearDay();
                        const monthDay = yearDay.calculateMonthDay();

                        var dateBuffer: [10]u8 = undefined;
                        const dateStr = try std.fmt.bufPrint(&dateBuffer, "{d}-{:0>2}-{:0>2}", .{
                            yearDay.year,
                            monthDay.month.numeric(),
                            monthDay.day_index + 1,
                        });

                        var temperatureBuffer: [8]u8 = undefined;
                        const temperatureStr = try std.fmt.bufPrint(&temperatureBuffer, "{d}", .{parsed.value.temperature});

                        const dateReplaced = try std.mem.replaceOwned(u8, allocator, templateContent, "<!-- PLACEHOLDER_DATE -->", dateStr);
                        defer allocator.free(dateReplaced);

                        const temperatureReplaced = try std.mem.replaceOwned(u8, allocator, dateReplaced, "<!-- PLACEHOLDER_TEMPERATURE -->", temperatureStr);
                        defer allocator.free(temperatureReplaced);

                        const finalHtml = try std.mem.replaceOwned(u8, allocator, temperatureReplaced, "<!-- PLACEHOLDER_COMMENT -->", parsed.value.comment);
                        defer allocator.free(finalHtml);

                        try req.respond(finalHtml, .{ .extra_headers = &[_]std.http.Header{.{ .name = "content-type", .value = "text/html; charset=utf-8" }} });

                        std.debug.print("Handling JSON GET request with content length: {d}\n", .{contentLength});
                    } else {
                        try req.respond("Invalid Content-Type", .{ .status = .bad_request, .extra_headers = &[_]std.http.Header{.{ .name = "content-type", .value = "text/plain; charset=utf-8" }} });
                    }
                } else {
                    try req.respond("Invalid path", .{ .status = .bad_request, .extra_headers = &[_]std.http.Header{.{ .name = "content-type", .value = "text/plain; charset=utf-8" }} });
                }
            },
            else => {
                try req.respond("Method not allowed", .{ .status = .method_not_allowed, .extra_headers = &[_]std.http.Header{.{ .name = "content-type", .value = "text/plain; charset=utf-8" }} });
            },
        }
    }
}

pub fn main() !void {
    const stdout_writer = std.io.getStdOut().writer();

    const port_env_var_name = "PORT";
    const port_str: []const u8 = std.posix.getenv(port_env_var_name) orelse "8080";
    const port_number: u16 = std.fmt.parseInt(u16, port_str, 10) catch 8080;

    try stdout_writer.print("Using port: {d}\n", .{port_number});

    // Bind to IPv4 explicitly like the C server does with INADDR_ANY
    const address = try std.net.Address.parseIp4("0.0.0.0", port_number);

    var server = try address.listen(std.net.Address.ListenOptions{ .reuse_address = true });
    defer server.deinit();

    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    while (true) {
        handleConnection(allocator, try server.accept()) catch |err| {
            std.debug.print("Failed to handle connection, reason: {}\n", .{err});
        };
    }
}
