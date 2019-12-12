L.Volte = L.Class.extend({
  /**
   * 初始化方法
   *
   * @param {echarts} ec
   * @private
   */
  initialize: function(div, opts) {
    try {
      L.Util.setOptions(this, opts);
      var me = this;
      var cfg = N.GIS_CFG;
      cfg.map.zoom = 14;
      me.nsnMap = L.nsnMap(div, cfg);
      me.map = me.nsnMap.getMap();
      me.loadingControl = L.Control.loading();
      me.map.addControl(me.loadingControl);
      
      L.Control.measureControl({position: 'topright'}).addTo(me.map);
    } catch (err) {
      alert(err);
    }
  },
  setPoints: function(points, title) {//加载点图层（无轨迹）
        try {
            var me = this;
            if (!me.pointsLayer) {
                me.pointsLayer = L.featureGroup();
                me.nsnMap.addOverlay({
                    layer: me.pointsLayer,
                    name: title,
                    show: true
                });
            } else {
                me.pointsLayer.clearLayers();
            }
            if (points && points.length > 0) {
                var msg = '';
                for (var i = 0, point; point = points[i]; i++) {
                    if (!point.latitude || !point.longitude || point.latitude == -1 || point.longitude == -1) {
                        continue;
                    }
                    //var lonLat = N.GPS.wgs2gcj(parseFloat(point.latitude), parseFloat(point.longitude));
                    var lonLat = L.latLng(parseFloat(point.latitude), parseFloat(point.longitude));
                    var msg = '';
                    for(var key in point){
                        msg += '<tr><td>' + key + '</td><td>' + point[key] + '</td></tr>';
                    }
                    var counts = Number(point['分钟']);
                    var color = me.getColor(Number(point['dura_rank']));
                    me.createMarker(color, lonLat, msg, null, counts-1, point.SEQ, point.ECI, me.pointsLayer, counts);
                }
                var bd = me.pointsLayer.getBounds();
                if (bd.isValid()) {
                    me.map.fitBounds(me.pointsLayer.getBounds());
                }
            }
        } catch (err) {
            alert(err);
        }
        this.loadingControl.hideIndicator();
  },
  setSectors1: function (cells, title) {//加载带轨迹的扇区图层
    var me = this;

    if (!me.sectorLayer) {
      me.sectorLayer = L.featureGroup();
      me.nsnMap.addOverlay({
        layer: me.sectorLayer,
        name: title,
        show: false
      });
    } else {
      me.sectorLayer.clearLayers();
    }

    if (cells && cells.features.length > 0) {
      var num = 0;//小区序号
      var prevPoint;//上一个点
      var sector = L.geoJson(cells, {
        style: function (feature) {
          var properties = feature.properties;
          var color = me.getColor(7);
          var opacity = properties['opacity']?properties['opacity']:0.2;
          return {
            color: color,
            opacity: opacity,
            fillColor: color,
            fillOpacity: opacity,
          };
        },
        onEachFeature: function (feature, layer) {
          num++;
          var properties = feature.properties;
          if (properties) {
            var pContent = me.buildContent(properties);
            layer.bindPopup(pContent.join(''), {maxWidth: 800, maxHeight: 350});
            var seq = properties['seq'];
            var eci = properties['eci'];
            layer.on('click', function(e) {
              if(seq && eci){
                $page.locateView.locateUser24GCellAbnormalEvent(seq, eci);
              }
            });
            //var currentPoint = N.GPS.wgs2gcj(parseFloat(properties.latitude), parseFloat(properties.longitude));//当前点
            var currentPoint = L.latLng(parseFloat(properties.latitude), parseFloat(properties.longitude));//当前点
            if (prevPoint) {//画轨迹（折线）
              if (currentPoint != prevPoint) {
                var latlngs = [prevPoint, currentPoint];
                var polyline = L.polyline(latlngs, {
                  opacity: 0.4,
                  weight: 2,
                  dashArray: [10, 5]
                }).setText('        \u2708      ', {
                  repeat: false,
                  center: true,
                  below: true,
                  offset: 6,
                  attributes: {
                    'font-weight': 'bold',
                    'font-size': '18',
                    fill: 'red'
                  }
                });
                me.sectorLayer.addLayer(polyline);
              }
            }
            var color = me.getColor(7);
            var mk = L.circleMarkerLabel(currentPoint, {
              radius: 12,
              fillColor: color,
              color: color,
              weight: 1,
              opacity: 0.8,
              fillOpacity: 0.5,
              text: num,
              fontSize: 12,
              'eci': eci,
              'content': pContent.join('')
            });
            me.sectorLayer.addLayer(mk);
            prevPoint = currentPoint;
          }
        }
      });
      me.sectorLayer.addLayer(sector);
      if (me.sectorLayer) {
        var bd = me.sectorLayer.getBounds();
        if (bd.isValid()) {
            me.map.fitBounds(me.sectorLayer.getBounds());
        }
      }
    }
  },
  setSectors2: function (cells, title) {//加载扇区图层
    var me = this;
    var center ;
  //  var control = me.createControl('bottomright');
   // console.log(control);
    if (!me.sectorLayer2) {
      me.sectorLayer2 = L.featureGroup();
      me.nsnMap.addOverlay({
        layer: me.sectorLayer2,
        name: title,
        show: true
      });
    } else {
      me.sectorLayer2.clearLayers();
    }

    if (cells && cells.features.length > 0) {
      var num = 0;
     
      var sector = L.geoJson(cells, {
        style: function (feature) {
          var properties = feature.properties;
          var color = me.getColor(properties['top_rank_of_xdr']);
          var opacity = properties['opacity']?properties['opacity']:0.2;
          return {
            color: color,
            opacity: opacity,
            fillColor: color,
            fillOpacity: opacity,
          };
        },
        onEachFeature: function (feature, layer) {
        	
          var properties = feature.properties;
          if(num==0){
        	  center=properties;
      	   }
          num++;
          console.log(center);
         // console.log(feature);
          if (properties) {
            var pContent = me.buildContent(properties);
            layer.bindPopup(pContent.join(''), {maxWidth: 800, maxHeight: 350});
            layer.on('click', function(e) {
            //  var seq = properties['seq'];
              var eci = properties['eci'];
              if(eci){
               // $page.locateView.locateUser24GCellAbnormalEvent(seq, eci);

            	  var result= $.inArray(eci, ecgilist);
            	  if(result=='-1'){
            		  ecgilist.push(eci);
            	  }else{
            		  ecgilist.splice(result,1);
            	  }
            	 
            	  $('#find').val($.unique(ecgilist).join(','))
            	  //control.update($.unique(ecgilist).join(','));
            	  
            	  console.log(ecgilist);
              }
            });
          }
        }
      });
      me.sectorLayer2.addLayer(sector);
      try {
    	  me.map.setView(L.latLng(center['latitude'],center['longitude']),15);
		}catch(err){
			if (me.sectorLayer2) {
		        var bd = me.sectorLayer2.getBounds();
		        if (bd.isValid()) {
		        	console.log(center);
		        me.map.fitBounds(me.sectorLayer2.getBounds());
		         
		        }
		      }
		}
      
    }
  },
  setSectors3: function (cells, title, lat, lon, preLonLat) {//加载扇区图层
    var me = this;
    if (!me.sectorLayer3) {
      me.sectorLayer3 = L.featureGroup();
      me.nsnMap.addOverlay({
        layer: me.sectorLayer3,
        name: title,
        show: true
      });
    } else {
      me.sectorLayer3.clearLayers();
    }
    //标记出工单发生的准确小区位置
    if(lat!='null' && lon!='null' && lat!=0 && lon!=0){
    	var icon = L.icon({
    	    iconUrl: '/optimization/static/images/marker-icon-red.png'
    	});
    	var water = L.marker([lat, lon], {icon: icon})
			    .bindPopup('lat: '+lat+' <br>lng: '+lon)
			    .openPopup();
		    me.sectorLayer3.addLayer(water);
    }
  //标记出工单发生的疑似小区位置
    if(preLonLat!='null' && preLonLat!=0){
    	var temp = lon+','+lat;
    	var lonLatArr = preLonLat.split(';');
    	for(var i=0; i<lonLatArr.length; i++){
    		var item = lonLatArr[i];
    		if(item!=temp){
    			var lonlat = item.split(',');
    			var water = L.marker([lonlat[1], lonlat[0]])
		    		    .bindPopup('lat: '+lat+' <br>lng: '+lon)
		    		    .openPopup();
		    	    me.sectorLayer3.addLayer(water);
    		}
    	}
    }
    
    if (cells && cells.features.length > 0) {
      var sector = L.geoJson(cells, {
        style: function (feature) {
          var properties = feature.properties;
          var color = me.getColor(properties['top_rank_of_stay']);
          var opacity = properties['opacity']?properties['opacity']:0.2;
          return {
            color: color,
            opacity: opacity,
            fillColor: color,
            fillOpacity: opacity,
          };
        },
        onEachFeature: function (feature, layer) {
          var properties = feature.properties;
          if (properties) {
            var pContent = me.buildTimeContent(properties);
            layer.bindPopup(pContent.join(''), {maxWidth: 800, maxHeight: 350});
            layer.on('click', function(e) {
              var seq = properties['seq'];
              var eci = properties['eci'];
              if(seq && eci){
                $page.locateView.locateUser24GCellAbnormalEvent(seq, eci);
              }
            });
          }
        }
      });
      me.sectorLayer3.addLayer(sector);
      if (me.sectorLayer3) {
        var bd = me.sectorLayer3.getBounds();
        if (bd.isValid()) {
          me.map.fitBounds(me.sectorLayer3.getBounds());
        }
      }
    }
  },
  setTracks: function(tracks,keywrd) {//加载轨迹图层
    try {
      var me = this;
      if (!me.tracksLayer) {
        me.tracksLayer = L.featureGroup();
        me.nsnMap.addOverlay({
          layer: me.tracksLayer,
          name: '小区轨迹',
          show: false
        });
      } else {
        me.tracksLayer.clearLayers();
      }

      if (tracks && tracks.length > 0) {
        var lastCi;
        var lastLonLat;
        var last = 0;
        var msg = '';
        var flagCount = 0;
        var cis = {};
        for (var i = 0, track; track = tracks[i]; i++) {
          if (!track.latitude || !track.longitude || track.latitude == -1 || track.longitude == -1) {
            continue;
          }
          var ci = track[keywrd];
          //if (ci != lastCi) {
          if (!cis[ci]) {
            //var lonLat = N.GPS.wgs2gcj(parseFloat(track.latitude), parseFloat(track.longitude));
            var lonLat = L.latLng(parseFloat(track.latitude), parseFloat(track.longitude));
            if (lastLonLat) {
              if (lastCi && lonLat != lastLonLat) {
                var latlngs = [lastLonLat, lonLat];
                var polyline = L.polyline(latlngs, {
                  opacity: 0.4,
                  weight: 2,
                  dashArray: [10, 5]
                }).setText('        \u2708      ', {
                  repeat: false,
                  center: true,
                  below: true,
                  offset: 6,
                  attributes: {
                    'font-weight': 'bold',
                    'font-size': '18',
                    fill: 'red'
                  }
                });
                me.tracksLayer.addLayer(polyline);
              }
            }
            var tmpTable = '';
            for(var key in track){
              tmpTable += '<tr><td>' + key + '</td><td>' + track[key] + '</td></tr>';
            }
            msg = tmpTable;
            flagCount = -1;
            lastCi = ci;
            lastLonLat = lonLat;
            last = i;
            //if (i == (tracks.length - 1)) {
              cis[lastCi] = {'ct':flagCount,'ll':lastLonLat,'msg':msg,'i':last, 'seq':track.SEQ, 'eci':track.ECI, 'abnormalNum':track['异常事件次数']};
            //}
          } else {
            var tmsg = cis[ci]['msg'];
            var tct = cis[ci]['ct'];
            var tmpTable = '';
            for(var key in track){
              tmpTable += '<tr><td>' + key + '</td><td>' + track[key] + '</td></tr>';
	        }
            tmsg = tmpTable;
            tct += -1;
            cis[ci]['msg'] = tmsg;
            cis[ci]['ct'] = tct;

            cis[ci]['seq'] = track.SEQ;
            cis[ci]['eci'] = track.ECI;
          }
        }
        var idx = 0;
        for(var ci in cis){
          var dt = cis[ci];
          var color = dt.ct <= 0 ? '#0000FF' : '#FF0000';
          me.createMarker(color, dt.ll, dt.msg, ci, idx++, dt.seq, dt.eci, me.tracksLayer, dt.abnormalNum);
        }
        var bd = me.tracksLayer.getBounds();
        if (bd.isValid()) {
          me.map.fitBounds(me.tracksLayer.getBounds());
        }
      }
    } catch (err) {
      alert(err);
    }
    this.loadingControl.hideIndicator();
  },
  createMarker: function(color, lastLonLat, msg, ci, i, seq, eci, layer, abnormalNum) {
    var mk = L.circleMarkerLabel(lastLonLat, {
      radius: 10,
      fillColor: color,
      color: color,
      weight: 1,
      opacity: 0.8,
      fillOpacity: 0.5,
      text: i + 1,
      fontSize: 12
    });
    var cont = [];
    cont.push("<table class='marker-properties'>");
    cont.push(msg);
    cont.push("</table>")
    mk.bindPopup(cont.join(''), { maxWidth: 600, maxHeight: 200 });
    mk.on('click', function(e) {
      //alert('纬度：' + e.latlng.lat + '\n经度：' + e.latlng.lng);
      if(seq && eci){
        $page.locateView.locateUser24GCellAbnormalEvent(seq, eci);
      }
    });
    layer.addLayer(mk);
  },
  createLegend: function(title, grades, position){
    var me = this;
    var legend = L.control({position: position});
    legend.onAdd = function (map) {
      var div = L.DomUtil.create('div', 'info legend'),
          labels = [];
      div.innerHTML = '<font style="font-weight: bold;">'+title+'</font><br>';
      for (var i = 0; i < grades.length; i++) {
        var grade = grades[i];
        var min = grade[0];
        var max = grade[1]!='~'?grade[1]:min+10;
        var text = min + "<~" + (grade[1]=='~'?'':('<='+max));
        var avg = (min+max)/2
        var color = me.getColor(avg);
        div.innerHTML += '<i style="background:' + color + '"></i> ' + text + '<br>';
      }
      return div;
    };
    //legend.addTo(me.map);
    return legend;
  },
  createControl: function(position){
	    var me = this;
	    console.log('运行到createControl');
	    var control = L.control({position: position});
	    control.onAdd = function (map) {
	   /*   var div = L.DomUtil.create('div', 'info legend'),
	          labels = [];
	      div.innerHTML = "<button id='ss'>搜索</button>";*/
	    	console.log('测试下onadd运行');
	       this._div = L.DomUtil.create('div', 'info');
	       this._div_1 = L.DomUtil.create('div', 'info');
			this.update();
			//this._div_1.innerHTML = "</span><button id='ss'>搜索</button>";
			return this._div;
	     // return div;
	    };
	    control.update = function (props) {
	    	/*var div = L.DomUtil.create('div', 'info');
	    	 div.innerHTML = "<p>选中的小区 </p> "+props+ "<button id='ss'>搜索</button>";
	    	return div;*/
	    	
	    	this._div.innerHTML = "选中的小区 <input type='text' id='find'/><button id='ss'>搜索</button>" ;
	    	
	    	$('#ss').on("click", function(e) {
            	if(ecgilist.length=='0'){
            		 layer.msg("未选中小区");
                     return;
            	}
            	$.unique(ecgilist);
    			console.log('地图点击事件');
    			console.log(ecgilist);
    			//console.log(res);
    			$.post("/optimization/mainAction/testList", {"ecgilist": JSON.stringify(ecgilist)}, function (res, status, xhr) {
    				console.log(status);
    				if(status=='success'){
    					ecgilist.length=0;
    				//	this._div.innerHTML = "<span>选中的小区  </span><button id='ss'>搜索</button>";
    				}
    				console.log(ecgilist);
    			});
    		
    		});
	    };
	    control.addTo(me.map);
	    return control;
	  },
  getColor: function(d){
	if(d){
	  d = parseFloat(d);
	}
    return ( 0<=d && d<= 5) ? '#00CD00' :
           ( 5<d && d<= 10) ? '#0000FF' :
           (10<d && d<= 20) ? '#FFFF00' :
           (20<d          ) ? '#FF0000' :
                              'FFFF00' ;
  },
  numberFixed:function(value){
      if (value == '' || value == 'null' || value == undefined || value == null) {
          return value;
      }
      return Number(value).toFixed(2);
  },
  buildContent: function(data) {
    var cont = [];
    if (data) {
      cont.push("<table style='font-size: 12px!important;width:200px;'>");
      if(data['entry_time']){
          cont.push('<tr><td>进入时间：</td><td>' + data['entry_time'] + '</td></tr>');
      }
      if(data['leave_time']){
          cont.push('<tr><td>离开时间：</td><td>' + data['leave_time'] + '</td></tr>');
      }
  //    cont.push('<tr><td>SEQ：</td><td>' + data['seq'] + '</td></tr>');
   //   cont.push('<tr><td>ECI：</td><td>' + data['eci'] + '</td></tr>');
    //  cont.push('<tr><td>ENB_ID：</td><td>' + data['enb_id'] + '</td></tr>');
      cont.push('<tr><td>CELL_ID：</td><td>' + data['cell_id'] + '</td></tr>');
      cont.push('<tr><td>小区名称：</td><td>' + data['cell_name'] + '</td></tr>');
      cont.push('<tr><td>异常事件次数：</td><td>' + data['top_rank_of_xdr'] + '</td></tr>');
    //  cont.push('<tr><td>用户覆盖电平：</td><td>' + this.numberFixed(data['avg_rsrp']) + '</td></tr>');
     // cont.push('<tr><td>用户信号质量：</td><td>' + this.numberFixed(data['avg_rsrq']) + '</td></tr>');
     // cont.push('<tr><td>用户上行功率余量：</td><td>' + this.numberFixed(data['avg_phr']) + '</td></tr>');
     // cont.push('<tr><td>用户上行干扰：</td><td>' + this.numberFixed(data['avg_received_power']) + '</td></tr>');
   //   cont.push('<tr><td>用户平均距离：</td><td>' + this.numberFixed(data['avg_distance']) + '</td></tr>');
      cont.push("</table>");
    }
    return cont;
  },
  buildTimeContent: function(data) {
	    var cont = [];
	    if (data) {
	      cont.push("<table style='font-size: 12px!important;width:200px;'>");
	      cont.push('<tr><td>SEQ：</td><td>' + data['seq'] + '</td></tr>');
	      cont.push('<tr><td>ECI:</td><td>' + data['eci'] + '</td></tr>');
	      cont.push('<tr><td>ENB_ID:</td><td>' + data['enb_id'] + '</td></tr>');
	      cont.push('<tr><td>CELL_ID：</td><td>' + data['cell_id'] + '</td></tr>');
	      cont.push('<tr><td>小区名称：</td><td>' + data['cell_name'] + '</td></tr>');
	      cont.push('<tr><td>longitude：</td><td>' + data['longitude'] + '</td></tr>');
	      cont.push('<tr><td>latitude：</td><td>' + data['latitude'] + '</td></tr>');
	      cont.push('<tr><td>驻留时长（分钟）：</td><td>' + this.numberFixed(data['length_of_stay']) + '</td></tr>');
	      cont.push("</table>");
	    }
	    return cont;
	  }
});
L.volte = function(div, opts) {
  return new L.Volte(div, opts);
};