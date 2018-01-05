const aws = require('aws-sdk'),
      Promise = require('bluebird'),
      docClient = Promise.promisifyAll(new aws.DynamoDB.DocumentClient())

exports.handler = (event, context, callback) => {
  const userId = event.userId
  
  const params = {
    TableName: process.env.USERS_TABLE,
    Key: {
      userId
    }
  }
  docClient.getAsync(params).then((result) => {
    if (!result.Item.chats) {
      return callback(null, {})
    }
    let userIds = result.Item.chats.values.map((i) => {
      return { userId: i }
    })
    let chatIds = result.Item.chats.values.map((i) => {
      return { chatId: [i, userId].sort().join('_') }
    })
    const userParams = {
      RequestItems: {
        [process.env.USERS_TABLE]: {
          Keys: userIds,
          ProjectionExpression: 'userId, username, lastActivity'
        },
        [process.env.CHATS_TABLE]: {
          Keys: chatIds
        }
      }
    }
    docClient.batchGetAsync(userParams).then((results) => {
      const users = results.Responses[process.env.USERS_TABLE]
      const chats = results.Responses[process.env.CHATS_TABLE]
      let response = {}
      for (let i = 0; i < users.length; i++) {
        let currentUser = users[i]
        let newChat = {
          otherUser: currentUser
        }
        if (chats[i].lastMessage) newChat.lastMessage = chats[i].lastMessage
        
        response[currentUser.userId] = newChat
      }
      callback(null, response)
    })
  })
}