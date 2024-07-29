const express = require("express");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");
const databaseConnection = require("./database/db.js");
const ErrorHandler = require("./middlewares/error.js");
const cors = require("cors");
const bodyParser = require("body-parser");
const compression = require("compression");
const consoleLogger = require("./config/logging.js");
const config = require("./config/config.js");
const userRoutes = require("./routes/userRoutes");
const postRoutes = require("./routes/postRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const ngrok = require("ngrok");

// ! Create app
const app = express();

// ! Handling uncaught exceptions
// process.on("uncaughtException", (err) => {
//   consoleLogger.error("Server error: " + err.message);
//   process.exit(1);
// });

// ! import middleware app
app.use((req, res, next) => {
  // ! if condition is used only for stripe webhook
  if (req.originalUrl.startsWith("/api/v1/order/stripe/webhook")) {
    bodyParser.raw({ type: "application/json" })(req, res, next);
  } else {
    // ! for all other routes
    express.json()(req, res, next);
  }
});

// ! gzip compression
app.use(compression());

// ! define cors options
app.use("*", cors());

// ! parse json request body
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

// ! starting the Database
databaseConnection();

// ! Error handling for multer
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    res.status(400).json({
      success: false,
      message: err.message,
    });
  } else if (err) {
    res.status(500).send({
      success: false,
      message: err.message,
    });
  } else {
    next();
  }
});

// ! limit repeated failed requests to auth endpoints

// ! Starting message
app.get("/", (req, res) => {
  return res.status(200).send("Welcome to OutBack Backend");
});

// ! Swagger
const swaggerUi = require("swagger-ui-express");
const swaggerDocument = require("./doc/swagger.json");
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));


app.use("/api/v1/usr-mgt", userRoutes);
app.use("/api/v1/post-mgt", postRoutes);
app.use("/api/v1/category-mgt", categoryRoutes);


// ! Starting Server
const PORT = config.port || 3000;
app.listen(PORT, async () => {
  consoleLogger.info(`Server is starting on port: ${PORT}`);

  // Start ngrok and expose the server
  try {
    const url = await ngrok.connect(PORT);
    consoleLogger.info(`ngrok tunnel created: ${url}`);
    console.log(`ngrok tunnel created: ${url}`);
  } catch (err) {
    consoleLogger.error("Error starting ngrok:", err);
    console.error("Error starting ngrok:", err);
  }
});
// ! Unhandled promise rejection
app.use(ErrorHandler);

process.on("unhandledRejection", (reason) => {
  consoleLogger.error("Server closed duce to" + reason);
  server.close(() => {
    process.exit(1);
  });
});
