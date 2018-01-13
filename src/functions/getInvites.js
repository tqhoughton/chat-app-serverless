const aws = require('aws-sdk'),
      Promise = require('bluebird'),
      docClient = Promise.promisifyAll(new aws.DynamoDB.DocumentClient()),
      iotdata = Promise.promisifyAll(new aws.IotData({endpoint: 'a1m8cwer9lqmrm.iot.us-west-2.amazonaws.com'}))
/*
  event: {
    userId: ...
  }
*/
exports.handler = (event, context, callback) => {
  const userParams = {
    TableName: process.env.USERS_TABLE,
    Key: {
      userId: event.userId
    }
  }
  docClient.getAsync(userParams).then((userResults) => {
    let userIds = userResults.Item.invitesReceived.values
    let ids = userIds.map((i) => {
      return { userId: i }
    })

    const params = {
      RequestItems: {
        [process.env.USERS_TABLE]: {
          Keys: ids,
          ProjectionExpression: 'username,userId'
        }
      }
    }

    docClient.batchGetAsync(params).then((userResults) => {
      callback(null, userResults.Responses[process.env.USERS_TABLE])
    })
  })
  
};