'use strict';

var Get_Teams_By_Id_Test = require('./get_teams_by_id_test');
var IDs_Required_Test = require('./ids_required_test');
var Get_My_Teams_Test = require('./get_my_teams_test');
var ACL_Test = require('./acl_test');

class Get_Teams_Request_Tester {

	get_teams_test () {
		new Get_My_Teams_Test().test();
		new Get_Teams_By_Id_Test().test();
		new IDs_Required_Test().test();
		new ACL_Test().test();
	}
}

module.exports = Get_Teams_Request_Tester;
