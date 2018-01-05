const aws = require('aws-sdk'),
      Promise = require('bluebird'),
      uuid = require('uuid/v4'),
      docClient = Promise.promisifyAll(new aws.DynamoDB.DocumentClient()),
      iotData = Promise.promisifyAll(new aws.IotData({endpoint: 'a1m8cwer9lqmrm.iot.us-west-2.amazonaws.com'}))
/*
  event: {
    receiverId: "d4e26787-9533-4743-915d-339e60e8caee",
    messageBody: "wow this is pretty cool",
    senderId: "a452539c-c1db-4628-a6c6-8d26ca2c031e"
  }
*/
exports.handler = (event, context, callback) => {
  let senderId = event.senderId
  let receiverId = event.receiverId
  let chatId = [senderId, receiverId].sort().join('_')
  const message = {
    messageId: uuid(),
    chatId,
    body: event.messageBody,
    senderId,
    sent: Math.floor(new Date().getTime()/1000)
  }
  
  const params = {
    TableName: process.env.MESSAGES_TABLE,
    Item: message
  }
  
  const chatParams = {
    TableName: process.env.CHATS_TABLE,
    Key: {
      chatId
    },
    UpdateExpression: 'SET lastMessage = :m',
    ExpressionAttributeValues: {
      ':m': message
    }
  }
  
  let iotMessage = Object.assign({}, message, { chatId: senderId })
  const iotParams = {
    payload: JSON.stringify({ type: 'message', payload: iotMessage }),
    topic: `${process.env.IOT_CHANNEL}/user/${receiverId}`
  }
  
  let messagePut = docClient.putAsync(params)
  let chatUpdate = docClient.updateAsync(chatParams)
  let iotPush = iotData.publishAsync(iotParams)
  
  Promise.all([messagePut, chatUpdate, iotPush]).then((results) => {
    console.log(results)
    let returnMessage = Object.assign({}, message, { chatId: receiverId })
    callback(null, returnMessage)
  })
};