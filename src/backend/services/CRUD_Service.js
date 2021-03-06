let postModel = require('../database/postsSchema')
let commentModel = require('../database/commentSchema')
let userModel = require('../database/userSchema')
let convoModel = require('../database/convoSchema')
let messageModel = require('../database/messageSchema')

const mongoose = require('mongoose')

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
    let allPosts = await postModel
    .find({})
    .populate('Author Comments')
    .populate(
        (
            {
                path: 'Comments', 
                populate:[
                    {path: 'Author'}
                ]
            }
        )
    )
    return allPosts
}

async function deletePost(id, userID)
{
    let targetPost = await postModel.findByIdAndDelete({_id: id})
    let postOwner = await userModel.findById({_id: userID})

    const index = postOwner.posts.indexOf(id)
    postOwner.posts.splice(index, 1)

    postOwner.save()

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

    let comment = await new commentModel({
        Author: commAuthor,
        Content: commContent
    }).populate('Author')

    
    await comment.save()
    
    targetPost.Comments.push(comment['_id'])
    
    await targetPost.save()

    // res.status(200).send()
}

async function getAllUserPosts(userID)
{
    let allUserPosts = await userModel.findById({_id: userID})
    .populate('posts')
    .populate('shares')
    .populate(({
        path: 'shares',
        populate:{
            path: 'Author',
        }
    }))
    return allUserPosts
}

async function getCommentById(id)
{
    let targetComment = await commentModel.find({_id: id}).populate('Replies')
    return targetComment
}

async function addCommentReply(replyObj)
{

    let targetComment = await getCommentById(replyObj.commentID)

    // console.log(targetComment)
    let reply = await commentModel({
        Author: replyObj.author,
        Content: replyObj.content
    })
    await reply.save()

    targetComment[0].Replies.push(reply)
    await targetComment[0].save()

}
//#endregion  post functions

//#region chatFunctions
async function createConversation(messageData)
{

    let targetConvo = await convoModel.find( { }, {"Sender":messageData.senderID, "Receiver": messageData.receiverID}).populate('Sender Receiver Messages')

    
    if(targetConvo.length >= 1)
    {
        let messages = targetConvo[0].Messages
        
        let message = await new messageModel({
            ConvoID: targetConvo[0]._id,
            Sender: messageData.senderID,
            Receiver: messageData.receiverID,
            Content: messageData.content
        }).populate('Sender Receiver')

        await message.save()
        
        messages.push(message)
        
        await targetConvo[0].save()        
        
        
    }
    else
    {
        let convo = await new convoModel({
            Sender: messageData.senderID,
            Receiver: messageData.receiverID
        }).populate('Sender Receiver')

        let message = await new messageModel({
            ConvoID: convo._id,
            Sender: messageData.senderID,
            Receiver: messageData.receiverID,
            Content: messageData.content
        }).populate('Sender Receiver')

        await message.save()

        convo.Messages.push(message)

        await convo.save()
    }
    return targetConvo
}
async function getConvo(messageData)
{
    let targetConvo = await convoModel.find( { }, {"Sender":messageData.senderID, "Receiver": messageData.receiverID}).populate('Sender Receiver Messages')
    
    // let targetConvo = await convoModel.find({
    //         $or:[{
    //                 "Sender": messageData.senderID,
    //                 "Receiver":  messageData.receiverID
    //             }]
    //     }).populate('Sender Receiver Messages')



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
    getConvo,
    getCommentById,
    addCommentReply
}