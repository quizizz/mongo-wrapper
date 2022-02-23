
class Service {
  constructor(name, emitter, config) {
    this.name = name;
    this.emitter = emitter;
    this.config = config;
  }

  log(message, data = {}) {
    this.emitter.emit('log', {
      service: this.name,
      message,
      data,
    });
  }

  success(message, data = {}) {
    this.emitter.emit('success', {
      service: this.name, message, data,
    });
  }

  error(err, data = {}) {
    this.emitter.emit('error', {
      service: this.name,
      data,
      err,
    });
  }
}

module.exports = Service;
