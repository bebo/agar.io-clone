var io = require('socket.io-client');
var ChatClient = require('./chat-client');
var Canvas = require('./canvas');
var global = require('./global');

// var playerNameInput = document.getElementById('playerNameInput');
var socket;
var reason;

var debug = function(args) {
    if (console && console.log) {
        console.log(args);
    }
};

if ( /Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent) ) {
    global.mobile = true;
}
var firstGame = true;

function startGame(type) {
    // global.playerName = "";
    if (firstGame) {
        firstGame = false;
        Bebo.User.getUser("me", function(err, u) {
            Bebo.Notification.roster("{{{user.username}}}",
                                     "is playing agar",
                                     {rate_limit_key: "agar:" + u.user_id + Math.random()});
        });
    }
    global.playerType = type;
    global.toggleMassState = 0;

    global.screenWidth = window.innerWidth;
    global.screenHeight = window.innerHeight;

    document.getElementById('startMenuWrapper').style.opacity = 0;
    document.getElementById('startMenuWrapper').style.maxHeight = '0px';
    document.getElementById('gameAreaWrapper').style.opacity = 1;
    if (!socket) {
        socket = io({query:"type=" + type});
        setupSocket(socket);
    }
    if (!global.animLoopHandle)
        animloop();
    socket.emit('respawn');
    window.chat.socket = socket;
    window.chat.registerFunctions();
    window.canvas.socket = socket;
    global.socket = socket;
}

// Checks if the nick chosen contains valid alphanumeric characters (and underscores).
function validNick() {
    var regex = /^\w*$/;
    debug('Regex Test', regex.exec(playerNameInput.value));
    return regex.exec(playerNameInput.value) !== null;
}

$(document).ready(function() {
    Bebo.onReady(function(){
        console.log("ready");
        Bebo.User.getUser("me", function(err, u) {
            console.log("me", err, u);
            global.playerName = u.username;
            global.user = u;

            var btn = document.getElementById('startButton'),
                // btnS = document.getElementById('spectateButton'),
            nickErrorText = document.querySelector('#startMenu .input-error');

            // btnS.onclick = function () {
            //     startGame('spectate');
            // };

            btn.onclick = function () {

                // Checks if the nick is valid.
                // if (validNick()) {
                //     nickErrorText.style.opacity = 0;
                startGame('player');
                // } else {
                //     nickErrorText.style.opacity = 1;
                // }
            };

            // var settingsMenu = document.getElementById('settingsButton');
            // var settings = document.getElementById('settings');
            var instructions = document.getElementById('instructions');
        });
    });
});

// window.onload = function() {

//     var btn = document.getElementById('startButton'),
//         // btnS = document.getElementById('spectateButton'),
//         nickErrorText = document.querySelector('#startMenu .input-error');

//     // btnS.onclick = function () {
//     //     startGame('spectate');
//     // };

//     btn.onclick = function () {

//         // Checks if the nick is valid.
//         // if (validNick()) {
//         //     nickErrorText.style.opacity = 0;
//             startGame('player');
//         // } else {
//         //     nickErrorText.style.opacity = 1;
//         // }
//     };

//     // var settingsMenu = document.getElementById('settingsButton');
//     // var settings = document.getElementById('settings');
//     var instructions = document.getElementById('instructions');

//     // settingsMenu.onclick = function () {
//     //     if (settings.style.maxHeight == '300px') {
//     //         settings.style.maxHeight = '0px';
//     //     } else {
//     //         settings.style.maxHeight = '300px';
//     //     }
//     // };

//     // playerNameInput.addEventListener('keypress', function (e) {
//     //     var key = e.which || e.keyCode;

//     //     if (key === global.KEY_ENTER) {
//     //         if (validNick()) {
//     //             nickErrorText.style.opacity = 0;
//     //             startGame('player');
//     //         } else {
//     //             nickErrorText.style.opacity = 1;
//     //         }
//     //     }
//     // });
// };

// TODO: Break out into GameControls.

var foodConfig = {
    border: 0,
};

var playerConfig = {
    border: 6,
    textColor: '#FFFFFF',
    textBorder: '#000000',
    textBorderSize: 3,
    defaultSize: 30
};

var player = {
    id: -1,
    x: global.screenWidth / 2,
    y: global.screenHeight / 2,
    screenWidth: global.screenWidth,
    screenHeight: global.screenHeight,
    target: {x: global.screenWidth / 2, y: global.screenHeight / 2}
};
global.player = player;

var foods = [];
var viruses = [];
var fireFood = [];
var users = [];
var leaderboard = [];
var target = {x: player.x, y: player.y};
var last_target = {};
global.target = target;
var zoom = 1;

window.canvas = new Canvas();
window.chat = new ChatClient();


// var visibleBorderSetting = document.getElementById('visBord');
// visibleBorderSetting.onchange = settings.toggleBorder;

// var showMassSetting = document.getElementById('showMass');
// showMassSetting.onchange = settings.toggleMass;

// var continuitySetting = document.getElementById('continuity');
// continuitySetting.onchange = settings.toggleContinuity;

// var roundFoodSetting = document.getElementById('roundFood');
// roundFoodSetting.onchange = settings.toggleRoundFood;

var c = window.canvas.cv;
var graph = c.getContext('2d');

$( "#feed" ).click(function() {
    socket.emit('1');
    window.canvas.reenviar = false;
});

$( "#split" ).click(function() {
    socket.emit('2');
    window.canvas.reenviar = false;
});

// socket stuff.
function setupSocket(socket) {
    // Handle ping.
    socket.on('pong', function () {
        var latency = Date.now() - global.startPingTime;
        debug('Latency: ' + latency + 'ms');
        // window.chat.addSystemLine('Ping: ' + latency + 'ms');
    });

    // Handle error.
    socket.on('connect_failed', function () {
        socket.close();
        global.disconnected = true;
    });

    socket.on('disconnect', function () {
        socket.close();
        global.disconnected = true;
    });

    // Handle connection.
    socket.on('welcome', function (playerSettings) {
        player = playerSettings;
        player.name = global.playerName;
        player.screenWidth = global.screenWidth;
        player.screenHeight = global.screenHeight;
        player.target = window.canvas.target;
        global.player = player;
        window.chat.player = player;
        socket.emit('gotit', player);
        global.gameStart = true;
        debug('Game started at: ' + global.gameStart);
        if (!global.mobile) {
            window.chat.addSystemLine('Connected to the game!');
            window.chat.addSystemLine('Type <b>-help</b> for a list of commands.');
        } else {
            document.getElementById('chatbox').removeChild(document.getElementById('chatInput'));
        }
		c.focus();
    });

    socket.on('gameSetup', function(data) {
        global.gameWidth = data.gameWidth;
        global.gameHeight = data.gameHeight;
        resize();
    });

    socket.on('playerDied', function (data) {
        window.chat.addSystemLine('<b>' + (data.name.length < 1 ? 'An unnamed cell' : data.name) + '</b> eaten by <b>' + (data.by.length < 1 ? 'An unnamed cell' : data.by));
    });

    socket.on('playerDisconnect', function (data) {
        window.chat.addSystemLine('<b>' + (data.name.length < 1 ? 'An unnamed cell' : data.name) + '</b> disconnected');
    });

    socket.on('playerJoin', function (data) {
        if (!data || !data.name) {
            console.log("Unexpected playerJoin payload", data);
            return;
        }
        window.chat.addSystemLine('<b>' + (data.name.length < 1 ? 'An unnamed cell' : data.name) + '</b> joined');
    });

    var PTR = ['↑&#xfe0e;', '↖&#xfe0e;', '←&#xfe0e;', '↙&#xfe0e;', '↓&#xfe0e;', '↘&#xfe0e;', '→&#xfe0e;', '↗&#xfe0e;', '↑&#xfe0e;'];
    function getDirectionHint(l) {
        if (!l.id || l.id === player.id) {
            return "";
        }
        var x = l.x - player.x;
        var y = l.y - player.y;
        var direction = 4 + Math.round(Math.atan2(x, y) * 4 / Math.PI);
        if (PTR[direction] === undefined) {
            console.log("PTR UNDEFINED", direction, x, y);
        }
        return PTR[direction];
    }

    socket.on('leaderboard', function (data) {
        leaderboard = data.leaderboard;
        var status = "<ul>";
        for (var i = 0; i < leaderboard.length; i++) {
            status += '<li id="lb_' + leaderboard[i].id + '"><div class="dir">' + getDirectionHint(leaderboard[i]) + '</div>';
            if (leaderboard[i].id == player.id){
                if(leaderboard[i].name.length !== 0)
                    status += '<span class="me"><span class="mass">' + player.massTotal + '</span>' + leaderboard[i].name + "</span>";
                else
                    status += '<span class="me">' + "An unnamed cell</span>";
            } else {
                if(leaderboard[i].name.length !== 0)
                    status += '<span "><span class="mass">' + leaderboard[i].massTotal + '</span>' + leaderboard[i].name + "</span>";
                else
                    status += 'An unnamed cell';
            }
            status += '</li>';
        }
        status += '</ul>';
        // status += "fps: " + global.fps;
        //status += '<br />Players: ' + data.players;
        document.getElementById('status').innerHTML = status;
    });

    socket.on('serverMSG', function (data) {
        window.chat.addSystemLine(data);
    });

    // Chat.
    socket.on('serverSendPlayerChat', function (data) {
        window.chat.addChatLine(data.sender, data.message, false);
    });

    // Handle movement.
    socket.on('serverTellPlayerMove', function (userData, foodsList, massList, virusList) {

        var playerData;

        for(var i =0; i< userData.length; i++) {
            if(typeof(userData[i].id) == "undefined") {
                playerData = userData[i];
                i = userData.length;
            }
        }

        if (global.playerType == 'player') {
            var xoffset = player.x - playerData.x;
            var yoffset = player.y - playerData.y;

            player.x = playerData.x;
            player.y = playerData.y;
            player.hue = playerData.hue;
            player.massTotal = playerData.massTotal;
            player.cells = playerData.cells;
            player.xoffset = isNaN(xoffset) ? 0 : xoffset;
            player.yoffset = isNaN(yoffset) ? 0 : yoffset;

            var max_x = 0, min_x = global.gameWidth;
            for (var j=0; j < player.cells.length ; j++) {
                var cell = player.cells[j];
                max_x = Math.max(cell[0] + cell[2], max_x);
                min_x = Math.min(cell[0] - cell[2], min_x);
            }
            var new_zoom = Math.min(global.screenWidth / (1.6 * (max_x - min_x)), 1);
            if (new_zoom !== zoom && (Math.abs(zoom-new_zoom)/zoom) > 0.02 ) {
                zoom = new_zoom;
                global.viewPortWidth = global.screenWidth / zoom;
                global.viewPortHeight = global.screenHeight / zoom;
                resize();
            }
        }
        users = userData;
        if (foodsList) {
            foods = foodsList;
            var l = foods.length;
            for(var fi=0 ; fi < l; fi++) {
                foods[fi].push((foods[fi][2]-10) * 360); // hue
            }
        }
        viruses = virusList;
        fireFood = massList;
    });

    // Death.
    socket.on('RIP', function () {
        global.gameStart = false;
        global.died = true;
        window.setTimeout(function() {
            document.getElementById('gameAreaWrapper').style.opacity = 0;
            document.getElementById('startMenuWrapper').style.opacity = 1;
            document.getElementById('startMenuWrapper').style.maxHeight = '1000px';
            global.died = false;
            if (global.animLoopHandle) {
                window.cancelAnimationFrame(global.animLoopHandle);
                global.animLoopHandle = undefined;
            }
        }, 2500);
    });

    socket.on('kick', function (data) {
        global.gameStart = false;
        reason = data;
        global.kicked = true;
        socket.close();
    });

    socket.on('virusSplit', function (virusCell) {
        socket.emit('2', virusCell);
        reenviar = false;
    });
}

function drawCircle(centerX, centerY, radius, sides) {
    var theta = 0;
    var x = 0;
    var y = 0;

    graph.beginPath();

    for (var i = 0; i < sides; i++) {
        theta = (i / sides) * 2 * Math.PI;
        x = centerX + radius * Math.sin(theta);
        y = centerY + radius * Math.cos(theta);
        graph.lineTo(x, y);
    }

    graph.closePath();
    graph.stroke();
    graph.fill();
}

function drawVirusCircle(virus, centerX, centerY, radius, sides) {

    var theta = 0;
    var x = 0;
    var y = 0;
    sides = sides * 4;
    var inner_radius = radius * 0.9 - 5;

    graph.beginPath();

    var rotate = (tick * 3 + (player.x + player.y) / 100) / 348 ;
    if (virus.mass % 2) {
        rotate = rotate * -1;
    }

    for (var i = 0; i < sides; i++) {
        theta = (i / sides) * 2 * Math.PI + rotate;
        if (i % 4) {
            x = centerX + inner_radius * Math.sin(theta);
            y = centerY + inner_radius * Math.cos(theta);
        } else {
            x = centerX + radius * Math.sin(theta);
            y = centerY + radius * Math.cos(theta);
        }
        graph.lineTo(x, y);
    }

    graph.closePath();
    graph.stroke();
    graph.fill();
}

function drawFood(food) {
    graph.strokeStyle = 'hsl(' + food[3] + ', 100%, 45%)';
    graph.fillStyle = 'hsl(' + food[3] + ', 100%, 50%)';
    graph.lineWidth = foodConfig.border * zoom;
    drawCircle(zoom * (food[0] - player.x + global.viewPortWidth / 2),
               zoom * (food[1] - player.y + global.viewPortHeight / 2),
               zoom * food[2], global.foodSides);
}

function drawVirus(virus) {
    graph.strokeStyle = virus.stroke;
    graph.fillStyle = virus.fill;
    graph.lineWidth = virus.strokeWidth * zoom;
    drawVirusCircle(virus,
               zoom * (virus.x - player.x + global.viewPortWidth / 2),
               zoom * (virus.y - player.y + global.viewPortHeight / 2),
               zoom * virus.radius, global.virusSides);
}

function drawFireFood(mass) {
    graph.strokeStyle = 'hsl(' + mass.hue + ', 100%, 45%)';
    graph.fillStyle = 'hsl(' + mass.hue + ', 100%, 50%)';
    graph.lineWidth = (playerConfig.border+10) * zoom;
    drawCircle(zoom * (mass.x - player.x + global.viewPortWidth / 2),
               zoom * (mass.y - player.y + global.viewPortHeight / 2),
               zoom * (mass.radius-5), 18 + (~~(mass.masa/5)));
}

function drawPlayers(order) {
    var start = {
        x: player.x - (global.screenWidth / (2 * zoom)),
        y: player.y - (global.screenHeight / (2 * zoom))
    };

    for(var z=0; z<order.length; z++)
    {
        var userCurrent = users[order[z].nCell];
        var cellCurrent = users[order[z].nCell].cells[order[z].nDiv];

        var x=0;
        var y=0;

        var points = 30 + ~~(cellCurrent[2]/5); // TODO should be from mass - recalc
        var increase = Math.PI * 2 / points;

        graph.strokeStyle = 'hsl(' + userCurrent.hue + ', 100%, 45%)';
        graph.fillStyle = 'hsl(' + userCurrent.hue + ', 100%, 50%)';
        graph.lineWidth = playerConfig.border * zoom;

        var xstore = [];
        var ystore = [];

        global.spin += 0.0;

        var circle = {
            x: cellCurrent[0] - start.x,
            y: cellCurrent[1] - start.y
        };

        for (var i = 0; i < points; i++) {

            x = cellCurrent[2] * Math.cos(global.spin) + circle.x;
            y = cellCurrent[2] * Math.sin(global.spin) + circle.y;
            if(typeof(userCurrent.id) == "undefined") {
                x = valueInRange(-userCurrent.x + global.screenWidth / 2,
                                 global.gameWidth - userCurrent.x + global.viewPortWidth / 2, x);
                y = valueInRange(-userCurrent.y + global.viewPortHeight / 2,
                                 global.gameHeight - userCurrent.y + global.viewPortHeight / 2, y);
            } else {
                x = valueInRange(-cellCurrent[0] - player.x + global.viewPortWidth / 2 + (cellCurrent[2]/3),
                                 global.gameWidth - cellCurrent[0] + global.gameWidth - player.x + global.viewPortWidth / 2 - (cellCurrent[2]/3), x);
                y = valueInRange(-cellCurrent[1] - player.y + global.viewPortHeight / 2 + (cellCurrent[2]/3),
                                 global.gameHeight - cellCurrent[1] + global.gameHeight - player.y + global.viewPortHeight / 2 - (cellCurrent[2]/3) , y);
            }
            global.spin += increase;
            xstore[i] = x;
            ystore[i] = y;
        }
        /*if (wiggle >= player.radius/ 3) inc = -1;
        *if (wiggle <= player.radius / -3) inc = +1;
        *wiggle += inc;
        */
        for (i = 0; i < points; ++i) {
            if (i === 0) {
                graph.beginPath();
                graph.moveTo(zoom * xstore[i], zoom * ystore[i]);
            } else if (i > 0 && i < points - 1) {
                graph.lineTo(zoom * xstore[i], zoom * ystore[i]);
            } else {
                graph.lineTo(zoom * xstore[i], zoom * ystore[i]);
                graph.lineTo(zoom * xstore[0], zoom * ystore[0]);
            }

        }
        graph.lineJoin = 'round';
        graph.lineCap = 'round';
        graph.fill();
        graph.stroke();
        var nameCell = "";
        if(typeof(userCurrent.id) == "undefined")
            nameCell = player.name;
        else
            nameCell = userCurrent.name;

        var fontSize = Math.max(cellCurrent[2]/ 3, 12);
        graph.lineWidth = playerConfig.textBorderSize * zoom;
        graph.fillStyle = playerConfig.textColor;
        graph.strokeStyle = playerConfig.textBorder;
        graph.miterLimit = 1;
        graph.lineJoin = 'round';
        graph.textAlign = 'center';
        graph.textBaseline = 'middle';
        graph.font = 'bold ' + fontSize * zoom + 'px sans-serif';
        graph.strokeText(nameCell, zoom * circle.x, zoom * circle.y);
        graph.fillText(nameCell, zoom * circle.x, zoom * circle.y);
    }
}

function valueInRange(min, max, value) {
    return Math.min(max, Math.max(min, value));
}

function drawgrid() {
     graph.lineWidth = 1 * zoom;
     graph.strokeStyle = global.lineColor;
     graph.globalAlpha = 0.05;
     graph.beginPath();

    for (var x = zoom * (global.xoffset - player.x); x < global.screenWidth ; x += zoom * global.screenHeight / 18 ) {
        graph.moveTo(x, 0);
        graph.lineTo(x, global.screenHeight);
    }

    for (var y = zoom * (global.yoffset - player.y) ; y < global.screenHeight ; y += zoom * global.screenHeight / 18) {
        graph.moveTo(0, y);
        graph.lineTo(global.screenWidth, y);
    }

    graph.stroke();
    graph.globalAlpha = 1;
}

// function drawborder() {
//     graph.lineWidth = 1 * zoom;
//     graph.strokeStyle = playerConfig.borderColor;

//     // Left-vertical.
//     if (player.x <= global.screenWidth/2) {
//         graph.beginPath();
//         graph.moveTo(zoom * (global.screenWidth/2 - player.x), 0 ? player.y > global.screenHeight/2 : global.screenHeight/2 - player.y);
//         graph.lineTo(global.screenWidth/2 - player.x, global.gameHeight + global.screenHeight/2 - player.y);
//         graph.strokeStyle = global.lineColor;
//         graph.stroke();
//     }

//     // Top-horizontal.
//     if (player.y <= global.screenHeight/2) {
//         graph.beginPath();
//         graph.moveTo(0 ? player.x > global.screenWidth/2 : global.screenWidth/2 - player.x, global.screenHeight/2 - player.y);
//         graph.lineTo(global.gameWidth + global.screenWidth/2 - player.x, global.screenHeight/2 - player.y);
//         graph.strokeStyle = global.lineColor;
//         graph.stroke();
//     }

//     // Right-vertical.
//     if (global.gameWidth - player.x <= global.screenWidth/2) {
//         graph.beginPath();
//         graph.moveTo(global.gameWidth + global.screenWidth/2 - player.x,
//                      global.screenHeight/2 - player.y);
//         graph.lineTo(global.gameWidth + global.screenWidth/2 - player.x,
//                      global.gameHeight + global.screenHeight/2 - player.y);
//         graph.strokeStyle = global.lineColor;
//         graph.stroke();
//     }

//     // Bottom-horizontal.
//     if (global.gameHeight - player.y <= global.screenHeight/2) {
//         graph.beginPath();
//         graph.moveTo(global.gameWidth + global.screenWidth/2 - player.x,
//                      global.gameHeight + global.screenHeight/2 - player.y);
//         graph.lineTo(global.screenWidth/2 - player.x,
//                      global.gameHeight + global.screenHeight/2 - player.y);
//         graph.strokeStyle = global.lineColor;
//         graph.stroke();
//     }
// }

window.requestAnimFrame = (function() {
    return  window.requestAnimationFrame       ||
            window.webkitRequestAnimationFrame ||
            window.mozRequestAnimationFrame    ||
            window.msRequestAnimationFrame     ||
            function( callback ) {
                window.setTimeout(callback, 1000 / 60);
            };
})();

window.cancelAnimFrame = (function(handle) {
    return  window.cancelAnimationFrame     ||
            window.mozCancelAnimationFrame;
})();

var fps_sample = 0;
var fps_cnt = 0;
var fps_last = Date.now();
var fps_sample_size = 30;
var slow_cnt = 0;
var tick = 0;
var last_heartbeat = 0;

function fps() {
    var now = Date.now();
    var delta = (now - fps_last);
    if (delta > 66) {
        slow_cnt += 1;
    }
    fps_sample += delta;
    fps_cnt = (fps_cnt +1) % fps_sample_size;
    if (fps_cnt === 0) {
        global.fps = Math.round(10000 * fps_sample_size / fps_sample)/10;
        // console.log("FPS", global.fps, slow_cnt , fps_sample_size, fps_sample, "/30");
        fps_sample = 0;
        slow_cnt = 0;
    }
    fps_last = now;
}

function animloop() {
    global.animLoopHandle = window.requestAnimFrame(animloop);
    gameLoop();
    fps();
}

function gameLoop() {
    tick ++;
    if (global.died) {
        graph.fillStyle = '#333333';
        graph.fillRect(0, 0, global.screenWidth, global.screenHeight);

        graph.textAlign = 'center';
        graph.fillStyle = '#FFFFFF';
        graph.font = 'bold 30px sans-serif';
        graph.fillText('You died!', global.screenWidth / 2, global.screenHeight / 2);
    }
    else if (!global.disconnected) {
        if (global.gameStart) {
            graph.fillStyle = global.backgroundColor;
            graph.fillRect(0, 0, global.screenWidth, global.screenHeight);
            drawgrid();
            foods.forEach(drawFood);
            fireFood.forEach(drawFireFood);
            viruses.forEach(drawVirus);

            if (global.borderDraw) {
                // drawborder();
            }
            var orderMass = [];
            for(var i=0; i<users.length; i++) {
                for(var j=0; j<users[i].cells.length; j++) {
                    orderMass.push({
                        nCell: i,
                        nDiv: j,
                        mass: users[i].cells[j][2]
                    });
                }
            }
            orderMass.sort(function(obj1, obj2) {
                return obj1.mass - obj2.mass;
            });

            drawPlayers(orderMass);

            if (window.canvas.target.x !== last_target.x || window.canvas.target.y !== last_target.y || (tick - last_heartbeat) > 60) {
                last_target.y = window.canvas.target.y;
                last_target.x = window.canvas.target.x;
                last_heartbeat = tick;
                socket.emit('0', window.canvas.target); // playerSendTarget "Heartbeat".
            }

        } else {
            graph.fillStyle = '#333333';
            graph.fillRect(0, 0, global.screenWidth, global.screenHeight);

            graph.textAlign = 'center';
            graph.fillStyle = '#FFFFFF';
            graph.font = 'bold 30px sans-serif';
            graph.fillText('Game Over!', global.screenWidth / 2, global.screenHeight / 2);
        }
    } else {
        graph.fillStyle = '#333333';
        graph.fillRect(0, 0, global.screenWidth, global.screenHeight);

        graph.textAlign = 'center';
        graph.fillStyle = '#FFFFFF';
        graph.font = 'bold 30px sans-serif';
        if (global.kicked) {
            if (reason !== '') {
                graph.fillText('You were kicked for:', global.screenWidth / 2, global.screenHeight / 2 - 20);
                graph.fillText(reason, global.screenWidth / 2, global.screenHeight / 2 + 20);
            } else {
                graph.fillText('You were kicked!', global.screenWidth / 2, global.screenHeight / 2);
            }
        } else {
              graph.fillText('Disconnected!', global.screenWidth / 2, global.screenHeight / 2);
        }
    }
}

window.addEventListener('resize', resize);

function resize() {
    player.screenWidth = c.width = global.screenWidth = global.playerType == 'player' ? window.innerWidth : global.gameWidth;
    player.screenHeight = c.height = global.screenHeight = global.playerType == 'player' ? window.innerHeight : global.gameHeight;

    if (global.playerType == 'spectate') {
        player.x = global.gameWidth / 2;
        player.y = global.gameHeight / 2;
    }

    global.viewPortWidth = global.screenWidth / zoom;
    global.viewPortHeight = global.screenHeight / zoom;
    socket.emit('windowResized', { screenWidth: global.screenWidth / zoom, screenHeight: global.screenHeight /zoom });
}
