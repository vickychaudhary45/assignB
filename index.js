// const express = require('express');
// const app = express();
// const port = process.env.PORT || 3000;

// app.get('/', (req, res) => {
//   res.send('Hello World!');
// });

// app.listen(port, () => {
//   console.log(`Server is running on http://localhost:${port}`);
// });

const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");
const app = express();
const PORT = 3000;

// Proxy configuration
const apiProxy = createProxyMiddleware("/dev", {
  target: "http://localhost:4000", // Target Serverless endpoint
  changeOrigin: true,
  pathRewrite: {
    "^/dev": "", // Remove /dev from the proxied request
  },
});

// Use the proxy middleware
app.use("/dev", apiProxy);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

// const express = require("express");
// const { createProxyMiddleware } = require("http-proxy-middleware");
// const app = express();
// const PORT = process.env.PORT || 3000;

// // Proxy middleware
// app.use(
//   "/dev",
//   createProxyMiddleware({
//     target: "http://localhost:4000",
//     changeOrigin: true,
//     pathRewrite: {
//       "^/dev": "", // Remove '/dev' from the request path
//     },
//   })
// );

// // Other routes can be defined here...

// app.listen(PORT, () => {
//   console.log(`Server is running on http://localhost:${PORT}`);
// });
