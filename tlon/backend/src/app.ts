// app.ts
import Fastify from "fastify";
import fs from "fs";
import path from "path";
import fastifyCors from "@fastify/cors";
import fastifyJwt from "@fastify/jwt";
import fastifyCookie from "@fastify/cookie";
import fastifyMultipart from "@fastify/multipart";
import { Server } from "socket.io";
import rateLimit from "@fastify/rate-limit";
import helmet from "@fastify/helmet";
import { initEmailService } from "./services/email.service";
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod";
import { errorResponseSchema } from "./schemas";

// Import routes
import authRoutes from "./modules/auth/routes.js";
import userRoutes from "./modules/user/routes.js";

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection:", reason);
});
process.on("uncaughtException", err => {
  console.error("Uncaught Exception:", err);
});

// Create Fastify instance
/**
 * @type {import('fastify').FastifyInstance} Instance of Fastify
 */
let fastify: import("fastify").FastifyInstance;

if (!process.env.SSL_KEY || !process.env.SSL_CERT) {
  console.error("ERROR: SSL certificates not found.");
  process.exit(1);
}

const keyPath = process.env.SSL_KEY;
const certPath = process.env.SSL_CERT;

try {
  fastify = Fastify({
    logger: true,
    https: {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath),
    },
  });
} catch (error: any) {
  console.error(
    `ERROR reading SSL certificates: ${error?.message || "Unknown error"}`
  );
  process.exit(1);
}

// Cookies names
const JWT_COOKIE_NAME = process.env.JWT_COOKIE_NAME as string;
const CSRF_COOKIE_NAME = process.env.CSRF_COOKIE_NAME as string;

// Register plugins
const frontendUrls = [
  process.env.FRONTEND_HTTPS_URL,
  process.env.FRONTEND_NGINX_URL,
  process.env.FRONTEND_BY_IP_URL,
].filter(Boolean) as string[];

fastify.register(fastifyCors, {
  origin: frontendUrls,
  credentials: true,
  methods: ["GET", "PUT", "POST", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "X-CSRF-Token",
  ],
  exposedHeaders: ["Content-Disposition", "Set-Cookie"],
  // Allow credentials for CORS
  preflightContinue: false,
  optionsSuccessStatus: 204,
  maxAge: 600, // 10 minutes
  preflight: true,
});

// Register cookie plugin for HttpOnly cookies
fastify.register(fastifyCookie);

if (!process.env.JWT_SECRET) {
  fastify.log.error("JWT_SECRET is not set");
  process.exit(1);
}

fastify.register(fastifyJwt, {
  secret: process.env.JWT_SECRET as string,
  cookie: {
    cookieName: JWT_COOKIE_NAME,
    signed: false,
  },
});

// Register multipart for file uploads
fastify.register(fastifyMultipart, {
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB limit
    files: 1,
  },
  attachFieldsToBody: false,
});

// Register rate limiting
fastify.register(rateLimit, {
  global: true,
  max: 5000,
  timeWindow: "1 minute",
  skipOnError: true,
  keyGenerator: req => req.ip,
});

// Register helmet plugin for security headers
fastify.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "validator.swagger.io", ...frontendUrls],
      fontSrc: ["'self'", "data:"],
    },
  },
  crossOriginResourcePolicy: { policy: "cross-origin" },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
});

// Global preHandler hook for request processing
fastify.addHook("preHandler", async (request, reply) => {
  if (request.body) {
    // Sanitize string fields
    const sanitize = (obj: any, parentKey?: string) => {
      if (!obj || typeof obj !== "object") return;

      Object.entries(obj).forEach(([key, value]) => {
        if (typeof value === "string") {
          // Skip sanitization for password fields
          const isPasswordField =
            key.toLowerCase().includes("password") ||
            key.toLowerCase() === "pwd" ||
            key.toLowerCase() === "pass";
          // Skip sanitization for password fields - passwords are hashed immediately
          // and never displayed, so XSS sanitization would only corrupt legitimate
          // special characters needed for strong passwords
          if (!isPasswordField) {
            // Basic XSS prevention for non-password fields
            obj[key] = value.replace(/[<>&'"]/g, "");
          }
        } else if (value && typeof value === "object") {
          sanitize(value, key);
        }
      });
    };

    sanitize(request.body);
  }
  // Normalize method and URL to non-undefined strings
  const method = request.raw.method ?? "";
  const url = request.raw.url ?? "";

  // Define pre-authentication routes
  const preAuthRoutes = [
    "/api/auth/register",
    "/api/auth/login",
    "/api/auth/google-login",
    "/api/auth/forgot-password",
    "/api/auth/reset-password",
    "/api/auth/enable-2fa",
    "/api/auth/verify-2fa",
    "/api/auth/refresh-token",
  ];

  // Skip security for pre-authentication routes
  if (preAuthRoutes.some(route => url.startsWith(route))) {
    return;
  }

  const publicRoutes = [
    "/api/health",
    "/api/auth/status",
    "/api/users/status",
    "/api/users/avatar/",
    "/api/auth/verify-email",
    "/api/users/getUsers",
    "/api/users/isAdmin",
    "/api/users/:id/role",
  ];

  // JWT Verification for all authenticated routes
  const isPublicEndpoint = (url: string) =>
    publicRoutes.some(route => url.startsWith(route));
  try {
    await request.jwtVerify();
  } catch (err) {
    // Allow GET requests to public endpoints
    if (method === "GET" && isPublicEndpoint(url)) {
      return;
    }
    return reply
      .status(401)
      .send({ code: "UNAUTHORIZED", message: "Unauthorized" });
  }

  // CSRF protection for state-changing methods
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    const csrfCookie = request.cookies[CSRF_COOKIE_NAME];
    const csrfHeader = request.headers["x-csrf-token"];
    if (!csrfCookie || csrfHeader !== csrfCookie) {
      return reply
        .status(403)
        .send({ code: "FORBIDDEN", message: "Invalid CSRF token" });
    }
  }
});

// Docker nginx healthcheck route
fastify.get("/api/health", async (request, reply) => {
  return reply.status(200).send({ success: true });
});

// Set validators and serializers (zod)
fastify.setValidatorCompiler(validatorCompiler);
fastify.setSerializerCompiler(serializerCompiler);

// Setup routes
fastify.register(authRoutes, { prefix: "/api/auth" });
fastify.register(userRoutes, { prefix: "/api/users" });

// Catch-all route for API paths that don't match any route
fastify.get("/api/*", async (request, reply) => {
  reply.status(404).send({
    statusCode: 404,
    error: "Not Found",
    message: "API endpoint not found or not accessible via browser",
  });
});

// Error handler for unhandled routes
fastify.setNotFoundHandler((request, reply) => {
  reply.status(404).send({
    statusCode: 404,
    error: "Not Found",
    message: "Route not found",
  });
});

// Socket.io setup
// Always use WSS in production (Socket.io will use HTTPS server if present)
const io = new Server(fastify.server, {
  cors: {
    origin: process.env.FRONTEND_DEV_URL,
    credentials: true,
  },
});

// Initialize WebSocket handlers
// require("./websocket")(io); // Disabled: not implemented yet

// Start the server
const start = async () => {
  try {
    // Initialize email service
    try {
      initEmailService();
      fastify.log.info("Email service initialized successfully");
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      fastify.log.error(
        "Warning: Email service initialization failed. Email functionality will be disabled."
      );
      fastify.log.error("Email error:", errorMessage);
    }

    // Start the server
    const address = await fastify.listen({
      port: parseInt(process.env.PORT || "3000"),
      host: "0.0.0.0",
    });

    const os = await import("os");
    const ifaces = os.networkInterfaces();
    let lanIp = "42_cluster_pc_ip";
    for (const name of Object.keys(ifaces)) {
      for (const iface of ifaces[name]!) {
        if (iface.family === "IPv4" && !iface.internal) {
          lanIp = iface.address;
        }
      }
    }
    fastify.log.info(`Server listening on ${address}`);
    fastify.log.info(
      `Backend server listening at http://localhost:${parseInt(
        process.env.PORT || "3000"
      )} (LAN: http://${lanIp}:${parseInt(process.env.PORT || "3000")})`
    );
  } catch (err) {
    fastify.log.error(`Error starting server: ${err}`, err);
    process.exit(1);
  }
};

start();
