var nodes_data = [{ name: "@ViewBag.Name", image: "/images/人物图片/@ViewBag.Name-1.jpg"}];
var edges_data = [{ source: 0, target: 0, relation: "本人" }];
var ready = ["@ViewBag.Name"];
var public = [];

var object = '@ViewBag.Object'.split('|');
var link = '@ViewBag.Link'.split('|');
var tag = '@ViewBag.Tag'.split('|');

for (var i = 0; i < object.length; i++) {
    var image_path = '/images/人物图片/' + object[i] + '-1.jpg';
    if (tag[i] == 'ORG')
        image_path = "/pictures/jg.jpg";
    else if (tag[i] == 'LOC')
        image_path = "/pictures/dd.png";
    nodes_data.push({ name: object[i], image: image_path });
    edges_data.push({ source: i + 1, target: 0, relation: link[i] });
}

//移除空值
nodes_data.pop();
edges_data.pop();

var width = $("#div2").width() - 20;
var height = 1200;
var img_w = 200;
var img_h = 200;
var radius = 50;    //圆形半径
var flag = 0;
var n = 0;
var force = d3.layout.force()
    .nodes(nodes_data) //指定节点数组
    .links(edges_data) //指定连线数组
    .size([width, height])
    .linkDistance(300) //指定连线长度
    .charge([-30000]) //相互之间的作用力
    .start(); //开始作用

var zoom = d3.behavior.zoom()//缩放配置，
    .scaleExtent([0.1, 2])//缩放比例
    .on("zoom", zoomed);

function zoomed() {//缩放函数
    svg.selectAll("g").attr("transform",//svg下的g标签移动大小
        "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
}

function drag() {//拖拽函数
    return force.drag()
        .on("dragstart", function (d) {
            d3.event.sourceEvent.stopPropagation(); //取消默认事件
            d.fixed = true;    //拖拽开始后设定被拖拽对象为固定
        }).on("dragend", function (d) {
            d.fixed = false;    //拖拽结束后解除固定
        });
}

function getJsonLength(jsonData) {
    var length = 0;
    for (var ever in jsonData) {
        length++;
    }
    return length;
}

var svg = d3.select("#div2")
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .call(zoom)

//d3.select("svg").on("dblclick.zoom", null);          //取消Zoom的双击放大事件绑定
//svg.call(d3.behavior.zoom()).on('dblclick', null)  //不能使用svg.call，因为会重置zoom函数

//绘制连线
var svg_edges = svg.append("g").selectAll("line")
    .data(edges_data)
    .enter()
    .append("line")
    .attr("id", function (d) {
        return d.source.name + "line";
    })
    .style("stroke", "#ccc")
    .style("stroke-width", 3);

//绘制人物关系
var edges_text = svg.append("g").selectAll(".linetext")
    .data(edges_data)
    .enter()
    .append("text")
    .attr("id", function (d) {
        return d.source.name + "line_text";
    })
    .text(function (d) {
        return d.relation;
    });

//绘制节点
var svg_nodes = svg.append("g").selectAll("circle")
    .data(nodes_data)
    .enter()
    .append("circle")
    .attr("id", function (d) {
        return d.name + "node";
    })
    .attr("r", radius)
    .attr("class", "circleImg")
    .style("fill", function (d, i) {
        n = n + 1;
        if (d.image) {
            //创建圆形图片
            var defs = svg.append("defs").attr("id", "imgdefs")
            var catpattern = defs.append("pattern")
                .attr("id", "catpattern" + d.name)
                .attr("height", 1)
                .attr("width", 1)

            if (d.image == '/pictures/jg.jpg') {
                catpattern.append("image")
                    .attr("x", - 0)
                    .attr("y", - 5)
                    .attr("width", 100)
                    .attr("height", 100)
                    .attr("xlink:href", d.image)
            }
            else {
                catpattern.append("image")
                    .attr("x", - (img_w / 2 - radius))
                    .attr("y", - (img_h / 2 - radius * 1.5))
                    .attr("width", img_w)
                    .attr("height", img_h)
                    .attr("xlink:href", d.image)
            }

            return "url(#catpattern" + d.name + ")";
        }
        else
            return color(i);
    }).on("click", function (d) {
        if (d3.event.defaultPrevented) return; // click suppressed
        //清除隐藏节点
        if (public.length) {
            $("#switch").click();
        }

        //判断节点关系是否存在
        if ($.inArray(d.name, ready) == -1) {
            var tag = "PER";
            if (d.image == "/pictures/dd.png")
                tag = "LOC";
            else if (d.image == "/pictures/jg.jpg")
                tag = "ORG"

            $.ajax({
                url: '/Display/Mongo',
                type: "post",
                data: { name: d.name, tag: tag },
                success: function (data) {
                    if (getJsonLength(data) > 1) {
                        //获取目标节点序号
                        target = check(d.name);

                        //判断待节点是否存在
                        for (var key in data) {
                            status = check(key);
                            relation = data[key][0];
                            tag = data[key][1];

                            image_path = '/images/人物图片/' + key + '-1.jpg';
                            if (tag == 'ORG')
                                image_path = "/pictures/jg.jpg";
                            else if (tag == 'LOC')
                                image_path = "/pictures/dd.png";

                            if (status > -1) {
                                edges_data.push({ source: target, target: nodes_data[status], relation: relation });
                            }
                            else {
                                nodes_data.push({ name: key, image: image_path });
                                edges_data.push({ source: nodes_data.length - 1, target: target, relation: relation });
                            }
                        }
                        update()
                        ready.push(d.name);
                    }
                    else {
                        alert("抱歉，暂无数据！");
                    }
                }
            });
        }

        else {
            //index = check(d.name, 1);
            //while (index != -1) {
            //    edges_data.splice(index);
            //    index = check(d.name, 1);
            //}
            //update();
            alert('暂时不能删除已加入知识！');
        } 
    }).call(drag()); //使得节点能够拖动

//绘制节点名称
var node_texts = svg.append("g").selectAll(".nodetext")
    .data(nodes_data)
    .enter()
    .append("text")
    .attr("id", function (d) {
        return d.name + "node_text";
    })
    .attr("dx", -20)
    .attr("dy", -55)
    .attr("class", "node_text")
    .text(function (d) {
        return d.name;
    });

function transform(d) {
    return "translate(" + d.x + "," + d.y + ")";
}

force.on("tick", function () { //对于每一个时间间隔
    //更新连线坐标
    svg_edges.attr("x1", function (d) { return d.source.x; })
        .attr("y1", function (d) { return d.source.y; })
        .attr("x2", function (d) { return d.target.x; })
        .attr("y2", function (d) { return d.target.y; });

    //更新节点坐标
    svg_nodes.attr("transform", transform);

    //更新文字坐标
    node_texts.attr("transform", transform);

    //更新连接线上文字的位置
    edges_text.attr("x", function (d) { return (d.source.x + d.target.x) / 2; });
    edges_text.attr("y", function (d) { return (d.source.y + d.target.y) / 2; });
});

function update() {
    //更新节点
    svg_nodes = svg_nodes.data(force.nodes());
    svg_nodes.enter().append("circle")
        .attr("id", function (d) {
            return d.name + "node";
        })
        .attr("r", radius)
        .attr("class", "circleImg")
        .style("fill", function (d, i) {
            if (d.image) {
                //创建圆形图片
                var defs = svg.append("defs").attr("id", "imgdefs")
                var catpattern = defs.append("pattern")
                    .attr("id", "catpattern" + d.name)
                    .attr("height", 1)
                    .attr("width", 1)

                if (d.image == '/pictures/jg.jpg') {
                    catpattern.append("image")
                        .attr("x", - 0)
                        .attr("y", - 5)
                        .attr("width", 100)
                        .attr("height", 100)
                        .attr("xlink:href", d.image)
                }
                else {
                    catpattern.append("image")
                        .attr("x", - (img_w / 2 - radius))
                        .attr("y", - (img_h / 2 - radius * 1.5))
                        .attr("width", img_w)
                        .attr("height", img_h)
                        .attr("xlink:href", d.image)
                }

                return "url(#catpattern" + d.name + ")";
            }
            else
                return color(i);
        }).on("click", function (d) {
            if (d3.event.defaultPrevented) return; // click suppressed
            //清除隐藏节点
            if (public.length) {
                $("#switch").click();
            }

            //判断节点关系是否存在
            if ($.inArray(d.name, ready) == -1) {
                var tag = "PER";
                if (d.image == "/pictures/dd.png")
                    tag = "LOC";
                else if (d.image == "/pictures/jg.jpg")
                    tag = "ORG"

                $.ajax({
                    url: '/Display/Mongo',
                    type: "post",
                    data: { name: d.name, tag: tag },
                    success: function (data) {
                        if (getJsonLength(data)>1) {
                            //获取目标节点序号
                            target = check(d.name);

                            //判断待节点是否存在
                            for (var key in data) {
                                status = check(key);
                                relation = data[key][0];
                                tag = data[key][1];

                                image_path = '/images/人物图片/' + key + '-1.jpg';
                                if (tag == 'ORG')
                                    image_path = "/pictures/jg.jpg";
                                else if (tag == 'LOC')
                                    image_path = "/pictures/dd.png";

                                if (status > -1) {
                                    edges_data.push({ source: target, target: nodes_data[status], relation: relation });
                                }
                                else {
                                    nodes_data.push({ name: key, image: image_path });
                                    edges_data.push({ source: nodes_data.length - 1, target: target, relation: relation });
                                }
                            }
                            update()
                            ready.push(d.name);
                        }
                        else {
                            alert("抱歉，暂无数据！");
                        }
                    }
                });
            }

            else {
                //index = check(d.name, 1);
                //while (index != -1) {
                //    edges_data.splice(index);
                //    index = check(d.name, 1);
                //}
                //update();
                alert('暂时不能删除已加入知识！');
            }

        }).call(drag()); //使得节点能够拖动

    svg_nodes.exit().remove();

    //更新节点文字
    node_texts = node_texts.data(force.nodes());
    node_texts.enter()
        .append("text")
        .attr("id", function (d) {
            return d.name + "node_text";
        })
        .attr("dx", -20)
        .attr("dy", -55)
        .attr("class", "node_text")
        .text(function (d) {
            return d.name;
        });
    node_texts.exit().remove();

    //更新连线
    svg_edges = svg_edges.data(force.links());
    svg_edges.enter()
        .append("line")
        .attr("id", function (d) {
            return nodes_data[d.source].name + "line";
        })
        .style("stroke", "#ccc")
        .style("stroke-width", 3);
    svg_edges.exit().remove();

    //更新连线文字
    edges_text = edges_text.data(force.links());
    edges_text.enter()
        .append("text")
        .attr("id", function (d) {
            return nodes_data[d.source].name + "line_text";
        })
        .text(function (d) {
            return d.relation;
        });
    edges_text.exit().remove();

    force.start();
}

function check(key, model = 0) {

    //默认，判断节点是否存在
    if (!model) {
        for (var i = 0; i < nodes_data.length; i++) {
            if (nodes_data[i].name == key)
                return i;
        }
    }

    //判断节点的关系是否存在
    else if (model == 1) {
        for (var i = 0; i < edges_data.length; i++) {
            if (edges_data[i].target.name == key && edges_data[i].source.name != key)
                return i;
        }
    }

    //检查边界数组来源
    else if (model == 2) {
        for (var i = 0; i < edges_data.length; i++) {
            if (edges_data[i].source.name == key)
                return i;
        }
    }

    return -1
}

$("#switch").click(function () {
    if (!public.length) {
        for (var i = 0; i < edges_data.length; i++) {
            if ($.inArray(edges_data[i].target.name, public) == -1)
                public.push(edges_data[i].target.name);
        }

        for (var i = 0; i < edges_data.length; i++) {
            if ($.inArray(edges_data[i].source.name, public) == -1)
                hidden(edges_data[i].source.name, 500);
        }
    }
    else {
        for (var i = 0; i < edges_data.length; i++) {
            show(edges_data[i].source.name, 500);
        }
        public.length = 0;
    }
});

function hidden(name, time) {
    $("#" + name + "node").fadeOut(time);
    $("#" + name + "node_text").fadeOut(time);
    $("#" + name + "line").fadeOut(time);
    $("#" + name + "line_text").fadeOut(time);
}

function show(name, time) {
    $("#" + name + "node").fadeIn(time);
    $("#" + name + "node_text").fadeIn(time);
    $("#" + name + "line").fadeIn(time);
    $("#" + name + "line_text").fadeIn(time);
}
