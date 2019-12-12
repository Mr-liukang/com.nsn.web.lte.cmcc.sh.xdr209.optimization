package com.nsn.web.lte.cmcc.sh.xdr209.optimization;

import org.osgi.framework.BundleActivator;
import org.osgi.framework.BundleContext;

import com.nsn.logger.Logger;
import com.nsn.scheduler.SchedulerService;
import com.nsn.web.SystemMenu;
import com.nsn.web.SystemMenuPath;
import com.nsn.web.lte.DoSystem;
import com.nsn.web.lte.DoWebApplication;
import com.nsn.web.lte.DoWebModule;
import com.nsn.web.lte.cmcc.sh.xdr209.optimization.action.MainAction;
import com.nsn.web.lte.cmcc.sh.xdr209.optimization.action.OrderCheckTask;
import com.nsn.web.lte.db.DSType;
import com.nsn.web.lte.db.SqlMap;
import com.nsn.web.lte.mvc.Actions;

public class Activator implements BundleActivator {
	private Logger log = Logger.getLogger(this.getClass().getName());
	private static String packageName = Activator.class.getPackage().getName();
	
	
	@Override
	public void start(BundleContext context) throws Exception {
		String oneMenu = "LTE数据业务投诉分析";
		SystemMenuPath root = new SystemMenuPath().menu(new SystemMenu().index(0).id(oneMenu).name(oneMenu).clazz("glyphicon glyphicon-th-large"));
		//模块路径，所在包的最后一个文件夹名，例如com.nsn.web.abcdef，moduleKey为/abcdef
		String dirName = packageName.substring(packageName.lastIndexOf(".") + 1);
		String moduleKey = "/" + dirName;
		DoWebApplication webapp = new DoWebApplication(DoSystem.getWebSystem(), context.getBundle(),this.getClass().getClassLoader());
		webapp.setContextPath(moduleKey);
		
		//页面调用action的key
		String actionKey = moduleKey + "/mainAction";	//页面调用action的key
		Actions.add(actionKey, MainAction.class);
		DoSystem.getWebSystem().addWebApplication(webapp);
		
		//模块菜单入口
		String moduleName = "LTE数据业务投诉分析";	//根据情况修改，模块菜单名，建议一个模块一个菜单
		SystemMenuPath moduleMenu = new SystemMenuPath(root.clone()).menu(new SystemMenu().id(actionKey).name(moduleName).icon("fa-cogs"));
		DoWebModule generaQueryModule = new DoWebModule(webapp,actionKey,moduleName,moduleMenu).setModuleUrl(actionKey);
		webapp.addWebModule(generaQueryModule);
		
		SqlMap.loadSql(this.getClass(),"sql", DSType.MAIN);
		
		log.info(packageName + " STARTED.");
		
		//每天早上6点更新一些超时的工单
		 SchedulerService.getScheculer().registerTask("doweb", "task_order_check", "0 0 6 * * ?", new OrderCheckTask());
		SchedulerService.getScheculer().start();
		
		/*MainAction action = new MainAction();
		action.reExecute();*/
	}

	@Override
	public void stop(BundleContext arg0) throws Exception {
		log.info(packageName + " STOPPED.");
	}
}
