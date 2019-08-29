TweenLite.defaultEase = Expo.easeOut;

var timer = null;

var utils = {
    map: function (value, min1, max1, min2, max2) {
        var value1 = (value - min1) / (max1 - min1);
        var value2 = value1 * (max2 - min2) + min2;
        return value2;
    }
};

var UIButton = function () {
    'use strict';
    var UIButton = function ($element) {
        this.$element = $element;
        this.$shadow = this.$element.find('.btn__shadow');
        this.clickableArea = {
            x: 0,
            y: 0,
            w: this.$element.width() + 20,
            h: this.$element.height() + 20
        };
        this.handlers = {};
        this.$element.on('click', function (evt) {
            var offsetX = evt.pageX - this.$element.offset().left;
            var offsetY = evt.pageY - this.$element.offset().top;
            if (offsetX >= this.clickableArea.x && offsetX <= this.clickableArea.x + this.clickableArea.w && offsetY >= this.clickableArea.y && offsetY <= this.clickableArea.y + this.clickableArea.h) {
                this.trigger('click', evt);
            }
        }.bind(this));
        this.on('click', this.shadow.bind(this));
    };
    UIButton.prototype.shadow = function () {
        var timeline = new TimelineMax();
        timeline.set(this.$shadow, { opacity: 0.15 });
        timeline.to(this.$shadow, 1, { opacity: 0 });
    };
    UIButton.prototype.on = function (name, fn) {
        if (typeof name === 'string' && typeof fn === 'function') {
            this.handlers[name] = (this.handlers[name] || []).concat(fn);
        }
    };
    UIButton.prototype.trigger = function (name) {
        var args = Array.prototype.slice.call(arguments);
        for (var i = 0; i < (this.handlers[name] || []).length; i++) {
            this.handlers[name][i].apply(this, args.slice(1));
        }
    };
    return UIButton;
}();

var PlayPauseUIButton = function () {
    'use strict';
    var PlayPauseUIButton = function ($element) {
        UIButton.call(this, $element);
        this.timeline = new TimelineMax({ paused: true });
        
        this.timeline.staggerTo(this.$element.find('.icon__shape--circle'), 1.75, {
            strokeDasharray: '119.38052 0',
            strokeDashoffset: -119.38052
        }, 0.05, 0);
        this.timeline.to(this.$element.find('.icon__shape--triangle'), 1.75, {
            strokeDasharray: '38 0',
            strokeDashoffset: 38
        }, 0);
        this.play();
        this.timeline.to(this.$element.find('.icon__shape--line'), 0.5, { strokeDashoffset: -12 }, 0);
        this.timeline.to(this.$element.find('.icon__shape--line'), 0.5, { opacity: 0 }, 0.1);
        this.on('click', this.toggle);
        
    };
    PlayPauseUIButton.prototype = Object.create(UIButton.prototype);
    PlayPauseUIButton.prototype.toggle = function () {
        if (this.timeline.yoyo()) {
            this.pause();
            var btn = this;
            var index = 0;
            if ($("#max").val() < keyword_count) {
                for (var i = index; i < num.length; i++) {
                    if (num[i] > $("#max").val() || num[i] > keyword_count)
                    {
                        break;
                    }
                    index++;
                }
            }
            console.log(index);
            timer = setInterval(function () {
                if (num[index] < keyword_count) {
                    if (num[index + 1] > keyword_count) {
                        $("#max").val(keyword_count);
                    }
                    else {
                        $("#max").val(num[index]);
                    }
                    setTimeout(function () {
                        $("#max").click();
                    }, 1)

                    index++;
                }
                else {
                    btn.play();
                    clearInterval(timer);
                }
            }, 2500);
        }
        else {
            clearInterval(timer);
            this.play();
        }
    };

    PlayPauseUIButton.prototype.play = function () {
        this.timeline.yoyo(true).tweenTo(this.timeline.duration());
    };
    PlayPauseUIButton.prototype.pause = function () {
        this.timeline.yoyo(false).tweenTo(0, { ease: Expo.easeOut });
    };
    return PlayPauseUIButton;
}();

$('.btn--play-pause').each(function () {
    new PlayPauseUIButton($(this));
});