package com.nsn.web.lte.cmcc.sh.xdr209.optimization.action;

import java.util.List;

import com.nsn.logger.Logger;
import com.nsn.scheduler.SchedulerTask;
import com.nsn.web.lte.cmcc.sh.xdr209.optimization.action.bean.OperateConst;
import com.nsn.web.lte.db.Db;
import com.nsn.web.lte.db.Record;
import com.nsn.web.lte.db.SqlMap;

/**
 * 
 * @author admin
 *
 */
public class OrderCheckTask extends SchedulerTask {
	private Logger log = Logger.getLogger(getClass());

	@Override
	public void execute() throws RuntimeException {
		List<Record> recs  = Db.use().query(SqlMap.getSql("TASK_CHECK_ORDER"));
		log.info("僵尸工单数:"+log);
		if(recs.size()>0) {
			for(Record rec:recs) {
				rec.set("status",OperateConst.TIMEOUT);
				Db.update("RPT_COMPLAINT_IMSI_LIST", "tmpid", rec);
			}
		}
	}
}
