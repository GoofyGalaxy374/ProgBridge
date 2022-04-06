let postModel = require('../database/postsSchema')
let commentModel = require('../database/commentSchema')
let userModel = require('../database/userSchema')
let convoModel = require('../database/convoSchema')
let messageModel = require('../database/messageSchema')

const { ObjectID } = require('mongodb');

//#region post functions
async function createPost(content, owner)
{
    let post = new postModel({
        Author: owner,
        Content: content
    })
    await post.save()
    
    let allUserPosts = await userModel.findById({_id: owner})
    allUserPosts.posts.push(post)
    await allUserPosts.save()

    return post
}

async function getAllPosts()
{
    let allPosts = await postModel.find({}).populate('Author Comments')
    return allPosts
}

async function deletePost(id)
{
    let targetPost = await postModel.findByIdAndDelete({_id: id})
    
    return targetPost
}

async function findPostByID(id)
{
    let targetPost = await postModel.findById({_id: id})
    
    return targetPost
}


async function addPostComment(content)
{
    let targetPost = await postModel.findById({_id: content.postID})
    
    let commAuthor = content.author
    let commContent = content.content

    let comment = new commentModel({
        Author: commAuthor,
        Content: commContent
    })

    await comment.save()

    targetPost.Comments.push(comment['_id'])
    
    await targetPost.save()

    // res.status(200).send()
}

async function getAllUserPosts(userID)
{
    let allUserPosts = await userModel.findById({_id: userID}).populate('posts').populate('shares')
    return allUserPosts
}
//#endregion  post functions

//#region chatFunctions
async function createConversation(messageData)
{
    let convoExists = await convoModel.find({$or: {
        Sender: { $in: [ messageData.senderID ] },
        Receiver: {$in: [messageData.receiverID]}
        }
    })

    if(convoExists.length >= 1)
    {
        let targetConvo = convoExists
        let messages = targetConvo[0].Messages

        let message = new messageModel({
            ConvoID: targetConvo[0]._id,
            Content: messageData.content
        })
        await message.save()

        messages.push(message)

        await targetConvo[0].save()        

    }
    else
    {
        // TODO SAVE MESSAGE AFTER CREATING CONVO
        let convo = new convoModel({
            Sender: ObjectID(messageData.senderID),
            Receiver: ObjectID(messageData.receiverID),
            Messages: []
        })
        await convo.save()
    }

}

async function getConvo(receiverID, senderID)
{


    let targetConvo = await convoModel.find({$or: {
        Sender: { $in: [ ObjectID(senderID) ] },
        Receiver: {$in: [ ObjectID(receiverID)]}
        }
    }).populate('Messages Sender Receiver')

    // console.log(targetConvo)

    return targetConvo[0]

}
//#endregion chatFunctions
module.exports = {
    createPost,
    getAllPosts,
    deletePost,
    findPostByID,
    addPostComment,
    getAllUserPosts,
    createConversation,
    getConvo
}