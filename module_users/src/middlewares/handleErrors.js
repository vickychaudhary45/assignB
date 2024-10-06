/* eslint-disable no-unused-vars */
const { GeneralError, BadRequest, Unauthorized, Forbidden, NotFound, BadGateway, ServiceUnavailable } = require("../utils/errors");
const handleErrors = (err, req, res, next) => {
  let status, errorCode;

  switch (true) {
    case err instanceof BadRequest:
      status = "BadRequest";
      errorCode = 200;
      break;
    case err instanceof Unauthorized:
      status = "Unauthorized";
      errorCode = 200;
      break;
    case err instanceof Forbidden:
      status = "Forbidden";
      errorCode = 403;
      break;
    case err instanceof NotFound:
      status = "NotFound";
      errorCode = 404;
      break;
    case err instanceof BadGateway:
      status = "BadGateway";
      errorCode = 502;
      break;
    case err instanceof ServiceUnavailable:
      status = "ServiceUnavailable";
      errorCode = 503;
      break;
    default:
      status = "Internal Server Error";
      errorCode = 500;
  }

  return res.status(errorCode).json({
    status,
    message: err.message,
    data: err.stack,
  });
};

module.exports = handleErrors;
