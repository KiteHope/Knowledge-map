function TimePlay(options)	{
	var timePlay = this;
	timePlay.default_option = {
		speed: 50,
		startDate: 19160101,
		endDate: 19480101,
		timeUnitControl: false,
		container: '#timePlay',
		onClickChangeEnd: function(timePlay){},
		onAnimateEnd: function(timePlay){}
	};
	timePlay.options   = jQuery.extend(true, timePlay.default_option, options);//基本配置
	
	timePlay.initDoms();//初始化结构
	
	timePlay.timer     = null;//动画定时器
	timePlay.translate = 0;//时间轴位移
	timePlay.width     = 0;//时间轴长度
	timePlay.timeUnit  = '天';//单位
    timePlay.left = $(".timeProgress-box").offset().left;
	timePlay.right     = $(window).width() - timePlay.left - $(".timeProgress-box").width();
	timePlay.dis       = $('.timeProgress-inner li').outerWidth();//运动每格长度
	timePlay.dis_hour  = timePlay.dis/24;//小时单位移动距离
	timePlay.curr_x    = 0;//临时记录X轴位移
	timePlay.temp_day  = {};//临时记录时间
	timePlay.curr_day  = {};//进度条时间
	timePlay.index_hover = 0;//临时索引
	timePlay.hover     = 0;//当前索引
	timePlay.delay     = false;//是否延迟
	timePlay.init();//初始化
}

TimePlay.prototype.init = function(){
	var timePlay = this;
	timePlay.initDate();//初始化日期
	
	$('.timeControl').on('click',function(){//时间轴播放暂停
		timePlay.play();
	});
	
	$('.timeProgress').on('mouseover',function(){
		timePlay.hoverPopup();
	})
	
	$('.timeProgress').on('click',function(){
		timePlay.clickPopup();
	})
	
	$(".next").on('click',function(){
		timePlay.pageNext();
	})
	
	$(".prev").on('click',function(){
		timePlay.pagePrev();
	})
	
	$(".today").on('click',function(){
		timePlay.stopPlay();
		timePlay.initDate();
	})
}

TimePlay.prototype.hoverPopup = function(){
	var timePlay = this;
	$(window).on('mousemove',function(event){
		var e = event||window.event;
        var x = e.clientX;
        var day_index = Math.floor((x + timePlay.translate - timePlay.left) / timePlay.dis);
		timePlay.index_hover = day_index;
        timePlay.temp_day = { "year": parseInt($('.every:eq(' + day_index+')').attr('data-year'))}
        timePlay.curr_x = x + timePlay.translate - timePlay.left;

        texts = timePlay.temp_day.year + "年";
		$(".hover-popup").show().css("left",x - timePlay.left + 6).text(texts);
	})
	
	$('.timeProgress').one('mouseleave',function(){
		$(window).off('mousemove');
		$(".hover-popup").hide();
	})
}

TimePlay.prototype.clickPopup = function(){
	var timePlay = this;
	timePlay.stopPlay();
    texts = timePlay.temp_day.year + "年";
	$(".curr-popup").hide().text(texts);
    $(".curr-popup.for-click").show().css('left', timePlay.curr_x - timePlay.translate + 6)
    timePlay.width = timePlay.curr_x;

	timePlay.curr_day = timePlay.temp_day;
    timePlay.index = timePlay.index_hover;
    timePlay.options.onClickChangeEnd();
    $('.timeProgress-bar').animate({
        width: timePlay.width,
    }, 100, 'linear');
}

TimePlay.prototype.initDate = function(){//初始化日期
	var timePlay = this;
	var curr_date = new Date();
    var year = curr_date.getYear();
	var month = curr_date.getMonth()+1;
	var day = curr_date.getDate();
	var hour = curr_date.getHours();
	timePlay.curr_day = {
												"year": year,
												"mon": month,
												"day": day,
												"hour": hour
									};
    $(".curr-popup").text("开始");
    timePlay.index = 0;
}

TimePlay.prototype.initDoms = function(){//初始化dom
	var timePlay = this;
	$(timePlay.options.container).hide();
	var mainContainer = $('<div id="timeMain"></div>'),
	    playControl = '<div class="timeControl-box" title="播放"><div class="timeControl play"></div></div>',
	    pageControl = '<div class="prev-box"><div class="prev" title="上一页"></div></div><div class="next-box"><div class="next" title="下一页"></div></div>',
	    timeAxis = '<div class="timeProgress-box"><div class="hover-popup"></div><div class="curr-popup for-click"></div><div class="timeProgress-hide"><div class="timeProgress-inner"><div class="timeProgress"><div class="timeProgress-bar"><div class="curr-popup for-animate"></div></div></div><ul></ul></div></div></div>';
	if(timePlay.options.timeUnitControl){
		$(timePlay.options.container).append(timeUnitControl);
	}
	$(timePlay.options.container).append(mainContainer);
	mainContainer.append(playControl).append(pageControl).append(timeAxis);
    timePlay.fillDate(timePlay.options.startDate, timePlay.options.endDate);
    $('.timeProgress-bar').animate({
        width: 36,
    }, 100, 'linear');
}

TimePlay.prototype.fillDate = function(start,end){
	var timePlay = this;
	var startYear  = Math.floor(start/10000),
			startMonth = Math.floor((start%10000)/100),
			startDay   = Math.floor(start%100),
			endYear    = Math.floor(end/10000),
			endMonth   = Math.floor((end%10000)/100),
			endDay     = Math.floor(end%100),
        datelist = '';
    while (startYear != endYear + 1)
    {
        datelist += '<li class="every" data-year=' + startYear + '><span class="year">' + startYear + '</span></li>'
        startYear++;
    }

    $(timePlay.options.container).show().find('ul').append(datelist);
}

TimePlay.prototype.progressAni = function(){//进度条动画
	var timePlay = this,
			page_width = $('.timeProgress-box').width(),
			con_width = $('.timeProgress-inner').width(),
            page_num = Math.floor(timePlay.width / page_width),
			left_dis = page_num * page_width;

	if(page_width - timePlay.width + left_dis < timePlay.dis){
		left_dis = left_dis + (page_width/2);
	}		

	if(left_dis+page_width>con_width){
		left_dis = $('.timeProgress-inner').width() - page_width;
		$(".prev").addClass('disable');
	}

	timePlay.translate = left_dis;
	$('.timeProgress-inner').css({'transform': "translateX(-"+left_dis+"px)"});
	$('.timeProgress-bar').animate({
			width: timePlay.width ,
	},100,'linear');
}

TimePlay.prototype.play = function(){
	var timePlay = this;
	if($('.timeControl').hasClass('play')){
		timePlay.startPlay();
	}else{
		timePlay.stopPlay();
	}
}

TimePlay.prototype.delayAnimation = function(){
	var timePlay = this;
	timePlay.delay = true;
}

TimePlay.prototype.continueAnimation = function(){
	var timePlay = this;
	timePlay.delay = false;
}

TimePlay.prototype.startPlay = function(){
    var timePlay = this;
    $(".curr-popup").hide();
    $('.timeControl').toggleClass('play').toggleClass('pause');
    timePlay.progressAni();
    $(".curr-popup.for-animate").show();
    timePlay.timer = setInterval(function () {
		if(timePlay.delay){
			return false;
		}
		var temp_date = timePlay.curr_day;
		if(timePlay.reachEnd()){
			timePlay.halfPageNext();
		}
        timePlay.index++;
        var real_width = Math.floor(timePlay.width / timePlay.dis) * timePlay.dis;
		timePlay.width = real_width + timePlay.dis;
        timePlay.curr_day = { "year": parseInt($('.every:eq(' + timePlay.index + ')').attr('data-year')) }
		if(timePlay.index < $(".every").length ){
			$(".curr-popup").text(timePlay.curr_day.year + '年');
		}

		if(timePlay.width >= $('.timeProgress').width()){
            timePlay.width = $('.timeProgress').width();

			timePlay.curr_day = temp_date;
            timePlay.stopPlay();
        }
        
		$(".timeProgress-bar").css({'width':timePlay.width})
        timePlay.options.onAnimateEnd();
	},timePlay.options.speed)
}

TimePlay.prototype.stopPlay = function(){
	var timePlay = this;
	if($('.timeControl').hasClass('pause')){
		$('.timeControl').toggleClass('play').toggleClass('pause');
	}
	clearInterval(timePlay.timer);
}

TimePlay.prototype.reachEnd = function(){
	var timePlay = this;
	var dis_right = $('.timeProgress-box').width() - (timePlay.width - timePlay.translate);
	if(dis_right <= 108){
		return true;
	}else{
		return false;
	}
}

TimePlay.prototype.halfPageNext = function(){
	$(".curr-popup").hide();
	$(".curr-popup.for-animate").show();
	$(".prev").removeClass('disable');
	var timePlay = this,
			page_width = $('.timeProgress-box').width(),
			con_width = $('.timeProgress-inner').width();
	timePlay.translate += ($('.timeProgress-box').width() / 2);		
	if(timePlay.translate + page_width > con_width){
		timePlay.translate = $('.timeProgress-inner').width() - page_width;
		$(".next").addClass('disable');
	}	
	$('.timeProgress-inner').css({'transform': "translateX(-"+timePlay.translate+"px)"});	
}

TimePlay.prototype.pageNext = function(){
	$(".curr-popup").hide();
	$(".curr-popup.for-animate").show();
	$(".prev").removeClass('disable');
    var timePlay = this,
        page_width = $('.timeProgress-box').width(),
        con_width = $('.timeProgress-inner').width();
   
    timePlay.translate += $('.timeProgress-box').width();
	if(timePlay.translate + page_width > con_width){
        timePlay.translate = $('.timeProgress-inner').width() - page_width;
		$(".next").addClass('disable');
	}	
	$('.timeProgress-inner').css({'transform': "translateX(-"+timePlay.translate+"px)"});	
}

TimePlay.prototype.pagePrev = function(){
	$(".next").removeClass('disable');
	$(".curr-popup").hide();
	$(".curr-popup.for-animate").show();
	var timePlay = this;
	timePlay.translate -= $('.timeProgress-box').width();		
	if(timePlay.translate < 0){
		timePlay.translate = 0;
		$(".prev").addClass('disable');
	}	
	$('.timeProgress-inner').css({'transform': "translateX(-"+timePlay.translate+"px)"});	
}
