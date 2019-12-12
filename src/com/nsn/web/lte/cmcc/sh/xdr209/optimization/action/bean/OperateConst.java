package com.nsn.web.lte.cmcc.sh.xdr209.optimization.action.bean;

public class OperateConst {
	// 投诉分析完成：数据分析完毕
	public static final int NORMAL = 0;
	// 正在排队等待：处于排队申请XDR数据的状态
	public static final int QUEUED = 1;
	// 正在数据生成：向DPI申请DPI数据直至创表成功
	public static final int DATAOK = 2;
	// 数据生成失败
	public static final int DATAFAIL = 3;
	// 正在投诉分析
	public static final int DBPROCESS = 4;
	// 异常，不可查询；
	public static final int ABNORMAL = 5;
	// 异常，查询超时；
	public static final int TIMEOUT = 6;
	// 异常，工单验证失败；
	public static final int SHEETFAIL = 7;

	// 查询成功，数据为空；
	public static final int SUCCNULL = 8;
	// 查询失败，数据为空；
	public static final int FAILNULL = 9;

	
	// 不支持的工单 工单类型错误
	public static final int SHEETINVALID = 10;
	// 工单已过期
	public static final int SHEETEXPIRE = 11;
	// 溢出查询时间段
	public static final int SHEETOVERFLOW = 12;
	// 工单号与号码不对应
	public static final int SHEETDISMATCH = 13;
	// 验证服务器异常
	public static final int SHEETRESPFAIL = 14;
	// 手机号码异常，不可查询
	public static final int PHONE_NUMBER_ABNORMAL = 15;
}
