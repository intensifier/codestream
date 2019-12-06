class SlackInteractiveComponentBlocks {
	static createRequiresAccess() {
		return [
			{
				type: 'section',
				text: {
					type: 'mrkdwn',
					text: 'If you\'re not a CodeStream user, please sign up.'
				},
				accessory: {
					type: 'button',
					text: {
						type: 'plain_text',
						text: 'Sign Up',
						emoji: true
					},
					url: 'https://codestream.com',
					value: 'click_me_123'
				}
			}
		];
	}

	static createMarkdownBlocks(message) {
		return [
			{
				type: 'section',
				text: {
					type: 'mrkdwn',
					text: message
				}
			}
		];
	}

	static getReplyText(viewState) {
		try {
			return viewState.values['block__text_input--message'][
				'action__text_input--message'
			].value;
		}
		catch (ex) {
			return undefined;
		}
	}

	static createModalReply() {
		return {
			block_id: 'block__text_input--message',
			type: 'input',
			element: {
				type: 'plain_text_input',
				action_id: 'action__text_input--message',
				multiline: true,
				placeholder: {
					type: 'plain_text',
					text: 'Compose a reply'
				}
			},
			label: {
				type: 'plain_text',
				text: 'Reply'
			}
		};
	}

	static createModalUpdatedView() {
		return {
			type: 'modal',
			title: {
				type: 'plain_text',
				text: 'Reply Sent'
			},
			close: {
				type: 'plain_text',
				text: 'Close',
				emoji: true
			},
			blocks: [
				{
					type: 'section',
					text: {
						type: 'plain_text',
						text:
							'Reply posted to CodeStream!'
					}
				}
				// TODO once we have faux users, need to add a custom message if user is not officially signed up after replying
				// ,{
				// 	type: 'section',
				// 	text: {
				// 		type: 'plain_text',
				// 		text:
				// 			'Have XXX invite you to CodeStream so that you can discuss code right inside your IDE.'
				// 	}
				// }				
			]
		};
	}

	static createModalView(payload, actionPayload, blocks) {
		return {
			private_metadata: JSON.stringify({
				crId: actionPayload.crId,
				sId: actionPayload.sId,
				tId: actionPayload.tId,
				uId: payload.user.id,
				cId: actionPayload.cId,
				ppId: actionPayload.ppId,
				pcuId: actionPayload.pcuId
			}),
			type: 'modal',
			callback_id: JSON.stringify({
				id: actionPayload.id,
				cId: actionPayload.cId,
				mId: actionPayload.mId
			}),
			title: {
				type: 'plain_text',
				text: 'Post a Reply',
				emoji: true
			},
			submit: {
				type: 'plain_text',
				text: 'Reply',
				emoji: true
			},
			close: {
				type: 'plain_text',
				text: 'Cancel',
				emoji: true
			},
			blocks: blocks
		};
	}
}

module.exports = SlackInteractiveComponentBlocks;
