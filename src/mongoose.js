/// <reference path='./mongoose.d.ts' />

const MongooseClient = require('mongoose');
const { generateUrl, addDefaults } = require('./connection');
const Service = require('./service');

/**
 * @class Mongo
 */
class MongooseWrapper extends Service {
  /**
   * @param {string} name - unique name to this service
   * @param {EventEmitter} emitter
   * @param {Object} config - configuration object of service
   */
  constructor(name, emitter, config) {
    super(name, emitter, config);
    this.name = name;
    this.emitter = emitter;
    this.config = addDefaults(config);
  }

  /**
   * Connect to server
   */
  async init() {
    const { config } = this;
    const { url, options, print } = generateUrl(config);

    this.log(`Connecting in ${print.mode} mode`, print);
    await MongooseClient.connect(url, options);
    this.log(`Connected in ${print.mode} mode`);
  }
}

exports.MongooseWrapper = MongooseWrapper;
