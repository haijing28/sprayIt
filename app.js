var http = require('http');
var util = require('util');

var connect = require('connect');

// This is the syntax for Heroku to understand what port is requested
var port = process.env.PORT || 5000;

var app = connect.createServer(
	connect.static(__dirname + "/public")
).listen(port);

util.log("server running at port: " + port);

var io = require("socket.io").listen(app);
// if .listen() is set to another port then that means the socket is listening on another port...

var onlineUser = [];

io.set('log level', 2); // showing only significant log such as handshaking and data transmission
io.sockets.on('connection', function(socket) { // when a user, "socket" connects
	onlineUser++;
	util.log('hola server, the user #' + socket.id + ' has just connected');
	util.log('number of user: ' + onlineUser);
	
	// listening to mouse position signal and transmit to every users
/*
	
*/
	// listening for mouse move events
	socket.on('mousemove', function(data) {
		socket.broadcast.emit('moving', data);
		util.log('move: ' + data.x + " " + data.y);
	});
	
	socket.on('mousedown', function(data) {
		socket.broadcast.emit('down', data);
		util.log('down ' + data.x + " " + data.y);
	});
	
	socket.on('mouseup', function(data) {
		socket.broadcast.emit('up', data);
		util.log('up ' + data.x + " " + data.y);
	});
	
	// when that user disconnects
	    socket.on('disconnect', function() {
		onlineUser--;
		util.log('the user #' + socket.id + ' has just disconnected');
		util.log('number of user: ' + onlineUser);
	});
	
    //listen for ready
     socket.on('ready',function(data){
     util.log('ready:' +data);
     socket.emit('message','thanks'+socket.id);//reply to user
     io.sockets.emit('message','total users:',+onlineUser); //emit to all
     
     socket.broadcast.emit('user',socket.id); //emit to everyone else
	    
	   	    
    });
    
});