const aws = require('aws-sdk'),
      Promise = require('bluebird'),
      docClient = Promise.promisifyAll(new aws.DynamoDB.DocumentClient())

exports.handler = (event, context, callback) => {
  console.log(event)
  const newUser = {
    username: event.userName,
    userId: event.request.userAttributes.sub,
    lastActivity: Math.floor(new Date().getTime()/1000)
  }
  const params = {
    TableName: process.env.USERS_TABLE,
    Item: newUser
  }
  docClient.putAsync(params).then((result) => {
    callback(null, event)
  })
}