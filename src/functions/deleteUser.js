const aws = require('aws-sdk'),
      Promise = require('bluebird'),
      docClient = Promise.promisifyAll(new aws.DynamoDB.DocumentClient()),
      cisp = Promise.promisifyAll(new aws.CognitoIdentityServiceProvider)

function deleteUserFromTable(userId) {
  return new Promise((resolve, reject) => {
    const params = {
      TableName : process.env.USERS_TABLE,
      Key: {
        userId
      }
    }

    docClient.deleteAsync(params).then((data) => {
      resolve(data)
    }).catch((err) => {
      reject(err)
    })
  })
}

function deleteUserFromCognito(username, userPoolId) {
  return new Promise((resolve, reject) => {
    let params = {
      UserPoolId: userPoolId, /* required */
      Username: username /* required */
    };
    cisp.adminDeleteUserAsync(params).then((res) => {
      resolve(res)
    }).catch((err) => {
      reject(err)
    })
  })
}

function updateOtherUsers(invitesSent, invitesReceived, chatIds, userId) {
  console.log('chatIds are: ', chatIds)
  function constructUpdateRequest(type, userId, item) {
    return {
      TableName: process.env.USERS_TABLE,
      Key: {
        userId
      },
      UpdateExpression: `DELETE ${type} :i`,
      ExpressionAttributeValues: {
        ':i': docClient.createSet(item)
      }
    }
  }
  
  return new Promise((resolve, reject) => {
    let requests = []
    
    for (let i of invitesSent) {
      // we sent the invite, so we need to delete invitesReceived from the other user
      let params = constructUpdateRequest('invitesReceived', i, userId)
      requests.push(docClient.updateAsync(params))
    }
    for (let i of invitesReceived) {
      // we sent the invite, so we need to delete invitesReceived from the other user
      let params = constructUpdateRequest('invitesSent', i, userId)
      requests.push(docClient.updateAsync(params))
    }
    for (let i of chatIds) {
      // we sent the invite, so we need to delete invitesReceived from the other user
      let params = constructUpdateRequest('chats', i, userId)
      console.log('chat params are : ', params)
      requests.push(docClient.updateAsync(params))
    }
    Promise.all(requests).then((results) => {
      resolve(results)
    }).catch((err) => {
      reject(err)
    })
  })
}

function deleteChatsAndMessages(messageIds, chatIds) {
  console.log('messageIds are: ', messageIds)
  console.log('chatIds are: ', chatIds)
  console.log('userId is: ', userId)
  function constructDeleteRequest(key, ids) {
    console.log(ids)
    if (!ids.length) {
      return []
    }
    return ids.map((x) => {
      return {
        DeleteRequest: {
          Key: {
            [key]: x
          }
        }
      }
    })
  }
  
  return new Promise((resolve, reject) => {
    let chatParams = constructDeleteRequest('chatId', chatIds)
    let messageParams = constructDeleteRequest('messageId', messageIds)
    
    if (!chatParams.length && !messageParams.length) return resolve()
    
    let batchParams = {
      RequestItems: {
        
      }
    }
    if (chatParams.length) batchParams.RequestItems[process.env.CHATS_TABLE] = chatParams
    if (messageParams.length) batchParams.RequestItems[process.env.MESSAGES_TABLE] = messageParams
    
    docClient.batchWriteAsync(batchParams).then((result) => {
      console.log(result)
      resolve(result)
    }).catch((err) => {
      reject(err)
    })
  })
}

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
    const username = user.username
    let keyParts = user.chats ? user.chats.values : []
    console.log('keyparts are: ', keyParts)
    let chatIds = keyParts.map((x) => {
      return [x, userId].sort().join('_')
    })
    console.log('chats are: ', chatIds)
    let invitesSent = user.invitesSent ? user.invitesSent.values : []
    let invitesReceived = user.invitesReceived ? user.invitesReceived.values : []
    
    let messagesToDelete = []
    // first, do a bunch of different queries to get all of the messageIds
    let messageRequests = getAllMessages(chatIds)
    let usersRequest = updateOtherUsers(invitesSent, invitesReceived, keyParts)
    let deleteUserRequest = deleteUserFromTable(userId)
    let cognitoRequest = deleteUserFromCognito(username, process.env.USER_POOL_ID)
    messageRequests.then((messageIds) => {
      let deleteRequest = deleteChatsAndMessages(messageIds, chatIds, userId)
      Promise.all([deleteRequest, usersRequest, cognitoRequest, deleteUserRequest]).then((results) => {
        callback(null, {success: 1})
      }).catch((err) => {
        callback(err)
      })
    })
  })
}
      