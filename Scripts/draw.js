function getControlPoints(arr, smooth_value) {
    var x0 = arr[0][0], y0 = arr[0][1], z0 = arr[0][2];
    var x1 = arr[1][0], y1 = arr[1][1], z1 = arr[1][2];
    var x2 = arr[2][0], y2 = arr[2][1], z2 = arr[2][2];
    var x3 = arr[3][0], y3 = arr[3][1], z3 = arr[3][2];
    // Assume we need to calculate the control
    // points between (x1,y1) and (x2,y2).
    // Then x0,y0 - the previous vertex,
    //      x3,y3 - the next one.
    // 1.假设控制点在(x1,y1)和(x2,y2)之间，第一个点和最后一个点分别是曲线路径上的上一个点和下一个点
    // 2.求中点
    var xc1 = (x0 + x1) / 2.0;
    var yc1 = (y0 + y1) / 2.0;
    var zc1 = (z0 + z1) / 2.0;
    var xc2 = (x1 + x2) / 2.0;
    var yc2 = (y1 + y2) / 2.0;
    var zc2 = (z1 + z2) / 2.0;
    var xc3 = (x2 + x3) / 2.0;
    var yc3 = (y2 + y3) / 2.0;
    var zc3 = (z2 + z3) / 2.0;
    // 3.求各中点连线长度
    var len1 = Math.sqrt((x1 - x0) * (x1 - x0) + (y1 - y0) * (y1 - y0) + (z1 - z0) * (z1 - z0));
    var len2 = Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1) + (z2 - y1) * (z2 - y1));
    var len3 = Math.sqrt((x3 - x2) * (x3 - x2) + (y3 - y2) * (y3 - y2) + (z3 - y2) * (z3 - y2));
    // 4.求中点连线长度比例（用来确定平移前p2, p3的位置）
    var k1 = len1 / (len1 + len2);
    var k2 = len2 / (len2 + len3);
    // 5.平移p2
    var xm1 = xc1 + (xc2 - xc1) * k1;
    var ym1 = yc1 + (yc2 - yc1) * k1;
    var zm1 = zc1 + (zc2 - zc1) * k1;
    // 6.平移p3
    var xm2 = xc2 + (xc3 - xc2) * k2;
    var ym2 = yc2 + (yc3 - yc2) * k2;
    var zm2 = zc2 + (zc3 - zc2) * k2;
    // Resulting control points. Here smooth_value is mentioned
    // above coefficient K whose value should be in range [0...1].
    // 7.微调控制点与顶点之间的距离，越大曲线越平直
    var ctrl1_x = xm1 + (xc2 - xm1) * smooth_value + x1 - xm1;
    var ctrl1_y = ym1 + (yc2 - ym1) * smooth_value + y1 - ym1;
    var ctrl1_z = zm1 + (zc2 - zm1) * smooth_value + z1 - zm1;
    var ctrl2_x = xm2 + (xc2 - xm2) * smooth_value + x2 - xm2;
    var ctrl2_y = ym2 + (yc2 - ym2) * smooth_value + y2 - ym2;
    var ctrl2_z = zm2 + (zc2 - zm2) * smooth_value + z2 - zm2;
    return [{ x: ctrl1_x, y: ctrl1_y, z: ctrl1_z }, { x: ctrl2_x, y: ctrl2_y, z: ctrl2_z}];
}


//anchorpoints：贝塞尔基点
//pointsAmount：生成的点数
function CreateBezierPoints(anchorpoints, pointsAmount) {
    var points = [];
    for (var i = 0; i < pointsAmount; i++) {
        var point = MultiPointBezier(anchorpoints, i / pointsAmount);
        points.push(point);
    }
    return points;
}


function MultiPointBezier(points, t) {
    var len = points.length;
    var x = 0, y = 0, z = 0;
    var erxiangshi = function (start, end) {
        var cs = 1, bcs = 1;
        while (end > 0) {
            cs *= start;
            bcs *= end;
            start--;
            end--;
        }
        return (cs / bcs);
    };
    for (var i = 0; i < len; i++) {
        var point = points[i];
        x += point.x * Math.pow((1 - t), (len - 1 - i)) * Math.pow(t, i) * (erxiangshi(len - 1, i));
        y += point.y * Math.pow((1 - t), (len - 1 - i)) * Math.pow(t, i) * (erxiangshi(len - 1, i));
        z += point.z * Math.pow((1 - t), (len - 1 - i)) * Math.pow(t, i) * (erxiangshi(len - 1, i));
    }
    return { x: x, y: y, z: z };
}


function Draw(points, pointsAmount, smooth_value) {
    results = [];
    for (i = 0; i < points.length - 1; i++) {
        if (points[i][0] == points[i + 1][0] && points[i][1] == points[i + 1][1])
            continue;
        if (!i) {
            temp = [points[points.length - 1], points[i], points[i + 1], points[i + 2]];
        }
        else if (i == points.length - 2) {
            temp = [points[i - 1], points[i], points[i + 1], points[0]];
        }
        else {
            temp = [points[i - 1], points[i], points[i + 1], points[i + 2]];
        }
        temp = getControlPoints(temp, smooth_value);
        point1 = { x: points[i][0], y: points[i][1], z: points[i][2] };
        point2 = { x: temp[0].x, y: temp[0].y, z: temp[0].z };
        point3 = { x: temp[1].x, y: temp[1].y, z: temp[1].z };
        point4 = { x: points[i + 1][0], y: points[i + 1][1], z: points[i+1][2] };
        CreateBezierPoints([point1, point2, point3, point4], pointsAmount).forEach(function (value) {
            results.push([value.x, value.y, value.z]);
        });
        results.push(points[i + 1]);
    }
    return results;
}