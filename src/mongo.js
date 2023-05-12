/// <reference path='./src/driver.d.ts' />

const { MongoClient, Logger: mLogger } = require('mongodb');
const { generateUrl, addDefaults } = require('./connection');
const Service = require('./service');

/**
 * @class Mongo
 */
class MongoWrapper extends Service {
  /**
   * @param {string} name - unique name to this service
   * @param {EventEmitter} emitter
   * @param {Object} config - configuration object of service
   */
  constructor(name, emitter, config) {
    super(name, emitter, config);
    this.client = null;
    this.config = addDefaults(config);
  }


  /**
   * Connect to server
   */
  init() {
    const { config } = this;

    if (this.client) {
      return Promise.resolve(this);
    }

    const { url, options, print } = generateUrl(config);

    this.log(`Connecting in ${print.mode} mode`, print);

    return MongoClient.connect(url, options).then(client => {
      this.client = client.db(config.db);
      this.connected = true;
      this.success(`Successfully connected in ${print.mode} mode`);
      mLogger.setLevel('info');
      mLogger.setCurrentLogger((msg, context) => {
        this.log(msg, context);
      });
      return this;
    });
  }

  getCollection(name) {
    return this.client.collection(name);
  }
}

exports.MongoWrapper = MongoWrapper;
