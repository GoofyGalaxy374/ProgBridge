const express = require('express')
const cors = require('cors')
const databaseConfig = require('./database/mongoose')
const { login, register, getUserByID, getAllUnfollowedUsers } = require('./services/userService')

var bodyParser = require('body-parser')

var cookieParser = require('cookie-parser');
const { createPost, getAllPosts, deletePost, findPostByID, addPostComment, removeLike, getAllUserPosts, createConversation, getConvo, getCommentById, addCommentReply } = require('./services/CRUD_Service')
const io = require('socket.io')


const mongoose = require('mongoose')

async function start()
{
    
    //#region config
    const app = express()
    const server = require('http').createServer(app)
    const io = require('socket.io')(server, {
        cors: {
            origin: '*',
          } 
    })

    app.use(cors())
    
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(bodyParser.json());
    
    app.use(cookieParser());
    await databaseConfig(app)
    //#endregion config
    //#region endpoints 
    app.post('/login', async (req,res) => {
        let username = req.body.username
        let pass = req.body.pass
        try
        {
            let user = await login(username, pass)
            res.status(200).send(user)
        }
        catch(err)
        {
            res.status(401).send(err.message)

        }
    })

    app.post('/register', async (req,res) => {
        let username = req.body.username
        let pass = req.body.pass
        let repass = req.body.repass
        if(pass === repass)
        {
            try
            {
                let user = await register(username, pass, 'SOME RANDOM STRING FOR THE SAKE OF IT')
                res.status(200).send(user)
                return res.status(200).send(user)
            }
            catch(err)
            {
                res.status(401).send(err.message)
    
            }
        }
        else
        {
            res.status(401).send('Passwords do not match !')
        }
    })

    app.post('/createPost', async (req,res) => {
        let postContent = req.body['content']
        let postOwner = req.body['owner']

        if(postContent.trim().length > 0)
        {
            await createPost(postContent, postOwner)
        }

    })

    app.get('/getAllPosts', async (req,res) => {
        let allPosts = await getAllPosts()
        res.status(200).send(allPosts)
    })

    app.post('/deletePost/:id', async (req,res) => {

        let targetPost = await findPostByID(req.params.id)
        if(targetPost.Author == req.body.userID)
        {
            await deletePost(req.params.id, req.body.userID)

        }
        else
        {
            res.status(401).send({error: 'You have no rights upon this post!'})
        }
    })

    app.post('/addComment/:id', async (req,res) => {
        let commContent = req.body['content']
        let commAuthor = req.body['commentAuthor']

        let commentObj = {content: commContent, author: commAuthor, postID: req.params.id }
        if(commContent != '')
        {
            let result = await addPostComment(commentObj)
        }
        else
        {
            res.json({error: 'Your comment cannot be empty !'})
        }
    })

    app.post('/likePost/:id', async (req,res) => {

        let targetPost = await findPostByID(req.params.id)
        let likeGiverID = req.body.likeGiverID
        
        if(targetPost.Likes.includes(likeGiverID) == false)
        {
            targetPost.Likes.push(likeGiverID)
        }
        else
        {
            const index = targetPost.Likes.indexOf(likeGiverID)
            targetPost.Likes.splice(index, 1)
        }

        await targetPost.save()

    })

    app.get('/getAllUserPosts/:id', async (req,res) => {
        let userPosts = await getAllUserPosts(req.params.id)
        res.status(200).send(userPosts)
    })

    app.get('/getUserByID/:id', async (req,res)=> {

        let user = await getUserByID(req.params.id)
        res.status(200).send(user)
    })

    app.post('/sharePost/:id', async ( req, res ) => {
        let sharerID = req.body.sharer
        let postID = req.body.post
        let targetPost = await findPostByID(req.params.id)
        let targetSharer = await getUserByID(sharerID)

        targetSharer.shares.push(postID)
        await targetSharer.save()
    })

    app.post('/changePFP/:id', async(req,res) => {
        let targetUser = await getUserByID(req.params.id)
        let newPFP = req.body.img
        targetUser.profilePicture = newPFP
        targetUser.save()

        res.status(200).send(targetUser)
    })

    app.post('/edit/:id', async(req,res) => {

        const userID = req.body.userID
        let targetPost = await findPostByID(req.params.id)
        
        if(userID == targetPost.Author)
        {
            let updatedContent = req.body.updated

            targetPost.Content = updatedContent

            await targetPost.save()

            res.status(200).send(targetPost)
        }
    })

    app.post('/addFollowing/:id',  async(req,res)=>{

        let targetID = req.body.targetUserID
        let ownerID = req.params.id

        let ownerProfile = await getUserByID(ownerID)

        if(!ownerProfile.following.some((user) => user._id == targetID))
        {
            ownerProfile.following.push(targetID)
        }
        else
        {
            let index = ownerProfile.following.indexOf(targetID)
            ownerProfile.following.splice(index,1)
        }


        await ownerProfile.save()
        res.status(200).send(ownerProfile)
        
    })
    
    app.post('/addFollower/:id',  async(req,res)=>{

        // add OWNER ID to Target's followers
        let ownerID = req.body.ownerID
        let targetID = req.params.id

        let targetProfile = await getUserByID(targetID)

        if(!targetProfile.followers.some((user) => user._id == ownerID))
        {
            targetProfile.followers.push(ownerID)
            
        }
        else
        {
            let index = targetProfile.followers.indexOf(ownerID)
            targetProfile.followers.splice(index,1)
        }
        await targetProfile.save()
        
        res.status(200).send(targetProfile)
    })

    app.post('/getConvo', async (req,res) => {

        let convoData = { receiverID: mongoose.Types.ObjectId(req.body.receiverID), senderID: mongoose.Types.ObjectId(req.body.senderID) }
        let targetConvo = await getConvo(convoData)

        res.status(200).send(targetConvo)
    })

    app.post('/addCommentLike/:id', async(req,res) => {
        let targetCommentID = req.params.id

        let targetComment = await getCommentById(targetCommentID)
        let likerID = req.body.userID

        if(targetComment[0].Likes.includes(likerID))
        {
            const index = targetComment[0].Likes.indexOf(likerID)
            targetComment[0].Likes.splice(index, 1)
        }
        else
        {
            targetComment[0].Likes.push(likerID)
        }
        await targetComment[0].save()

    })

    app.post('/addCommentReply/:id', async(req,res) => {
        let targetCommentID = req.params.id

        let targetComment = await getCommentById(targetCommentID)
        let userID = req.body.userID
        let Content = req.body.content
        
        
        let replyObj = {content: Content, author: userID, commentID: targetCommentID}

        let replyRes = await addCommentReply(replyObj)
    })

    app.post('/getUnfollowedUsers/:id', async(req,res)=>{
        let targetUser = await getUserByID(req.body.userID)
        let followers = targetUser.following;

        let followersArray = [mongoose.Types.ObjectId(req.body.userID)]
        followers.forEach((user) => followersArray.push(user._id))

        let allUnfollowedUsers = await getAllUnfollowedUsers(followersArray);

        res.status(200).send(allUnfollowedUsers)
    })

    //#endregion endpoints
    
    server.listen(3000, () => {
        console.log('server working')
        
    })
    

    io.on('connection',(socket)=>{

        socket.on('disconnect', function () {

        });

         socket.on('sendMSG',  async (msgData)=>{
            
            let res = await createConversation(msgData)
            socket.emit('getMessages', (res[0]))
         })

         socket.on('getConvo',  async (msgData)=>{
            let res = await getConvo(msgData)
            socket.emit('getMessages', (res))

        })
    })
    

 
}


start()