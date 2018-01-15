const aws = require('aws-sdk'),
      Promise = require('bluebird'),
      docClient = Promise.promisifyAll(new aws.DynamoDB.DocumentClient()),
      cisp = Promise.promisifyAll(new aws.CognitoIdentityServiceProvider)

exports.handler = (event, context, callback) => {
  let userId = event.userId
  
  let params = {
    TableName: process.env.USERS_TABLE,
    Key: {
      userId
    }
  }
  docClient.getAsync(params).then((result) => {
    
  })
}
      