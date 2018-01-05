// requires

const aws = require('aws-sdk'),
      Promise = require('bluebird'),
      docClient = Promise.promisifyAll(new aws.DynamoDB.DocumentClient())
/*
  event: {
    userId: "d4e26787-9533-4743-915d-339e60e8caee"
    otherUserId: '...'
  }
*/
exports.handler = (event, context, callback) => {
  const userId = event.userId
  const otherUserId = event.otherUserId
  
  const params = {
    TableName: process.env.MESSAGES_TABLE,
    IndexName: 'chatId-sent-index',
    KeyConditionExpression: 'chatId = :c',
    ExpressionAttributeValues: {
      ':c': [userId, otherUserId].sort().join('_')
    },
    ScanIndexForward: false
  }
  
  docClient.queryAsync(params).then((results) => {
    callback(null, results.Items)
  })
};