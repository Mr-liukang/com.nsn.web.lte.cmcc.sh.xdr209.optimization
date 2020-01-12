package com.nsn.web.lte.cmcc.sh.xdr209.optimization.action;

import com.nokia.req.HttpRequestInter;
import com.nsn.gis.geojson.*;
import com.nsn.logger.Logger;
import com.nsn.web.lte.Const;
import com.nsn.web.lte.action.PageAction;
import com.nsn.web.lte.beans.User;
import com.nsn.web.lte.cache.CacheManager;
import com.nsn.web.lte.cmcc.anhui.CustomerServiceSystem.controller.DateFromHbase;
import com.nsn.web.lte.cmcc.anhui.CustomerServiceSystem.controller.SencodLineImp;
import com.nsn.web.lte.cmcc.sh.xdr209.optimization.action.bean.OperateConst;
import com.nsn.web.lte.db.*;
import com.nsn.web.lte.mvc.ReqContext;
/*import com.nsn.web.lte.sys.action.GoldAction;*/
import com.nsn.web.lte.utils.ExcelUtil;
import com.nsn.web.lte.utils.Ret;
import com.vividsolutions.jts.geom.Geometry;
import com.vividsolutions.jts.geom.Point;
import com.vividsolutions.jts.geom.Polygon;
import org.apache.commons.lang3.StringUtils;
import org.apache.commons.lang3.time.DateUtils;

import javax.servlet.http.HttpSession;
import java.io.BufferedReader;
import java.io.File;
import java.io.IOException;
import java.io.Reader;
import java.sql.Clob;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.text.DecimalFormat;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.*;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

public class MainAction {

	// 创建一次性7个线程池
	private static ExecutorService executor = Executors.newFixedThreadPool(7);

	//创建一次性定时执行线程池
	private static ScheduledExecutorService ses = Executors.newScheduledThreadPool(7);

	private static Map<String,List<Record>> uploadFailed = new HashMap<String, List<Record>>();

	private final String cacheName = "1h";

	private Logger log = Logger.getLogger(this.getClass());
	SimpleDateFormat df = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");


	/**
	 * 主页
	 *
	 * @param rc
	 * @return
	 */
	public String index(ReqContext rc) {
		return "optimization.html";
	}

	/**
	 * 导出
	 *
	 * @param rc
	 */
	public void exportExcel(ReqContext rc) {
		String seq = rc.param("seq");
		Integer key = rc.paramToInt("key");
		List<Record> exportList = new ArrayList<Record>();
		switch (key) {
			// 定界具体输出
			case 0:
				//exportList = Db.use().query(SqlMap.get("CONFIRM_CAUSE_LIST").parse(rc.params()));
				exportList = specificOutput(rc);
				break;
			// 异常事件定位详情
			case 1:
				exportList = Db.use().query(SqlMap.get("LOCATE_XDR_PAGE").parse(rc.params()));
				break;
			// 定位分类
			case 2:
				exportList = Db.use().query(SqlMap.get("COMP_LOCATE_CATEGPRY").parse(rc.params()));
				break;
			// 投诉小区轨迹
			case 3:
				exportList = Db.use().query(SqlMap.get("COMP_LOCATE_CELL").parse(rc.params()));
				break;
			// 投诉用户xdr详单
			case 4:
				exportList = Db.use().query(SqlMap.get("DATA_ANALYSE_XDR").parse(rc.params()));
				break;
			// 经过小区OMC指标
			case 5:
				exportList = Db.use().query(SqlMap.get("DATA_ANALYSE_OMC").parse(rc.params()));
				break;
			// 经过小区告警信息
			case 6:
				exportList = Db.use().query(SqlMap.get("DATA_ANALYSE_CELLWARN").parse(rc.params()));
				break;
			// UEMR导出
			case 7:
				Map<String, Object> param = rc.params();
				param.put("stime", "");
				exportList = Db.use().query(SqlMap.get("DATA_UEMR_XDR").parse(param));
				break;
			// 导出工单结果
			case 8:{
				String[] seqs = seq.split(",");//字符串过长，需分段查询
				StringBuffer sql = new StringBuffer();
				if(seqs.length>1000){
					List<String> list = Arrays.asList(seqs);
					int splitSize = 800;
					int totalSize = list.size();
					int count = (totalSize % splitSize == 0) ? (totalSize / splitSize) : (totalSize/splitSize+1);
					String _key = "";
					for (int i = 0; i<count; i++) {
						List<String> rows = list.subList(i * splitSize, (i == count-1) ? totalSize-1 : splitSize*(i + 1)-1);
						if(i>0){
							_key = " or";
						}
						sql.append(_key).append(" seq in("+rows.toString().replace("[","").replace("]","")+")");
					}
				}else{
					sql.append(" seq in("+rc.param("seq")+")");
				}
				Map<String, Object> map = rc.params();
				map.remove("seq");
				map.put("seq", sql.toString());
				List<Record> list = Db.use().query(SqlMap.get("ORDER_RECORDS_RESULTS").parse(map));
				try{
					for(int i=0; i<list.size(); i++){
						Record r = list.get(i);

						String str0 = ClobToString(r.get("主因概述"));
						r.remove("主因概述");
						r.set("主因概述", str0);

						String str1 = ClobToString(r.get("涉及主要网元详情"));
						r.remove("涉及主要网元详情");
						r.set("涉及主要网元详情", str1);

						String str2 = ClobToString(r.get("投诉建议"));
						r.remove("投诉建议");
						r.set("投诉建议", str2);

						exportList.add(r);
					}
				}catch(Exception e) {
					e.printStackTrace();
				}
				break;}
			// 导出用户2/4G网络图表呈现
			case 9:
				exportList = locateUser24GViewLine(rc);
				break;
			default:
				break;
		}
		PageAction pageAction = new PageAction();
		pageAction.exportList(rc, exportList);
	}
	/**
	 * 详单导出（多表多sheet）
	 *
	 * @param rc
	 */
	public void exportDetail(ReqContext rc) {
		String seq = rc.param("seq");
		String fileName = rc.param("fileName");
		List<String> sheetNameList = new ArrayList<String>();
		List<List<Record>> sheetDataList = new ArrayList<List<Record>>();

		PageAction pageAction = new PageAction();
		if("Complain_allcontents".equals(fileName)){
			sheetNameList.add("AbnormalCases");
			sheetNameList.add("AbnormalXdr");
			sheetNameList.add("EventsCategory");
			sheetNameList.add("CellsOfComplaints");
			sheetNameList.add("UemrDetails");
			sheetNameList.add("XdrDetailsForComplaints");
			sheetNameList.add("OmcIndecateViaCells");

			sheetDataList.add(Db.query("select * from v_complain_dj_detail t where t.seq="+seq));
			sheetDataList.add(Db.query("select * from v_complain_dw_detail t where t.seq="+seq));
			sheetDataList.add(Db.query("select * from v_complain_dw_maincause t where t.seq="+seq));
			sheetDataList.add(Db.query("select * from V_COMPLAIN_position_gis_cell t where t.seq="+seq));
			sheetDataList.add(Db.query("select * from xdr_ue_mr_"+seq));
			sheetDataList.add(Db.query("select * from V_COMPLAIN_data_list t where t.seq="+seq));
			sheetDataList.add(Db.query("select * from V_COMPLAIN_OMC_CELL_H t where t.seq="+seq));

			pageAction.exportListExt(rc, fileName+"_"+seq, sheetDataList, sheetNameList);

		}else if("Eventslist_original".equals(fileName)){

			sheetNameList.add("XDR_UE_MR");
			sheetNameList.add("XD_S1_U_HTTP");
			sheetNameList.add("XD_S1_U_VIDEO");
			sheetNameList.add("XD_S1_U_IM");
			sheetNameList.add("XD_S1_U_COMMON");
			sheetNameList.add("XD_S1_ MME");
			sheetNameList.add("GN_PDP_EVENT");

			sheetDataList.add(Db.query("select * from xdr_ue_mr_"+seq));
			sheetDataList.add(Db.query("select * from XDR_S1_U_HTTP_"+seq));
			sheetDataList.add(Db.query("select * from XDR_S1_U_VIDEO_"+seq));
			sheetDataList.add(Db.query("select * from XDR_S1_U_IM_"+seq));
			sheetDataList.add(Db.query("select * from XDR_S1_U_COMMON_"+seq));
			sheetDataList.add(Db.query("select * from XDR_S1_MME_"+seq));
			sheetDataList.add(Db.query("select * from GN_PDP_EVENT_"+seq));

			pageAction.exportListExt(rc, fileName+"_"+seq, sheetDataList, sheetNameList);
		}
	}

	/***************************** 主页查询/批量导入/单次查询记录 *****************************/
	public Ret batchProcess(ReqContext rc) {
		String value = rc.sessionAttr("HANDLE_PROCESS");
		Float process = 0f;
		if(value != null) {
			String[] listProcess = value.split(":");
			if(StringUtils.equals("0", listProcess[1])) {
				process = 0f;
			}else {
				process = Float.parseFloat(new DecimalFormat("0.00").format((float)Integer.parseInt(listProcess[1]) / Integer.parseInt(listProcess[0])));
			}
		}
		process = process*100;
		return Ret.ok("process",process);
	}

	/**
	 * 批量导入查询
	 *
	 * @param rc (文件.xlsx)
	 * @return
	 */
	public Ret batchUpload(ReqContext rc) {
		List<Record> failList = new ArrayList<Record>();
		String userId = ((User)rc.sessionAttr(Const.LOGIN_USER)).getId();
		uploadFailed.remove(userId);
		String query_id = UUID.randomUUID().toString();
		int resNum = 0,failNum = 0;
		String msg = "";
		File file = rc.file();
		List<Record> list = ExcelUtil.readExcel(file);
		if (list != null && list.size() > 0) {
			Record item = list.get(0);
			if(!item.hasKey("用户号码") || !item.hasKey("投诉时间") || !item.hasKey("回溯小时") || !item.hasKey("查询工单") || !item.hasKey("经纬度") || !item.hasKey("执行时间")){
				return Ret.fail("msg", "模板表头字段名称错误，请检查");
			}
			for (int i=0;i<list.size();i++) {
				rc.sessionAttr("HANDLE_PROCESS", list.size()+":"+i);
				Record rec = list.get(i);
				String imsi = rec.getStr("用户号码");
				String sdate = rec.getStr("投诉时间");
				String stime = rec.getStr("回溯小时");
				String sheetno = rec.getStr("查询工单");
				String pre_lonlat = rec.getStr("经纬度");
				String exectime = rec.getStr("执行时间");

				String serv_order = rec.getStr("客服工单编号");
				String cplain_type = rec.getStr("报障归类");
				String customer_name = rec.getStr("客户姓名");
				String cplain_descrip = rec.getStr("投诉内容");
				String addr_rd1 = rec.getStr("故障交叉路名1");
				String addr_rd2 = rec.getStr("故障交叉路名2");
				String addr_identity = rec.getStr("识别位置");
				String area = rec.getStr("故障行政区");

				// 时间为空则默认回溯5小时
				if (StringUtils.equals(stime, "null") || StringUtils.isEmpty(stime)) {
					stime = "5";
				}
				if (imsi == null || StringUtils.equals(imsi, "null") || StringUtils.isEmpty(imsi)) {
					rec.set("错误原因", "查询号码为空");
					rec.set("解决参考", "填写正确查询号码");
					failNum++;
					failList.add(rec);
					continue;
				}
				if (sdate == null || StringUtils.equals(sdate, "null") || StringUtils.isEmpty(sdate)) {
					rec.set("错误原因", "投诉时间为空");
					rec.set("解决参考", "填写正确投诉时间,格式为:1970-01-01 00:00:00");
					failNum++;
					failList.add(rec);
					continue;
				}
				if (sheetno == null || StringUtils.equals(sheetno, "null") || StringUtils.isEmpty(sheetno)) {
					rec.set("错误原因", "查询工单为空");
					rec.set("解决参考", "填写投诉号码对应的工单号");
					failNum++;
					failList.add(rec);
					continue;
				}
				rc.attr("imsi", imsi);
				rc.attr("sdate", sdate);
				rc.attr("stime", stime);
				rc.attr("sheetno", sheetno);
				rc.attr("pre_lonlat",pre_lonlat);
				rc.attr("exectime", exectime);
				rc.attr("query_id", query_id);

				rc.attr("serv_order", serv_order);
				rc.attr("cplain_type", cplain_type);
				rc.attr("customer_name", customer_name);
				rc.attr("cplain_descrip", cplain_descrip);
				rc.attr("addr_rd1",addr_rd1);
				rc.attr("addr_rd2", addr_rd2);
				rc.attr("addr_identity", addr_identity);
				rc.attr("area", area);

				log.info("");
				log.info("excel record");
				log.info("---------------------------------------------------------------------------");
				log.info(imsi + "," + sdate + "," + stime + "," + sheetno + "," + pre_lonlat + "," + exectime);
				log.info("---------------------------------------------------------------------------");
				log.info("");

				Ret ret = initQuery(rc);
				if (ret.isFail()) {
					rec.set("错误原因", ret.get("msg"));
					rec.set("解决参考", ret.get("resolve"));
					failNum++;
					failList.add(rec);
				} else {
					resNum++;
				}
			}
			uploadFailed.put(userId, failList);
			//处理完成置0
			rc.sessionAttr("HANDLE_PROCESS", "0:0");
		} else {
			return Ret.fail("msg", "文件为空或者无法读取");
		}

		if (failNum > 0) {
			msg = "本次共成功导入"+resNum+"个工单，失败"+failNum+"个工单,需要下载失败工单请点击“确定”，不下载则点击“取消”";
			Map<String, String> resultMap = new HashMap<String, String>();
			resultMap.put("query_id", query_id);
			resultMap.put("msg", msg);
			return Ret.fail("msg", resultMap);
		}
		return Ret.ok("query_id", query_id);
	}

	public void downfail(ReqContext rc) {
		PageAction pageAction = new PageAction();
		String userId = ((User)rc.sessionAttr(Const.LOGIN_USER)).getId();
		pageAction.exportList(rc, uploadFailed.get(userId));
	}


	/**
	 * 单次查询
	 * @param rc
	 * @return
	 */
	public Ret addQuery(ReqContext rc) {
		String imsi = rc.param("imsi");
		String sdate = rc.param("sdate");
		String stime = rc.param("stime");
		String pre_lonlat = rc.param("pre_lonlat");
		String query_id = UUID.randomUUID().toString();

		rc.attr("imsi", imsi);
		rc.attr("sdate", sdate);
		rc.attr("stime", stime);
		rc.attr("pre_lonlat", pre_lonlat);
		rc.attr("query_id", query_id);
		Ret ret = initQuery(rc);
		if (ret.isOk()) {
			return Ret.ok("query_id", query_id);
		}
		return ret;
	}

	/**
	 * 批量/单次投诉查询 - 公用查询方法
	 *
	 * @return
	 * @throws ParseException
	 */
	public Ret initQuery(ReqContext rc) {
		String tmpId = UUID.randomUUID().toString();
		User user = (User) rc.sessionAttr(Const.LOGIN_USER);
		String imsimsisdn = rc.attr("imsi");
		String endtime = rc.attr("sdate");
		Integer stime = Integer.parseInt(rc.attr("stime"));
		String sheetno = rc.attr("sheetno");
		String pre_lonlat = rc.attr("pre_lonlat");
		String exectime = rc.attr("exectime");
		String query_id = rc.attr("query_id");

		String serv_order = rc.attr("serv_order");
		String cplain_type = rc.attr("cplain_type");
		String customer_name = rc.attr("customer_name");
		String _cplain_descrip = rc.attr("cplain_descrip");
		String cplain_descrip = ( !"".equals(_cplain_descrip) && _cplain_descrip!=null ) ? ((_cplain_descrip.length()>2000)?_cplain_descrip.substring(0, 1999):_cplain_descrip):"";
		String addr_rd1 = rc.attr("addr_rd1");
		String addr_rd2 = rc.attr("addr_rd2");
		String addr_identity = rc.attr("addr_identity");
		String area = rc.attr("area");

		if (exectime == null || StringUtils.equals(exectime, "null") || StringUtils.isEmpty(exectime)) {
			exectime = "";
		}
		String texecutetime="",tstarttime = "";
		try {
			tstarttime = df.format(DateUtils.addHours(DateUtils.parseDate(endtime, "yyyy-MM-dd HH:mm:ss"), -stime));
		} catch (ParseException e) {
			saveQueryRecord(user, null, query_id, imsimsisdn, imsimsisdn, tstarttime, endtime, stime, sheetno,pre_lonlat, exectime, OperateConst.ABNORMAL,tmpId,"日期格式错误,格式应为 1970-01-01 00:00:00",
					serv_order, cplain_type, customer_name, cplain_descrip, addr_rd1, addr_rd2, addr_identity, area);
			return Ret.fail("msg", "日期格式错误,格式应为 1970-01-01 00:00:00").set("query_id", query_id);
		}
		final String starttime = tstarttime;
		if(StringUtils.isNotEmpty(exectime)) {
			try {
				texecutetime = df.format(DateUtils.parseDate(exectime, "yyyy-MM-dd HH:mm:ss"));
			} catch (ParseException e) {
				saveQueryRecord(user, null, query_id, imsimsisdn, imsimsisdn, starttime, endtime, stime, sheetno,pre_lonlat, exectime, OperateConst.ABNORMAL,tmpId,"定时执行时间格式错误,格式应为 1970-01-01 00:00:00",
						serv_order, cplain_type, customer_name, cplain_descrip, addr_rd1, addr_rd2, addr_identity, area);
				return Ret.fail("msg", "定时执行时间格式错误,格式应为 1970-01-01 00:00:00").set("query_id", query_id);
			}
		}
		final String executetime = texecutetime;
		if (imsimsisdn == null || !StringUtils.isNumeric(imsimsisdn)) {
			saveQueryRecord(user, null, query_id, imsimsisdn, imsimsisdn, starttime, endtime, stime, sheetno,pre_lonlat, exectime, OperateConst.ABNORMAL,tmpId,"查询的用户号码不规范",
					serv_order, cplain_type, customer_name, cplain_descrip, addr_rd1, addr_rd2, addr_identity, area);
			return Ret.fail("msg", "查询的用户号码不规范").set("query_id", query_id);
		}
		// 手机号码是以0或者2开头，只做入库，不允许查询
		if ("0".equals(imsimsisdn.subSequence(0, 1))
				|| "2".equals(imsimsisdn.subSequence(0, 1))
				|| "860".equals(imsimsisdn.subSequence(0, 3))
				|| "862".equals(imsimsisdn.subSequence(0, 3)) ) {
			saveQueryRecord(user, null, query_id, imsimsisdn, imsimsisdn, starttime, endtime, stime, sheetno,pre_lonlat, exectime, OperateConst.PHONE_NUMBER_ABNORMAL,tmpId,"0或2开头的用户号码",
					serv_order, cplain_type, customer_name, cplain_descrip, addr_rd1, addr_rd2, addr_identity, area);
			return Ret.fail("msg", "用户号码异常").set("query_id", query_id);
		}
		imsimsisdn = imsimsisdn.replace(" ", "");
		String timsi = "";
		String tmsisdn = "";
		// 手机号没有86,则对手机号加86处理
		if (StringUtils.length(imsimsisdn) != 15) {
			tmsisdn = imsimsisdn.startsWith("86") ? imsimsisdn : "86" + imsimsisdn;
		} else {
			timsi = imsimsisdn;
		}
		final String imsi = timsi;
		final String msisdn = tmsisdn;

		String userName = user.getAccount();
		if (!"root".equals(userName) && null != sheetno && StringUtils.isNotEmpty(sheetno)) {
			rc.attr("orderno", sheetno);
			rc.attr("customno", imsimsisdn);
			rc.attr("start", starttime);
			rc.attr("end", endtime);
			rc.attr("title", "LTE投诉优化");
	/*		Ret ret = new GoldAction().check(rc);
			if (ret.isFail()) {
				Integer number = (Integer) ret.get("no");
				String resolve = ret.getStr("msg");
				Integer res = 0;
				String msg = "";
				switch (number) {
					case 1:
						res = OperateConst.SHEETINVALID;
						msg = "工单类型不支持";
						break;
					case 2:
						res = OperateConst.SHEETEXPIRE;
						msg = "工单已经过期";
						break;
					case 3:
						res = OperateConst.SHEETOVERFLOW;
						msg = "非可查询时段";
						break;
					case 4:
						res = OperateConst.SHEETDISMATCH;
						msg = "号码工单不符";
						break;
					case 5:
						res = OperateConst.SHEETRESPFAIL;
						msg = "工单服务异常";
						break;
					default:
						break;
				}
				// 获取一个可用序列
				String seq = "";
				Record seqRec = Db.read("select seq_complain.nextval seq from dual");
				if (seqRec != null) {
					seq = seqRec.getStr("seq");
				}
				saveQueryRecord(user, seq, query_id, imsi, msisdn, starttime, endtime, stime, sheetno,pre_lonlat, exectime, res ,tmpId,msg,serv_order, cplain_type, customer_name, cplain_descrip, addr_rd1, addr_rd2, addr_identity, area);
				return Ret.fail("msg", msg).set("no",res).set("resolve", resolve);
			}*/
		}

		//定时执行时间存在,则按照定时时间执行
		if(StringUtils.isNotEmpty(exectime)) {
			try {
				long delay = df.parse(exectime).getTime() - System.currentTimeMillis();
				if(delay > 0) {
					ses.schedule(new Runnable() {
						@Override
						public void run() {
							execute(user, imsi, msisdn, starttime, endtime, stime, sheetno,pre_lonlat, executetime, query_id, tmpId, "export", serv_order, cplain_type, customer_name, cplain_descrip, addr_rd1, addr_rd2, addr_identity, area);
						}
					}, delay, TimeUnit.MILLISECONDS);
					saveQueryRecord(user, null, query_id, imsi, msisdn, starttime, endtime, stime, sheetno,pre_lonlat, exectime, OperateConst.QUEUED,tmpId,"",
							serv_order, cplain_type, customer_name, cplain_descrip, addr_rd1, addr_rd2, addr_identity, area);
					return Ret.ok("msg", "定时执行").set("query_id", query_id);
				}
				saveQueryRecord(user, null, query_id, imsi, msisdn, starttime, endtime, stime, sheetno,pre_lonlat, exectime, OperateConst.QUEUED,tmpId,"",
						serv_order, cplain_type, customer_name, cplain_descrip, addr_rd1, addr_rd2, addr_identity, area);
			} catch (Exception e) {
				e.printStackTrace();
			}
		}
		execute(user, imsi, msisdn, starttime, endtime, stime, sheetno, pre_lonlat, executetime, query_id, tmpId, "export", serv_order, cplain_type, customer_name, cplain_descrip, addr_rd1, addr_rd2, addr_identity, area);
		return Ret.ok();
	}

	private Record saveQueryRecord(User user, String seq, String query_id, String imsi, String msisdn, String starttime, String endtime, Integer stime, String sheetno,String pre_lonlat, String executetime,int status, String tmpid,String reasons,
								   String serv_order, String cplain_type, String customer_name, String cplain_descrip, String addr_rd1, String addr_rd2, String addr_identity, String area) {
		Record rec = new Record();
		if (seq != null && !StringUtils.isEmpty(seq)) {
			rec.set("seq", seq);
		}
		rec.set("query_id", query_id);
		rec.set("imsi", imsi);
		rec.set("msisdn", msisdn);
		rec.set("stime", stime);
		rec.set("sheetno", sheetno);
		rec.set("pre_lonlat", pre_lonlat);
		rec.set("tmpid", tmpid);
		rec.set("user_id", user.getId());
		rec.set("user_name", user.getName());
		rec.set("exec_time", executetime);
		rec.set("gd_failue_cause",reasons);

		rec.set("serv_order", serv_order);
		rec.set("cplain_type", cplain_type);
		rec.set("customer_name", customer_name);
		rec.set("cplain_descrip", cplain_descrip);
		rec.set("addr_rd1", addr_rd1);
		rec.set("addr_rd2", addr_rd2);
		rec.set("addr_identity", addr_identity);
		rec.set("area",area);
		try {
			rec.set("start_time", new Timestamp(df.parse(starttime).getTime()));
		} catch (Exception e) {
			rec.set("start_time", null);
		}
		try {
			rec.set("end_time", new Timestamp(df.parse(endtime).getTime()));
		} catch (Exception e) {
			rec.set("end_time", null);
		}
		if (status != OperateConst.QUEUED && status != OperateConst.DATAOK && status != OperateConst.DBPROCESS) {
			rec.set("check_end", new Timestamp(new Date().getTime()));
		}
		rec.set("action_time", 0);
		rec.set("status", status);
		try {
			Db.save("RPT_COMPLAINT_IMSI_LIST", rec);
		} catch (Exception e) {
			e.printStackTrace();
		}
		return rec;
	}

	/**
	 * 通过query_id查询单次投诉记录
	 *
	 * @param rc
	 * @return
	 */
	public List<Record> queryRecordPage(ReqContext rc) {
		//Page<?> pageParam = rc.page();
		String seq = rc.param("seq");
		String queryId = rc.param("queryId");
		Map<String, Object> params = rc.params();
		if (StringUtils.isNotEmpty(seq)) {
			seq = " and seq = " + seq;
		}
		if (StringUtils.isNotEmpty(queryId)) {
			queryId = " and query_id = '" + queryId + "'";
		}
		params.put("seq", seq);
		params.put("queryId", queryId);
		return Db.query(SqlMap.get("QUERY_RECORD_PAGE").parse(params));
	}

	/***************************** 工单查询 *****************************/

	public List<Record> queryOrderNoPage(ReqContext rc) {
		
		
		
		//Page<?> pageParam = rc.page();
		Map<String, Object> params = rc.params();

		String user = rc.param("orderUsers");
		String status = rc.param("orderStatus");
		String imsiMsisdn = rc.param("imsiMsisdn");
		//String checkStart = rc.param("checkStart");
		String checkEnd = rc.param("checkEnd");
		String startTime = rc.param("startTime");
		String area = rc.param("area");

		if (StringUtils.isNotEmpty(user)) {
			user = " and user_id = " + user;
		}
		if (StringUtils.isNotEmpty(status)) {
			status = " and status = " + status;
		}
		if (StringUtils.isNotEmpty(imsiMsisdn)) {
			imsiMsisdn = " and (imsi = '" + imsiMsisdn + "' or msisdn = '"+imsiMsisdn+"')";
		}
		/*if (StringUtils.isNotEmpty(checkStart)) {
			checkStart = " and check_start >= to_date('" + checkStart + "','yyyy-mm-dd hh24:mi:ss')";
		}
		if (StringUtils.isNotEmpty(checkEnd)) {
			checkEnd = " and check_start <= to_date('" + checkEnd + "','yyyy-mm-dd hh24:mi:ss')";
		}*/
		if (StringUtils.isNotEmpty(startTime)) {
			//to_date(' 
			startTime = " and start_time >= " + startTime/* + "','yyyy-mm-dd hh24:mi:ss')"*/;
		}
		if (StringUtils.isNotEmpty(area)) {
			area = " and area = '" + area + "'";
		}

		params.put("user", user);
		params.put("status", status);
		params.put("imsiMsisdn", imsiMsisdn);
	//	params.put("checkStart", checkStart);
		//params.put("checkEnd", checkEnd);
		//params.put("startTime", startTime);
		params.put("area", area);

		//return Db.page(SqlMap.get("QUERY_ORDERNO_PAGE").parse(params), pageParam);
		return Db.query(SqlMap.get("QUERY_ORDERNO_PAGE").parse(params));
	}

	public List<Record> orderUserGrouped(ReqContext rc) {
		HttpSession ssn = rc.session();
		User user = (User) ssn.getAttribute(Const.LOGIN_USER);
		List<Record> list = Db.query(SqlMap.getSql("ORDER_USER_GROUPED"));
		for(int i=0; i<list.size(); i++){
			Record record = list.get(i);
			if(user.getId().equals(record.get("user_id"))){
				record.set("selected", true);
			}else{
				record.set("selected", false);
			}
		}
		return list;
	}

	/**
	 * 工单统计->本月投诉走势（最近30天投诉趋势）
	 *
	 * @param rc
	 * @return
	 */
	public Ret queryOrderNoTrend(ReqContext rc) {
		Map<String, Object> params = rc.params();

		String user = rc.param("orderUsers");
		String status = rc.param("orderStatus");
		String imsiMsisdn = rc.param("imsiMsisdn");
		String checkStart = rc.param("checkStart");
		String checkEnd = rc.param("checkEnd");
		String startTime = rc.param("startTime");
		String area = rc.param("area");

		if (StringUtils.isNotEmpty(user)) {
			user = " and user_id = " + user;
		}
		if (StringUtils.isNotEmpty(status)) {
			status = " and status = " + status;
		}
		if (StringUtils.isNotEmpty(imsiMsisdn)) {
			imsiMsisdn = " and (imsi = '" + imsiMsisdn + "' or msisdn = '"+imsiMsisdn+"')";
		}
		/*if (StringUtils.isNotEmpty(checkStart)) {
			checkStart = " and check_start >= to_date('" + checkStart + "','yyyy-mm-dd hh24:mi:ss')";
		}
		if (StringUtils.isNotEmpty(checkEnd)) {
			checkEnd = " and check_start <= to_date('" + checkEnd + "','yyyy-mm-dd hh24:mi:ss')";
		}*/
		if (StringUtils.isNotEmpty(startTime)) {
			startTime = " and start_time >= to_date('" + startTime + "','yyyy-mm-dd hh24:mi:ss')";
		}
		if (StringUtils.isNotEmpty(area)) {
			area = " and area = '" + area + "'";
		}

		params.put("user", user);
		params.put("status", status);
		params.put("imsiMsisdn", imsiMsisdn);
		params.put("checkStart", checkStart);
		params.put("checkEnd", checkEnd);
		params.put("startTime", startTime);
		params.put("area", area);

		return Ret.ok("data", Db.use().query(SqlMap.get("NEAR30_COMPLAINT_NUMS").parse(params)));
	}

	/**
	 * 删除工单记录
	 *
	 * @param rc
	 * @return
	 */
	public Ret delCompsBySeqs(ReqContext rc) {
		HttpSession ssn = rc.session();
		User user = (User) ssn.getAttribute(Const.LOGIN_USER);
		String userName = user.getAccount();
		if("root".equals(userName)){
			String tmpids = rc.param("tmpids");
			return Ret.ok("data", Db.update("delete from RPT_COMPLAINT_IMSI_LIST where tmpid in (" + tmpids + ")"));
		}else{
			return Ret.ok("data", "no-auth");
		}
	}

	/***************************** 投诉定界 *****************************/
	// 用户信息
	public Ret userInfo(ReqContext rc) {
		long startTime = new Date().getTime();
		Record userInfo = null;
		try{
			userInfo = Db.read(SqlMap.get("COMP_CONFIRM_USERINFO").parse(rc.params()));
		}catch(Exception e) {
			e.printStackTrace();
		}
		long endTime = new Date().getTime();
		log.info("Method userInfo() 投诉定界-->用户信息 execution time:"+(endTime - startTime)+"ms");
		return Ret.ok("data", userInfo);
	}
	// APP使用情况
	public Ret appUsage(ReqContext rc) {
		long startTime = new Date().getTime();
		List<Record>  appInfo = null;
		try{
			appInfo = Db.query(SqlMap.get("COMP_CONFIRM_APPINFO").parse(rc.params()));
		}catch(Exception e) {
			e.printStackTrace();
		}
		long endTime = new Date().getTime();
		log.info("Method appUsage() 投诉定界-->APP使用情况 execution time:"+(endTime - startTime)+"ms");
		return Ret.ok("data", appInfo);
	}
	// 指标快照
	public Ret indexSnapshot(ReqContext rc) {
		long startTime = new Date().getTime();
		Record snapShot = null;
		try{
			snapShot = Db.read(SqlMap.get("COMP_CONFIRM_SNAPSHOT").parse(rc.params()));
		}catch(Exception e) {
			e.printStackTrace();
		}
		long endTime = new Date().getTime();
		log.info("Method indexSnapshot() 投诉定界-->指标快照 execution time:"+(endTime - startTime)+"ms");
		return Ret.ok("data", snapShot);
	}
	// 诊断定界
	public Object diagnosticDelimitation(ReqContext rc) {
		String imsi = rc.param("imsi");
		String sdate = rc.param("sdate");
		SencodLineImp sl = new SencodLineImp();
		Object secondLine = null;
		try {
			 secondLine = sl.secondLine(imsi, "day", sdate, "");
			// secondLine = sl.secondLine("18325513100", "day", "2019-09-27", "");
		} catch (ParseException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
		//log.info("Method diagnosticDelimitation() 投诉定界-->诊断定界 execution time:"+(endTime - startTime)+"ms");
//		return Ret.ok("data", allCause);
		return secondLine;
	}
	// 定界主因
	public Ret mainCauseDelimitation(ReqContext rc) {
		long startTime = new Date().getTime();
		Record mainCause = null;
		try{
			mainCause = Db.read(SqlMap.get("COMP_CONFIRM_MAINCAUSE").parse(rc.params()));
		}catch(Exception e) {
			e.printStackTrace();
		}
		long endTime = new Date().getTime();
		log.info("Method mainCauseDelimitation() 投诉定界-->定界主因 execution time:"+(endTime - startTime)+"ms");
		return Ret.ok("data", mainCause);
	}
	// 感知标签
	public Ret perceptionLabel(ReqContext rc) {
		long startTime = new Date().getTime();
		Record anaLabel = null;
		try{
			anaLabel = Db.read(SqlMap.get("COMP_CONFIRM_ANALABEL").parse(rc.params()));
		}catch(Exception e) {
			e.printStackTrace();
		}
		long endTime = new Date().getTime();
		log.info("Method perceptionLabel() 投诉定界-->感知标签 execution time:"+(endTime - startTime)+"ms");
		return Ret.ok("data", anaLabel);
	}
	// 流程分析
	public Ret processAnalysis(ReqContext rc) {
		long startTime = new Date().getTime();
		Record againstAll = null;
		try{
			againstAll = Db.read(SqlMap.get("COMP_CONFIRM_AGAINSTALL").parse(rc.params()));
		}catch(Exception e) {
			e.printStackTrace();
		}
		long endTime = new Date().getTime();
		log.info("Method processAnalysis() 投诉定界-->流程分析 execution time:"+(endTime - startTime)+"ms");
		return Ret.ok("data", againstAll);
	}
	// 异常事件分布
	public Ret abnormalEvents(ReqContext rc) {
		long startTime = new Date().getTime();
		Map<String, Object> params = rc.params();
		
		String sdate = rc.param("sdate");
		String msisdn = rc.param("msisdn");
		
		String sd = sdate.replaceAll("-", "");
		System.out.println("异常事件 时间 sd "+sd);
		params.put("sdate", sd);
		params.put("msisdn",msisdn);
		List<Record> causeLine = null;
		try{
			causeLine = Db.query(SqlMap.get("CONFIRM_CAUSE_LINE").parse(params));
		}catch(Exception e) {
			e.printStackTrace();
		}
		long endTime = new Date().getTime();
		log.info("Method abnormalEvents() 投诉定界-->异常事件分布 execution time:"+(endTime - startTime)+"ms");
		return Ret.ok("data", causeLine);
	}
	// 具体输出
	public List specificOutput(ReqContext rc) {
		String imsi = rc.param("imsi");
		String sdate = rc.param("sdate");
		String type= rc.param("type");
		System.out.println("type "+type);
		DateFromHbase dfh = new DateFromHbase();
		List<Map<String,Object>> httpSpecDetail =  new ArrayList();
		if("http".equals(type)) {
		 httpSpecDetail = dfh.getHttpSpecDetail(sdate, imsi,"rpt_cus_ser_http_spec_detail");
		}else {
		 httpSpecDetail = dfh.getS1mmSpecDetail(sdate, imsi,"rpt_cus_ser_signaling_detail");
		}
		/*long startTime = new Date().getTime();
		List<Record> output = null;
		try{
			output = Db.query(SqlMap.get("CONFIRM_CAUSE_LIST").parse(rc.params()));
		}catch(Exception e){
			e.printStackTrace();
		}
		long endTime = new Date().getTime();
		log.info("Method specificOutput() 投诉定界-->具体输出 execution time:"+(endTime - startTime)+"ms");*/
		return httpSpecDetail;
	}



	/***************************** 投诉定位 *****************************/
	// 诊断定位主因
	public Ret diagnosisLocationMainCause(ReqContext rc) {
		long startTime = new Date().getTime();
		  Map<String, Object> params = rc.params();
		 /* String sdate = rc.param("sdate");
			String msisdn = rc.param("msisdn");
			String type = rc.param("type");
			String sd = sdate.replaceAll("-", "");
		//	System.out.println("异常事件 时间 sd "+sd);
			params.put("sdate", sd);
			params.put("msisdn",msisdn);
			params.put("type", type);*/
		Record mainCause = null;
		try{
			//mainCause = Db.read(SqlMap.get("COMP_LOCATE_MAINCAUSE").parse(rc.params()));
		mainCause = Db.read(SqlMap.get("COMP_LOCATE_CATEGPRY_TEXT").parse(params));
		}catch(Exception e) {
			e.printStackTrace();
		}
		long endTime = new Date().getTime();
		log.info("Method diagnosisLocationMainCause() 投诉定位-->诊断定位主因 execution time:"+(endTime - startTime)+"ms");
		return Ret.ok("data", mainCause);
	}
	// 诊断定位主因
	/*public Ret diagnosisLocationMainCauseForText(ReqContext rc) {
		long startTime = new Date().getTime();
		  Map<String, Object> params = rc.params();
		  String sdate = rc.param("sdate");
			String msisdn = rc.param("msisdn");
			String type = rc.param("type");
			String sd = sdate.replaceAll("-", "");
		//	System.out.println("异常事件 时间 sd "+sd);
			params.put("sdate", sd);
			params.put("msisdn",msisdn);
			params.put("type", type);
		Record mainCause = null;
		try{
			//mainCause = Db.read(SqlMap.get("COMP_LOCATE_MAINCAUSE").parse(rc.params()));
		mainCause = Db.read(SqlMap.get("COMP_LOCATE_CATEGPRY_TEXT").parse(params));
		}catch(Exception e) {
			e.printStackTrace();
		}
		long endTime = new Date().getTime();
		log.info("Method diagnosisLocationMainCauseForText() 投诉定位-->诊断定位主因 execution time:"+(endTime - startTime)+"ms");
		return Ret.ok("data", mainCause);
	}*/
	//定位分类-表格
	public Page<Record> locateCategoryTable(ReqContext rc) {
		long startTime = new Date().getTime();
      /*  Map<String, Object> params = rc.params();
		String sdate = rc.param("sdate");
		String msisdn = rc.param("msisdn");
		String type = rc.param("type");
		String sd = sdate.replaceAll("-", "");
	//	System.out.println("异常事件 时间 sd "+sd);
		params.put("sdate", sd);
		params.put("msisdn",msisdn);
		params.put("type", type);*/
		Page<Record> data = null;
		try{
			Page<?> pageParam = rc.page();
			Map<String, Object> params = rc.params();
			data =  Db.page(SqlMap.get("COMP_LOCATE_CATEGPRY").parse(params), pageParam);
		}catch(Exception e) {
			e.printStackTrace();
		}
		long endTime = new Date().getTime();
		log.info("Method locateCategoryTable() 投诉定位-->定位分类-表格 execution time:"+(endTime - startTime)+"ms");
		return data;
	}
	//定位分类-表格（一级下钻）
	public Page<Record> showCateLevelOne(ReqContext rc) {
		long startTime = new Date().getTime();
		Page<Record> data = null;
		try{
			Page<?> pageParam = rc.page();
			Map<String, Object> params = rc.params();
			data =  Db.page(SqlMap.get("COMP_LOCATE_CATEGPRY_LEAVEL_ONE").parse(params), pageParam);
		}catch(Exception e) {
			e.printStackTrace();
		}
		long endTime = new Date().getTime();
		log.info("Method showCateLevelOne() 投诉定位-->定位分类-表格（一级下钻） execution time:"+(endTime - startTime)+"ms");
		return data;
	}
	// 定位分类-饼图
	public Ret locationCategoryPie(ReqContext rc) {
		long startTime = new Date().getTime();
		   Map<String, Object> params = rc.params();
			String sdate = rc.param("sdate");
			String msisdn = rc.param("msisdn");
			String sd = sdate.replaceAll("-", "");
			String type = rc.param("type");
		//	System.out.println("异常事件 时间 sd "+sd);
			params.put("sdate", sd);
			params.put("msisdn",msisdn);
			params.put("type", type);
		List<Record> category = null;
		try{
			category = Db.query(SqlMap.get("COMP_LOCATE_CATEGPRY").parse(params));
		}catch(Exception e) {
			e.printStackTrace();
		}
		long endTime = new Date().getTime();
		log.info("Method locationCategoryPie() 投诉定位-->定位分类-饼图 execution time:"+(endTime - startTime)+"ms");
		return Ret.ok("data", category);
	}
	// 定位分类-指标查询
	public List<Record> locationIndexQuery(ReqContext rc) {
		long startTime = new Date().getTime();
		List<Record> line = null;
		try{
			String lacci = rc.param("lacci");
			String cell_name = rc.param("cell_name");
			String start_time = rc.param("start_time");
			String end_time = rc.param("end_time");

			Map<String, Object> params = new HashMap<>();

			if (StringUtils.isNotEmpty(lacci)) {
				lacci = " and lacci = '" + lacci + "'";
			}
			if (StringUtils.isNotEmpty(cell_name)) {
				cell_name = " and cell_name like '%" + cell_name + "%'";
			}
			if (StringUtils.isNotEmpty(end_time)) {
				end_time = " and to_date('" + end_time + "','yyyy-mm-dd hh24:mi:ss') >= stat_time";
			}
			if (StringUtils.isNotEmpty(start_time)) {
				start_time = " and stat_time >= to_date('" + start_time + "','yyyy-mm-dd hh24:mi:ss')";
			}

			params.put("columns", rc.param("columns"));
			params.put("lacci", lacci);
			params.put("cell_name", cell_name);
			params.put("end_time", end_time);
			params.put("start_time", start_time);

			line = Db.query(SqlMap.get("COMP_LOCATE_INDEX_QUERY").parse(params));
		}catch(Exception e) {
			e.printStackTrace();
		}
		long endTime = new Date().getTime();
		log.info("Method locationIndexQuery() 投诉定位-->定位分类-指标查询 execution time:"+(endTime - startTime)+"ms");
		return line;
	}
	// 定位分类-指标查询-获取所有指标名称
	public List<Record> getIndexColumns(ReqContext rc) {
		long startTime = new Date().getTime();
		List<Record> list = null;
		try{
			String key = rc.param("key");
			list = Db.query("select * from (select A.COLUMN_NAME from user_tab_columns A where TABLE_NAME='DW_FT_RE_ST_EUTRANCELL_H') where COLUMN_NAME like '%"+key+"%'");
		}catch(Exception e) {
			e.printStackTrace();
		}
		long endTime = new Date().getTime();
		log.info("Method getIndexColumns() 定位分类-指标查询-获取所有指标名称 execution time:"+(endTime - startTime)+"ms");
		return list;
	}
	//用户2/4G网络图表呈现（趋势图）
	public List<Record> locateUser24GViewLine(ReqContext rc) {
		long startTime = new Date().getTime();
		List<Record> line = null;
		try{
			line = Db.query(SqlMap.get("USER_24G_VIEW_LINE").parse(rc.params()));
		}catch(Exception e) {
			e.printStackTrace();
		}
		long endTime = new Date().getTime();
		log.info("Method locateUser24GViewLine() 投诉定位-->用户2/4G网络图表呈现（趋势图） execution time:"+(endTime - startTime)+"ms");
		return line;
	}
	//用户2/4G网络图表呈现（异常小区轨迹图）
	public Ret locateUser24GAbnormalCellTravel(ReqContext rc) {
		long startTime = new Date().getTime();
		Map<String, Object> res = new HashMap<String, Object>();
		try{
			//地图渲染 用户轨迹
		//	List<Record> gisCell = Db.query(SqlMap.get("USER_24G_CELL_TRAVEL").parse(rc.params()));
			//res.put("gis_cell", getCellGisData(gisCell));
			//地图渲染 用户轨迹(小区异常事件汇总+小区驻留时长)
			List<Record> list = Db.query(SqlMap.get("USER_24G_CELL_ABNORMAL_EVENT_COUNT_AND_HOLD_TIME").parse(rc.params()));
			res.put("abnormal_event_count_and_hold_time", getCellGisData(list));
			//res.put("cell_hold_time_list", list);
		}catch(Exception e) {
			e.printStackTrace();
		}
		long endTime = new Date().getTime();
		log.info("Method locateUser24GCellTravel() 投诉定位-->用户2/4G网络图表呈现（异常小区轨迹图） execution time:"+(endTime - startTime)+"ms");
		return Ret.ok("data", res);
	}
	//用户2/4G网络图表呈现（单个小区的异常事件查询） 地图右侧
	public List<Record> locateUser24GCellAbnormalEvent(ReqContext rc) {
		long startTime = new Date().getTime();
		List<Record> detail = null;
		try{
			detail = Db.query(SqlMap.get("USER_24G_ONE_CELL_ABNORMAL_EVENT").parse(rc.params()));
		}catch(Exception e) {
			e.printStackTrace();
		}
		long endTime = new Date().getTime();
		log.info("Method locateUser24GCellAbnormalEvent() 投诉定位-->用户2/4G网络图表呈现（单个小区的异常事件查询） execution time:"+(endTime - startTime)+"ms");
		return detail;
	}
	//用户2/4G网络用户（小区某一异常事件详情查询）
	public List<Record> locateUser24GCellAbnormalEventDetail(ReqContext rc) {
		long startTime = new Date().getTime();
		List<Record> detail = null;
		try{
			detail = Db.query(SqlMap.get("USER_24G_ONE_CELL_ABNORMAL_EVENT_DETAIL").parse(rc.params()));
		}catch(Exception e) {
			e.printStackTrace();
		}
		long endTime = new Date().getTime();
		log.info("Method locateUser24GCellAbnormalEventDetail() 投诉定位-->用户2/4G网络用户（小区某一异常事件详情查询） execution time:"+(endTime - startTime)+"ms");
		return detail;
	}
	//异常事件定位详情
	public List<Record> locateXdrDetail(ReqContext rc) {
		long startTime = new Date().getTime();
		List<Record> xdr = null;
		try{
			Map<String, Object> params = rc.params();
			xdr = Db.query(SqlMap.get("LOCATE_XDR_PAGE").parse(params));
/*			for(Record re : xdr) {
				Map<String, Object> columns = re.getColumns();
				Double tmp=new Double(-1);
				 String dwStr = "";
				for(Map.Entry<String, Object> entry : columns.entrySet()){
					dwStr = "";
				    String mapKey = entry.getKey();
				   // System.out.println("执行一次");
				  //  System.out.println(mapKey);
				   
				    if("p_day".equals(mapKey)||"cell_name".equals(mapKey)||"xdr_count".equals(mapKey)) {
				    	continue;
				    }
				    try {
				    log.info("Method locateXdrDetail() mapKey "+mapKey);
				    log.info("Method locateXdrDetail() entry.getValue() "+entry.getValue());
				    Double value = Double.parseDouble(entry.getValue().toString());
				   
				    //Double value =(double) entry.getValue();
				   // System.out.println("value"+value);
			    //	System.out.println("tmp"+tmp);
			    	//System.out.println(value.compareTo(tmp));
				    if(value.compareTo(tmp)==1) {
				    	//System.out.println("进来了");
				    	tmp = value;
				    	if(mapKey.equals("poor_coverage_rt")) {
				    		//re.set("dw", "弱覆盖");
				    		dwStr = "弱覆盖";
				    	}
				    	if(mapKey.equals("dl_interfe_rt")) {
				    		//re.set("dw", "下行干扰");
				    		dwStr = "下行干扰";
				    	}
				    	if(mapKey.equals("ul_poor_sinr_rt")) {
				    		//re.set("dw", "上行SINR");
				    		dwStr = "上行SINR";
				    	}
				    	if(mapKey.equals("overlap_rt")) {
				    		//re.set("dw", "重叠覆盖");
				    		dwStr = "重叠覆盖";
				    	}
				    	if(mapKey.equals("cross_rt")) {
				    		//re.set("dw", "越区覆盖");
				    		dwStr = "越区覆盖";
				    	}
				    	if(mapKey.equals("uepoorphr_rt")) {
				    		//re.set("dw", "上行功率余量低");
				    		dwStr = "上行功率余量低";
				    	}
				    	if(mapKey.equals("prb_highusage_rt")) {
				    		//re.set("dw", "PRB占用率过高");
				    		dwStr = "PRB占用率过高";
				    	}
				    	if(mapKey.equals("prach_highusage_rt")) {
				    		//re.set("dw", "PRACH占用高");
				    		dwStr = "PRACH占用高";
				    	}
				    	if(mapKey.equals("pdcch_highusage_rt")) {
				    		//re.set("dw", "PDCCH占用高");
				    		dwStr = "PDCCH占用高";
				    	}
				    	if(mapKey.equals("high_conusers_rt")) {
				    		//re.set("dw", "小区激活用户高");
				    		dwStr = "小区激活用户高";
				    	}
				    	
				     }
				    }catch(Exception e) {
				    	//System.out.println("内层异常");
				    	e.printStackTrace();
				    	log.info("Method locateXdrDetail() 投诉定位-->内层异常 ");
				    }
				  //  System.out.println(mapKey+":"+mapValue);
				}
				re.set("dw", dwStr);
			}*/
			
		}catch(Exception e) {
		   log.info("Method locateXdrDetail() 投诉定位-->外层异常 ");
			
		}
		
		log.info("Method locateXdrDetail() 投诉定位-->异常事件定位详情 : "+xdr);
		long endTime = new Date().getTime();
		log.info("Method locateXdrDetail() 投诉定位-->异常事件定位详情 execution time:"+(endTime - startTime)+"ms");
		return xdr;
	}
	//投诉小区详情
	public List<Record> complaintCellDetail(ReqContext rc) {
		long startTime = new Date().getTime();
		List<Record> detail = null;
		try{
			Map<String, Object> params = rc.params();
			detail = Db.query(SqlMap.get("COMP_LOCATE_CELL").parse(params));
		}catch(Exception e) {
			e.printStackTrace();
		}
		long endTime = new Date().getTime();
		log.info("Method complaintCellDetail() 投诉定位-->投诉小区详情 execution time:"+(endTime - startTime)+"ms");
		return detail;
	}
	// 投诉小区轨迹
	public Ret complaintCellTravel(ReqContext rc) {
		long startTime = new Date().getTime();
		List<Record> locateGisCell = null;
		try{
			locateGisCell = Db.query(SqlMap.get("COMP_LOCATE_IMSICELL").parse(rc.params()));
		}catch(Exception e) {
			e.printStackTrace();
		}
		long endTime = new Date().getTime();
		log.info("Method complaintCellTravel() 投诉定位-->投诉小区轨迹 execution time:"+(endTime - startTime)+"ms");
		return Ret.ok("data", locateGisCell);
	}



	/***************************** 数据分析 *****************************/
	//投诉用户UEMR分布（走势图）
	public List<Record> complainUserUemrLine(ReqContext rc) {
		long startTime = new Date().getTime();
		List<Record> data = null;
		try{
			data = Db.query(SqlMap.get("DATA_UEMR_LINE").parse(rc.params()));
		}catch(Exception e) {
			e.printStackTrace();
		}
		long endTime = new Date().getTime();
		log.info("Method complainUserUemrLine() 数据分析-->投诉用户UEMR分布（走势图） execution time:"+(endTime - startTime)+"ms");
		return data;
	}
	//投诉用户UEMR分布（走势图-->下钻方法）
	public Record userUmerLineDrilldown(ReqContext rc) {
		long startTime = new Date().getTime();
		Record data = null;
		try{
			data = Db.read(SqlMap.get("DATA_UEMR_PAGENUM").parse(rc.params()));
		}catch(Exception e) {
			e.printStackTrace();
		}
		long endTime = new Date().getTime();
		log.info("Method userUmerLineDrilldown() 数据分析-->投诉用户UEMR分布（走势图-->下钻方法） execution time:"+(endTime - startTime)+"ms");
		return data;
	}
	//投诉用户UEMR详单（表格）  第13个功能
	public List complainUserUemrDetail(ReqContext rc) {
		long startTime = new Date().getTime();
		String sdate = rc.param("sdate");
		String msisdn = rc.param("msisdn");
		System.out.println("complainUserUemrDetail==========");
		
		//Page<Record> data = null;
		/*try{
			Page<?> pageParam = rc.page();
			Map<String, Object> params = rc.params();
			if (StringUtils.isNotEmpty(rc.param("stime"))) {
				params.put("stime", " and time = TO_TIMESTAMP('" + rc.param("stime") + "','yyyy-mm-dd hh24:mi:ss.FF6')");
			}
			data = Db.page(SqlMap.get("DATA_UEMR_XDR").parse(params), pageParam);
		}catch(Exception e) {
			e.printStackTrace();
		}*/
		DateFromHbase df = new DateFromHbase();
		List<Map<String,Object>> data = df.getDataFromHbaseDetail(sdate, msisdn, "lte_wxdw_xdrmr_hour", 0);
		System.out.println(data.toString());
		String cellIdString = "";
		
		int dataSize = data.size();
		for(int i=0 ; i<dataSize ; i++) {
			Map map = data.get(i);
			if(i==dataSize-1) {
				cellIdString += "'"+map.get("cell_id")+"'";
			}else {
				cellIdString += "'"+map.get("cell_id")+"',";
			}
		}
		List<Record> oracleData = null;
		Map<String, Object> params = rc.params();
		params.clear();
		params.put("cell_id", cellIdString);
		
		if(dataSize>0) {
			oracleData =  Db.query(SqlMap.get("CFG_GIS_CELL_ID").parse(params));
			//设置格式
	        for(Map<String,Object> temp:data) {
	        	temp.put("cell_name","");
	        	if(null!=temp.get("cell_id")) {
	        	String cnStr =	temp.get("cell_id").toString();
	        	//遍历放入小区名
	        	
	        	  for(Record re:oracleData) {
	    			if(cnStr.equals(re.getStr("cell_id"))) {
	    			  temp.put("cell_name",re.getStr("cell_name"));
	    			  break;
	    			}
	    			
	    		  }
	        	}
	         }
		}
		
		System.out.println("改变后的data "+data.toString());
		long endTime = new Date().getTime();
		log.info("Method complainUserUemrDetail() 数据分析-->投诉用户UEMR详单（表格） execution time:"+(endTime - startTime)+"ms");
		return data;
	}
	//投诉用户XDR详单
	public List<Record> complainUserXdrDetail(ReqContext rc) {
		long startTime = new Date().getTime();
		List<Record> data = null;
		try{
			data = Db.query(SqlMap.get("DATA_ANALYSE_XDR").parse(rc.params()));
		}catch(Exception e) {
			e.printStackTrace();
		}
		long endTime = new Date().getTime();
		log.info("Method complainUserXdrDetail() 数据分析-->投诉用户XDR详单 execution time:"+(endTime - startTime)+"ms");
		return data;
	}
	//经过小区OMC指标   james
	public Page<Record> passCellOmcIndex(ReqContext rc) {
		long startTime = new Date().getTime();
		Page<Record> data = null;
		try{
			Page<?> pageParam = rc.page();
			data = Db.page(SqlMap.get("DATA_ANALYSE_OMC").parse(rc.params()),pageParam);
		}catch(Exception e) {
			e.printStackTrace();
		}
		long endTime = new Date().getTime();
		log.info("Method passCellOmcIndex() 数据分析-->经过小区OMC指标 execution time:"+(endTime - startTime)+"ms");
		return data;
	}
	//经过小区告警信息
	public List<Record> passCellWarningMsg(ReqContext rc) {
		long startTime = new Date().getTime();
		List<Record> data = null;
		try{
			data = Db.query(SqlMap.get("DATA_ANALYSE_CELLWARN").parse(rc.params()));
		}catch(Exception e) {
			e.printStackTrace();
		}
		long endTime = new Date().getTime();
		log.info("Method passCellWarningMsg() 数据分析-->经过小区告警信息 execution time:"+(endTime - startTime)+"ms");
		return data;
	}
	//小区告警信息
	public List<Record> passNeiCellWarningMsg(ReqContext rc) {
		long startTime = new Date().getTime();
		List<Record> data = null;
		try{
			data = Db.query(SqlMap.get("DATA_ANALYSE_NEICELLWARN").parse(rc.params()));
		}catch(Exception e) {
			e.printStackTrace();
		}
		long endTime = new Date().getTime();
		log.info("Method passCellWarningMsg() 数据分析-->经过小区告警信息 execution time:"+(endTime - startTime)+"ms");
		return data;
	}
	//经过小区告警信息
	public Object testList(ReqContext rc) {
		long startTime = new Date().getTime();
		List<Record> data = null;
		//String param = rc.param("");
		Object attribute = rc.context().getAttribute("ecgilist");
		String[] params = rc.params("ecgilist");
		System.out.println("testList---> "+params[0] +" "+attribute);
		long endTime = new Date().getTime();
		log.info("Method passCellWarningMsg() 数据分析-->经过小区告警信息 execution time:"+(endTime - startTime)+"ms");
		return "ok";
	}




	public void callDPI(User user, final Record rec, String seq, final String start, final String end, final String imsi, final String msisdn, final Integer backtrackingStep, long maxBacktrackingTime, final String sheetno, final String longitude,final Double latitude,final String queryId, final String executetime, final int has, String firstEndTime){
		Timestamp execute_start = new Timestamp(new Date().getTime());
		// 调用dpi && 数据存储过程调用
		String result = HttpRequestInter.getXdrData(seq, start, end, imsi, msisdn);
		log.info(imsi + " , " + msisdn + " , " + sheetno + " , " + longitude + "," +latitude+ " , " + queryId + " , " + firstEndTime + ", " + start + " , " + end + " , " + backtrackingStep);
		log.info("Response is : " + result);
		if (!StringUtils.isEmpty(result)) {
			String[] res = result.split("\\|");
			String msg = "";
			String isNull = "";
			if (res.length == 3) {
				msg = res[0];
				isNull = res[2];
				rec.set("seq", seq);
				// imsi/msisdn由数据层回填,更新的时候不再update
				rec.remove("imsi");
				rec.remove("msisdn");
				if (StringUtils.equals("SUCCESS", msg) && StringUtils.equals("NOTNULL", isNull)) {
					rec.set("status", OperateConst.DATAOK);
					Db.update("RPT_COMPLAINT_IMSI_LIST", "tmpid", rec);

					// 调用存储过程算法计算
					try {
						rec.set("status", OperateConst.DBPROCESS);
						Db.update("RPT_COMPLAINT_IMSI_LIST", "tmpid", rec);

						Db.proc("call SP_COMPLAIN_EXCP_PRE_H(?,?,?)", start, backtrackingStep, seq);
						Db.proc("call f_complain_count_xdr(?,?,?,?,?,?,?,?,?,?)", seq, imsi, start, end, backtrackingStep, msisdn, user.getId(), user.getName(), executetime, sheetno);

						Map<String, Object> map = new HashMap<String, Object>();
						map.put("seq", seq);
						List<Record> proRes = Db.use().query(SqlMap.get("RPT_COMPLAIN_XDR_COUNT_RESULT").parse(map));
						Record item = proRes.get(0);
						String flag = item.getStr("flag");
						String endTime = item.getStr("end_time");
						Date _endTime = DateUtils.parseDate(endTime, "yyyy-MM-dd HH:mm:ss");
						Date firstEnd = DateUtils.parseDate(firstEndTime, "yyyy-MM-dd HH:mm:ss");

						if("0".equals(flag)){//查询结果flag为0，不符合预期，继续回溯查询
							long backTime = (_endTime.getTime() - firstEnd.getTime()) / (1000 * 60 * 60);
							if (maxBacktrackingTime > backTime) {
								String _start = endTime;
								String _end = df.format(DateUtils.addHours(DateUtils.parseDate(_start, "yyyy-MM-dd HH:mm:ss"), backtrackingStep));
								callDPI(user, rec, seq, _start, _end, imsi, msisdn, backtrackingStep, maxBacktrackingTime, sheetno, longitude,latitude, queryId, executetime, has, firstEndTime);
							}else{
								Db.proc("call SP_COMPLAIN_EXCP_TOTAL_H(?,?,?,?,?,?)", imsi, end, backtrackingStep, seq, longitude,latitude);
							}
						}else{//返回查询结果符合预期，直接执行分析
							Db.proc("call SP_COMPLAIN_EXCP_TOTAL_H(?,?,?,?,?,?)", imsi, end, backtrackingStep, seq, longitude,latitude);
						}
						rec.set("status", OperateConst.NORMAL);
						// 更新查询结束时间和更新查询状态为 分析完成，可查询
						rec.set("check_end", new Timestamp(new Date().getTime()));
						long actionTime = ((Timestamp) rec.get("check_end")).getTime() - execute_start.getTime();
						rec.set("action_time", actionTime);
						Db.update("RPT_COMPLAINT_IMSI_LIST", "seq", rec);
					} catch (Exception e) {
						log.error(e.getMessage());
						rec.set("gd_failue_cause", e.getMessage());
						rec.set("status", OperateConst.ABNORMAL);
					}
				} else if(StringUtils.equals("SUCCESS", msg) && StringUtils.equals("ISNULL", isNull)){
					rec.set("seq", seq);
					rec.set("status", OperateConst.SUCCNULL);
					rec.set("gd_failue_cause", "查询成功数据为空,请更换时间查询尝试");
					Db.update("RPT_COMPLAINT_IMSI_LIST", "tmpid", rec);
				} else if(StringUtils.equals("FAILED", msg) && StringUtils.equals("ISNULL", isNull)){
					rec.set("seq", seq);
					rec.set("status", OperateConst.FAILNULL);
					rec.set("gd_failue_cause", "查询失败数据为空,请检查DPI服务");
					Db.update("RPT_COMPLAINT_IMSI_LIST", "tmpid", rec);
				} else if(StringUtils.equals("TIMEOUT", msg) && StringUtils.equals("ISNULL", isNull)){
					rec.set("seq", seq);
					rec.set("status", OperateConst.TIMEOUT);
					rec.set("gd_failue_cause", "数据查询超时,请检查DPI服务");
					Db.update("RPT_COMPLAINT_IMSI_LIST", "tmpid", rec);
				}
			} else {
				rec.set("status", OperateConst.DATAFAIL);
				rec.set("gd_failue_cause", "数据生成失败,请检查DPI服务");
				Db.update("RPT_COMPLAINT_IMSI_LIST", "tmpid", rec);
			}
		} else {
			rec.set("status", OperateConst.DATAFAIL);
			rec.set("gd_failue_cause", "数据生成失败,请检查DPI服务");
			Db.update("RPT_COMPLAINT_IMSI_LIST", "tmpid", rec);
		}
	}

	/**
	 * 启动时执行，扫描工单表，重新执行未完成的工单
	 */
	public Ret reExecute(ReqContext rc){
		log.info("----------------------------------启动未执行完成的工单---------------------------------");
		String msg = "";
		String tmpIds = rc.param("tmpIds");
		List<Record> data = Db.query("select imsi, msisdn, to_char(start_time, 'yyyy-mm-dd hh24:mi:ss') start_time, to_char(end_time, 'yyyy-mm-dd hh24:mi:ss') end_time, stime, sheetno, pre_lonlat, exec_time, query_id, tmpid from RPT_COMPLAINT_IMSI_LIST where tmpid in("+tmpIds+")");
		for(int i=0; i<data.size(); i++){
			Record r = data.get(i);
			String tmpid = r.getStr("tmpid");
			String msisdn = r.getStr("msisdn");
			Object tmpId = CacheManager.get(cacheName, tmpid);
			if(tmpId==null){
				User user = new User();
				user.setId(r.getStr("user_id"));
				user.setName(r.getStr("user_name"));
				execute(user, r.getStr("imsi"), r.getStr("msisdn"), r.getStr("start_time"), r.getStr("end_time"), r.getInt("stime"), r.getStr("sheetno"), r.getStr("pre_lonlat"), r.getStr("exec_time"), r.getStr("query_id"), r.getStr("tmpid"), "restart", null, null, null, null, null, null, null, null);
			}else{
				msg = msisdn + "," + msg;
			}
		}
		if(msg.length()>0){
			msg = "手机号码"+msg+"正在查询中，请勿重复操作";
		}
		return Ret.ok("msg", msg);
	}

	/*****************************
	 * 处理投诉 使用5个并发线程池来控制多任务调用
	 *
	 * @param stime
	 *****************************/
	private void execute(User user, final String imsi, final String msisdn, final String start, final String end, final Integer stime, final String sheetno, final String pre_lonlat,final String executetime,final String queryId,final String tmpId,String flag,
						 String serv_order, String cplain_type, String customer_name, String cplain_descrip, String addr_rd1, String addr_rd2, String addr_identity, String area) {
		CacheManager.set(cacheName, tmpId, tmpId);
		Record rec = new Record();
		rec.set("tmpid", tmpId);
		//来自于预约执行的已经新增过记录了直接查询
		if("export".equals(flag)){
			if(!StringUtils.isNotEmpty(executetime)) {
				saveQueryRecord(user, null, queryId, imsi, msisdn, start, end, stime, sheetno,pre_lonlat, executetime, OperateConst.QUEUED,tmpId,"",serv_order, cplain_type, customer_name, cplain_descrip, addr_rd1, addr_rd2, addr_identity, area);
			}
		}else if("restart".equals(flag)){
			rec.set("status", OperateConst.QUEUED);
			rec.set("gd_failue_cause", "正在排队等待");
			Db.update("RPT_COMPLAINT_IMSI_LIST", "tmpid", rec);
		}

		rec.set("check_start", new Timestamp(new Date().getTime()));
		Db.update("RPT_COMPLAINT_IMSI_LIST", "tmpid", rec);
		executor.submit(new Runnable() {
			public void run() {
				// 获取一个可用序列
				String seq = "";
				Record seqRec = Db.read("select seq_complain.nextval seq from dual");
				if (seqRec != null) {
					seq = seqRec.getStr("seq");
				}
				if (StringUtils.isEmpty(seq)) {
					log.info("当前线程:" + Thread.currentThread().getName() + ", SEQ is null");
					return;
				}
				log.info("当前线程:" + Thread.currentThread().getName() + ", SEQ:" + seq);
				rec.set("seq", seq);
				Timestamp execute_start = new Timestamp(new Date().getTime());
				Db.update("RPT_COMPLAINT_IMSI_LIST", "tmpid", rec);
				// 调用dpi && 数据存储过程调用
				String result = HttpRequestInter.getXdrData(seq, start, end, imsi, msisdn);
				log.info(imsi + " , " + msisdn + " , " + start + " , " + end + " , " + stime + " , " + pre_lonlat + " , " + queryId);
				log.info("Response is : " + result);
				if (!StringUtils.isEmpty(result)) {
					String[] res = result.split("\\|");
					String msg = "";
					String isNull = "";
					if (res.length == 3) {
						msg = res[0];
						isNull = res[2];
						// imsi/msisdn由数据层回填,更新的时候不再update
						rec.remove("imsi");
						rec.remove("msisdn");
						if (StringUtils.equals("SUCCESS", msg) && StringUtils.equals("NOTNULL", isNull)) {
							rec.set("status", OperateConst.DATAOK);
							rec.set("gd_failue_cause", "正在数据生成");
							Db.update("RPT_COMPLAINT_IMSI_LIST", "tmpid", rec);
							// 调用存储过程算法计算
							try {
								rec.set("gd_failue_cause", "正在投诉分析");
								rec.set("status", OperateConst.DBPROCESS);
								Db.update("RPT_COMPLAINT_IMSI_LIST", "tmpid", rec);
								if("restart".equals(flag)){
									Record r = Db.read("select start_time, stime from RPT_COMPLAINT_IMSI_LIST where tmpid = '"+tmpId+"'");
									Integer _stime = r.getInt("stime");
									Db.proc("call SP_COMPLAIN_EXCP_TOTAL_H(?,?,?,?,?)", imsi, end, _stime, seq, pre_lonlat);
								}else if("export".equals(flag)){
									Db.proc("call SP_COMPLAIN_EXCP_TOTAL_H(?,?,?,?,?)", imsi, end, stime, seq, pre_lonlat);
								}
								rec.set("status", OperateConst.NORMAL);
								rec.set("gd_failue_cause", "投诉分析完成");
								// 更新查询结束时间和更新查询状态为 分析完成，可查询
								rec.set("check_end", new java.sql.Timestamp(new Date().getTime()));
								long actionTime = ((java.sql.Timestamp) rec.get("check_end")).getTime() - execute_start.getTime();
								rec.set("action_time", actionTime);
								Db.update("RPT_COMPLAINT_IMSI_LIST", "seq", rec);
							} catch (Exception e) {
								log.error(e.getMessage());
								rec.set("gd_failue_cause", e.getMessage());
								rec.set("status", OperateConst.ABNORMAL);
							}
						} else if(StringUtils.equals("SUCCESS", msg) && StringUtils.equals("ISNULL", isNull)){
							rec.set("seq", seq);
							rec.set("status", OperateConst.SUCCNULL);
							rec.set("gd_failue_cause", "查询成功数据为空,请更换时间查询尝试");
							Db.update("RPT_COMPLAINT_IMSI_LIST", "tmpid", rec);
						} else if(StringUtils.equals("FAILED", msg) && StringUtils.equals("ISNULL", isNull)){
							rec.set("seq", seq);
							rec.set("status", OperateConst.FAILNULL);
							rec.set("gd_failue_cause", "查询失败数据为空,请检查DPI服务");
							Db.update("RPT_COMPLAINT_IMSI_LIST", "tmpid", rec);
						} else if(StringUtils.equals("TIMEOUT", msg) && StringUtils.equals("ISNULL", isNull)){
							rec.set("seq", seq);
							rec.set("status", OperateConst.TIMEOUT);
							rec.set("gd_failue_cause", "数据查询超时,请检查DPI服务");
							Db.update("RPT_COMPLAINT_IMSI_LIST", "tmpid", rec);
						}
					} else {
						rec.set("status", OperateConst.DATAFAIL);
						rec.set("gd_failue_cause", "数据生成失败,请检查DPI服务");
						Db.update("RPT_COMPLAINT_IMSI_LIST", "tmpid", rec);
					}
				} else {
					rec.set("status", OperateConst.DATAFAIL);
					rec.set("gd_failue_cause", "数据生成失败,请检查DPI服务");
					Db.update("RPT_COMPLAINT_IMSI_LIST", "tmpid", rec);
				}
				CacheManager.justEvict(cacheName, tmpId);
			}
		});
	}

	/**
	 * 根据设定的坐标系，统一转化为GCJ02坐标进行计算
	 * @param spt
	 * @param prjType
	 * @return
	 */
	private Point convertPoint(Point spt, String prjType) {
		if ("WGS84".equals(prjType)) {
			return ProjUtils.wgs2gcj(spt);
		} else if ("CGJ02".equals(prjType)) {
			return spt;
		} else if ("BD09".equals(prjType)) {
			return ProjUtils.bd2gcj(spt);
		} else {
			return spt;
		}
	}

	/**
	 * 对经纬度数据进行02加密处理,并生产扇区数据
	 */
	private Map<String, Object> geneCellWkt(Double lon, Double lat, Double dir, Double radius, Double beam){
		Map<String, Object> result = new HashMap<>();
		Point curPt = Geom.point(lon, lat);
		//对经纬度数据进行02加密处理
		//Point point = convertPoint(curPt, "WGS84");
		Polygon polygon = JtsUtils.cellSector(curPt.getX(), curPt.getY(), radius!=null?radius:60, dir!=null?dir:0, beam!=null?beam:30, 20);
		String strGeom = JtsUtils.geometry2Wkt(polygon);
		result.put("point", curPt);
		result.put("wkt", strGeom);
		return result;
	}

	/**
	 * 获取小区图层信息
	 * @param list
	 * @return
	 */
	public FeatureCollection getCellGisData(List<Record> list){
		List<Feature> listFtr = new ArrayList<Feature>();
		if (null != list) {
			for (int i = 0, len = list.size(); i < len; i++) {
				Record record = list.get(i);
				Double lon = record.getDouble("longitude");
				Double lat = record.getDouble("latitude");
				Double radius = record.getDouble("radius");
				Double beam = record.getDouble("beam");
				if(lon==null || lat == null){
					continue;
				}
				Map<String, Object> res = geneCellWkt(lon, lat, record.getDouble("dir"), radius, beam);
				String wktString = res.get("wkt") != null ? res.get("wkt").toString() : "";
				if(!wktString.equals("")){
					Point point = (Point) res.get("point");
					Geometry ply = JtsUtils.wkt2Geometry(wktString);
					Feature ftr = new Feature(ply);
					Map<String, Object> prts = new LinkedHashMap<String, Object>();
					for(String key : record.getColumnNames()){
						prts.put(key, record.get(key));
					}
					prts.put("point", point);
					prts.put("cell_wkt", wktString);
					ftr.setProperties(prts);
					listFtr.add(ftr);
				}
			}
		}
		FeatureCollection ftrc = new FeatureCollection(listFtr);
		return ftrc;
	}

	public String ClobToString(Clob clob) throws SQLException, IOException {
		String reString = "";
		if(clob!=null){
			reString = clob.getSubString((long)1, (int)clob.length());
		}
		return reString;
	}
}
