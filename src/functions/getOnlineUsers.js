// requires

const aws = require('aws-sdk'),
      Promise = require('bluebird'),
      docClient = Promise.promisifyAll(new aws.DynamoDB.DocumentClient())

exports.handler = (event, context, callback) => {
  
  let time = Math.floor(new Date().getTime()/1000 - event.timeLimit)
  
  console.log(time)

  const params = {
    TableName: process.env.USERS_TABLE,
    FilterExpression: 'lastActivity > :t AND NOT userId = :u',
    ExpressionAttributeValues: {
      ':t': time,
      ':u': event.userId
    },
    ProjectionExpression: 'username,userId,lastActivity'
  };

  docClient.scanAsync(params).then((data) => {
    let returnObj = {}
    for (let i of data.Items) {
      returnObj[i.userId] = i
    }
    callback(null, returnObj)
  })
};