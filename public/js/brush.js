

/**
 * requestAnimationFrame
 */
window.requestAnimationFrame = (function(){
    return  window.requestAnimationFrame       ||
            window.webkitRequestAnimationFrame ||
            window.mozRequestAnimationFrame    ||
            window.oRequestAnimationFrame      ||
            window.msRequestAnimationFrame     ||
            function (callback) {
                window.setTimeout(callback, 1000 / 60);
            };
})();


/**
 * Brush
 */
var Brush = (function() {

    /**
     * @constructor
     * @public
     */
    function Brush(x, y, color, size, inkAmount) {
        this.x = x || 0;
        this.y = y || 0;
        if (color !== undefined) this.color = color;
        if (size !== undefined) this.size = size;
        if (inkAmount !== undefined) this.inkAmount = inkAmount;

        this._drops = [];
        this._resetTip();
    }

    Brush.prototype = {
        _SPLASHING_BRUSH_SPEED: 75,

        x:          0,
        y:          0,
        color:      '#000',
        size:       35,
        inkAmount:  7,
        splashing:  true,
        dripping:   true,
        _latestPos: null,
        _strokeId:  null,
        _drops:     null,

        isStroke: function() {
            return Boolean(this._strokeId);
        },

        startStroke: function() {
            if (this.isStroke()) return;
            this._resetTip();

            // http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript
            this._strokeId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                var r, v;
                r = Math.random() * 16 | 0;
                v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        },

        endStroke: function() {
            this._strokeId = this._latestPos = null;
        },

        render: function(ctx, x, y) {
            var isStroke = this.isStroke(),
                dx, dy,
                i, len;
             

            if (!this._latestPos) this._latestPos = {};
            this._latestPos.x = this.x;
            this._latestPos.y = this.y;
            this.x = x;
            this.y = y;

            if (this._drops.length) {
                var drops  = this._drops,
                    drop,
                    sizeSq = this.size * this.size;

                for (i = 0, len = drops.length; i < len; i++) {
                    drop = drops[i];

                    dx = this.x - drop.x;
                    dy = this.y - drop.y;

                    if (
                        (isStroke && sizeSq > dx * dx + dy * dy && this._strokeId !== drop.strokeId) ||
                        drop.life <= 0
                    ) {
                        drops.splice(i, 1);
                        len--;
                        i--;
                        continue;
                    }

                    drop.render(ctx);
                }
            }

            if (isStroke) {
                var tip = this._tip,
                    strokeId = this._strokeId,
                    dist;

                dx = this.x - this._latestPos.x;
                dy = this.y - this._latestPos.y;
                dist = Math.sqrt(dx * dx + dy * dy);

                if (this.splashing && dist > this._SPLASHING_BRUSH_SPEED) {
                    var maxNum = (dist - this._SPLASHING_BRUSH_SPEED) * 0.5 | 0,
                        r, a, sr, sx, sy;

                    ctx.save();
                    ctx.fillStyle = this.color;
                    ctx.beginPath();
                    for (i = 0, len = maxNum * Math.random() | 0; i < len; i++) {
                        r = (dist - 1) * Math.random() + 1;
                        a = Math.PI * 2 * Math.random();
                        sr = 5 * Math.random();
                        sx = this.x + r * Math.sin(a);
                        sy = this.y + r * Math.cos(a);
                        ctx.moveTo(sx + sr, sy);
                        ctx.arc(sx, sy, sr, 0, Math.PI * 2, false);
                    }
                    ctx.fill();
                    ctx.restore();

                } else if (this.dripping && dist < this.inkAmount * 2 && Math.random() < 0.05) {
                    this._drops.push(new Drop(
                        this.x,
                        this.y,
                        (this.size + this.inkAmount) * 0.5 * ((0.25 - 0.1) * Math.random() + 0.1),
                        this.color,
                        this._strokeId
                    ));
                }

                for (i = 0, len = tip.length; i < len; i++) {
                    tip[i].render(ctx, dx, dy, dist);
                }
            }
        },

        dispose: function() {
            this._tip.length = this._drops.length = 0;
        },

        _resetTip: function() {
            var tip = this._tip = [],
                rad = this.size * 0.5,
                x0, y0, a0, x1, y1, a1, cv, sv,
                i, len;

            a1  = Math.PI * 2 * Math.random();
            len = rad * rad * Math.PI / this.inkAmount | 0;
            if (len < 1) len = 1;

            for (i = 0; i < len; i++) {
                x0 = rad * Math.random();
                y0 = x0 * 0.5;
                a0 = Math.PI * 2 * Math.random();
                x1 = x0 * Math.sin(a0);
                y1 = y0 * Math.cos(a0);
                cv = Math.cos(a1);
                sv = Math.sin(a1);

                tip.push(new Hair(
                    this.x + x1 * cv - y1 * sv,
                    this.y + x1 * sv + y1 * cv,
                    this.inkAmount,
                    this.color
                ));
            }
        }
    };


    /**
     * Hair
     * @private
     */
    function Hair(x, y, inkAmount, color) {
        this.x = x || 0;
        this.y = y || 0;
        this.inkAmount = inkAmount;
        this.color = color;

        this._latestPos = { x: this.x, y: this.y };
    }

    Hair.prototype = {
        x:          0,
        y:          0,
        inkAmount:  7,
        color:      '#000',
        _latestPos: null,

        render: function(ctx, offsetX, offsetY, offsetLength) {
            this._latestPos.x = this.x;
            this._latestPos.y = this.y;
            this.x += offsetX;
            this.y += offsetY;

            var per = offsetLength ? this.inkAmount / offsetLength : 0;
            if      (per > 1) per = 1;
            else if (per < 0) per = 0;

            ctx.save();
            ctx.lineCap = ctx.lineJoin = 'round';
            ctx.strokeStyle = this.color;
            ctx.lineWidth = this.inkAmount * per;
            ctx.beginPath();
            ctx.moveTo(this._latestPos.x, this._latestPos.y);
            ctx.lineTo(this.x, this.y);
            ctx.stroke();
            ctx.restore();
        }
    };


    /**
     * Drop
     * @private
     */
    function Drop(x, y, size, color, strokeId) {
        this.x = x || 0;
        this.y = y || 0;
        this.size = size;
        this.color = color;
        this.strokeId = strokeId;

        this.life = this.size * 1.5;
        this._latestPos = { x: this.x, y: this.y };
    }

    Drop.prototype = {
        x:          0,
        y:          0,
        size:       7,
        color:      '#000',
        strokeId:   null,
        life:       0,
        _latestPos: null,
        _xOffRatio: 0,

        render: function(ctx) {
            if (Math.random() < 0.03) {
                this._xOffRatio += 0.06 * Math.random() - 0.03;
            } else if (Math.random() < 0.1) {
                this._xOffRatio *= 0.003;
            }

            this._latestPos.x = this.x;
            this._latestPos.y = this.y;
            this.x += this.life * this._xOffRatio;
            this.y += (this.life * 0.5) * Math.random();

            this.life -= (0.05 - 0.01) * Math.random() + 0.01;

            ctx.save();
            ctx.lineCap = ctx.lineJoin = 'round';
            ctx.strokeStyle = this.color;
            ctx.lineWidth = this.size + this.life * 0.3;
            ctx.beginPath();
            ctx.moveTo(this._latestPos.x, this._latestPos.y);
            ctx.lineTo(this.x, this.y);
            ctx.stroke();
            ctx.restore();
            ctx.restore();
        }
    };

    return Brush;

})();




/*the code below is how i connect the brush to my sockets */

// Initialize 

(function() {

	var socket = io.connect(); 
	
	if(document.domain == 'localhost')
		socket = io.connect('http://localhost:5000');
	

    // Vars set varables.

    var canvas, context,
        centerX, centerY,
        mouseX = 0, mouseY = 0,
        brush, brushOther;
        

    // Event Listeners 
    //

    function resize(e) {
        canvas.width  = window.innerWidth;
        canvas.height = window.innerHeight;
        centerX = canvas.width * 0.5;
        centerY = canvas.height * 0.5;
        context = canvas.getContext('2d');
    }

    function mouseDown(e) {
        drawStart(e.clientX, e.clientX, brush);
        socket.emit('mousedown',{       //send mouseDown event to socket.
			'x': e.clientX,
			'y': e.clientY,
		});
    }

    function mouseUp(e) {
        drawEnd(brush);
        socket.emit('mouseup',{
			'x': e.clientX,
			'y': e.clientY,
		});
    }
	
	function mouseMove(e) {
        mouseX = e.clientX;
        mouseY = e.clientY;
        socket.emit('mousemove',{
			'x': e.clientX,
			'y': e.clientY,
		});
    }
    
    // send moving events
    socket.on('down', function (data) {
		drawStart(data.x, data.y, brushOther);
	});
	
	socket.on('up', function (data) {
		drawEnd(brushOther);
	});
	
	socket.on('moving', function (data) {
		mouseX = data.x;
		mouseY = data.y;
		brushOther.render(context, data.x, data.y);
	});
	
	
	function drawStart(x, y, b) {
        mouseX = x;
        mouseY = y;
        b.color = randomColor();
        b.size = random(51, 5) | 0;
        b.startStroke(mouseX, mouseY);
    }

    function drawEnd(b) {
        b.endStroke();
    }


    // Helpers brush random setup
    function randomColor() {
        var r = random(256) | 0,
            g = random(256) | 0,
            b = random(256) | 0;
        return 'rgb(' + r + ',' + g + ',' + b + ')';
    }

    function random(max, min) {
        if (typeof max !== 'number') {
            return Math.random();
        } else if (typeof min !== 'number') {
            min = 0;
        }
        return Math.random() * (max - min) + min;
    }


    // Init

    canvas = document.getElementById('c'); //get the canvas 

    brush = new Brush(centerX, centerY, randomColor());     //original 
    brushOther = new Brush(centerX, centerY, randomColor()); //socket emit brush

    window.addEventListener('resize', resize, false); // connect event resize
    resize(null);

    canvas.addEventListener('mousemove', mouseMove, false);  // connect event mousemove
    canvas.addEventListener('mousedown', mouseDown, false); // connect event mousedown
    canvas.addEventListener('mouseout', mouseUp, false);   // connect event mouseout
    canvas.addEventListener('mouseup', mouseUp, false);   // connect event mouseup


    // Start Update

    var loop = function() {
        brush.render(context, mouseX, mouseY);
        requestAnimationFrame(loop);
    };
    loop();   // rendering the brush

})();