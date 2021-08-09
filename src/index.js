const path = require('path')
const http = require('http')
const express = require('express')
const socketio = require('socket.io')
const Filter = require('bad-words')
const { generateMessage, generateLocationMessage } = require('./utils/messages')
const { addUser, removeUser, getUser, getUsersInRoom } = require('./utils/users')


const app = express()
const server = http.createServer(app);
const io = socketio(server)

const port = process.env.PORT || 3000


const publicDirectoryPath = path.join(__dirname, "../public")

// Static directory to serve
app.use(express.static(publicDirectoryPath))


// socket.emit: send events to a specific client
// io.emit: send event to every connected client
// socket.broadcast.emit: send event to every connected client except for this one
// ============ ROOMs
// io.to().emit: send events to everybody in a specific room
// socket.broadcast.to().emit: send event to every connected client in a specific room except for this one
io.on('connection', (socket) => {


    socket.on('join', ({ username, room }, callback) => {
        // socket.id: the unique identifier for a particular connection
        const {error, user} = addUser({
            id: socket.id,
            username: username,
            room: room
        })

        if (error) {
           return callback(error)
        }

        socket.join(user.room)

        socket.emit('message', generateMessage('Admin', 'Welcome'));
        // This message goes to all users in a room except the new user who has joined
        socket.broadcast.to(user.room).emit('message', generateMessage('Admin', `${user.username} has joined`))

        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })

        callback() // calling callback without argument means there is no error
    })

    // This "callback" send acknowledgement to the client
    // The ackMsg can be empty meaning the callback funttion will have empty arguments: callback()
    // or it can have an argument:: callback('Delivered')
    socket.on('sendMessage', (message, callback) => {
        const filter = new Filter()
        if (filter.isProfane(message)) {
            return callback('Profanity is not allowed')
        }
        const user = getUser(socket.id)
        if (user) {
            io.to(user.room).emit('message', generateMessage(user.username, message))
            callback('Delivered')
        }
    })

    socket.on('sendLocation', (location, callback) => {
        const user = getUser(socket.id)
        if (user) {
            io.to(user.room).emit('LocationMessage', generateLocationMessage(user.username, 'https://google.com/maps?q=' + location.latitude + ',' + location.longitude))
            callback() // Sending callback to the client with empty argument
        }
    })

    socket.on('disconnect', () => {
        const user = removeUser(socket.id)
        if (user) {
            io.to(user.room).emit('message', generateMessage('Admin', `${user.username} has left`))

            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }
    })

})
/*let  count = 0
io.on('connection', (socket) => {
    console.log('New websocket connection')
    socket.emit('countUpdated', count)
    socket.on('increment', () => {
        count++
        // socket.emit() emits to specific connection
        // socket.emit('countUpdated', count)
        // io.emit() emits to all connections
        io.emit('countUpdated', count)
    })
})*/



server.listen(port, () => {
    console.log("Chat app listening on port.... ", port)
})













