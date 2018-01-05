const aws = require('aws-sdk'),
      Promise = require('bluebird'),
      docClient = Promise.promisifyAll(new aws.DynamoDB.DocumentClient()),
      iotdata = Promise.promisifyAll(new aws.IotData({endpoint: 'a1m8cwer9lqmrm.iot.us-west-2.amazonaws.com'}))

exports.handler = (event, context, callback) => {
  // TODO: add an initial get to make sure that the user actually has an invite and it isn't a bad request
  // update each user
  const params = {
    TableName: 'chatApp.messages',
    Key: {
      messageId: event.messageId
    },
    UpdateExpression: 'SET recieved = :r',
    ExpressionAttributeValues: {
      ':r': 1
    }
  }
  
  docClient.updateAsync(params).then((result) => {
    callback(null, result)
  })
};