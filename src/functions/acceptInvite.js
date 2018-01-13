const aws = require('aws-sdk'),
      Promise = require('bluebird'),
      uuid = require('uuid/v4'),
      docClient = Promise.promisifyAll(new aws.DynamoDB.DocumentClient()),
      iotData = Promise.promisifyAll(new aws.IotData({endpoint: 'a1m8cwer9lqmrm.iot.us-west-2.amazonaws.com'}))

exports.handler = (event, context, callback) => {
  const senderId = event.senderId
  const receiverId = event.receiverId
  const chatId = [receiverId, senderId].sort().join('_')
  
  console.log(senderId, receiverId)
  
  const senderParams = {
    TableName: process.env.USERS_TABLE,
    Key: {
      userId: senderId
    },
    UpdateExpression: 'ADD chats :c DELETE invitesReceived :c',
    ExpressionAttributeValues: {
      ':c': docClient.createSet(receiverId)
    },
    ReturnValues: 'ALL_NEW'
  }
  
  const receiverParams = {
    TableName: process.env.USERS_TABLE,
    Key: {
      userId: receiverId
    },
    UpdateExpression: 'ADD chats :c DELETE invitesSent :c',
    ExpressionAttributeValues: {
      ':c': docClient.createSet(senderId)
    },
    ReturnValues: 'ALL_NEW'
  }
  
  const newChat = {
    chatId
  }
  
  const chatParams = {
    TableName: process.env.CHATS_TABLE,
    Item: newChat
  }
  
  let ids = [senderId, receiverId].map((x) => {
    return { userId: x }
  })
  const userParams = {
    RequestItems: {
      [process.env.USERS_TABLE]: {
        Keys: ids,
        ProjectionExpression: 'username,userId,lastActivity'
      }
    }
  }
  
  let senderUpdate = docClient.updateAsync(senderParams)
  let receiverUpdate = docClient.updateAsync(receiverParams)
  let chatInsert = docClient.putAsync(chatParams)
  let usersGet = docClient.batchGetAsync(userParams)
  // now we need to get the receiver and the sender so we can construct the new chats
  
  // TODO: Fix these by putting them in the same batch get

  
  Promise.all([senderUpdate, receiverUpdate, chatInsert, usersGet]).then(([senderResponse, receiverResponse, chatResponse, usersResponse]) => {
    console.log(usersResponse)
    let sender = usersResponse.Responses[process.env.USERS_TABLE].find((x) => {
      return x.userId === senderId
    })
    let receiver = usersResponse.Responses[process.env.USERS_TABLE].find((x) => {
      return x.userId === receiverId
    })
    let senderChat = {
      chatId: receiverId,
      otherUser: receiver
    }
    let receiverChat = {
      chatId: senderId,
      otherUser: sender
    }
    
    let iotParams = {
      payload: JSON.stringify({ type: 'chat', payload: receiverChat} ),
      topic: `${process.env.IOT_CHANNEL}/user/${receiverId}`
    }
    
    iotData.publishAsync(iotParams).then(() => {
      callback(null, senderChat)
    })
  }, (err) => {
    callback(err)
  })
};