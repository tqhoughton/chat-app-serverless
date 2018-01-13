// requires

const aws = require('aws-sdk'),
      Promise = require('bluebird'),
      docClient = Promise.promisifyAll(new aws.DynamoDB.DocumentClient()),
      iotData = Promise.promisifyAll(new aws.IotData({endpoint: 'a1m8cwer9lqmrm.iot.us-west-2.amazonaws.com'}))

exports.handler = (event, context, callback) => {
  const senderId = event.senderId
  const username = event.username
  const userId = event.userId
  
  //console.log(senderId, userId)
  
  function sendIotPush(receiverId, senderId) {
    return new Promise((resolve, reject) => {
      const params = {
        TableName: process.env.USERS_TABLE,
        Key: {
          userId: senderId
        },
        ProjectionExpression: 'userId,username'
      }
      docClient.getAsync(params).then((result) => {
        let item = { type: 'invite', payload: result.Item }
        console.log(item)
        let endpoint = `${process.env.IOT_CHANNEL}/user/${receiverId}`
        let iotParams = {
          payload: JSON.stringify(item),
          topic: endpoint
        }
        
        console.log('iot params are: ', iotParams)
        
        iotData.publishAsync(iotParams).then((results) => {
          resolve()
        })
      })
    })
  }
  function addInviteToUser(userId, senderId, prop) {
    console.log('userid: ', userId, 'senderId: ', senderId)
    return new Promise((resolve, reject) => {
      console.log(docClient.createSet([senderId]))
      const params = {
        TableName: process.env.USERS_TABLE,
        Key: {
          userId
        },
        UpdateExpression: `ADD ${prop} :i`,
        ExpressionAttributeValues: {
          ':i': docClient.createSet([senderId])
        }
      }
      docClient.updateAsync(params).then((results) => {
        console.log('success')
        resolve(userId)
      }, (err) => {
        console.log('err')
        reject(err)
      })
    })
  }
  
  if (userId) {
    console.log('provided user id')
    let addInviteReceived = addInviteToUser(userId, senderId, 'invitesReceived')
    let addInviteSent = addInviteToUser(senderId, userId, 'invitesSent')
    let iotSend = sendIotPush(userId, senderId)
    
    Promise.all([addInviteReceived, addInviteSent, iotSend]).then(() => {
      callback(null, userId)
    })
  } else {
    console.log('didn\'t have user id')
    const params = {
      TableName: process.env.USERS_TABLE,
      IndexName: 'username-index',
      KeyConditionExpression: 'username = :u',
      ExpressionAttributeValues: {
        ':u': username
      }
    };

    docClient.queryAsync(params).then((data) => {
      console.log(data)
      if (!data.Items.length) {
          callback(new Error('[404] Username not found.'))
      }
      const receiverId = data.Items[0].userId
      

      let addInviteRecieved = addInviteToUser(receiverId, senderId, 'invitesReceived')
      let addInviteSent = addInviteToUser(senderId, receiverId, 'invitesSent')
      let iotSend = sendIotPush(receiverId, senderId)
      
      Promise.all([addInviteRecieved, addInviteSent, iotSend]).then(() => {
        callback(null, receiverId)
      })
    })
  }
};