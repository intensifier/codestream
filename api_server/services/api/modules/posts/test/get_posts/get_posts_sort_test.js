'use strict';

var Get_Posts_Test = require('./get_posts_test');

class Get_Posts_Sort_Test extends Get_Posts_Test {

	get description () {
		return 'should return the correct posts in correct order when requesting posts in ascending order by ID';
	}

	set_path (callback) {
		this.path = `/posts/?team_id=${this.team._id}&stream_id=${this.stream._id}&sort=asc`;
		callback();
	}

	validate_response (data) {
		this.validate_sorted_matching_objects(data.posts, this.my_posts, 'posts');
		super.validate_response(data);
	}
}

module.exports = Get_Posts_Sort_Test;
