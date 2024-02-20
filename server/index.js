const express = require('express');
require('dotenv').config();
const http = require('http');
const cors = require('cors');
const mongoose = require('mongoose');
const { Server } = require('socket.io');
const userRoute = require('./Routes/userRoute');
const chatRoute = require('./Routes/chatRoute');
const messageRoute = require('./Routes/messageRoute');

const app = express();
const server = http.createServer(app);

const io = new Server(server, { cors: process.env.CLIENT_URL });

require('dotenv').config();

app.use(express.json());
app.use(cors());
app.use('/api/users', userRoute);
app.use('/api/chats', chatRoute);
app.use('/api/messages', messageRoute);

app.get('/', (req, res) => {
  res.send('hi')
});

const port = process.env.PORT || 5000;
const uri = process.env.ATLAS_URI;

server.listen(port, (req, res) => {
  console.log(`Socket.io server running on port: ${port}`);
});

mongoose
  .connect(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true
  })
  .then(() => {
    console.log("MongoDB connection established");
    
    let onlineUsers = [];

    io.on("connection", (socket) => {
      // listen to a connection
      socket.on("addNewUser", (userId) => {
        !onlineUsers.some((user) => user.userId === userId) && onlineUsers.push({
          userId,
          socketId: socket.id
        });
    
        io.emit("getOnlineUsers", onlineUsers);
      });
    
      // add message
      socket.on("sendMessage", (message) => {
        const user = onlineUsers.find((user) => user.userId === message.recipientId);
    
        if (user) {
          io.to(user.socketId).emit("getMessage", message);
          io.to(user.socketId).emit("getNotification", {
            senderId: message.senderId,
            isRead: false,
            date: new Date()
          });
        }
      });
    
      socket.on("disconnect", () => {
        onlineUsers = onlineUsers.filter(user => user.socketId !== socket.id);
    
        io.emit("getOnlineUsers", onlineUsers);
      });
    });
  })
  .catch((error) => console.log("MongoDB connection failed: ", error.message));