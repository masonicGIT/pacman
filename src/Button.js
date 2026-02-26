var getPointerPos = function(evt) {
    var obj = canvas;
    var top = 0;
    var left = 0;
    while (obj.tagName != 'BODY') {
        top += obj.offsetTop;
        left += obj.offsetLeft;
        obj = obj.offsetParent;
    }

    // calculate relative mouse position
    var mouseX = evt.pageX - left;
    var mouseY = evt.pageY - top;

    // make independent of scale
    var ratio = getDevicePixelRatio();
    mouseX /= (renderScale / ratio);
    mouseY /= (renderScale / ratio);

    // offset
    mouseX -= mapMargin;
    mouseY -= mapMargin;

    return { x: mouseX, y: mouseY };
};

var Button = function(x,y,w,h,onclick) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.onclick = onclick;

    // text and icon padding
    this.pad = tileSize;



    // icon attributes
    this.frame = 0;

    this.borderBlurColor = "#333";
    this.borderFocusColor = "#EEE";

    this.isSelected = false;

    // touch events
    this.startedInside = false;
    var that = this;
    var touchstart = function(evt) {
        evt.preventDefault();
        var fingerCount = evt.touches.length;
        if (fingerCount == 1) {
            var pos = getPointerPos(evt.touches[0]);
            (that.startedInside=that.contains(pos.x,pos.y)) ? that.focus() : that.blur();
        }
        else {
            touchcancel(evt);
        }
    };
    var touchmove = function(evt) {
        evt.preventDefault();
        var fingerCount = evt.touches.length;
        if (fingerCount == 1) {
            if (that.startedInside) {
                var pos = getPointerPos(evt.touches[0]);
                that.contains(pos.x, pos.y) ? that.focus() : that.blur();
            }
        }
        else {
            touchcancel(evt);
        }
    };
    var touchend = function(evt) {
        evt.preventDefault();
        var registerClick = (that.startedInside && that.isSelected);
        if (registerClick) {
            that.click();
        }
        touchcancel(evt);
        if (registerClick) {
            // focus the button to keep it highlighted after successful click
            that.focus();
        }
    };
    var touchcancel = function(evt) {
        evt.preventDefault();
        this.startedInside = false;
        that.blur();
    };


    // mouse events
    var click = function(evt) {
        var pos = getPointerPos(evt);
        if (that.contains(pos.x, pos.y)) {
            that.click();
        }
    };
    var mousemove = function(evt) {
        var pos = getPointerPos(evt);
        that.contains(pos.x, pos.y) ? that.focus() : that.blur();
    };
    var mouseleave = function(evt) {
        that.blur();
    };

    this.isEnabled = false;
    this.onEnable = function() {
        canvas.addEventListener('click', click);
        canvas.addEventListener('mousemove', mousemove);
        canvas.addEventListener('mouseleave', mouseleave);
        canvas.addEventListener('touchstart', touchstart);
        canvas.addEventListener('touchmove', touchmove);
        canvas.addEventListener('touchend', touchend);
        canvas.addEventListener('touchcancel', touchcancel);
        this.isEnabled = true;
    };

    this.onDisable = function() {
        canvas.removeEventListener('click', click);
        canvas.removeEventListener('mousemove', mousemove);
        canvas.removeEventListener('mouseleave', mouseleave);
        canvas.removeEventListener('touchstart', touchstart);
        canvas.removeEventListener('touchmove', touchmove);
        canvas.removeEventListener('touchend', touchend);
        canvas.removeEventListener('touchcancel', touchcancel);
        that.blur();
        this.isEnabled = false;
    };
};

Button.prototype = {

    contains: function(x,y) {
        return x >= this.x && x <= this.x+this.w &&
               y >= this.y && y <= this.y+this.h;
    },

    click: function() {
        // disable current click timeout (to prevent double clicks on some devices)
        clearTimeout(this.clickTimeout);

        // set a click delay
        var that = this;
        if (that.onclick) {
            this.clickTimeout = setTimeout(function() { that.onclick(); }, 200);
        }
    },

    enable: function() {
        this.frame = 0;
        this.onEnable();
    },

    disable: function() {
        this.onDisable();
    },

    focus: function() {
        this.isSelected = true;
        this.onfocus && this.onfocus();
    },

    blur: function() {
        this.isSelected = false;
        this.onblur && this.onblur();
    },

    setText: function(msg) {
        this.msg = msg;
    },

    setFont: function(font,fontcolor) {
        this.font = font;
        this.fontcolor = fontcolor;
    },

    setIcon: function(drawIcon) {
        this.drawIcon = drawIcon;
    },

    draw: function(ctx) {

        // draw border
        ctx.lineWidth = 2;
        ctx.beginPath();
        var x=this.x, y=this.y, w=this.w, h=this.h;
        var r=h/4;
        ctx.moveTo(x,y+r);
        ctx.quadraticCurveTo(x,y,x+r,y);
        ctx.lineTo(x+w-r,y);
        ctx.quadraticCurveTo(x+w,y,x+w,y+r);
        ctx.lineTo(x+w,y+h-r);
        ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
        ctx.lineTo(x+r,y+h);
        ctx.quadraticCurveTo(x,y+h,x,y+h-r);
        ctx.closePath();
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fill();
        ctx.strokeStyle = this.isSelected && this.onclick ? this.borderFocusColor : this.borderBlurColor;
        ctx.stroke();

        // draw icon
        if (this.drawIcon) {
            if (!this.msg) {
                this.drawIcon(ctx,this.x+this.w/2,this.y+this.h/2,this.frame);
            }
            else {
                this.drawIcon(ctx,this.x+this.pad+tileSize,this.y+this.h/2,this.frame);
            }
        }

        // draw text
        if (this.msg) {
            ctx.font = this.font;
            ctx.fillStyle = this.isSelected && this.onclick ? this.fontcolor : "#777";
            ctx.textBaseline = "middle";
            ctx.textAlign = "center";
            //ctx.fillText(this.msg, 2*tileSize+2*this.pad+this.x, this.y + this.h/2 + 1);
            ctx.fillText(this.msg, this.x + this.w/2, this.y + this.h/2 + 1);
        }
    },

    update: function() {
        if (this.drawIcon) {
            this.frame = this.isSelected ? this.frame+1 : 0;
        }
    },
};

var ToggleButton = function(x,y,w,h,isOn,setOn) {
    var that = this;
    var onclick = function() {
        setOn(!isOn());
        that.refreshMsg();
    };
    this.isOn = isOn;
    this.setOn = setOn;
    Button.call(this,x,y,w,h,onclick);
};

ToggleButton.prototype = newChildObject(Button.prototype, {

    enable: function() {
        Button.prototype.enable.call(this);
        this.refreshMsg();
    },
    setToggleLabel: function(label) {
        this.label = label;
    },
    refreshMsg: function() {
        if (this.label) {
            this.msg = this.label + ": " + (this.isOn() ? "ON" : "OFF");
        }
    },
    refreshOnState: function() {
        this.setOn(this.isOn());
    },

});
