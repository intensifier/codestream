'use strict';

var PutCalculateLocationsTest = require('./put_calculate_locations_test');
var BoundAsync = require(process.env.CS_API_TOP + '/server_utils/bound_async');

class OtherTeamTest extends PutCalculateLocationsTest {

	get description () {
		return 'should return error when attempting to calculate marker locations for a stream from a team not matching the given team ID';
	}

	getExpectedError () {
		return {
			code: 'RAPI-1010'
		};
	}

	// before the test runs...
	before (callback) {
		BoundAsync.series(this, [
			super.before,	// set up the standard test conditions
			this.createOtherRepo,	// create another repo (and another team)
			this.createOtherStream	// create a stream in this other repo
		], callback);
	}

	// create another repo
	createOtherRepo (callback) {
		this.repoFactory.createRandomRepo(
			(error, response) => {
				if (error) { return callback(error); }
				this.otherRepo = response.repo;
				callback();
			},
			{
				token: this.teamCreatorData.accessToken, // team creator creates another repo and team
				withEmails: [this.currentUser.email]	// but current user is included
			}
		);
	}

	// create another stream to try to put marker locations to
	createOtherStream (callback) {
		this.streamFactory.createRandomStream(
			(error, response) => {
				if (error) { return callback(error); }
				this.data.streamId = response.stream._id;
				callback();
			},
			{
				type: 'file',
				teamId: this.otherRepo.teamId,	// using the other team
				repoId: this.otherRepo._id,		// using the other repo
				token: this.teamCreatorData.accessToken	// team creator creates a stream
			}
		);
	}
}

module.exports = OtherTeamTest;
