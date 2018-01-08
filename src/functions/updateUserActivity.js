const aws = require('aws-sdk'),
      Promise = require('bluebird'),
      uuid = require('uuid/v4'),
      docClient = Promise.promisifyAll(new aws.DynamoDB.DocumentClient()),
      iotData = Promise.promisifyAll(new aws.IotData({endpoint: 'a1m8cwer9lqmrm.iot.us-west-2.amazonaws.com'}))

exports.handler = (event, context, callback) => {
  let userId = event.userId
  let currentTime = Math.floor(new Date().getTime()/1000)
  
  let params = {
    TableName: process.env.USERS_TABLE,
    Key: {
      userId
    },
    UpdateExpression: 'SET lastActivity = :c',
    ExpressionAttributeValues: {
      ':c': currentTime
    }
  }
  
  docClient.updateAsync(params).then((res) => {
    callback(null, res)
  })
}