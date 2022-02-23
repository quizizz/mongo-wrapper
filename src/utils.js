
const { ObjectId } = require('mongodb');

exports.isValidObjectId = function (value) {
  const regex = /[0-9a-f]{24}/;
  const matched = String(value).match(regex);
  if (!matched) {
    return false;
  }

  return ObjectId.isValid(value);
};

exports.castToObjectId = function (value) {
  if (exports.isValidObjectId(value) === false) {
    throw new TypeError(`Value passed is not valid objectId, is [ ${value} ]`);
  }
  return ObjectId.createFromHexString(value);
};
