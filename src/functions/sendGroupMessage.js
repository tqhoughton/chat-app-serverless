const aws = require('aws-sdk'),
      Promise = require('bluebird'),
      iotData = Promise.promisifyAll(new aws.IotData({endpoint: 'a1m8cwer9lqmrm.iot.us-west-2.amazonaws.com'})),
      docClient = Promise.promisifyAll(new aws.DynamoDB.DocumentClient())

exports.handler = (event, context, callback) => {
  const userId = event.userId
  let params = {
    TableName: process.env.USERS_TABLE,
    Key: {
      userId
    }
  }
  docClient.getAsync(params).then((res) => {
    const username = res.Item.username
    const message = event.message
    console.log('username is :', username)
    console.log('message is: ', message)
    
    const iotParams = {
      payload: JSON.stringify({username, message}),
      topic: `${process.env.IOT_CHANNEL}/group`
    }
    console.log(iotParams)

    iotData.publishAsync(iotParams).then((results) => {
      callback(null, message)
    }).catch((err) => {
      callback(err)
    })
  })
};