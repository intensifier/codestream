'use strict';

var MessageToTeamTest = require('./message_to_team_test');

class MessageToStreamTest extends MessageToTeamTest {

	get description () {
		return `members of the stream should receive a message with the marker when a marker is updated, for ${this.fromOtherStreamType} streams`;
	}

	// set the name of the channel we expect to receive a message on
	setChannelName (callback) {
		// it is the stream channel
		this.channelName = 'stream-' + this.otherStream._id;
		callback();
	}
}

module.exports = MessageToStreamTest;
