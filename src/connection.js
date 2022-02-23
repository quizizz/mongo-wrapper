
const defaults = require('lodash.defaultsdeep');
const clone = require('lodash.clonedeep');

exports.generateUrl = function (config) {
  const { auth, options, replica } = clone(config);
  let url = 'mongodb://';
  let print = {};

  if (auth.use === true) {
    print.authentication = 'TRUE';
    url += `${auth.username}:${auth.password}@`;
    options.authSource = auth.authSource;
  } else {
    print.authentication = 'FALSE';
  }
  if (replica.use === true) {
    print.mode = 'REPLICAS';
    print.servers = replica.servers;
    url += replica.servers.map(s => `${s.host}:${s.port}`).join(',');
    options.replicaSet = replica.name;
  } else {
    print.mode = 'SINGLE';
    print.host = config.host;
    print.port = config.port;
    url += `${config.host}:${config.port}`;
    options.directConnection = true;
  }
  print.db = config.db;
  print.options = options;

  return {
    url,
    options,
    print,
  };
};

exports.addDefaults = (config) => {
  return defaults(config, {
    host: 'localhost',
    port: 27017,
    auth: {
      use: false,
    },
    replica: {
      use: false,
    },
    options: {
      connectTimeoutMS: 30000,
      keepAlive: true,
      readPreference: 'secondaryPreferred',
      socketTimeoutMS: 30000,
    },
  });
};
