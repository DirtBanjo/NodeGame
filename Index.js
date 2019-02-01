var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);


var circles = [];
var squares = []; //small food to eat for the circles
var speedIncrease = 0.01;
var maxNumSquares = 8;
var enemy = new Square();
enemy.size = 45;

//function to generate Guid
function guid() {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);
    }
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
        s4() + '-' + s4() + s4() + s4();
}

//Prototype for square object
function Square() {
    this.id = guid();
    this.value = getRandomArbitrary(3, 6);
    this.size =  parseInt(getRandomArbitrary(5, 10));
    this.xpos = getRandomArbitrary(100, 1450);
    this.ypos = getRandomArbitrary(100, 850);
    this.color = getRandomColor();
}

//Prototype for circle object
function Usercircle(owner) {
    this.owner = owner;
    this.radius = 2;
    this.score = 0;
    this.xpos = getRandomArbitrary(100, 1450);
    this.ypos = getRandomArbitrary(100, 850);
    this.directionAngle = 0;
    this.moveRight = false;
    this.moveLeft = false;
    this.moveUp = false;
    this.moveDown = false;
    this.speed = 0.5;
    this.maxRight = 1500;
    this.maxLeft = 0;
    this.maxUp = 0;
    this.maxDown = 920;
    this.UserName = "";
    this.IsSpectator = false;
    this.speedIncreaser = 0.000;

  //function to check if circle out of bounds
    this.outOfBounds = function() {
        if ((this.xpos > this.maxRight)) {
            this.xpos = this.maxLeft + this.radius;
        }
        if ((this.xpos < this.maxLeft)) {
            this.xpos = this.maxRight - this.radius;
        }
        if ((this.ypos < this.maxUp)) {
            this.ypos = this.maxDown - (this.radius);
        }
        if ((this.ypos > this.maxDown)) {
            this.ypos = this.maxUp + this.radius;
        }
    }

//function to check if the user circle is colliding with a square
    this.SquareCollides = function(circle, rect) {
        var distx = Math.abs(circle.xpos - rect.xpos);
        var disty = Math.abs(circle.ypos - rect.ypos);
        if (distx > (rect.size / 2 + circle.radius)) {
            return false;
        }
        if (disty > (rect.size / 2 + circle.radius)) {
            return false;
        }
        if (distx <= (rect.size / 2)) {
            return true;
        }
        if (disty <= (rect.size / 2)) {
            return true;
        }
        var hypot = (distx - rect.size / 2) * (distx - rect.size / 2) +
            (disty - rect.size / 2) * (disty - rect.size / 2);
        return (hypot <= (circle.radius * circle.radius));
    }

	//Function to check all collision types, collision with other users or squares
    this.collide = function() {
        var circle;
        for (var i = 0; i < circles.length; i++) {
            //check square collision
            for (var j = 0; j < squares.length; j++) {
                var circleObj = this;
                var squareObj = squares[j];
                if (this.SquareCollides(circleObj, squareObj)) {
                    removeSquare(squareObj.id);
                    circleObj.radius = IncreaseCircleSize(circleObj);
                    circleObj.speed = circleObj.speed - speedIncrease;
                    circleObj.score += squareObj.size;
                }
				//if enemy sqaure colliding with user circles
                if (this.SquareCollides(circleObj, enemy)) {
                    removeUserCircle(this.owner);
                    return;
                }
            }

            if (circles[i].owner !== this.owner) {
                circle = circles[i];
                var dx = this.xpos - circle.xpos;
                var dy = this.ypos - circle.ypos;
                var distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < this.radius + circle.radius) {
                    //collision detected with other player
                    //which circle is bigger
                    if (this.radius > circle.radius) { //winner
                        removeUserCircle(circle.owner);
                        this.radius = IncreaseCircleSize(this);
                        this.score += 5;
                        this.speed = this.speed - speedIncrease;
                        //kill off other circle
                    } else { //loser
                        removeUserCircle(this.owner);
                        io.to(this.owner).emit('Spectator');
                    }
                }
            }
        }
    }

}

//function to increase circle size
function IncreaseCircleSize(circle) {
    if (circle.radius < 30) {
        circle.radius += 3;
    }
    return circle.radius;
}

//function to create a user circle
function CreateCircle(owner, userName) {
    var circle = new Usercircle(owner);
    circle.UserName = userName;
    circles.push(circle);
}

//function to create a sqaure
function CreateSquare() {
    if (squares.length < getRandomArbitrary(3, 6)) {
        var square = new Square();
        squares.push(square);
    }
};

//infinite game loop, handles the creation of squares randomly
(function loop() {
    var rand = Math.round(Math.random() * (3000 - 500)) + getRandomArbitrary(900, 1500);
    setTimeout(function() {
        CreateSquare();
        loop();
    }, rand);

    var r = getRandomArbitrary(8000, 15000);
    if (r > 10000 && r < 13000) //add randomness
    {
        if (squares.length > 0) { //randomly remove squares
            var randomSquareToRemove = parseInt(getRandomArbitrary(0, squares.length - 1));;
            var id = squares[randomSquareToRemove].id;
            removeSquare(id);
        }
    }
}());


//function to get random number between min and max
function getRandomArbitrary(min, max) {
    return Math.random() * (max - min) + min;
}

//function to remove a users circle so they can become a spectator
function removeUserCircle(owner) {
    for (var i = 0; i < circles.length; i++) {
        if (circles[i].owner === owner) {
            console.log("Removing: " + owner);
            circles.splice(i, 1);
            io.emit('RemovedUser', owner, circles);
        }
    }
}

//function to remove square
function removeSquare(id) {
    for (var i = 0; i < squares.length; i++) {
        if (squares[i].id === id) {
            squares.splice(i, 1);
        }
    }
}


function getUsersCircle(owner) {
    var circle;
    owner = owner.substring(2);
    for (var i = 0; i < circles.length; i++) {
        if (circles[i].owner === owner) {
            circle = circles[i];
            break;
        }
    }
    return circle;
}


//Function to update the objects we send to the client, update positions etc...
//Also perform operations such as checks
function updateClient() {
    for (var i = 0; i < circles.length; i++) {
        if (circles[i] != null) {
            circles[i].xpos += (circles[i].speed) * Math.cos(circles[i].directionAngle);
            circles[i].ypos += (circles[i].speed) * Math.sin(circles[i].directionAngle);
            circles[i].outOfBounds();
            circles[i].collide();
        }
    }
    getClosestCircle();
    io.emit('updateClient', circles, squares, enemy);
}

//function to get the closest circle to the enemy square and to move towards circle
function getClosestCircle() {
    var distances = [];
    var closestCircle = 0;
    var distTemp = 0;
    for (var i = 0; i < circles.length; i++) {
        var a = enemy.xpos - circles[i].xpos;
        var b = enemy.ypos - circles[i].ypos;
        var dist = Math.sqrt(a * a + b * b);
        distances.push(dist);
    }
    var largest = 0;

    for (i = 0; i <= largest; i++) {
        if (distances[i] > largest) {
            var largest = distances[i];
        }
    }
    closestCircle = distances.indexOf(largest);
    if (closestCircle >= 0) {
        var speed = 0.3;
        var rotation = Math.atan2(enemy.ypos - circles[closestCircle].ypos, enemy.xpos - circles[closestCircle].xpos);
        // Move towards the player
        enemy.xpos -= Math.cos(rotation) * speed;
        enemy.ypos -= Math.sin(rotation) * speed;
    }
}

//function to get random color
function getRandomColor() {
    var letters = '012345'.split('');
    var color = '#';
    color += letters[Math.round(Math.random() * 5)];
    letters = '0123456789ABCDEF'.split('');
    for (var i = 0; i < 5; i++) {
        color += letters[Math.round(Math.random() * 15)];
    }
    return color;
}

app.get('/', function(req, res) {
    res.sendfile('ClickGame.html');
});

setInterval(updateClient, 2);

//User connection
io.on('connection', function(client) {
    var id = client.id;
    id = id.substring(2);
    console.log("User joined");
    io.emit('UserConnected', circles, id, squares);

    client.on('disconnect', function() {
    });

	//when user provides a username create a circle for the user with their name
    client.on('UserNameInput', function(circleId, userName) {
        var id = circleId;
        CreateCircle(id, userName); //create a circle for the user
    });

	//when mouse angle changes update the users circle with the new angle so it can be used when it was being re-drawn
    client.on('mouseAngleChanged', function(angle) {
        if (getUsersCircle(client.id)) {
            var owner = client.id.substring(2);
            for (var i = 0; i < circles.length; i++) {
                if (circles[i].owner === owner) {
                    circles[i].directionAngle = angle;
                }
            }
        }
    });

	//when the client requests to shrink their circle i.e. space bar pressed
    client.on('decreaseCicrleSize', function() {
        if (getUsersCircle(client.id)) {
            var owner = client.id.substring(2);
            for (var i = 0; i < circles.length; i++) {
                if (circles[i].owner === owner) {
                    if (circles[i].radius > 3) {
                        circles[i].radius -= 0.5;
                    }
                    if (circles[i].speed < 0.5) {
                        circles[i].speed += speedIncrease;
                    }
                }
            }
        }
    });

    //when the client becomes a spectator or requests to be one
    client.on('UserSpectating', function() {
        if (getUsersCircle(client.id)) {
            var owner = client.id.substring(2);
            for (var i = 0; i < circles.length; i++) {
                if (circles[i].owner === owner) {
                    removeUserCircle(owner);
                    io.to(owner).emit('Spectator');
                }
            }
        }
    });

});

http.listen(8080, function() {
    console.log('listening on *:8080');
});