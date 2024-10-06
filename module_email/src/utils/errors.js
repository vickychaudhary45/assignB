/* eslint-disable no-use-before-define */
// eslint-disable-next-line max-classes-per-file
class GeneralError extends Error {
  constructor(message) {
    super();
    this.message = message;
  }

  getCode() {
    switch (true) {
      case this instanceof NoContent:
        return 204;
      case this instanceof BadRequest:
        return 400;
      case this instanceof Unauthorized:
        return 401;
      case this instanceof Forbidden:
        return 403;
      case this instanceof NotFound:
        return 404;
      case this instanceof BadGateway:
        return 502;
      case this instanceof ServiceUnavailable:
        return 503;
      default:
        return 500;
    }
  }
}

class NoContent extends GeneralError { }
class BadRequest extends GeneralError { }
class Unauthorized extends GeneralError { }
class Forbidden extends GeneralError { }
class NotFound extends GeneralError { }
class BadGateway extends GeneralError { }
class ServiceUnavailable extends GeneralError { }

module.exports = {
  GeneralError, NoContent, BadRequest, Unauthorized, Forbidden, NotFound, BadGateway, ServiceUnavailable
};
