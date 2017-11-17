'use strict';

var GetStreamsTest = require('./get_streams_test');
var ObjectID = require('mongodb').ObjectID;

class GetStreamsGreaterThanEqualTest extends GetStreamsTest {

	constructor (options) {
		super(options);
		this.dontDoForeign = true;
		this.dontDoTeamStreams = true;
	}

	get description () {
		return 'should return the correct streams when requesting streams with sort IDs greater than or equal to some value';
	}

	setPath (callback) {
		this.myStreams = this.streamsByRepo[this.myRepo._id];
		let pivot = this.myStreams[2]._id;
		this.myStreams = this.myStreams.filter(stream => ObjectID(stream.sortId) >= ObjectID(pivot));
		this.path = `/streams/?teamId=${this.myTeam._id}&repoId=${this.myRepo._id}&gte=${pivot}`;
		callback();
	}
}

module.exports = GetStreamsGreaterThanEqualTest;
