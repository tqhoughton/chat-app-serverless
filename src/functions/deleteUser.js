const aws = require('aws-sdk'),
      Promise = require('bluebird'),
      docClient = Promise.promisifyAll(new aws.DynamoDB.DocumentClient()),
      cisp = Promise.promisifyAll(new aws.CognitoIdentityServiceProvider)

function getAllMessages(chatIds) {
  if (!chatIds.length) {
    return new Promise((resolve) => resolve([]))
  } else {
    return new Promise((resolve, reject) => {
      let requests = chatIds.map((x) => {
        let params = {
          TableName: process.env.MESSAGES_TABLE,
          IndexName: 'chatId-sent-index',
          KeyConditionExpression: 'chatId = :c',
          ExpressionAttributeValues: {
            ':c': x
          }
        }
        return docClient.queryAsync(params)
      })
      Promise.all(requests).then((results) => {
        const messageIds = []
        for (let i of results) {
          for (let j of i.Items) {
            messageIds.push(j.messageId)
          }
        }
        resolve(messageIds)
      })
    })
  }
}

exports.handler = (event, context, callback) => {
  let userId = event.userId
  
  let params = {
    TableName: process.env.USERS_TABLE,
    Key: {
      userId
    }
  }
  docClient.getAsync(params).then((result) => {
    const user = result.Item
    let keyParts = user.chats ? user.chats.values : []
    console.log('keyparts are: ', keyParts)
    let chats = keyParts.map((x) => {
      return [x, userId].sort().join('_')
    })
    console.log('chats are: ', chats)
    let invitesSent = user.invitesSent ? user.invitesSent.values : []
    let invitesReceived = user.invitesReceived ? user.invitesReceived.values : []
    
    let messagesToDelete = []
    // first, do a bunch of different queries to get all of the messageIds
    let messageRequests = getAllMessages(chats)
    
    messageRequests.then((results) => {
      callback(null, results)
    })
  })
}
      