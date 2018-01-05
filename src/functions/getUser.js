const aws = require('aws-sdk'),
      Promise = require('bluebird'),
      docClient = Promise.promisifyAll(new aws.DynamoDB.DocumentClient())
/*
event: {
  userId: '...'
}
*/
exports.handler = (event, context, callback) => {
  // TODO implement
  const params = {
    TableName: process.env.USERS_TABLE,
    Key: {
      userId: event.userId
    }
  }
  
  docClient.getAsync(params).then((result) => {
    let item = result.Item
    if (!item) callback(new Error('[404] User Not Found'))
    for (let i in item) {
      console.log(typeof item[i])
      if (typeof item[i] === 'object' && item[i].values) item[i] = item[i].values
    }
    callback(null, item)
  })
};