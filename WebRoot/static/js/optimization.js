var clickLineTime;
//异常事件分布图
var eventLine;
ecgilist=[];
var loader = "<img src='/optimization/static/images/loader-icon.gif'>";
var colors = ['#6890d4', '#54becc', '#68d4b2', '#a4e59b', '#e6f3a4', '#f0d487', '#f9b878', '#f9815c', '#c82b3d', '#4d6fa9', '#36b3c3', '#f8ab60'];
Highcharts.setOptions({
    colors: colors
});
var queryType = 0;
var gis0; /*gis1,*/ /*gis2;*/
var currentSeq = -1,currentSdate="",currentEdate="",preLonLat=0,orderLocatLat=0,orderLocatLon=0,currentImsi="",currentMsisdn="";
var currentTab = 0;
userclick = 0,localclick=0,dataclick=0;
var loadGis = true;
var legend_1=null, legend_2=null, legend_3=null

//进度指示
var process;

//浏览器信息
function getBrowserInfo(){
    var Sys = {};
    var ua = navigator.userAgent.toLowerCase();
    var re =/(msie|firefox|chrome|opera|version).*?([\d.]+)/;
    var m = ua.match(re);
    Sys.browser = m[1].replace(/version/, "'safari");
    Sys.ver = m[2];
    return Sys;
}

$(function () {
	//$("title").html('数据分析');
    var sys = getBrowserInfo();
    if(sys.browser == 'chrome' && parseInt((sys.ver).split(".")[0]) <= 55){
        loadGis = false;
    }
    if(!loadGis){
        loadGis=confirm("过时的Chrome浏览器版本("+sys.ver+"),加载本应用地图将导致页面崩溃。不加载地图，请点击'取消'按钮，继续加载请点击'确定'按钮");
    }
    $("#startTime").val(laydate.now('YYYY-MM-DD'));
   // $("#startTime").val(laydate.now(-30, 'YYYY-MM') + '-01 00');
    //$("#checkStart").val(laydate.now(-30, 'YYYY-MM-DD') + ' 00');
   // $page.orderView.orderUserGrouped();
    $('a[data-toggle="tab"]').on('click', function (e) {
        var text = e.target.innerText;
        $(".legend-item").attr("val", "1").text("全不选");
        setTimeout(function () {
        	//console.log('300秒执行');
            if (text == '用户分析状态') {
                if (currentSeq != -1) {
                   // $page.confirmView.initCompConfirm(currentSeq,currentEdate);
                }
            }
            if (text == '工单统计') {
                /*if(loadGis && !gis2){
                    gis2 = L.volte('gisPanel2');
                }*/
                $page.orderView.queryOrderNoPage();
            }
            if (text == '投诉定界') {
                currentTab = 0;
                if (currentSeq != -1) {
                   // $page.confirmView.initCompConfirm(currentSeq,currentEdate);
                }
            }
            if (text == '投诉定位') {
                currentTab = 1;
                if(loadGis && !gis0){
                    gis0 = L.volte('gisPanel0');
                    var grades = [[0,5], [5,10], [10,20], [20,"~"] ];
                  //  legend_1 = gis0.createLegend('用户轨迹', grades, 'bottomright');
                    legend_2 = gis0.createLegend('异常汇总',grades,  'bottomleft');
                 //   legend_3 = gis0.createLegend('驻留时长', grades,  'bottomleft');
                 //  control_1 =  gis0.createControl('bottomright');
                }
                locateUser24GAbnormalCellTravel();
                if(localclick == 0 ){
                
                locateCategoryTableNew('1');
                locateUser24GViewLineNew();
                locateXdrDetailNew();
                locateUser24GCellAbnormalEventNew();
                }
                localclick = -1 ;
                if (currentSeq != -1) {
                   // $page.locateView.initCompLocate(currentSeq,currentEdate);
                }
            }
            if (text == '数据分析') {
                currentTab = 2;
                if(dataclick == 0 ){
                complainUserUemrLineNew();
                complainUserUemrDetailNew();
                passCellOmcIndexNew();
                passCellWarningMsgNew();
                }
                dataclick = -1;
                
                if (currentSeq != -1) {
                   // $page.dataView.initStatistic(currentSeq,currentSdate,currentEdate);
                }
            }
        },300);
    });

    //切换导入查询和常规imsi查询
    $(".fa-clone").click(function () {
        if (queryType == 0) {
            $(".content-header").eq(queryType).slideUp();
            queryType = 1;
            $(".content-header").eq(queryType).slideDown();
        } else {
            $(".content-header").eq(queryType).slideUp();
            queryType = 0;
            $(".content-header").eq(queryType).slideDown();
        }
    });

    //展开关闭指标查询面板
    $("#index-query").click(function () {
        var text = $(this).text();
        if("展开指标查询"==$.trim(text)){
            $(this).text("收起指标查询");
            $(".index-query").eq(0).slideDown();
        }else if("收起指标查询"==$.trim(text)){
            $(this).text("展开指标查询");
            $(".index-query").eq(0).slideUp();
        }
    });

    //导出
    $(".btn-export").click(function () {
        var key = $(this).attr("key");
        var name = $(this).attr("name");
        if (fmtNull(currentSeq) == "-") {
            return;
        }
        name += new Date().getTime();
        //工单导出多个seq
        if (key == "8") {
            var seqs = "";
            var $table = $('#orderno_imsi_list').DataTable();
            var array = $page.ckeckBoxEvent.getCheckbox($table).seq;
            if (array.length > 0) {
                seqs = array.join(',');
            } else {
                layer.alert("请先选择需要导出结果的投诉工单");
                return;
            }
            $page.expview.exportData(seqs, key, name, currentSdate,currentEdate);
        } else {
            $page.expview.exportData(currentSeq, key, name,currentSdate,currentEdate);
        }
    });

    $("#scell").click(function () {
        var checked = $(this).is(":checked");
        if (checked) {
            layer.open({
                type: 1,
                area: ['415px', '290px'],
                resize: false,
                title: "投诉小区",
                moveOut: true,
                content: $("#multicell_panel")
            });
        }
    });
    //highchart图表图例全选反选事件
    $(".legend-item").click(function () {
        var val = $(this).attr("val");
        //目前是全不选状态,设置全选
        if (val == "0") {
            $(this).attr("val", "1");
            $(this).text("全不选");
            for (i = 0; i < eventLine.series.length; i++) {
                if (eventLine.series[i].visible == false) {
                    eventLine.series[i].show();
                }
            }
        }
        //目前是全选状态,设置为全不选
        if (val == "1") {
            $(this).attr("val", "0");
            $(this).text("全选");
            for (i = 0; i < eventLine.series.length; i++) {
                if (eventLine.series[i].visible == true) {
                    eventLine.series[i].hide();
                }
            }
        }
    });
    $("#index_key").on("input",function(){
        $page.locateView.getIndexColumns();
    })
});

var $page = {
    //复选框事件
    ckeckBoxEvent: {
        bindCheckBoxsEvent: function (table) {
            var allBox = table.column(0).nodes();
            $(".comp_all").click(function () {
                var thizz = this;
                allBox.each(function (value, index) {
                    $(value).children('input:eq(0)').prop('checked', thizz.checked);
                });
            });
            allBox.each(function (value, index) {
                var box = $(value).children('input:eq(0)');
                box.click(function (v, i) {
                    var checkedNum = 0;
                    allBox.each(function (value, index) {
                        var checked = $(value).children('input:eq(0)').prop('checked');
                        if (checked) {
                            checkedNum++;
                        }
                    });
                    $(".comp_all").prop('checked', allBox.length == checkedNum ? true : false);
                });
            });
        },
        getCheckbox: function (table) {
            var seqArray = new Array();
            var tmpIdArray = new Array();
            var allBox = table.column(0).nodes();
            allBox.each(function (v, i) {
                var box = $(v).children('input:eq(0)');
                if (box.prop('checked')) {
                    var seq = box.attr("seq");
                    var value = box.prop("value");
                    if (seq && seq != 'null' && seq != '') {
                        seqArray.push(seq);
                    }
                    if (value && value != 'null' && value != '') {
                        tmpIdArray.push(value);
                    }
                }
            });
            return {'seq': seqArray, 'tmpIdArray': tmpIdArray};
        },
    },
    //投诉IMSI数据分页
    mainView: {
        queryRecordPage: function (seq, queryId) {
            $("#rpt_imsi_list tbody").html("<tr><td colspan='12'>"+loader+"</td>");
            $.ajax({
                "url": "/optimization/mainAction/queryRecordPage",
                "data": {'seq':seq, 'queryId':queryId},
                "success": function (result) {
                    $("#rpt_imsi_list tbody").html('<tr><td colspan=12 class="no-data">暂无数据</td></tr>');
                    var $table = $('#rpt_imsi_list').DataTable({
                        "destroy": true,
                        "processing": false,
                        "bFilter": false,
                        "iDisplayLength": 10,
                        "bLengthChange": false,
                        "ordering": false,
                        "sScrollX": true,
                        "bAutoWidth": true,
                        "data": result,
                        "columns": [
                            {title:'查询账号', "data": "user_name"},
                            {title:'查询序列', "data": "seq"},
                            {
                                title:'用户IMSI',
                                "data": "imsi",
                                "render": function (data, type, row) {
                                    return N.Util.setxxxxnumber(data);
                                }
                            },
                            {
                                title:'用户手机',
                                "data": "msisdn",
                                "render": function (data, type, row) {
                                    return N.Util.setxxxxnumber(data);
                                }
                            },
                            {title:'投诉开始', "data": "start_time_str"},
                            {title:'投诉结束', "data": "end_time_str"},
                            {title:'预约时间', "data": "exec_time"},
                            {title:'查询开始', "data": "check_start_str"},
                            {title:'查询结束', "data": "check_end_str"},
                            {title:'查询耗时', "data": "action_time", "render": function (data, type, row) {
                                    return formatDuring(data);
                                }},
                            {title:'分析状态', "data": "status", "render": function (data, type, row) {
                                    return status_string(data)
                                }},
                            {title:'查询操作', "data": "seq", "render": function (data, type, row) {
                                    var isdisabled = "disabled";
                                    if (row.status == 0) {
                                        isdisabled = "";
                                    }
                                    return '<a href="javascript:$page.orderView.viewResult(\''+fmtNull(data)+'\',\''+row.query_id+'\',\'' + row.imsi + '\',\'' + row.msisdn + '\',\''+row.start_time+'\',\''+row.end_time+'\',\''+row.seq_lat+'\',\''+row.seq_lng+'\',\''+row.pre_lonlat+'\');" class="btn btn-success btn-sm btn-small j-seeview" ' + isdisabled + ' seq="' + fmtNull(data) + '" queryId="' + row.query_id + '">查看结果</a>'
                                }
                            }
                        ]
                    });
                },
                "error": function (xhr, textStatus, error) {
                    console.log(error);
                }
            });
        }
    },
    //工单统计
    orderView: {
        viewResult:function(seq, queryId,imsi,msisdn,sdate, edate, lat, lon, lonLat){
            $(".legend-item").attr("val", "1").text("全不选");
            if (fmtNull(seq) == "-" || $(this).attr("disabled")) {
                return;
            }
            if (seq) {
                $page.mainView.queryRecordPage(seq, '');
            }
            currentSeq = seq;
            currentSdate = sdate;
            currentEdate = edate;
            orderLocatLat = lat;
            orderLocatLon = lon;
            preLonLat = lonLat;
            currentImsi=imsi,
                currentMsisdn=msisdn
            $("#detail-info-panel").show();
            switch (currentTab) {
                case 0 :
                    $page.confirmView.initCompConfirm(seq,edate);
                    break;
                case 1 :
                    $page.locateView.initCompLocate(seq,edate);
                    break;
                case 2 :
                    $page.dataView.initStatistic(seq,sdate,edate);
                    break;
                default :
                    break;
            }
        },

        //账号下拉框加载选项
        orderUserGrouped: function () {
            $.post("/optimization/mainAction/orderUserGrouped", {}, function (res) {
                var html = "<option value=''>全部用户</option>";
                if (res && res.length > 0) {
                    $.each(res, function (i) {
                        if (res[i].selected) {
                            html += "<option selected value='" + res[i].user_id + "'>" + res[i].user_name + "</option>";
                        } else {
                            html += "<option value='" + res[i].user_id + "'>" + res[i].user_name + "</option>";
                        }
                    });
                }
                $("#orderUsers").html(html);
            });
        },
        //工单统计（投诉详单查询）
        queryOrderNoPage: function () {
            $(".loading").show();
            var params = {};
            var json = $("#order-search-form").serializeArray();
            $.each(json, function () {
                params[this.name] = this.value;
            });
            $.post("/optimization/mainAction/queryOrderNoPage", $.extend({}, params), function (result, status, xhr) {
                var $table = $('#orderno_imsi_list').DataTable({
                    "destroy": true,
                    "processing": false,
                    "bFilter": false,
                    "iDisplayLength": 10,
                    "bLengthChange": false,
                    "ordering": false,
                    "sScrollX": true,
                    "bAutoWidth": true,
                    "data": result,
                    "columns": [
                       {
                            title: '<input type="checkbox" aria-label="" class="comp_all">',
                            "data": "tmpid",
                            "render": function (data, type, row) {
                                return '<input class="comp_item" type="checkbox" aria-label="" value="' + data + '" seq="' + row.seq + '">';
                            }
                        },
                   
                        {title: '投诉日期', "data": "start_time"},
                        {title: '投诉号码', "data": "phone_no"},
                        {title: '工单编号', "data": "case_no"},
                        {title: '投诉分类', "data": "biz_name"},
                        {title: '投诉详细内容', "data": "case_content"},
                       
                        {
                            title: '查询操作', "data": "seq", "render": function (data, type, row) {
                                var isdisabled = "disabled";
                                if (row.status == 0) {
                                    isdisabled = "";
                                }
                                return '<a href="javascript:$page.orderView.viewResult(\''+fmtNull(data)+'\',\''+row.query_id+'\',\'' + row.imsi + '\',\'' + row.msisdn + '\',\''+row.start_time+'\',\''+row.end_time+'\',\''+row.seq_lat+'\',\''+row.seq_lng+'\',\''+row.pre_lonlat+'\');" class="btn btn-success btn-sm btn-small j-seeview" ' + isdisabled + ' seq="' + fmtNull(data) + '" queryId="' + row.query_id + '">查看结果</a>&nbsp;&nbsp;' +
                                    '<a href="javascript:$page.orderView.detailExport(\'' + fmtNull(data) + '\',\'' + row.imsi + '\',\'' + row.msisdn + '\',\'' + row.start_time + '\',\'' + row.end_time + '\');" class="btn btn-success btn-sm btn-small" ' + isdisabled + '>详单导出</a>';
                            }
                        }
                    ]
                });

                /*var tracks = [];
                $.each(result, function (i, v) {
                    if (fmtNull(v.lon) != "-" && fmtNull(v.lat) != "-") {
                        tracks.push({
                            "imsi": v.imsi,
                            "time": v.start_time_str,
                            "longitude": v.lon,
                            "latitude": v.lat,
                        });
                    }
                });
                if(loadGis && gis2){
                    gis2.setTracks(tracks, "imsi");
                }*/
                $(".loading").hide();
               /* $page.ckeckBoxEvent.bindCheckBoxsEvent($table);
                $page.orderView.queryOrderNoTrend(params);*/
            });
        },
        //详单导出
        detailExport: function (seq,imsi,msisdn,sdate,edate) {
            currentSeq = seq;
            currentSdate = sdate;
            currentEdate = edate;
            currentImsi=imsi,
                currentMsisdn=msisdn
            $page.expview.exportDetail(seq);
        },
        //工单统计(本月投诉走势)
        queryOrderNoTrend: function (params) {
            $.post("/optimization/mainAction/queryOrderNoTrend", params, function (res) {
                var data = res.data;
                var cates = [];
                var tmonth = [];
                var lmonth = [];
                var series = [];
                if (data && data.length > 0) {
                    $.each(data, function (i) {
                        cates.push(data[i].sdate);
                        series.push(data[i].dcount);
                        tmonth.push(data[i].tmonth);
                        lmonth.push(data[i].lmonth);
                    });
                }

                var series =
                    [{
                        name: '本月投诉量',
                        type: 'column',
                        data: series,
                        tooltip: {
                            valueSuffix: ''
                        }
                    },
                        {
                            name: '上月均线',
                            type: 'spline',
                            data: lmonth,
                            marker: {
                                enabled: false
                            },
                            dashStyle: 'shortdot',
                            tooltip: {
                                valueSuffix: ''
                            }
                        },
                        {
                            name: '本月均线',
                            type: 'spline',
                            data: tmonth,
                            tooltip: {
                                valueSuffix: ''
                            }
                        }];
                initColumn('chart15', '最近30天投诉走势', true, cates, series);
            });
        }
    },

    //用户状态分析（投诉定界）
    confirmView: {
        initCompConfirm: function (seq, edate) {
            $("#main-nav-tab").find("li").removeClass("active").eq(0).addClass("active");
            $("#tab_user_info").addClass("active");
            $("#tab_order_statistic").removeClass("active");
            $(".container-fluid").animate({
                scrollTop: $("#anchor1").offset().top - 50
            }, 1000);
            $page.confirmView.userInfo(seq, edate);
            $page.confirmView.appUsage(seq, edate);
            $page.confirmView.indexSnapshot(seq, edate);
            $page.confirmView.diagnosticDelimitation(seq, edate);
            $page.confirmView.mainCauseDelimitation(seq, edate);
            $page.confirmView.perceptionLabel(seq, edate);
            $page.confirmView.processAnalysis(seq, edate);
            $page.confirmView.abnormalEvents(seq, edate);
            $page.confirmView.specificOutput(seq);
        },
        //用户信息
        userInfo: function(seq, edate){
            $("#user_info_table tbody").html("<tr><td colspan='5'>"+loader+"</td>");
            $.post("/optimization/mainAction/userInfo", {"seq": seq,"edate":edate}, function (res) {
                var data = res.data;
                $("#user_info_table tbody").html('<tr><td colspan=5 class="no-data">暂无数据</td></tr>');
                if (data) {
                    $("#user_info_table tbody").html('<tr><td>' + fmtNull(data.imsi) + '</td><td>' + fmtNull(data.ue_brand) + '</td><td>' + fmtNull(data.ue_model) + '</td><td>' + fmtNull(data.traffic) + 'GB</td><td><a>' + fmtNull(data.cells) + '个</a></td></tr>');
                }
            });
        },
        //APP指标和流量使用情况
        appUsage:function(seq, edate){
            $('#chart18, #chart19').html(loader);
            $.post("/optimization/mainAction/appUsage", {"seq": seq,"edate":edate}, function (res) {
                var app_info = res.data;
                var cates = ['上行RTT时延', '下行RTT时延', '第一个HTTP响应时延'];
                var series = [];
                if (app_info && app_info.length > 0) {
                    $.each(app_info, function (i) {
                        var $this = app_info[i];
                        series.push({
                            name: $this.app_name,
                            type: 'column',
                            data: [$this['上行rtt时延'], $this['下行rtt时延'], $this['第一个http响应时延']]
                        });
                    });
                }
                initColumn("chart18", 'APP使用指标情况', true, cates, series);

                var piedata = [];
                if (app_info && app_info.length > 0) {
                    $.each(app_info, function (i) {
                        var $this = app_info[i];
                        piedata.push({
                            name: $this.app_name,
                            y: $this['流量mb']
                        });
                    });
                }
                initPie('chart19', null, null, '', '流量占比', piedata, function (e) {
                }, 'vertical', 'right', 100, 120);
            });
        },
        //指标快照
        indexSnapshot:function(seq, edate){
            $('#chart1, #chart2, #chart3, #chart4, #chart5, #chart6, #chart7, #chart8, #chart9, #chart10, #chart11, #chart12').html(loader);
            $.post("/optimization/mainAction/indexSnapshot", {"seq": seq,"edate":edate}, function (res) {
                $('#chart1, #chart2, #chart3, #chart4, #chart5, #chart6, #chart7, #chart8, #chart9, #chart10, #chart11, #chart12').html("");
                var snap_shot = res.data;
                var a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0, h = 0, i = 0, j = 0, k = 0, l = 0;
                if (snap_shot) {
                    a = snap_shot.attach_rate;
                    b = snap_shot.def_rate;
                    c = snap_shot.tau_rate;
                    d = snap_shot.s1ho_o_rate;
                    e = snap_shot.s1ho_i_rate;
                    f = snap_shot.dns_rate;
                    g = snap_shot.tcp_rate;
                    h = snap_shot.tcp_latency;
                    i = snap_shot.http_latency;
                    j = snap_shot.http_rate;
                    k = snap_shot.tput500k;
                    l = snap_shot.cells;
                }
                initCircle("chart1", a, "%", "附着成功率", getColor1(a));
                initCircle("chart2", b, "%", "承载建立成功率", getColor1(b));
                initCircle("chart3", c, "%", "TAU成功率", getColor1(c));
                initCircle("chart4", d, "%", "S1U切出成功率", getColor1(d));
                initCircle("chart5", e, "%", "S1U切入成功率", getColor1(e));
                initCircle("chart6", f, "%", "DNS成功率", getColor1(f));
                initCircle("chart7", g, "%", "TCP建立成功率", getColor1(g));
                initCircle("chart8", h, "ms", "TCP建立时延", getColor2(h));
                initCircle("chart9", i, "ms", "HTTP响应时延", getColor2(i));
                initCircle("chart10", j, "%", "HTTP响应成功率", getColor2(j));
                initCircle("chart11", k, "kbps", "大包下载速率", getColor3(k));
                initCircle("chart12", l, "个", "经过小区数", '#68d4b2');
            });
        },
        //诊断定界
        diagnosticDelimitation:function(seq, edate){
            $.post("/optimization/mainAction/diagnosticDelimitation", {"seq": seq,"edate":edate}, function (res) {
                var all_cause = res.data;
                $("#terminal_label").removeClass("fa-times-circle").addClass("fa-check-circle").removeClass("icon-no").addClass("icon-yes");
                $("#wireless_label").removeClass("fa-times-circle").addClass("fa-check-circle").removeClass("icon-no").addClass("icon-yes");
                $("#corenet_label").removeClass("fa-times-circle").addClass("fa-check-circle").removeClass("icon-no").addClass("icon-yes");
                $("#sp_label").removeClass("fa-times-circle").addClass("fa-check-circle").removeClass("icon-no").addClass("icon-yes");
                if (all_cause && all_cause.length > 0) {
                    $.each(all_cause, function (i) {
                        if (all_cause[i].big_type_name == '用户侧') {
                            $("#terminal_label").removeClass("fa-check-circle").addClass("fa-times-circle").removeClass("icon-yes").addClass("icon-no");
                        } else if (all_cause[i].big_type_name == '无线侧') {
                            $("#wireless_label").removeClass("fa-check-circle").addClass("fa-times-circle").removeClass("icon-yes").addClass("icon-no");
                        } else if (all_cause[i].big_type_name == '核心网') {
                            $("#corenet_label").removeClass("fa-check-circle").addClass("fa-times-circle").removeClass("icon-yes").addClass("icon-no");
                        } else if (all_cause[i].big_type_name == 'SP侧') {
                            $("#sp_label").removeClass("fa-check-circle").addClass("fa-times-circle").removeClass("icon-yes").addClass("icon-no");
                        }
                    });
                }
            });
        },
        //主因定界
        mainCauseDelimitation:function(seq, edate){
            $('#confirm_main_cause').html(loader);
            $.post("/optimization/mainAction/mainCauseDelimitation", {"seq": seq,"edate":edate}, function (res) {
                var main_cause = res.data;
                $("#confirm_main_cause").text("未查询到此用户存在异常记录");
                if (main_cause) {
                    $("#confirm_main_cause").text(main_cause.conclusion);
                }
            });
        },
        //感知标签
        perceptionLabel:function(seq, edate){
            $('#feel_label').html(loader);
            $.post("/optimization/mainAction/perceptionLabel", {"seq": seq,"edate":edate}, function (res) {
                var ana_label = res.data;
                $("#feel_label").text("暂无数据");
                if (ana_label) {
                    $("#feel_label").text(ana_label.target_name);
                }
            });
        },
        //流程分析
        processAnalysis:function(seq, edate){
            $('#chart13, #chart13_1, #chart13_2').html(loader);
            $.post("/optimization/mainAction/processAnalysis", {"seq": seq,"edate":edate}, function (res) {
                var against_all = res.data;
                var cates = ['附着成功率', '承载建立', 'TAU成功率', 'S1切出', 'S1切入', 'DNS成功率', 'TCP成功率', 'HTTP成功率'];
                var series = [];
                if (against_all) {

                    series = [{
                        name: '用户',
                        type: 'column',
                        data: [against_all.u_attach_rate, against_all.u_def_rate, against_all.u_tau_rate, against_all.u_s1ho_o_rate, against_all.u_s1ho_i_rate, against_all.u_dns_rate, against_all.u_tcp_rate, against_all.u_http_rate]
                    },
                        {
                            name: '全网',
                            type: 'column',
                            data: [against_all.a_attach_rate, against_all.a_def_rate, against_all.a_tau_rate, against_all.a_s1ho_o_rate, against_all.a_s1ho_i_rate, against_all.a_dns_rate, against_all.a_tcp_rate, against_all.a_http_rate]
                        }];
                    initColumn("chart13", '成功率指标对比', true, cates, series);

                    cates = ['TCP时延', 'HTTP时延'];
                    series = [{
                        name: '用户',
                        type: 'column',
                        data: [against_all.u_tcp_latency, against_all.u_http_latency]
                    },
                        {
                            name: '全网',
                            type: 'column',
                            data: [against_all.a_tcp_latency, against_all.a_http_latency]
                        }];
                    initColumn("chart13_1", '时延指标对比', true, cates, series);

                    cates = ['大包速率'];
                    series = [{
                        name: '用户',
                        type: 'column',
                        data: [against_all.u_tput500k]
                    },
                        {
                            name: '全网',
                            type: 'column',
                            data: [against_all.a_tput500k]
                        }];
                    initColumn("chart13_2", '大包速率指标对比', true, cates, series);
                }
            });
        },
        //异常事件分布
        abnormalEvents:function(seq, edate){
            $('#chart16').html(loader);
            $.post("/optimization/mainAction/abnormalEvents", {"seq": seq,"edate":edate}, function (res) {
                var cause_line = res.data;
                var cates = [];
                var tempY = [];
                var series = [];
                if (cause_line && cause_line.length > 0) {
                    $.each(cause_line, function (i) {
                        var $this = cause_line[i];
                        cates.push($this.shour);
                        tempY.push($this.event_name);
                    });
                }
                cates = unique(cates);
                tempY = unique(tempY);
                for (var j = 0; j < tempY.length; j++) {
                    var ts = [];
                    for (var i = 0; i < cates.length; i++) {
                        ts.push(null);
                        $.each(cause_line, function (x) {
                            if (cates[i] == cause_line[x].shour && tempY[j] == cause_line[x].event_name) {
                                ts[i] = cause_line[x].nums;
                            }
                        });
                    }
                    series.push({
                        name: tempY[j],
                        data: ts
                    });
                }
                var tmpCates = [];
                for (var i = 0; i < cates.length; i++) {
                    tmpCates.push(cates[i] + ":00");
                }
                eventLine = initLines("chart16", '异常事件分布', tmpCates, series, 1, true, null, 0, null);
            });
        },
        //具体输出
        specificOutput: function (seq) {
            $('#confirm_cause_list tbody').html("<tr><td colspan='10'>"+loader+"</td>");
            $.post("/optimization/mainAction/specificOutput", {"seq": seq}, function (result) {
                var columns = [];
                if(result==null || result.length<1){
                    columns.push({'title':'', 'data':'', render:function(){return "暂无数据"}});
                }else {
                    $.each(result[0], function (k, v) {
                        columns.push({title: k, data: k});
                    });
                }
                $('#confirm_cause_list').DataTable({
                    "bDestroy": true,
                    "processing": false,
                    "bFilter": false,
                    "iDisplayLength": 10,
                    "bPaginage": true,
                    "bLengthChange": false,
                    "bSort": false,
                    "bAutoWidth": true,
                    "data": result,
                    "columns": columns
                });
            });
        }
    },
    //投诉定位
    locateView: {
        initCompLocate: function (seq,edate) {
            $("#main-nav-tab").find("li").removeClass("active").eq(0).addClass("active");
            $("#tab_user_info").addClass("active");
            $("#tab_order_statistic").removeClass("active");
            $(".container-fluid").animate({
                scrollTop: $("#anchor1").offset().top - 50
            }, 1000);
            $page.locateView.diagnosisLocationMainCause(seq, edate);
            $page.locateView.locateCategoryTable(seq);
            $page.locateView.locationCategoryPie(seq, edate);
            $page.locateView.locateUser24GViewLine(seq, edate);
            $page.locateView.locateUser24GAbnormalCellTravel(seq, edate);
            $page.locateView.loadUser24gViewEventTable([]);//切换tab页时清除地图关联的表格上一次点击查询的数据
            $page.locateView.locateXdrDetail(seq);
            /*$page.locateView.complaintCellDetail(seq,edate);
            $page.locateView.complaintCellTravel(seq, edate);*/
        },
        //诊断定位主因
        diagnosisLocationMainCause: function(seq, edate){
            $("#locate_main_cause").html(loader);
            $.post("/optimization/mainAction/diagnosisLocationMainCause", {"seq": seq,"edate":edate}, function (res) {
                var main_cause = res.data;
                $("#locate_main_cause").text("未查询到此用户存在异常记录");
                if (main_cause) {
                    $("#locate_main_cause").text(main_cause.conclusion);
                }
            });
        },
        //定位分类-表格
        locateCategoryTable: function (seq) {
            $("#locate_main_cause tbody").html("<tr><td colspan='4'>"+loader+"</td>");
            $('#locate_category_list').DataTable({
                "destroy": true,
                "processing": false,
                "serverSide": true,
                "bFilter": false,
                "iDisplayLength": 5,
                "bLengthChange": false,
                "ordering": false,
                "ajax": {
                    "url": "/optimization/mainAction/locateCategoryTable",
                    "data": function (d) {
                        return $.extend({}, d, {"seq": seq});
                    },
                    "error": function (xhr, textStatus, error) {
                        console.log(error);
                    }
                },
                "columns": [
                    {"data": "sdate"},
                    {"data": "grp_name"},
                    {"data": "grp_score"},
                    {
                        "data": "grp_scr_ratio", "render": function (data, type, row) {
                            var html = "<a href='javascript:$page.locateView.showCateLevelOne(\"" + row.seq + "\",\"" + row.grp_id + "\");'>" + data + "</a>";
                            return html;
                        }
                    }
                ]
            });
        },
        //定位分类-表格（一级下钻）
        showCateLevelOne: function (seq, grpId) {
            $(".loading").show();
            $('#cate-table-one').DataTable({
                "destroy": true,
                "processing": false,
                "serverSide": true,
                "bFilter": false,
                "iDisplayLength": 10,
                "bLengthChange": false,
                "ordering": false,
                "ajax": function (data, callback, settings) {
                    $.ajax({
                        "url": "/optimization/mainAction/showCateLevelOne",
                        "data": $.extend({}, data, {"seq": seq, "grpId": grpId}),
                        "success": function (result) {
                            callback(result);
                        },
                        "error": function (xhr, textStatus, error) {
                            console.log(error);
                        }
                    });
                },
                "columns": [
                    {"title": '问题类别', "data": "grp_name"},
                    {"title": '问题细类', "data": "qnum_name"},
                    {"title": '网元ID', "data": "ele_id"},
                    {"title": '网元名称', "data": "ele_name"},
                    {"title": '问题次数', "data": "ele_counts"},
                    {"title": '问题权重', "data": "ele_scr_ratio"},
                    {"title": '问题详情', "className": "td-txt-align", "data": "kpi_str"}
                ]
            });
            setTimeout(function (){
                $(".loading").hide();
                layer.open({
                    title: '定位分类-问题详情',
                    type: 1,
                    area: ['80%', '70%'],
                    skin: "layui-layer-lan", //样式类名
                    closeBtn: 1, //不显示关闭按钮
                    shift: 2,
                    shadeClose: true, //开启遮罩关闭
                    content: $("#cateLayerOne")
                });
            }, 3000);
        },
        //定位分类-饼图
        locationCategoryPie: function(seq, edate){
            $("#chart14").html("");
            $.post("/optimization/mainAction/locationCategoryPie", {"seq": seq,"edate":edate}, function (res) {
                var locate_category = res.data;
                var piedata = [];
                if (locate_category && locate_category.length > 0) {
                    $.each(locate_category, function (i) {
                        piedata.push({
                            name: locate_category[i].grp_name,
                            y: locate_category[i].grp_scr_ratio
                        });
                    });
                }
                initPie('chart14', null, null, '', '%', piedata, function (e) {
                }, 'vertical', 'right', 100, 180);
            });
        },
        //定位分类-指标查询
        locationIndexQuery: function(){
            var lacci = $('#lacci').val();
            var cell_name = $('#cell_name').val();
            var start_time = $('#start_time').val();
            var end_time = $('#end_time').val();

            if (!cell_name) {
                layer.msg("小区名称不能为空");
                return;
            }
            if (!start_time) {
                layer.msg("开始时间不能为空");
                return;
            }
            if (!end_time) {
                layer.msg("结束时间不能为空");
                return;
            }
            if (start_time && end_time && (new Date(start_time).getTime()) - (new Date(end_time).getTime()) > 0) {
                layer.msg("开始时间不能大于结束时间");
                return;
            }
            var fields = [];
            var columns = [{'title':'STAT_TIME', 'data':'stat_time'}];
            var cBox = $("input[type='checkbox'][name='index_columns']:checked");
            cBox.each(function (i, v) {
                var item = $(this);
                var field = item.val();
                if(field!="STAT_TIME"){
                    fields.push(item.val());
                    columns.push({'title':field, 'data':field.toLowerCase()});
                }
            });
            if(fields.length<1){
                layer.msg('请选择要查询的指标');
                return;
            }
            if(fields.length>5){
                layer.msg('最多只能选择5个指标');
                return;
            }
            fields = ', ' + fields.join(', ');
            var params = {"lacci": lacci,"cell_name":cell_name,"start_time":start_time,"end_time":end_time,'columns':fields};
            $.post("/optimization/mainAction/locationIndexQuery", params, function (res) {
                $('#index_query_result_table').DataTable({
                    "destroy": true,
                    "processing": true,
                    "language" : {"sProcessing": loader+"&nbsp;&nbsp;&nbsp;&nbsp;正在查询..."},
                    "serverSide": false,
                    "bFilter": false,
                    "iDisplayLength": 5,
                    "bLengthChange": false,
                    "ordering": false,
                    "columns": columns,
                    "data": res
                });
                $page.locateView.showIndexQueryLine(columns, res);
            });
        },
        showIndexQueryLine: function(columns, data){
            var cates = [];
            var ts0 = [], ts1 = [], ts2 = [], ts3 = [], ts4 = [];
            if (data && data.length > 0) {
                for(var i=0; i<data.length; i++){
                    var row = data[i];
                    cates.push( row[columns[0].title.toLowerCase()].substring(5,19) );
                    ts0.push({y:row[columns[1].title.toLowerCase()], d:row, topTipFlag:'index'});
                    ts1.push({y:row[columns[2].title.toLowerCase()], d:row, topTipFlag:'index'});
                    ts2.push({y:row[columns[3].title.toLowerCase()], d:row, topTipFlag:'index'});
                    ts3.push({y:row[columns[4].title.toLowerCase()], d:row, topTipFlag:'index'});
                    ts4.push({y:row[columns[5].title.toLowerCase()], d:row, topTipFlag:'index'});
                }
            }
            var series = [{
                yAxis: 0,
                name: columns[1].title,
                type: 'spline',
                data: ts0,
                color: Highcharts.getOptions().colors[4],
                visible: true
            },{
                yAxis: 0,
                name: columns[2].title,
                type: 'spline',
                data: ts1,
                color: Highcharts.getOptions().colors[8],
                visible: true
            },{
                yAxis: 1,
                name: columns[3].title,
                type: 'spline',
                data: ts2,
                color: Highcharts.getOptions().colors[5],
                visible: true
            }, {
                yAxis: 2,
                name: columns[4].title,
                type: 'spline',
                data: ts3,
                color: Highcharts.getOptions().colors[6],
                visible: true
            }, {
                yAxis: 3,
                name: columns[5].title,
                type: 'spline',
                data: ts4,
                color: Highcharts.getOptions().colors[7],
                visible: true
            }];
            var tics = 1;
            if (ts1.length > 10 && ts1.length <= 50) {
                tics = 5;
            }
            if (ts1.length > 50 && ts1.length <= 100) {
                tics = 15;
            }
            if (ts1.length > 100 && ts1.length <= 150) {
                tics = 25;
            }
            if (ts1.length > 150) {
                tics = 35;
            }
            var yAxises =
                [
                    {
                        title: {
                            text: '',
                            style: {
                                color: Highcharts.getOptions().colors[5]
                            }
                        },
                        labels: {
                            style: {
                                color: Highcharts.getOptions().colors[5]
                            }
                        }
                    },
                    {
                        title: {
                            text: '',
                            style: {
                                color: Highcharts.getOptions().colors[6]
                            }
                        },
                        labels: {
                            style: {
                                color: Highcharts.getOptions().colors[6]
                            }
                        }
                    },
                    {
                        title: {
                            text: '',
                            style: {
                                color: Highcharts.getOptions().colors[7]
                            }
                        },
                        labels: {
                            style: {
                                color: Highcharts.getOptions().colors[7]
                            }
                        }
                    },
                    {
                        title: {
                            text: '',
                            style: {
                                color: Highcharts.getOptions().colors[8]
                            }
                        },
                        labels: {
                            style: {
                                color: Highcharts.getOptions().colors[8]
                            }
                        }
                    },
                    {
                        title: {
                            text: '',
                            style: {
                                color: Highcharts.getOptions().colors[9]
                            }
                        },
                        labels: {
                            style: {
                                color: Highcharts.getOptions().colors[9]
                            }
                        }
                    },
                ];
            eventLine = initLines("chart14_index", '指标走势', cates, series, tics, false, yAxises, -20, null);
        },
        //打开指标面板
        openIndexPanel: function () {
            layer.open({
                title: '指标面板',
                type: 1,
                area: ['95%', '70%'],
                skin: "layui-layer-lan", //样式类名
                closeBtn: 1, //不显示关闭按钮
                shift: 2,
                shadeClose: true, //开启遮罩关闭
                content: $("#index_panel")
            });
        },
        getIndexColumns: function(){
            var index_key = $('#index_key').val();
            $.post("/optimization/mainAction/getIndexColumns", {'key':index_key.trim().toUpperCase()}, function (res, status, xhr) {
                var tds = "";
                var trArry = [];
                for(var i=0; i<res.length; i++){
                    var item = res[i];
                    tds = tds + "<td><input type='checkbox' name='index_columns' value='"+item.column_name+"'/>&nbsp;&nbsp;" + item.column_name + "&nbsp;&nbsp;&nbsp;&nbsp;</td>";
                    if((i+1)%3==0){
                        trArry.push("<tr>"+tds+"</tr>");
                        tds = "";
                    }
                }
                $("#index_table tbody").html(trArry.join(''));
                var cBox = $("input[type='checkbox'][name='index_columns']");
                cBox.on('click', function(){
                    var thizz = $(this);
                    var ccBox = $("input[type='checkbox'][name='index_columns']:checked");
                    if(ccBox.length>5){
                        layer.msg('最多只能选择五个指标');
                        thizz.prop("checked",false);
                    }
                });
            });
        },
        //用户2/4G网络图表呈现（趋势图）
        locateUser24GViewLine: function(seq,edate){
            $("#chart14_1").html(loader);
            $.post("/optimization/mainAction/locateUser24GViewLine", {"seq": seq, "edate":edate}, function (res, status, xhr) {
                var cates = [];
                var ts0 = [], ts1 = [], ts2 = [], ts3 = [], ts4 = [], ts5 = [], ts6= [];
                if (res && res.length > 0) {
                    $.each(res, function (i) {
                        var $this = res[i];
                        cates.push($this.date_char);
                        ts0.push({y:Number($this.net_flag), d:$this, topTipFlag:'all'});
                        ts1.push({y:$this.rsrp, d:$this, topTipFlag:'self'});
                        ts2.push({y:$this.rsrq, d:$this, topTipFlag:'self'});
                        ts3.push({y:$this.distance, d:$this, topTipFlag:'self'});
                        ts4.push({y:$this.phr, d:$this, topTipFlag:'self'});
                        ts5.push({y:$this.received_power, d:$this, topTipFlag:'self'});
                        if($this.event_dj_flag){
                            ts6.push({y:Number($this.xdr_bd_counts), d:$this, topTipFlag:'column'});
                        }else{
                            ts6.push({y:0, d:$this, topTipFlag:'column'});
                        }
                    });
                }
                var series = [{
                    yAxis: 0,
                    name: 'NET_FLAG',
                    type: 'spline',
                    data: ts0,
                    color: Highcharts.getOptions().colors[4],
                    visible: true
                },{
                    yAxis: 0,
                    name: 'EVENT_DJ_FLA',
                    type: 'column',
                    data: ts6,
                    color: Highcharts.getOptions().colors[8],
                    visible: true
                },{
                    yAxis: 1,
                    name: 'RSRP',
                    type: 'spline',
                    data: ts1,
                    color: Highcharts.getOptions().colors[5],
                    visible: false
                }, {
                    yAxis: 2,
                    name: 'RSRQ',
                    type: 'spline',
                    data: ts2,
                    color: Highcharts.getOptions().colors[6],
                    visible: false
                }, {
                    yAxis: 3,
                    name: 'DISTANCE',
                    type: 'spline',
                    data: ts3,
                    color: Highcharts.getOptions().colors[7],
                    visible: false
                }, {
                    yAxis: 4,
                    name: 'PHR',
                    type: 'spline',
                    data: ts4,
                    color: Highcharts.getOptions().colors[8],
                    visible: false
                }, {
                    yAxis: 5,
                    name: 'RECEIVED_POWER',
                    type: 'spline',
                    data: ts5,
                    color: Highcharts.getOptions().colors[9],
                    visible: false
                }];
                var tics = 1;
                if (ts1.length > 10 && ts1.length <= 50) {
                    tics = 5;
                }
                if (ts1.length > 50 && ts1.length <= 100) {
                    tics = 15;
                }
                if (ts1.length > 100 && ts1.length <= 150) {
                    tics = 25;
                }
                if (ts1.length > 150) {
                    tics = 35;
                }
                var yAxises =
                    [
                        {
                            title: {
                                text: '',
                                style: {
                                    color: Highcharts.getOptions().colors[4]
                                }
                            },
                            labels: {
                                style: {
                                    color: Highcharts.getOptions().colors[4]
                                }
                            },
                            min: 1,
                            max: 5,
                            labels: {
                                formatter: function () {
                                    var v = this.value;
                                    if(v==2 || v==4){
                                        v = v+'G';
                                    }
                                    return v;
                                }
                            }
                        },
                        {
                            title: {
                                text: '',
                                style: {
                                    color: Highcharts.getOptions().colors[5]
                                }
                            },
                            labels: {
                                style: {
                                    color: Highcharts.getOptions().colors[5]
                                }
                            }
                        },
                        {
                            title: {
                                text: '',
                                style: {
                                    color: Highcharts.getOptions().colors[6]
                                }
                            },
                            labels: {
                                style: {
                                    color: Highcharts.getOptions().colors[6]
                                }
                            }
                        },
                        {
                            title: {
                                text: '',
                                style: {
                                    color: Highcharts.getOptions().colors[7]
                                }
                            },
                            labels: {
                                style: {
                                    color: Highcharts.getOptions().colors[7]
                                }
                            }
                        },
                        {
                            title: {
                                text: '',
                                style: {
                                    color: Highcharts.getOptions().colors[8]
                                }
                            },
                            labels: {
                                style: {
                                    color: Highcharts.getOptions().colors[8]
                                }
                            }
                        },
                        {
                            title: {
                                text: '',
                                style: {
                                    color: Highcharts.getOptions().colors[9]
                                }
                            },
                            labels: {
                                style: {
                                    color: Highcharts.getOptions().colors[9]
                                }
                            }
                        },
                    ];
                eventLine = initLines("chart14_1", 'USER 4G NET FLAG', cates, series, tics, false, yAxises, 30, $page.locateView.lineClickToTravel);
            });
        },
        lineClickToTravel: function(event){
            var seq = event.point.d.seq;
            var _eci = event.point.d.eci;
            var layers = gis0.sectorLayer._layers;
            if(layers){
                for(key in layers){
                    var layer = layers[key];
                    var eci = layer.options.eci;
                    var content = layer.options.content;
                    if(_eci == eci){
                        var latlng = layer.getLatLng();
                        gis0.map.setView(latlng, 15);
                        L.popup().setLatLng(latlng).setContent(content).openOn(gis0.map);
                        $page.locateView.locateUser24GCellAbnormalEvent(seq, eci);
                        break;
                    }
                }
            }
        },
        //用户2/4G网络图表呈现（异常小区轨迹图）
        locateUser24GAbnormalCellTravel: function(seq, edate){
            $.post("/optimization/mainAction/locateUser24GAbnormalCellTravel", {"seq": seq, "edate":edate}, function (res, status, xhr) {
                var gis_cell = res.data.gis_cell;
                var gis_cell_count = res.data.gis_cell_count;
                var abnormal_event_count_and_hold_time = res.data.abnormal_event_count_and_hold_time;
                var cell_hold_time_list = res.data.cell_hold_time_list;
                if(loadGis && gis0){

                    if(legend_1!=null){
                        legend_1.remove();
                    }
                    if(legend_2!=null){
                        legend_2.remove();
                    }
                    if(legend_2!=null){
                        legend_2.remove();
                    }

                    gis0.setSectors1(gis_cell, "用户轨迹");
                    gis0.setSectors2(abnormal_event_count_and_hold_time, "异常汇总");
                    gis0.setSectors3(abnormal_event_count_and_hold_time, "驻留时长", orderLocatLat, orderLocatLon, preLonLat);

                    var cBoxs = $("input[type='checkbox'][class='leaflet-control-layers-selector']");

                    cBoxs.each(function(i,value){
                        var thizz = $(this);
                        var text = thizz.next().html().trim();
                        if(thizz.prop('checked')){
                            if(text=='用户轨迹'){
                                legend_1.addTo(gis0.map);
                            }else if(text=='异常汇总'){
                                legend_2.addTo(gis0.map);
                            }else if(text=='驻留时长'){
                                legend_3.addTo(gis0.map);
                            }
                        }
                    });

                    cBoxs.on('click',function(){
                        var thizz = $(this);
                        var text = thizz.next().html().trim();
                        if(thizz.prop('checked')){
                            if(text=='用户轨迹'){
                                legend_1.addTo(gis0.map);
                            }else if(text=='异常汇总'){
                                legend_2.addTo(gis0.map);
                            }else if(text=='驻留时长'){
                                legend_3.addTo(gis0.map);
                            }
                        }else{
                            if(text=='用户轨迹'){
                                legend_1.remove();
                            }else if(text=='异常汇总'){
                                legend_2.remove();
                            }else if(text=='驻留时长'){
                                legend_3.remove();
                            }
                        }
                    });
                }
                $page.locateView.locateUser24GCellHoldTimeInfoTable(cell_hold_time_list);
            });
        },
        //用户2/4G网络图表呈现（单个小区的异常事件查询）
        locateUser24GCellAbnormalEvent: function(seq, eci, edate){
            edate = edate == null || edate == undefined ? currentEdate : edate;
            $("#user_24g_view_event_table tbody").html("<tr><td colspan='8'>"+loader+"</td>");
            $.post("/optimization/mainAction/locateUser24GCellAbnormalEvent", {"seq": seq, "eci": eci,"edate" :edate}, function (result, status, xhr) {
                $page.locateView.loadUser24gViewEventTable(result,seq, eci, edate);
            });
        },
        loadUser24gViewEventTable:function(result,seq, eci, edate){
            $('#user_24g_view_event_table').DataTable({
                "destroy": true,
                "processing": false,
                "bFilter": false,
                "iDisplayLength": 10,
                "bLengthChange": false,
                "ordering": false,
                "bAutoWidth": true,
                "data": result,
                "columns": [
                    {title:'小区名称', data:'cell_name'},
                    {title:'ENB_CELL', data:'enb_cell'},
                    {title:'进入时间', data:'entry_time', render: function (data, type, row) {
                            var entryTime = data.replace(/-/g,'').replace(/:/g,'').replace(/ /g,'');
                            return "<a href='javascript:$page.locateView.locateUser24GCellAbnormalEventDetail("+seq+",\""+eci+"\",\""+entryTime+"\",);'>"+data.substr(5,14) +"</a>"
                        }},
                    {title:'离开时间', data:'leave_time', render: function (data, type, row) {return data.substr(5,14)}},
                    {title:'异常事件次数', data:'sum_xdr_bd_counts'},
                    {title:'用户覆盖电平', data:'avg_rsrp'},
                    {title:'用户信号质量', data:'avg_rsrq'},
                    {title:'用户距离', data:'avg_distance'},
                    {title:'用户上行SINR', data:'avg_ul_sinr'},
                    {title:'用户上行干扰', data:'avg_received_power'},
                    {title:'用户上行功率余量', data:'avg_phr'},
                ],
            });
        },
        //用户2/4G网络用户（小区某一异常事件详情查询）
        locateUser24GCellAbnormalEventDetail: function(seq, eci, entryTime){
            $(".loading").show();
            $.post("/optimization/mainAction/locateUser24GCellAbnormalEventDetail", {"seq": seq, "eci":eci, "entryTime":entryTime}, function (result, status, xhr) {
                $('#user_24g_view_event_detail_table').DataTable({
                    "destroy": true,
                    "processing": false,
                    "bFilter": false,
                    "iDisplayLength": 10,
                    "bLengthChange": false,
                    "ordering": false,
                    "bAutoWidth": true,
                    "data": result,
                    "columns": [
                        {title:'时间', data:'时间点'},
                        {title:'ECI', data:'eci'},
                        {title:'ENB_CELL', data:'enb_cell'},
                        {title:'小区名称', data:'cel_name'},
                        {title:'驻留网络', data:'驻留网络'},
                        {title:'异常事件次数', data:'异常事件次数'},
                        {title:'异常事件详情', data:'异常事件详情'},
                        {title:'用户覆盖电平', data:'用户覆盖电平'},
                        {title:'用户信号质量', data:'用户信号质量'},
                        {title:'用户距离', data:'用户距离'},
                        {title:'用户上行SINR', data:'用户上行sinr'},
                        {title:'用户上行干扰', data:'用户上行干扰'},
                        {title:'用户上行功率余量', data:'用户上行功率余量'},
                    ],
                });
            });
            setTimeout(function (){
                $(".loading").hide();
                layer.open({
                    title: '定位分类-异常事件详情',
                    type: 1,
                    area: ['80%', '70%'],
                    skin: "layui-layer-lan", //样式类名
                    closeBtn: 1, //不显示关闭按钮
                    shift: 2,
                    shadeClose: true, //开启遮罩关闭
                    content: $("#user_24g_view_event_detail_layer")
                });
            }, 3000);
        },
        //用户2/4G网络用户（小区驻留时长）
        locateUser24GCellHoldTimeInfoTable: function(result){
            $('#user_24g_cell_hold_time_info_table').DataTable({
                "destroy": true,
                "processing": false,
                "bFilter": false,
                "iDisplayLength": 10,
                "bLengthChange": false,
                "ordering": true,
                "bAutoWidth": true,
                "data": result,
                "order": [[ 9, "desc" ]],
                "columns": [
                    {title:'查询序列', data:'seq'},
                    {title:'ECI', data:'eci'},
                    {title:'小区名称', data:'cell_name'},
                    {title:'异常次数', data:'sum_xdr_bd_counts'},
                    {title:'经度', data:'longitude'},
                    {title:'纬度', data:'latitude'},
                    {title:'小区频点', data:'freq'},
                    {title:'小区频段', data:'band'},
                    {title:'方向角', data:'dir'},
                    {title:'驻留时长（分钟）', data:'length_of_stay'},
                    {title:'驻留时长占比', data:'top_rank_of_stay'},
                ],
            });
        },
        //异常事件定位详情
        locateXdrDetail: function (seq) {
            $.post("/optimization/mainAction/locateXdrDetail", {"seq": seq}, function (result, status, xhr) {
                var columns = [];
                if(result==null || result.length<1){
                    $("#locate_xdr_table_div").html("<table id='locate_xdr_table' class='table table-responsive text-nowrap table-condensed table-bordered'><thead><tr><td></td></tr></thead><tbody><tr><td>暂无数据</td></tr></tbody></table><div class='clear'></div>");
                    $('#locate_xdr_table').DataTable({
                        "destroy": true,
                        "processing": false,
                        "bFilter": false,
                        "iDisplayLength": 10,
                        "bLengthChange": false,
                        "ordering": false,
                        "bAutoWidth": true,
                        data: [],
                    });
                }else {
                    var thead = "";
                    $.each(result[0], function (k, v) {
                        thead = thead + "<td>"+k+"</td>";
                        if (k == 'type_name') {
                            columns.push({
                                title: k, data: k, render: function (data, type, row) {
                                    data = replaceNull(data);
                                    if (data.length > 20) {
                                        var html = "<div style='width:200px;overflow:hidden;text-overflow:ellipsis;display:inline-flex;'>" + data + "</div>";
                                        html += "<a onclick='showparams(this)' data-flag='1' class='pull-right'>[展开]</a>"
                                        return html;
                                    } else {
                                        return data;
                                    }
                                }
                            });
                        } else if (k == 'uri') {
                            columns.push({
                                title: k, data: k, render: function (data, type, row) {
                                    data = replaceNull(data);
                                    if (data.length > 20) {
                                        var html = "<div style='width:200px;overflow:hidden;text-overflow:ellipsis;display:inline-flex;'>" + data + "</div>";
                                        html += "<a onclick='showparams(this)' data-flag='1' class='pull-right'>[展开]</a>"
                                        return html;
                                    } else {
                                        return data;
                                    }
                                }
                            });
                        } else {
                            columns.push({title: k, data: k});
                        }
                    });
                    $("#locate_xdr_table_div").html("<table id='locate_xdr_table' class='table table-responsive text-nowrap table-condensed table-bordered'><thead><tr>"+thead+"</tr></thead><tbody></tbody></table><div class='clear'></div>");
                    $('#locate_xdr_table').DataTable({
                        "destroy": true,
                        "processing": false,
                        "bFilter": false,
                        "iDisplayLength": 10,
                        "bLengthChange": false,
                        "ordering": false,
                        "bAutoWidth": true,
                        data: result,
                        "columns": columns,
                    });
                }
            });
        },
        //投诉小区详情
        complaintCellDetail: function (seq,edate) {
            $.post("/optimization/mainAction/complaintCellDetail", {"seq": seq,"edate":edate}, function (result, status, xhr) {
                var thead = "";
                var columns = [];
                if(result==null || result.length<1){
                    $("#locate_giscell_table_div").html("<table id='locate_giscell_table' class='table table-responsive text-nowrap table-condensed table-bordered'><thead><tr><td></td></tr></thead><tbody><tr><td>暂无数据</td></tr></tbody></table><div class='clear'></div>");
                    $('#locate_giscell_table').DataTable({
                        "destroy": true,
                        "processing": false,
                        "bFilter": false,
                        "iDisplayLength": 10,
                        "bLengthChange": false,
                        "ordering": false,
                        "bAutoWidth": true,
                        "data": []
                    });
                }else {
                    $.each(result[0], function (k, v) {
                        columns.push({title: k, data: k});
                        thead = thead + "<td>"+k+"</td>";
                    });
                    $("#locate_giscell_table_div").html("<table id='locate_giscell_table' class='table table-responsive text-nowrap table-condensed table-bordered'><thead><tr>"+thead+"</tr></thead><tbody></tbody></table><div class='clear'></div>");
                    $('#locate_giscell_table').DataTable({
                        "destroy": true,
                        "processing": false,
                        "bFilter": false,
                        "iDisplayLength": 10,
                        "bLengthChange": false,
                        "ordering": false,
                        "bAutoWidth": true,
                        "data": result,
                        "columns": columns,
                    });
                }
            });
        },
        //投诉小区轨迹
        complaintCellTravel: function(seq, edate){
            $.post("/optimization/mainAction/complaintCellTravel", {"seq": seq,"edate":edate}, function (res) {
                //投诉小区轨迹
                var locate_gistrack = res.data;
                var tracks = [];
                if (locate_gistrack && locate_gistrack.length > 0) {
                    $.each(locate_gistrack, function (i) {
                        var $this = locate_gistrack[i];
                        if (fmtNull($this.longitude) != "-" && fmtNull($this.latitude) != "-") {
                            tracks.push({
                                "小区号": $this.cell_id,
                                "小区名称": $this.cell_name,
                                "附着成功率": $this.attach_rate,
                                "承载建立成功率": $this.attach_rate,
                                "TAU成功率": $this.def_rate,
                                "S1切出成功率": $this.s1ho_o_rate,
                                "S1切入成功率": $this.s1ho_i_rate,
                                "DNS成功率": $this.dns_rate,
                                "TCP建立成功率": $this.tcp_rate,
                                "TCP建立时延": $this.tcp_latency,
                                "HTTP响应成功率": $this.http_rate,
                                "HTTP响应时延": $this.http_latency,
                                "大包下载速率": $this.tput500k,
                                "longitude": $this.longitude,
                                "latitude": $this.latitude,
                            });
                        }
                    });
                }
                if(loadGis && gis0){
                    gis0.setTracks(tracks, "小区号");
                }
            });
        },
    },
    //数据分析
    dataView: {
        $uemerTable: null,
        initStatistic: function (seq,sdate,edate) {
            $("#main-nav-tab").find("li").removeClass("active").eq(0).addClass("active");
            $("#tab_user_info").addClass("active");
            $("#tab_order_statistic").removeClass("active");
            //跳转效果
            $(".container-fluid").animate({
                scrollTop: $("#anchor1").offset().top - 50
            }, 1000);
            $page.dataView.complainUserUemrLine(seq, sdate, edate);
            $page.dataView.complainUserUemrDetail(seq, sdate, edate);
            $page.dataView.complainUserXdrDetail(seq, sdate, edate);
            $page.dataView.passCellOmcIndex(seq, sdate, edate);
            $page.dataView.passCellWarningMsg(seq, sdate, edate);
        },
        //投诉用户UEMR分布（走势图）
        complainUserUemrLine: function (seq, sdate, edate) {
            $('#chart17').html(loader);
            $.post("/optimization/mainAction/complainUserUemrLine", {"seq": seq}, function (res, status, xhr) {
                if (status != 'success') {
                    layer.alert("UEMR表不存在");
                    return;
                }
                //UEMR
                var uemr_line = res;
                var cates = [];
                var ts1 = [], ts2 = [], ts3 = [], ts4 = [], ts5 = [], ts6 = [];
                if (uemr_line && uemr_line.length > 0) {
                    $.each(uemr_line, function (i) {
                        var $this = uemr_line[i];
                        //cates.push(($this.smill).substring(8,($this.smill).length-1));
                        cates.push($this.smill);
                        ts1.push($this.phr);
                        ts2.push($this.enb_received_power);
                        ts3.push($this.ul_sinr);
                        ts4.push($this.ta);
                        ts5.push($this.serving_rsrp);
                        ts6.push($this.serving_rsrq);
                    });
                }
                var series = [{
                    yAxis: 0,
                    name: 'PHR',
                    data: ts1,
                    color: Highcharts.getOptions().colors[4]
                }, {
                    yAxis: 1,
                    name: 'ENB_RECEIVED_POWER',
                    data: ts2,
                    color: Highcharts.getOptions().colors[5]
                }, {
                    yAxis: 2,
                    name: 'UL_SINR',
                    data: ts3,
                    color: Highcharts.getOptions().colors[6]
                }, {
                    yAxis: 3,
                    name: 'TA',
                    data: ts4,
                    color: Highcharts.getOptions().colors[7]
                }, {
                    yAxis: 4,
                    name: 'SERVING_RSRP',
                    data: ts5,
                    color: Highcharts.getOptions().colors[8]
                }, {
                    yAxis: 5,
                    name: 'SERVING_RSRQ',
                    data: ts6,
                    color: Highcharts.getOptions().colors[9]
                }];
                var tics = 1;
                if (ts1.length > 10 && ts1.length <= 50) {
                    tics = 5;
                }
                if (ts1.length > 50 && ts1.length <= 100) {
                    tics = 15;
                }
                if (ts1.length > 100 && ts1.length <= 150) {
                    tics = 25;
                }
                if (ts1.length > 150) {
                    tics = 35;
                }
                var yAxises =
                    [
                        {
                            title: {
                                text: '',
                                style: {
                                    color: Highcharts.getOptions().colors[4]
                                }
                            },
                            labels: {
                                style: {
                                    color: Highcharts.getOptions().colors[4]
                                }
                            }
                        },
                        {
                            title: {
                                text: '',
                                style: {
                                    color: Highcharts.getOptions().colors[5]
                                }
                            },
                            labels: {
                                style: {
                                    color: Highcharts.getOptions().colors[5]
                                }
                            }
                        },
                        {
                            title: {
                                text: '',
                                style: {
                                    color: Highcharts.getOptions().colors[6]
                                }
                            },
                            labels: {
                                style: {
                                    color: Highcharts.getOptions().colors[6]
                                }
                            }
                        },
                        {
                            title: {
                                text: '',
                                style: {
                                    color: Highcharts.getOptions().colors[7]
                                }
                            },
                            labels: {
                                style: {
                                    color: Highcharts.getOptions().colors[7]
                                }
                            }
                        },
                        {
                            title: {
                                text: '',
                                style: {
                                    color: Highcharts.getOptions().colors[8]
                                }
                            },
                            labels: {
                                style: {
                                    color: Highcharts.getOptions().colors[8]
                                }
                            }
                        },
                        {
                            title: {
                                text: '',
                                style: {
                                    color: Highcharts.getOptions().colors[9]
                                }
                            },
                            labels: {
                                style: {
                                    color: Highcharts.getOptions().colors[9]
                                }
                            }
                        },
                    ];
                eventLine = initLines("chart17", 'UEMR分布', cates, series, tics, false, yAxises, 30, function (event) {
                    $page.dataView.userUmerLineDrilldown($page.dataView.$uemerTable, seq, event);
                });
            });
        },
        //投诉用户UEMR分布（走势图-->下钻方法）
        userUmerLineDrilldown: function (table, seq, event) {
            clickLineTime = event.point.category;
            $.post("/optimization/mainAction/userUmerLineDrilldown", {
                "seq": seq,
                "pagesize": table.page.info().length,
                "sdate": clickLineTime
            }, function (res) {
                table.page(res.pageno).draw(false);
            });
        },
        //投诉用户UEMR详单（表格）
        complainUserUemrDetail: function (seq, sdate, edate) {
           // $('#data_ana_uemr tbody').html("<tr><td colspan='51'>"+loader+"</td>");
            $page.dataView.$uemerTable = $('#data_ana_uemr').DataTable({
                "destroy": true,
                "processing": false,
                "serverSide": true,
                "bFilter": false,
                "iDisplayLength": 15,
                "bLengthChange": false,
                "ordering": false,
                "ajax": {
                    "url": "/optimization/mainAction/complainUserUemrDetail",
                    "data": function (d) {
                        return $.extend({}, d, {"seq": seq, "stime": ""});
                    },
                    "error": function (xhr, textStatus, error) {
                        if (textStatus == 'error') {
                            layer.alert("UEMR表不存在");
                        }
                    }
                },
                "columns":
                    [
                        {"data": "smill"},
                        {"data": "xdr_id"},
                        {"data": "rat"},
                        {"data": "msisdn"},
                        {"data": "mme_group_id"},
                        {"data": "mme_code"},
                        {"data": "mme_ue_s1ap_id"},
                        {"data": "enb_id"},
                        {"data": "cell_id_str"},
                        {"data": "mr_type"},
                        {"data": "re_phr"},
                        {"data": "re_enb_received_power"},
                        {"data": "re_ul_sinr"},
                        {"data": "re_ta"},
                        {"data": "aoa"},
                        {"data": "serving_freq"},
                        {"data": "re_serving_rsrp"},
                        {"data": "re_serving_rsrq"},
                        {"data": "neighbor_cell_number"},
                        {"data": "neighbor_1_cell_pci"},
                        {"data": "neighbor_1_freq"},
                        {"data": "neighbor_1_rsrp"},
                        {"data": "neighbor_1_rsrq"},
                        {"data": "neighbor_2_cell_pci"},
                        {"data": "neighbor_2_freq"},
                        {"data": "neighbor_2_rsrp"},
                        {"data": "neighbor_2_rsrq"},
                        {"data": "neighbor_3_cell_pci"},
                        {"data": "neighbor_3_freq"},
                        {"data": "neighbor_3_rsrp"},
                        {"data": "neighbor_3_rsrq"},
                        {"data": "neighbor_4_cell_pci"},
                        {"data": "neighbor_4_freq"},
                        {"data": "neighbor_4_rsrp"},
                        {"data": "neighbor_4_rsrq"},
                        {"data": "neighbor_5_cell_pci"},
                        {"data": "neighbor_5_freq"},
                        {"data": "neighbor_5_rsrp"},
                        {"data": "neighbor_5_rsrq"},
                        {"data": "neighbor_6_cell_pci"},
                        {"data": "neighbor_6_freq"},
                        {"data": "neighbor_6_rsrp"},
                        {"data": "neighbor_6_rsrq"},
                        {"data": "neighbor_7_cell_pci"},
                        {"data": "neighbor_7_freq"},
                        {"data": "neighbor_7_rsrp"},
                        {"data": "neighbor_7_rsrq"},
                        {"data": "neighbor_8_cell_pci"},
                        {"data": "neighbor_8_freq"},
                        {"data": "neighbor_8_rsrp"},
                        {"data": "neighbor_8_rsrq"}
                    ],
                'drawCallback': function () {
                    if (clickLineTime) {
                        var $trs = $("#data_ana_uemr tbody tr");
                        $.each($trs, function (i) {
                            $($trs[i]).removeClass("row-active");
                            if ($($trs[i]).find("td").eq(0).text().trim() == clickLineTime) {
                                $($trs[i]).addClass("row-active");
                            }
                        });
                    }
                }
            });
        },
        //投诉用户XDR详单
        complainUserXdrDetail: function (seq, sdate, edate) {
            $('#data_ana_xdr tbody').html("<tr><td colspan='5'>"+loader+"</td>");
            $.post("/optimization/mainAction/complainUserXdrDetail", {"seq": seq, "edate": edate}, function (result, status, xhr) {
                var columns = [];
                if (result == null || result.length < 1) {
                    columns.push({
                        'title': '', 'data': '', render: function () {
                            return "暂无数据"
                        }
                    });
                } else {
                    $.each(result[0], function (k, v) {
                        if (k == 'uri') {
                            columns.push({
                                title: k, data: k, render: function (data, type, row) {
                                    data = replaceNull(data);
                                    if (data.length > 20) {
                                        var html = "<div style='width:200px;overflow:hidden;text-overflow:ellipsis;display:inline-flex;'>" + data + "</div>";
                                        html += "<a onclick='showparams(this)' data-flag='1' class='pull-right'>[展开]</a>"
                                        return html;
                                    } else {
                                        return data;
                                    }
                                }
                            });
                        } else {
                            columns.push({title: k, data: k});
                        }
                    });
                }
                $('#data_ana_xdr').DataTable({
                    "destroy": true,
                    "processing": false,
                    "bFilter": false,
                    "iDisplayLength": 15,
                    "bLengthChange": false,
                    "ordering": false,
                    "bAutoWidth": true,
                    "data": result,
                    "columns": columns
                });
            });
        },
        //经过小区OMC指标
        passCellOmcIndex: function (seq, sdate, edate) {
            $('#data_ana_omc tbody').html("<tr><td colspan='5'>"+loader+"</td>");
            $.post("/optimization/mainAction/passCellOmcIndex", {"seq": seq, "sdate": sdate, "edate": edate}, function (result, status, xhr) {
                var columns = [];
                if (result == null || result.length < 1) {
                    columns.push({
                        'title': '', 'data': '', render: function () {
                            return "暂无数据"
                        }
                    });
                } else {
                    $.each(result[0], function (k, v) {
                        columns.push({title: k, data: k});
                    });
                }
                $('#data_ana_omc').DataTable({
                    "destroy": true,
                    "processing": false,
                    "bFilter": false,
                    "iDisplayLength": 15,
                    "bLengthChange": false,
                    "ordering": false,
                    "bAutoWidth": true,
                    "data": result,
                    "columns": columns
                });
            });
        },
        //经过小区告警信息
        passCellWarningMsg: function (seq, sdate, edate) {
            $('#data_ana_cellwarn tbody').html("<tr><td colspan='5'>"+loader+"</td>");
            $.post("/optimization/mainAction/passCellWarningMsg", {"seq": seq, "edate": edate}, function (result, status, xhr) {
                var columns = [];
                if (result == null || result.length < 1) {
                    columns.push({
                        'title': '', 'data': '', render: function () {
                            return "暂无数据"
                        }
                    });
                } else {
                    $.each(result[0], function (k, v) {
                        columns.push({title: k, data: k});
                    });
                }
                $('#data_ana_cellwarn').DataTable({
                    "destroy": true,
                    "processing": false,
                    "bFilter": false,
                    "iDisplayLength": 15,
                    "bLengthChange": false,
                    "ordering": false,
                    "bAutoWidth": true,
                    "data": result,
                    "columns": columns
                });
            });
        },
    },

    expview: {
        exportData: function (seq, key, name,sdate,edate) {
            if(Golden){
                var imsimsisdn = nullToEmpty(currentMsisdn)==""?currentImsi:currentMsisdn;
                Golden.customno = imsimsisdn;
                Golden.start = currentSdate;
                Golden.end = currentEdate;
                Golden.title = "LTE投诉详单导出";
            }
            N.Util.download("/optimization/mainAction/exportExcel", {"seq": seq, "key": key, "fileName": name,"sdate":sdate,"edate":edate});
        },
        exportDetail: function (seq) {
            if(Golden){
                var imsimsisdn = nullToEmpty(currentMsisdn)==""?currentImsi:currentMsisdn;
                Golden.customno = imsimsisdn;
                Golden.start = currentSdate;
                Golden.end = currentEdate;
                Golden.title = "LTE投诉结论导出";
            }
            N.Util.download("/optimization/mainAction/exportDetail", {"seq": seq, "fileName": "Complain_allcontents"});
            N.Util.download("/optimization/mainAction/exportDetail", {"seq": seq, "fileName": "Eventslist_original"});
        }
    }
}

//查询按钮
function query(type) {
    //单用户查询
    if (type == 0) {
        var imsi = $("#imsival").val().replace(/\s+/g, "");
        var sdate = $("#sdate").val();
        var stime = $("#timeVars").val();
        if (imsi.length == 0) {
            layer.alert("请输入正确的手机号或IMSI");
            return;
        }
        if (sdate.replace(/\s+/g, "").length == 0) {
            layer.alert("请输入投诉时间");
            return;
        }
        if (isNaN(imsi)) {
            layer.alert("请输入正确的手机号或IMSI");
            return;
        }
        if (!stime || isNaN(stime) || !(stime%1 === 0) || stime==0) {
            //layer.alert("回溯时间必须为大于零的整数");
           // return;
        }
        if (parseInt(stime) > 240) {
          //  layer.alert("回溯时间不能超过240个小时");
           // return;
        }
        var pre_lonlat = $("#pre_lonlat").val();
       // 用户分析
        diagnosticDelimitationNew();
        abnormalEventsNew(imsi,sdate);
        specificOutputNew('http');
        //投诉定位
        locateCategoryTableNew('1');
        locateUser24GViewLineNew();
        locateXdrDetailNew();
        locateUser24GCellAbnormalEventNew();
        //数据分析
        locateUser24GAbnormalCellTravel();
        complainUserUemrLineNew();
        complainUserUemrDetailNew();
        passCellOmcIndexNew();
        passCellWarningMsgNew();
        //分开刷新的开关 1是全部刷新
        userclick = 1,localclick=1,dataclick=1;
       
    

     
        
        
    } else {//工单查询
        $page.orderView.queryOrderNoPage();
    }
}
/**
 * 具体输出
 */
function specificOutputNew(tab) {
	// console.log(tab);
	 var imsi = $("#imsival").val().replace(/\s+/g, "");
     var sdate = $("#sdate").val();
    $('#confirm_cause_list tbody').html("<tr><td colspan='10'>"+loader+"</td>");
    $.post("/optimization/mainAction/specificOutput", {"imsi": imsi,"sdate":sdate,"type":tab}, function (result) {
       var columns = [];
       /*
        if(result==null || result.length<1){
            columns.push({'title':'', 'data':'', render:function(){return "暂无数据"}});
        }else {
            $.each(result[0], function (k, v) {
                columns.push({title: k, data: k});
            });
        }*/
       $('#confirm_cause_list').html("");
	    if ($('#confirm_cause_list').hasClass('dataTable')) {
	        var dttable = $('#confirm_cause_list').dataTable();
	        dttable.fnClearTable(); //清空一下table
	        dttable.fnDestroy(); //还原初始化了的datatable
	    }
        if(tab=='http'){
        	//console.log('进入了http');
        	 $('#confirm_cause_list').DataTable({
                 "bDestroy": true,
                 "processing": false,
                 "bFilter": false,
                 "iDisplayLength": 10,
                 "bPaginage": true,
                 "bLengthChange": false,
                 "bSort": false,
                 "bAutoWidth": true,
                 "data": result, 
                 //"columns": columns
                 "columns": [
                 	{data:"cell_name",sTitle:"占用小区"},
                 	{data:"app_name",sTitle:"业务类型"},
                 	{data:"app_sub_name",sTitle:"业务app"},
                 	{data:"start_time",sTitle:"业务开始时间"},
                 	{data:"end_time",sTitle:"业务结束时间"},
                 	{data:"abnormal_sort",sTitle:"质差原因（增加）"},
                 	{data:"wireless_postion_result",sTitle:"定位原因"},
                 	{data:"rsrp",sTitle:"测量电平"},
                 	{data:"ulsinr",sTitle:"测量上行sinr"}
                 ]
             });
        }else{
        	//console.log('进入了S1mee');
        	$('#confirm_cause_list').DataTable({
                "bDestroy": true,
                "processing": false,
                "bFilter": false,
                "iDisplayLength": 10,
                "bPaginage": true,
                "bLengthChange": false,
                "bSort": false,
                "bAutoWidth": true,
                "data": result, 
                //"columns": columns
                "columns": [
                	{data:"cell_name",sTitle:"占用小区"},
                	{data:"proc_type_name",sTitle:"事件类型"},
                	{data:"status",sTitle:"事件状态"},
                	{data:"start_time",sTitle:"业务开始时间"},
                	{data:"end_time",sTitle:"业务结束时间"},
                	{data:"wireless_postion_result",sTitle:"定位原因"},
                	{data:"rsrp",sTitle:"测量电平"},
                	{data:"ulsinr",sTitle:"测量上行sinr"}
                ]
            });
        }
       
    });
}
//用户2/4G网络图表呈现（异常小区轨迹图）
 function locateUser24GAbnormalCellTravel(){
	 var imsi = $("#imsival").val().replace(/\s+/g, "");
     var sdate = $("#sdate").val().replace(/-/g, "");
    $.post("/optimization/mainAction/locateUser24GAbnormalCellTravel", {"msisdn":imsi ,"sdate":sdate}, function (res, status, xhr) {
        var gis_cell = res.data.gis_cell;
        console.log(res.data);
        var gis_cell_count = res.data.gis_cell_count;
        var abnormal_event_count_and_hold_time = res.data.abnormal_event_count_and_hold_time;
        console.log(abnormal_event_count_and_hold_time);
        var cell_hold_time_list = res.data.cell_hold_time_list;
        if(loadGis && gis0){

            if(legend_1!=null){
                legend_1.remove();
            }
            if(legend_2!=null){
                legend_2.remove();
            }
            if(legend_2!=null){
                legend_2.remove();
            }



          //  gis0.setSectors1(gis_cell, "用户轨迹");
            gis0.setSectors2(abnormal_event_count_and_hold_time, "异常汇总");
           // gis0.setSectors3(abnormal_event_count_and_hold_time, "驻留时长", orderLocatLat, orderLocatLon, preLonLat);
         //   gis0.setView([31.80188049, 119.97151974],13);
            var cBoxs = $("input[type='checkbox'][class='leaflet-control-layers-selector']");

            cBoxs.each(function(i,value){
                var thizz = $(this);
                var text = thizz.next().html().trim();
                if(thizz.prop('checked')){
                    if(text=='用户轨迹'){
                        legend_1.addTo(gis0.map);
                    }else if(text=='异常汇总'){
                       // legend_2.addTo(gis0.map);
                    }else if(text=='驻留时长'){
                        legend_3.addTo(gis0.map);
                    }
                }
            });
         //   control_1.addTo(gis0.map);
            $('#ss').on("click", function(e) {
            	var find = $('#find').val()
            	if(find==''){
            		 layer.msg("未选中小区");
                     return;
            	}
            //	$.unique(ecgilist);
    			console.log('地图点击事件');
    			console.log(ecgilist);
    			//console.log(res);
    			$.post("/optimization/mainAction/testList", {"ecgilist": find}, function (res, status, xhr) {
    				console.log(status);
    				if(status=='success'){
    					ecgilist.length=0;
    				}
    				console.log(ecgilist);
    			});
    		
    		});
            cBoxs.on('click',function(){
                var thizz = $(this);
                var text = thizz.next().html().trim();
                if(thizz.prop('checked')){
                    if(text=='用户轨迹'){
                        legend_1.addTo(gis0.map);
                    }else if(text=='异常汇总'){
                        legend_2.addTo(gis0.map);
                    }else if(text=='驻留时长'){
                        legend_3.addTo(gis0.map);
                    }
                }else{
                    if(text=='用户轨迹'){
                        legend_1.remove();
                    }else if(text=='异常汇总'){
                        legend_2.remove();
                    }else if(text=='驻留时长'){
                        legend_3.remove();
                    }
                }
            });
        }
       // $page.locateView.locateUser24GCellHoldTimeInfoTable(cell_hold_time_list);
    });
}
//投诉用户UEMR详单（表格）
 function complainUserUemrDetailNew() {
	 var imsi = $("#imsival").val().replace(/\s+/g, "");
     var sdate = $("#sdate").val();
     $.post("/optimization/mainAction/complainUserUemrDetail", {"msisdn":imsi,"sdate":sdate}, function (res) {
    	 $('#data_ana_uemr').DataTable({
             "destroy": true,
             "processing": false,
             "bFilter": false,
             "iDisplayLength": 10,
             "bLengthChange": false,
             "ordering": false,
             "bAutoWidth": true,
             "data": res,
             "columns": [
            	 {"data":"cell_name",sTitle:"CELL_NAME"},
                 {"data":"procedure_start_time",sTitle:"PROCEDURE_START_TIME"},
                 {"data":"procedure_end_time",sTitle:"PROCEDURE_END_TIME"},
                 {"data":"duration",sTitle:"DURATION",
                	 render : function(data, type, row) {
                		 
                		if(data!=null&&data!=''){ var  c=parseFloat(data);
                		 return (c/1000).toFixed(4);
                		 }else{
                			 return data;
                		 }
                        
                     }
                	 
                 },
                 {"data":"rsrp",sTitle:"RSRP",
                	 render : function(data, type, row) {
                		if(data!=null&&data!=''){ 
                 			var  c=parseFloat(data);
                 		    return c-140;
                 		 }else{
                 			 return data;
                 		 }
                       }
                 },
                 {"data":"rsrq",sTitle:"RSRQ",
                	 render : function(data, type, row) {
                 		if(data!=null&&data!=''){ 
                  			var  c=parseFloat(data);
                  		    return c*0.5-19.5;
                  		 }else{
                  			 return data;
                  		 }
                        }
                 },
                 {"data":"ulsinr",sTitle:"ULSINR"},
                 {"data":"location_longitude",sTitle:"LOCATION_LONGITUDE"},
                 {"data":"location_latitude",sTitle:"LOCATION_LATITUDE"}
              ]
         });
      });
   
}


/**
 * 用户分析定位
 * @returns
 */
function diagnosticDelimitationNew() {
	 var imsi = $("#imsival").val().replace(/\s+/g, "");
     var sdate = $("#sdate").val();
     var edate = sdate+' 23:59:59';
     sdate = sdate+' 00:00:00';
     
	 $("#detail-info-panel").show();
     $.post("http://127.0.0.1:8080/css/customer/secondline", 
    		 {"phone":imsi ,"sdate":sdate,"edate":edate,module: "0"}, function (res) {
    	 //$.post("/optimization/mainAction/diagnosticDelimitation", {"imsi":imsi ,"sdate":sdate}, function (res) {
       // console.log(res);
     	var all_cause = res.data;
         $("#terminal_label").removeClass("fa-times-circle").addClass("fa-check-circle").removeClass("icon-no").addClass("icon-yes");
         $("#wireless_label").removeClass("fa-times-circle").addClass("fa-check-circle").removeClass("icon-no").addClass("icon-yes");
         $("#corenet_label").removeClass("fa-times-circle").addClass("fa-check-circle").removeClass("icon-no").addClass("icon-yes");
         $("#sp_label").removeClass("fa-times-circle").addClass("fa-check-circle").removeClass("icon-no").addClass("icon-yes");
         $("#confirm_main_cause").text("未查询到此用户存在异常记录");
         if (all_cause) {
             $.each(all_cause, function (i) {
             	console.log(all_cause[i].result);
             	console.log(all_cause[i].order_id);
                 if (all_cause[i].result == '终端') {
                 	 
                     $("#terminal_label").removeClass("fa-check-circle").addClass("fa-times-circle").removeClass("icon-yes").addClass("icon-no");
                 } else if (all_cause[i].result == '无线问题'||all_cause[i].order_id == '17') {
                     $("#wireless_label").removeClass("fa-check-circle").addClass("fa-times-circle").removeClass("icon-yes").addClass("icon-no");
                 } else if (all_cause[i].result == '核心网') {
                     $("#corenet_label").removeClass("fa-check-circle").addClass("fa-times-circle").removeClass("icon-yes").addClass("icon-no");
                 } else if (all_cause[i].result == 'sp问题') {
                     $("#sp_label").removeClass("fa-check-circle").addClass("fa-times-circle").removeClass("icon-yes").addClass("icon-no");
                 }
                 else if (all_cause[i].result == '用户') {
                     $("#user_label").removeClass("fa-check-circle").addClass("fa-times-circle").removeClass("icon-yes").addClass("icon-no");
                 }
                // $("#confirm_main_cause").text(res[i].result);
                 $('#confirm_main_cause').empty().append('  <div class="tab-pane active" id="' + '#' + all_cause[i].id + '">\n' +
                         '                        <h5 style="margin-top:0;">问题判定:' + all_cause[i].jump + '</h5>\n' +
                         '                    <p>(处理建议：' + all_cause[i].advice + ')</p>\n' +
                         '                    <p>对话脚本：' + all_cause[i].dialogue + '</p>\n' +
                         '                    </div>');
             });
         }
        
     });
}
//定位分类-表格
 function  locateCategoryTableNew(cate) {
	 var imsi = $("#imsival").val().replace(/\s+/g, "");
     var sdate = $("#sdate").val();
    $("#locate_main_cause tbody").html("<tr><td colspan='4'>"+loader+"</td>");
    
   /* if ($('#locate_category_list').hasClass('dataTable')) {
        var dttable = $('#locate_category_list').dataTable();
        dttable.fnClearTable(); //清空一下table
        dttable.fnDestroy(); //还原初始化了的datatable
    }*/
    $('#locate_category_list').DataTable({
        "destroy": true,
        "processing": false,
        "serverSide": true,
        "bFilter": false,
        "iDisplayLength": 5,
        "bLengthChange": false,
        "ordering": false,
        "ajax": {
            "url": "/optimization/mainAction/locateCategoryTable",
            "data": function (d) {
                return $.extend({}, d, {"msisdn":imsi,"sdate":sdate,"type":cate});
            },
            "error": function (xhr, textStatus, error) {
                console.log(error);
            }
        },
        "columns": [
            {"data": "sdate"},
            {"data": "grp_name"},
          /*  {"data": "grp_score"},*/
            {"data": "grp_scr_ratio"}
            
        ]
    });
    locationCategoryPie(imsi,sdate,cate);
    diagnosisLocationMainCauseNew(imsi,sdate,cate);
}
 /**
  * 定位分析
  */
 function diagnosisLocationMainCauseNew(msisdn,sdate,type){
     $("#locate_main_cause").html(loader);
     $.post("/optimization/mainAction/diagnosisLocationMainCause", {"msisdn":msisdn,"sdate":sdate,"type":type}, function (res) {
         var main_cause = res.data;
       //  console.log(res);
        // console.log(main_cause);
        // console.log(main_cause.grp_name);
        // console.log(res.length);
         $("#locate_main_cause").text("未查询到此用户存在异常记录");
         if(main_cause){
             $("#locate_main_cause").text(main_cause.grp_name);
         }
      });
 }
 //定位分类-饼图
 function locationCategoryPie(msisdn,sdate,type){
     $("#chart14").html(loader);
     $.post("/optimization/mainAction/locationCategoryPie", {"msisdn":msisdn,"sdate":sdate,"type":type}, function (res) {
         var locate_category = res.data;
         var piedata = [];
         if (locate_category && locate_category.length > 0) {
             $.each(locate_category, function (i) {
                 piedata.push({
                     name: locate_category[i].grp_name,
                     y: locate_category[i].grp_scr_ratio
                 });
             });
         }
         initPie('chart14', null, null, '', '%', piedata, function (e) {
         }, 'vertical', 'right', 100, 180);
     });
 }
//用户2/4G网络图表呈现（趋势图）
 function locateUser24GViewLineNew(){
     $("#detail-info-panel").show();
     var imsi = $("#imsival").val().replace(/\s+/g, "");
     var sdate = $("#sdate").val().replace(/-/g, "");
   //  $("#chart14_1").html(loader);
     $.post("/optimization/mainAction/locateUser24GViewLine", {"msisdn": imsi,"sdate":sdate}, function (res, status, xhr) {
         var cates = [];
         var ts0 = [], ts1 = [], ts2 = [];
        // console.log(res);
         if (res && res.length > 0) {
             $.each(res, function (i) {
                 var $this = res[i];
                 cates.push($this.mr_time);
                 //console.log($this.date_char);
              /*   ts0.push({y:Number($this.net_flag), d:$this, topTipFlag:'all'});
                 ts1.push({y:$this.rsrp, d:$this, topTipFlag:'self'});
                 ts2.push({y:$this.rsrq, d:$this, topTipFlag:'self'});*/
                 ts0.push({y:Number($this.rsrp_low_lose110), d:$this});
                 ts1.push({y:Number($this.ul_sinr_low_3_rate), d:$this});
                 ts2.push({y:Number($this.rsrp_avg), d:$this});
                 
             });
         }
       /*  console.log(cates);
         console.log(ts0);
         console.log(ts1);
         console.log(ts2);*/
         var series = [{
             yAxis: 0,
             name: 'rsrp_low_lose110',
             type: 'spline',
             data: ts0,
             color: Highcharts.getOptions().colors[4]
            // visible: true
         },
         {
             yAxis: 1,
             name: 'ul_sinr_low_3_rate',
             type: 'spline',
             data: ts1,
             color: Highcharts.getOptions().colors[5]
            // visible: false
         }, {
             yAxis: 2,
             name: 'rsrp_avg',
             type: 'spline',
             data: ts2,
             color: Highcharts.getOptions().colors[6]
             //visible: false
         }];
         var tics = 1;
         if (ts1.length > 10 && ts1.length <= 50) {
             tics = 5;
         }
         if (ts1.length > 50 && ts1.length <= 100) {
             tics = 15;
         }
         if (ts1.length > 100 && ts1.length <= 150) {
             tics = 25;
         }
         if (ts1.length > 150) {
             tics = 35;
         }
         var yAxises =
             [
                 {
                     title: {
                         text: '',
                         style: {
                             color: Highcharts.getOptions().colors[4]
                         }
                     },
                     labels: {
                         style: {
                             color: Highcharts.getOptions().colors[4]
                         }
                     }
                 },
                 {
                     title: {
                         text: '',
                         style: {
                             color: Highcharts.getOptions().colors[5]
                         }
                     },
                     labels: {
                         style: {
                             color: Highcharts.getOptions().colors[5]
                         }
                     }
                 },
                 {
                     title: {
                         text: '',
                         style: {
                             color: Highcharts.getOptions().colors[6]
                         }
                     },
                     labels: {
                         style: {
                             color: Highcharts.getOptions().colors[6]
                         }
                     }
                 }
             ];
         eventLine = initLines("chart14_1", 'USER 4G NET FLAG', cates, series, tics, false, yAxises, 30, $page.locateView.lineClickToTravel);
     });
 }
 //用户2/4G网络图表呈现（单个小区的异常事件查询）
function locateUser24GCellAbnormalEventNew(){
	 var imsi = $("#imsival").val().replace(/\s+/g, "");
     var sdate = $("#sdate").val().replace(/-/g, "");
    
    // $("#user_24g_view_event_table tbody").html("<tr><td colspan='8'>"+loader+"</td>");
     $.post("/optimization/mainAction/locateUser24GCellAbnormalEvent", {"msisdn": imsi, "sdate": sdate}, function (result, status, xhr) {
        $('#user_24g_view_event_table').DataTable({
         "destroy": true,
         "processing": false,
         "bFilter": false,
         "iDisplayLength": 10,
         "bLengthChange": false,
         "ordering": false,
         "bAutoWidth": true,
         "data": result,
         "columns": [
             {"data":"res_day",sTitle:"日期"},
             {"data":"cell_name",sTitle:"小区名称"},
             {"data":"unusual_count",sTitle:"XDR质差话单数"},
             {"data":"usa",sTitle:"用户平均上行sinr"},
             {"data":"rav",sTitle:"用户平均RSRP"},
             {"data":"rsa",sTitle:"用户平均RSRQ"}
          ]
     });
   });
 }
//异常事件定位详情
  function locateXdrDetailNew() { //
	  var imsi = $("#imsival").val().replace(/\s+/g, "");
	     var sdate = $("#sdate").val().replace(/-/g, "");
	   //  console.log(sdate);
     $.post("/optimization/mainAction/locateXdrDetail", {"msisdn": imsi,"sdate":sdate}, function (result, status, xhr) {
         var columns = [];
         if(result){
            // $("#locate_xdr_table_div").html("<table id='locate_xdr_table' class='table table-responsive text-nowrap table-condensed table-bordered'><thead><tr><td></td></tr></thead><tbody><tr><td>暂无数据</td></tr></tbody></table><div class='clear'></div>");
             $('#locate_xdr_table').DataTable({
                 "destroy": true,
                 "processing": false,
                 "bFilter": false,
                 "iDisplayLength": 10,
                 "bLengthChange": false,
                 "ordering": false,
                 "bAutoWidth": true,
                 "data": result,
                 "columns": [
                	 {"data":"p_day",sTitle:"日期"},
                	 {"data":"cell_name",sTitle:"小区名称",
                		 render : function(data, type, row) {
                            console.log(data);
                            console.log(type);
                            console.log(row);
                			 return data;
                         } },
                      {"data":"dw",sTitle:"定位原因"},
                	 {"data":"xdr_count",sTitle:"无线原因质差单数"},
                	 {"data":"poor_coverage_rt",sTitle:"弱覆盖(%)"},
                	 {"data":"dl_interfe_rt",sTitle:"下行干扰(%)"},
                	 {"data":"ul_poor_sinr_rt",sTitle:"上行SINR(%)"},
                	 {"data":"overlap_rt",sTitle:"重叠覆盖(%)"},
                	 {"data":"cross_rt",sTitle:"越区覆盖(%)"},
                	 {"data":"uepoorphr_rt",sTitle:"上行功率余量低(%)"},
                	 {"data":"prb_highusage_rt",sTitle:"PRB占用率过高(%)"},
                	 {"data":"prach_highusage_rt",sTitle:"PRACH占用高(%)"},
                	 {"data":"pdcch_highusage_rt",sTitle:"PDCCH占用高(%)"},
                	 {"data":"high_conusers_rt",sTitle:"小区激活用户高(%)"}
                 ]
             });
         }
         
     });
 }
  //投诉用户UEMR分布（走势图）
  function complainUserUemrLineNew() {
	  var imsi = $("#imsival").val().replace(/\s+/g, "");
	     var sdate = $("#sdate").val().replace(/-/g, "");
     // $('#chart17').html(loader);
      $.post("/optimization/mainAction/complainUserUemrLine", {"msisdn":imsi ,"sdate":sdate}, function (res, status, xhr) {
          if (status != 'success') {
              layer.alert("UEMR表不存在");
              return;
          }
          //UEMR
          var uemr_line = res;
          var cates = [];
          var ts1 = [], ts2 = [], ts3 = [], ts4 = [], ts5 = [], ts6 = [];
          if (uemr_line && uemr_line.length > 0) {
              $.each(uemr_line, function (i) {
                  var $this = uemr_line[i];
                  //cates.push(($this.smill).substring(8,($this.smill).length-1));
                  cates.push($this.mr_time);
                  ts1.push($this.rsrp_low_lose110);
                  ts2.push($this.ul_sinr_low_3_rate);
                  ts3.push($this.rsrp_avg);
                  ts4.push($this.sinr);
                  ts5.push($this.rsrq);
                  ts6.push($this.rsro);
              });
          }
          var series = [{
              yAxis: 0,
              name: 'rsrp_low_lose110',
              data: ts1,
              color: Highcharts.getOptions().colors[4]
          }, {
              yAxis: 1,
              name: 'ul_sinr_low_3_rate',
              data: ts2,
              color: Highcharts.getOptions().colors[5]
          }, {
              yAxis: 2,
              name: 'RSRP_avg',
              data: ts3,
              color: Highcharts.getOptions().colors[6]
          }, {
              yAxis: 3,
              name: '用户平均上行sinr',
              data: ts4,
              color: Highcharts.getOptions().colors[7]
          }, {
              yAxis: 4,
              name: '用户平均RSRQ',
              data: ts5,
              color: Highcharts.getOptions().colors[8]
          }, {
              yAxis: 5,
              name: 'RSRO_low_13_rate',
              data: ts6,
              color: Highcharts.getOptions().colors[9]
          }];
          var tics = 1;
          if (ts1.length > 10 && ts1.length <= 50) {
              tics = 5;
          }
          if (ts1.length > 50 && ts1.length <= 100) {
              tics = 15;
          }
          if (ts1.length > 100 && ts1.length <= 150) {
              tics = 25;
          }
          if (ts1.length > 150) {
              tics = 35;
          }
          var yAxises =
              [
                  {
                      title: {
                          text: '',
                          style: {
                              color: Highcharts.getOptions().colors[4]
                          }
                      },
                      labels: {
                          style: {
                              color: Highcharts.getOptions().colors[4]
                          }
                      }
                  },
                  {
                      title: {
                          text: '',
                          style: {
                              color: Highcharts.getOptions().colors[5]
                          }
                      },
                      labels: {
                          style: {
                              color: Highcharts.getOptions().colors[5]
                          }
                      }
                  },
                  {
                      title: {
                          text: '',
                          style: {
                              color: Highcharts.getOptions().colors[6]
                          }
                      },
                      labels: {
                          style: {
                              color: Highcharts.getOptions().colors[6]
                          }
                      }
                  },
                  {
                      title: {
                          text: '',
                          style: {
                              color: Highcharts.getOptions().colors[7]
                          }
                      },
                      labels: {
                          style: {
                              color: Highcharts.getOptions().colors[7]
                          }
                      }
                  },
                  {
                      title: {
                          text: '',
                          style: {
                              color: Highcharts.getOptions().colors[8]
                          }
                      },
                      labels: {
                          style: {
                              color: Highcharts.getOptions().colors[8]
                          }
                      }
                  },
                  {
                      title: {
                          text: '',
                          style: {
                              color: Highcharts.getOptions().colors[9]
                          }
                      },
                      labels: {
                          style: {
                              color: Highcharts.getOptions().colors[9]
                          }
                      }
                  },
              ];
          eventLine = initLines("chart17", 'UEMR分布', cates, series, tics, false, yAxises, 30, null);
      });
  }
//经过小区OMC指标
 function passCellOmcIndexNew() {
    //  $('#data_ana_omc tbody').html("<tr><td colspan='5'>"+loader+"</td>");
	 var imsi = $("#imsival").val().replace(/\s+/g, "");
     var sdate = $("#sdate").val().replace(/-/g, "");
     $('#data_ana_omc').DataTable({
         "destroy": true,
         "processing": false,
         "serverSide": true,
         "bFilter": false,
         "iDisplayLength": 5,
         "bLengthChange": false,
         "ordering": false,
         "ajax": {
             "url": "/optimization/mainAction/passCellOmcIndex",
             "type":"post",
             "data": function (d) {
                 return $.extend({}, d, {"msisdn":imsi ,"sdate":sdate});
             },
             "error": function (xhr, textStatus, error) {
                 console.log(error);
             }
         },
         "columns": [
       	  {"data":"daytime",sTitle:"时间"},
       	  {"data":"eci",sTitle:"CI"},
       	  {"data":"cgi",sTitle:"eci+cellid"},
       	  {"data":"rrc_succconnestab",sTitle:"RRC连接建立成功次数"},
       	  {"data":"rrc_attconnestab",sTitle:"RRC连接建立请求次数"},
       	  {"data":"erab_nbrsuccestab",sTitle:"E-RAB建立成功数"},
       	  {"data":"erab_nbrattestab",sTitle:"E-RAB建立请求数"},
       	  {"data":"radio_succ_rate",sTitle:"无线接通率"},
       	  {"data":"context_attrelenb",sTitle:"正常的eNB请求释放上下文数"},
       	  {"data":"context_attrelenb_normal",sTitle:"正常的eNB请求释放上下文数"},
       	  {"data":"context_attinitalsetup",sTitle:"初始上下文建立请求次数"},
       	  {"data":"context_nbrleft",sTitle:"遗留上下文个数"},
       	  {"data":"drop_rate",sTitle:"无线掉线率"},
       	  {"data":"ho_succoutinterenbs1",sTitle:"ENB间S1切换出准备成功次数"},
       	  {"data":"ho_succoutinterenbx2",sTitle:"ENB间X2切换出准备成功次数"},
       	  {"data":"ho_succoutintraenb",sTitle:"ENB内切换出成功次数"},
       	  {"data":"ho_attoutinterenbs1",sTitle:"ENB间S1切换出请求次数"},
       	  {"data":"ho_attoutinterenbx2",sTitle:"ENB间X2切换出请求次数"},
       	  {"data":"ho_attoutintraenb",sTitle:"ENB内切换出请求次数"},
       	  {"data":"ho_rate",sTitle:"切换成功率"},
       	  {"data":"rru_puschprbtot",sTitle:"上行PUSCHPRB可用数"},
       	  {"data":"rru_puschprbassn",sTitle:"上行PUSCHPRB占用数"},
       	  {"data":"ul_prb_rate",sTitle:"上行PUSCH利用率"},
       	  {"data":"rru_pdschprbtot",sTitle:"下行业务信道PRB可用数"},
       	  {"data":"rru_pdschprbassn",sTitle:"下行业务信道PRB占用数"},
       	  {"data":"dl_prb_rate",sTitle:"下行PDSCH利用率"},
       	  {"data":"rru_pdcchcceutil",sTitle:"PDCCH信道CCE占用个数"},
       	  {"data":"rru_pdcchcceavail",sTitle:"PDCCH信道CCE可用个数"},
       	  {"data":"rru_pdcchcceutilratio",sTitle:"PDCCH信道CCE占用率"},
       	  {"data":"pdcp_upoctul",sTitle:"小区用户面上行字节数"},
       	  {"data":"pdcp_upoctdl",sTitle:"小区用户面下行字节数"},
       	  {"data":"traffic",sTitle:"业务量"},
       	  {"data":"rru_cellunavailabletime",sTitle:"小区不可用总时长"},
       	  {"data":"rru_celltime_causeenergysave",sTitle:"节能原因退服导致小区不可用时长"},
       	  {"data":"rru_celltime_causes1failure",sTitle:"S1接口故障原因导致小区不可用时长"},
       	  {"data":"rrc_effectiveconnmean",sTitle:"有效RRC连接平均数"},
       	  {"data":"rrc_effectiveconnmax",sTitle:"有效RRC连接最大数"},
       	  {"data":"rrc_admissionconnmean",sTitle:"接纳用户平均数"},
       	  {"data":"rrc_admissionconnmax",sTitle:"接纳用户最大数"},
       	  {"data":"rrc_connreleasecsfb",sTitle:"CSFB触发的RRC连接释放次数"},
       	  {"data":"rrc_connrelease_redirectto2g",sTitle:"重定向到2G的RRC连接释放次数"},
       	  {"data":"rrc_connrelease_redirectto3g",sTitle:"重定向到3G的RRC连接释放次数"},
       	  {"data":"phy_ulmeannl_prb_busy_sum",sTitle:"上行干扰统计字段"},
       	  {"data":"phy_ulmeannl_prbwatt_busy",sTitle:"上行干扰统计字段"},
       	  {"data":"phy_ulmeannl_prb_sum",sTitle:"上行干扰统计字段"},
       	  {"data":"phy_ulmeannl_prbwatt_sum",sTitle:"上行干扰统计字段"}
         ]
     });
  }
function passCellWarningMsgNew() {
	 var imsi = $("#imsival").val().replace(/\s+/g, "");
     var sdate = $("#sdate").val().replace(/-/g, "");
     //$('#data_ana_cellwarn tbody').html("<tr><td colspan='5'>"+loader+"</td>");
     $.post("/optimization/mainAction/passCellWarningMsg", {"msisdn":imsi ,"sdate":sdate}, function (result, status, xhr) {
         var columns = [];
   
         $('#data_ana_cellwarn').DataTable({
             "destroy": true,
             "processing": false,
             "bFilter": false,
             "iDisplayLength": 15,
             "bLengthChange": false,
             "ordering": false,
             "bAutoWidth": true,
             "data": result,
             "columns": [
            	 {"data":"alarm_day",sTitle:"日期"},
            	 {"data":"cell_id",sTitle:"小区ID"},
            	 {"data":"cell_name",sTitle:"小区名称"},
            	 {"data":"omc_alarm_id",sTitle:"告警流水号"},
            	 {"data":"object_class",sTitle:"告警对象设备类型"},
            	 {"data":"org_severity",sTitle:"告警级别"},
            	 {"data":"alarm_title_text",sTitle:"告警标题"},
            	 {"data":"probable_cause_txt",sTitle:"告警可能原因"},
            	 {"data":"effectonbusiness",sTitle:"该事件对业务的影响"},
            	 {"data":"eventtime",sTitle:"告警发生时间"},
            	 {"data":"canceltime",sTitle:"告警清除时间"}
             ]
         });
     });
 }
/**
 * 异常事件分布
 */

function abnormalEventsNew(msisdn,sdate){
   // $('#chart16').html(loader);
    $.post("/optimization/mainAction/abnormalEvents", {"msisdn":msisdn,"sdate":sdate}, function (res) {
        var cause_line = res.data;
        var cates = [];
        var tempY = [];
        var series = [];
        if (cause_line && cause_line.length > 0) {
            $.each(cause_line, function (i) {
                var $this = cause_line[i];
                cates.push($this.shour);
                tempY.push($this.event_name);
            });
        }
        cates = unique(cates);
        tempY = unique(tempY);
        for (var j = 0; j < tempY.length; j++) {
            var ts = [];
            for (var i = 0; i < cates.length; i++) {
                ts.push(null);
                $.each(cause_line, function (x) {
                    if (cates[i] == cause_line[x].shour && tempY[j] == cause_line[x].event_name) {
                        ts[i] = cause_line[x].nums;
                    }
                });
            }
            series.push({
                name: tempY[j],
                data: ts
            });
        }
        var tmpCates = [];
        for (var i = 0; i < cates.length; i++) {
            tmpCates.push(cates[i] + ":00");
        }
        eventLine = initLines("chart16", '异常事件分布', tmpCates, series, 1, true, null, 0, null);
    });
}
function reQueryOrder() {
    var $table = $('#orderno_imsi_list').DataTable();
    var array = $page.ckeckBoxEvent.getCheckbox($table).tmpIdArray;
    var tmpIds = "";
    if (array.length > 0) {
        tmpIds = "'" + array.join('\',\'') + "'";
    } else {
        layer.alert("请选择需要重新查询的投诉工单");
        return;
    }
    $.post("/optimization/mainAction/reExecute", {"tmpIds": tmpIds},function (res) {
        var msg = res.msg;
        if(msg){
            layer.alert(msg);
        }else{
            query(1);
        }
    });
}

//删除投诉记录
function delComps() {
    var $table = $('#orderno_imsi_list').DataTable();
    var array = $page.ckeckBoxEvent.getCheckbox($table).tmpIdArray;
    var tmpids = "";
    if (array.length > 0) {
        tmpids = "'" + array.join('\',\'') + "'";
    } else {
        layer.alert("请先选择需要删除的投诉记录");
        return;
    }
    layer.confirm("确定删除吗?", function () {
        $.post("/optimization/mainAction/delCompsBySeqs", {
                "tmpids": tmpids
            },
            function (res) {
                if(res.data=="no-auth"){
                    layer.alert("该账户没有删除权限，请用root账户删除。");
                }else{
                    query(1);
                    layer.closeAll();
                }
            });
    }, function () {
    });
}

//关闭详情
function closeDetail() {
    $(".container-fluid").animate({
        scrollTop: 0
    },1000);
    setTimeout(function () {
        $("#detail-info-panel").hide();
    },1000);
}


function showparams(obj, flag) {
    if ($(obj).data("flag") == "1") {
        $(obj).prev().css("overflow", "visible");
        $(obj).prev().css("word-break", "break-all");
        $(obj).prev().css("white-space", "initial");
        $(obj).html("[收起]");
        $(obj).data("flag", "0");
    } else {
        $(obj).prev().css("overflow", "hidden");
        $(obj).prev().css("word-break", "initial");
        $(obj).prev().css("white-space", "inherit");
        $(obj).html("[展开]");
        $(obj).data("flag", "1");
    }
}

/******方法*******/
function formatDuring(mss) {
    var days = parseInt(mss / (1000 * 60 * 60 * 24));
    var hours = parseInt((mss % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    var minutes = parseInt((mss % (1000 * 60 * 60)) / (1000 * 60));
    var seconds = ((mss % (1000 * 60)) / 1000).toFixed(2);
    var res = "";
    if (days > 0) {
        res += days + "天";
    }
    if (hours > 0) {
        res += hours + "小时";
    }
    if (minutes > 0) {
        res += minutes + "分钟";
    }
    if (seconds > 0) {
        res += seconds + "秒";
    }
    return res;
}

function replaceNull(value) {
    if (value == null || value == 'null' || value == 'undefined' || value == undefined) {
        return "";
    }
    return value;
}

function status_string(status) {

    switch (status) {
        case 0:
            return '<label class="col-td-status status-green"></label>投诉分析完成';
            break;
        case 1:
            return '<label class="col-td-status status-blue"></label>排队获取数据';
            break;
        case 2:
            return '<label class="col-td-status status-blue"></label>数据正在生成';
            break;
        case 3:
            return '<label class="col-td-status status-red"></label>数据生成失败';
            break;
        case 4:
            return '<label class="col-td-status status-orange"></label>正在投诉分析';
            break;
        case 5:
            return '<label class="col-td-status status-red"></label>异常不可查询';
            break;
        case 6:
            return '<label class="col-td-status status-red"></label>查询已经超时';
            break;
        case 7:
            return '<label class="col-td-status status-red"></label>工单验证失败';
            break;

        case 8:
            return '<label class="col-td-status status-red"></label>查询数据为空';
            break;
        case 9:
            return '<label class="col-td-status status-red"></label>查询数据失败';
            break;
        //工单状态
        case 10:
            return '<label class="col-td-status status-red"></label>不支持的工单';
            break;
        case 11:
            return '<label class="col-td-status status-red"></label>工单已经过期';
            break;
        case 12:
            return '<label class="col-td-status status-red"></label>非可查询时段';
            break;
        case 13:
            return '<label class="col-td-status status-red"></label>号码工单不符';
            break;
        case 14:
            return '<label class="col-td-status status-red"></label>工单服务异常';
            break;
        case 15:
            return '<label class="col-td-status status-red"></label>0或2开头的号码';
            break;
        default:
            break;
    }

}

//线图
function initLines(htmlId, title, cates, series, interval, toolShare, yAxisArr, xRotation, clickCallBack, xIsformat) {
    xRotation = xRotation == null ? 0 : xRotation;
    var yAxises = [{
        title: {
            text: ''
        }
    }];
    if (yAxisArr) {
        yAxises = yAxisArr;
    }
    var chart = Highcharts.chart(htmlId, {
        chart: {
            zoomType: 'x'
        },
        title: {
            text: title
        },
        subtitle: {
            text: ''
        },
        tooltip: {
            useHTML: true,
            shared: toolShare,
            dateTimeLabelFormats: {
                millisecond: '%H:%M:%S.%L',
                second: '%H:%M:%S',
                minute: '%H:%M',
                hour: '%H:%M',
                day: '%Y-%m-%d',
                week: '%m-%d',
                month: '%Y-%m',
                year: '%Y'
            },
            formatter: function () {
                var s = '';
                if(this.point) {
                    if (this.point.topTipFlag) {
                        var p = this.point.d;
                        var ids = '<b>ENB_ID：</b>' + p.enb_id + '<br/><b>CELL_ID：</b>' + p.cellid + '<br/><b>CELL_NAME：</b>' + p.cel_name + '<br/>';
                        if (this.point.topTipFlag == 'column' && p.y != 0) {
                            var events = (p.event_dj_flag).split('；');
                            s = '<b>时间：</b>' + this.x + '<br/>' + ids + '<b>异常事件次数：</b>' + p.xdr_bd_counts + '<br/><b>异常事件信息：</b>' + events.join('<br/>&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;');
                        } else if (this.point.topTipFlag == 'all') {
                            s = '<b>时间：</b>' + this.x + '<br/><b>小区：</b>' + p.eci + '<br/>' + ids + '<b>RSRP：</b>' + p.rsrp + '<br/><b>RSRQ：</b>' + p.rsrq + '<br/><b>距离：</b>' + p.distance + '<br/><b>SINR：</b>' + p.ul_sinr + '<br/><b>PHR：</b>' + p.phr;
                        } else if (this.point.topTipFlag == 'index') {
                            for (var key in p) {
                                s = s + '<b>'+key+'：</b>' + p[key] + '<br/>';
                            }
                        } else {
                            var value = this.series.name + ': <b>' + this.y + "</b>";
                            var circle = "<div style='margin-top:4px;float:left;width:8px;height:8px;background-color:" + this.color + ";border-radius:50%;-moz-border-radius:50%;-webkit-border-radius:50%;'></div>&nbsp;";
                            s = this.x + "<br/>" + ids + circle + value;
                        }
                    } else {
                        var value = this.series.name + ': <b>' + this.y + "</b>";
                        var circle = "<div style='margin-top:4px;float:left;width:8px;height:8px;background-color:" + this.color + ";border-radius:50%;-moz-border-radius:50%;-webkit-border-radius:50%;'></div>&nbsp;";
                        s = this.x + "<br/>" + circle + value;
                    }
                }else if(this.points){
                    var points = this.points;
                    for(var i=0; i<points.length; i++){
                        var item = points[i];
                        var value = item.series.name + ':' + item.y;
                        var circle = "<div style='margin-top:4px;float:left;width:8px;height:8px;background-color:" + item.color + ";border-radius:50%;-moz-border-radius:50%;-webkit-border-radius:50%;'></div>&nbsp;";
                        s = s + circle + value + "<br/>";
                    }
                    s = this.x + "<br/>" + s;
                }else{
                    var value = this.y;
                    var circle = "<div style='margin-top:4px;float:left;width:8px;height:8px;background-color:"+this.color+";border-radius:50%;-moz-border-radius:50%;-webkit-border-radius:50%;'></div>&nbsp;";
                    s = this.x + "<br/>" + circle + value;
                }
                return s;
            },
        },
        yAxis: yAxises,
        xAxis: {
            categories: cates,
            tickInterval: interval,
            type: 'datetime',
            dateTimeLabelFormats: {
                millisecond: '%H:%M:%S.%L',
                second: '%H:%M:%S',
                minute: '%H:%M',
                hour: '%H:%M',
                day: '%m-%d',
                week: '%m-%d',
                month: '%Y-%m',
                year: '%Y'
            },
            labels: {
                rotation: xRotation,
                formatter: function () {
                    var v = this.value;
                    return xIsformat?v.substring(5, v.length):v;
                }
            }
        },
        legend: {
            layout: 'vertical',
            align: 'right',
            verticalAlign: 'middle'
        },
        series: series,
        responsive: {
            rules: [{
                condition: {
                    maxWidth: 500
                },
                chartOptions: {
                    legend: {
                        layout: 'horizontal',
                        align: 'center',
                        verticalAlign: 'bottom'
                    }
                }
            }]
        },
        plotOptions: {
            series: {
                cursor: 'pointer',
                turboThreshold: 20000,
                events: {
                    click: function (event) {
                        clickCallBack(event);
                    }
                }
            }
        },
    });
    return chart;
}

function initColumn(htmlId, title, showLegend, cates, series) {
    showLegend = showLegend == null ? true : showLegend;
    Highcharts.chart(htmlId, {
        title: {
            text: title,
            y: 3
        },
        subtitle: {
            text: ''
        },
        xAxis: [{
            categories: cates,
            crosshair: true
        }],
        yAxis: [
            {
                labels: {
                    format: '{value}'
                },
                title: {
                    text: '',
                },
            },
            {
                labels: {
                    format: '{value}'
                },
                title: {
                    text: '',
                },
                opposite: true
            }
        ],
        tooltip: {
            shared: true
        },
        legend: {
            enabled: showLegend,
            layout: 'horizontal',
            align: 'center',
            verticalAlign: 'bottom',
            floating: false,
//            y: -95,
//            backgroundColor: (Highcharts.theme && Highcharts.theme.legendBackgroundColor) || '#FFFFFF'
        },
        series: series
    });
}

function initPie(htmlid, width, size, title, serieName, data, callback, layout, align, marginRight, legendWidth) {
    if (!layout) {
        layout = 'horizontal';
    }
    if (!align) {
        align = 'center';
    }
    if (!marginRight) {
        marginRight = 100;
    }
    $('#' + htmlid).highcharts({
        chart: {
            width: width,
            plotBackgroundColor: null,
            plotBorderWidth: null,
            plotShadow: false,
            marginRight: marginRight,
            events: {
                click: function (e) {
                    if (callback) {
                        callback();
                    }
                }
            }
        },
        credits: {
            enabled: false // 禁用版权信息
        },
        title: {
            text: title,
            y: 10,
            verticalAlign: 'top',
            style: {
                fontFamily: "微软雅黑"
            }
        },
        legend: {
            layout: layout,
            align: align,
            verticalAlign: 'middle',
            borderWidth: 0,
            itemWidth: legendWidth,
            x: 50,
            itemStyle: {
                cursor: 'pointer',
                fontFamily: "微软雅黑",
                'word-break': 'break-all',
                'font-size': '12px'
            }
        },
        tooltip: {
            pointFormat: '{series.name}:{point.percentage:.1f}%</b>',
            style: {
                fontFamily: "微软雅黑"
            }
        },
        plotOptions: {
            pie: {
                allowPointSelect: true,
                cursor: 'pointer',
                dataLabels: {
                    enabled: false
                },
                size: size,
                showInLegend: true,
                events: {
                    click: function (event) {
                        if (!callback || typeof callback == 'undefined' || callback == undefined) {
                            return;
                        }
                        callback(event);
                    }
                }
            },
            series: {
                states: {
                    hover: {
                        enabled: true
                    }
                }
            }
        },
        series: [{
            type: 'pie',
            name: serieName,
            dataLabels: {
                formatter: function () {
                    return this.y > 1 ? '<b>' + this.point.name + ': ' + this.point.percentage.toFixed(2) + ' %</b>' : null;
                }
            },
            data: data
        }]
    });
}

function getColor1(d) {
    return ( 0<d  && d< 60) ? '#FF0000' :
        (60<=d && d< 70) ? '#FFA500' :
            (70<=d && d< 80) ? '#FFFF00' :
                (80<=d && d< 90) ? '#68d4b2' :
                    (90<=d         ) ? '#90EE90' :
                        '#eee' ;
}
function getColor2(d) {
    return ( 0<d && d<= 60) ? '#90EE90' :
        (60<d && d<= 80) ? '#68d4b2' :
            (80<d && d<= 90) ? '#FFFF00' :
                (90<d && d<= 100) ? '#FFA500' :
                    (100<d && d<= 110) ? '#FF0000' :
                        (110<d           ) ? '#FF0000' :
                            '#eee' ;
}
function getColor3(d) {
    return (   0<d  && d< 500) ? '#FF0000' :
        (500<=d && d< 1000) ? '#FFA500' :
            (1000<=d && d< 2000) ? '#FFFF00' :
                (2000<=d && d< 3000) ? '#68d4b2' :
                    (3000<=d          ) ? '#90EE90' :
                        '#eee' ;
}

/**
 * 绘制圆形进度图
 * @param htmlId 标签ID
 * @param value 值
 * @param unit 单位
 * @param text 文本
 * @returns
 */
function initCircle(htmlId, value, unit, text, color) {
    $("#" + htmlId).find(".circle-text").remove();
    var content = "";
    if (value == null || value == 0) {
        content = '-' + unit; // 根据value修改text
    } else {
        content = (Math.round(value) + unit); // 根据value修改text
    }
    $("#" + htmlId).circleChart({
        color: color,
        textSize: '15px',
        size: 78,
        value: value == null || value == 0 ? 100 : value,
        text: content,
    }).append("<p class='circle-text'>" + text + "</p>");
}

//导入文件
function importFile(uploadFile) {
    if (uploadFile.files.length == 1) {
        var file = uploadFile.files[0];
        var dForm = new FormData();
        dForm.append("uploadFile", file, file.name);
        uploadFile.value = "";
        $(".loading").show();
        if(process){
            window.clearInterval(process);
            process=null;
            $(".loading-process").text("数据正在加载 ...");
        }
        process = setInterval(function(){
            $.post("/optimization/mainAction/batchProcess", {}, function (res) {
                $(".loading-process").text("正在检查工单与用户是否有效 ... "+res.process+"%");
            });
        }, 500);
        $.ajax({
            url: "/optimization/mainAction/batchUpload",
            data: dForm,
            dataType: 'json',
            processData: false,
            contentType: false,
            type: 'POST',
            success: function (data) {
                $(".loading").hide();
                if(process){
                    window.clearInterval(process);
                    process=null;
                    $(".loading-process").text("数据正在加载 ...");
                }
                var queryId = "";
                if (!data.isOk) {
                    queryId = data.msg.query_id;
                    if(!queryId){
                        layer.alert(data.msg);
                        return;
                    }
                    layer.confirm(data.msg.msg, function () {
                        layer.closeAll();
                        $(".loading").hide();
                        N.Util.download("/optimization/mainAction/downfail", {"fileName": "ErrorList_"+new Date().getTime()});
                    }, function () {
                        layer.closeAll();
                        $(".loading").hide();
                        return;
                    });
                } else {
                    queryId = data.query_id;
                }
                if(queryId){
                    $("#exportQuery").attr('queryId', queryId);
                    $page.mainView.queryRecordPage('', queryId);
                }
            },
            error: function (xhr, textStatus, error) {
                if(process){
                    window.clearInterval(process);
                    process=null;
                    $(".loading-process").text("数据正在加载 ...");
                }
                $(".loading").hide();
                if (textStatus == 'error') {
                    layer.alert("批量处理错误,请检查模版是否填写正确");
                }
            }
        });
    }
}

//查询导入的数据（数据状态变化）
function exportQuery() {
    var queryId = $("#exportQuery").attr('queryId');
    if(!queryId){
        layer.alert("请先导入数据");
        return false;
    }
    $page.mainView.queryRecordPage('', queryId);
}

function nullToZero(value) {
    if (value == '' || value == 'null' || value == undefined || value == null) {
        return 0;
    }
    return value;
}

function fmtNull(value) {
    if (value == '' || value == 'null' || value == undefined || value == null) {
        return "-";
    }
    return value;
}

function nullToEmpty(value) {
    if (value == '' || value == 'null' || value == 'undefined' || value == undefined || value == null) {
        return "";
    }
    return value;
}

function unique(array) {
    var uarrays = [];
    if (array && array.length > 0) {
        $.each(array, function (i) {
            var $this = array[i];
            if (uarrays.indexOf($this) == -1 && $this != null) {
                uarrays.push($this);
            }
        });
    }
    return uarrays;
}

$(function () {
    var loadingHtml = '<div class="loading"><div class="loading-content"><svg width="150px" height="150px" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid" class="lds-wedges"><g transform="translate(50,50)"><g transform="scale(0.7)"><g transform="translate(-50,-50)"><g transform="rotate(329.235 50.0001 50)"><animateTransform attributeName="transform" type="rotate" calcMode="linear" values="0 50 50;360 50 50" keyTimes="0;1" dur="0.75s" begin="0s" repeatCount="indefinite"></animateTransform><path ng-attr-fill-opacity="{{config.opacity}}" ng-attr-fill="{{config.c1}}" d="M50 50L50 0A50 50 0 0 1 100 50Z" fill-opacity="0.8" fill="#f05125"></path></g><g transform="rotate(246.926 50 50)"><animateTransform attributeName="transform" type="rotate" calcMode="linear" values="0 50 50;360 50 50" keyTimes="0;1" dur="1s" begin="0s" repeatCount="indefinite"></animateTransform><path ng-attr-fill-opacity="{{config.opacity}}" ng-attr-fill="{{config.c2}}" d="M50 50L50 0A50 50 0 0 1 100 50Z" transform="rotate(90 50 50)" fill-opacity="0.8" fill="#fdb813"></path></g><g transform="rotate(164.617 50 50)"><animateTransform attributeName="transform" type="rotate" calcMode="linear" values="0 50 50;360 50 50" keyTimes="0;1" dur="1.5s" begin="0s" repeatCount="indefinite"></animateTransform><path ng-attr-fill-opacity="{{config.opacity}}" ng-attr-fill="{{config.c3}}" d="M50 50L50 0A50 50 0 0 1 100 50Z" transform="rotate(180 50 50)" fill-opacity="0.8" fill="#7fbb42"></path></g><g transform="rotate(82.3087 50 50)"><animateTransform attributeName="transform" type="rotate" calcMode="linear" values="0 50 50;360 50 50" keyTimes="0;1" dur="3s" begin="0s" repeatCount="indefinite"></animateTransform><path ng-attr-fill-opacity="{{config.opacity}}" ng-attr-fill="{{config.c4}}" d="M50 50L50 0A50 50 0 0 1 100 50Z" transform="rotate(270 50 50)" fill-opacity="0.8" fill="#32a0da"></path></g></g></g></g></svg><label class="loading-process">数据正在加载 ...</label></div></div>';
    $("body").append(loadingHtml);
});