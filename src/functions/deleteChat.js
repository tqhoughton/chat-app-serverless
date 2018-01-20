const aws = require('aws-sdk'),
      Promise = require('bluebird'),
      docClient = Promise.promisifyAll(new aws.DynamoDB.DocumentClient())

exports.handler = (event, context, callback) => {
  let userId = event.userId
  let otherUserId = event.otherUserId
  let chatId = [userId, otherUserId].sort().join('_')
  
  function deleteFromChatsTable(chatId) {
    return new Promise((resolve, reject) => {
      const params = {
        TableName: process.env.CHATS_TABLE,
        Key: {
          chatId
        }
      }
      
      docClient.deleteAsync(params).then((data) => {
        resolve(data)
      }).catch((err) => {
        reject(err)
      })
    })
  }
  
  function deleteChatsFromUsers(userId, otherUserId) {
    return new Promise((resolve, reject) => {
      function getParams(userId, otherUserId) {
        return {
          TableName: process.env.USERS_TABLE,
          Key: {
            userId
          },
          UpdateExpression: 'DELETE chats :c',
          ExpressionAttributeValues: {
            ':c': docClient.createSet(otherUserId)
          },
          ReturnValues: 'ALL_NEW'
        }
      }
      let userRequest = docClient.updateAsync(getParams(userId, otherUserId))
      let otherUserRequest = docClient.updateAsync(getParams(otherUserId, userId))
      Promise.all([userRequest, otherUserRequest]).then((results) => {
        resolve(results)
      }).catch((err) => {
        reject(err)
      })
    })
  }
  
  function deleteMessages(userId, otherUserId) {
    return new Promise((resolve, reject) => {
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
        let messageIds = results.Items.map((item) => {
          return {
            DeleteRequest: {
              Key: {
                messageId: item.messageId
              }
            }
          }
        })
        
        if (!messageIds.length) {
          return resolve()
        }

        //callback(null, messageIds)
        let batchParams = {
          RequestItems: {
            [process.env.MESSAGES_TABLE]: messageIds
          }
        }
        docClient.batchWriteAsync(batchParams).then((result) => {
          console.log(result)
          resolve(result)
        }).catch((err) => {
          reject(err)
        })
      })
    })
  }
  
  Promise.all([deleteFromChatsTable(chatId), deleteChatsFromUsers(userId, otherUserId), deleteMessages(userId, otherUserId)]).then(() => {
    callback(null, {success: 1})
  }).catch((err) => {
    callback(err)
  })
}