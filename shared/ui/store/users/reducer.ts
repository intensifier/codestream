import { CSStream, CSTeam, CSUser, StreamType } from "@codestream/protocols/api";
import { difference, isString } from "lodash-es";
import { createSelector } from "reselect";
import { CodeStreamState } from "..";
import { emptyArray, mapFilter, toMapBy } from "../../utils";
import { ActionType } from "../common";
import { PreferencesState } from "../preferences/types";
import { getStreamForId } from "../streams/reducer";
import * as actions from "./actions";
import { UsersActionsType, UsersState } from "./types";

type UsersActions = ActionType<typeof actions>;

const initialState: UsersState = {};

const updateUser = (payload: CSUser, users: UsersState) => {
	const user = users[payload.id] || {};
	return { ...user, ...payload };
};

export function reduceUsers(state = initialState, action: UsersActions) {
	switch (action.type) {
		case UsersActionsType.Bootstrap: {
			return toMapBy("id", action.payload);
		}
		case UsersActionsType.Update:
			return { ...state, [action.payload.id]: updateUser(action.payload, state) };
		case UsersActionsType.Add: {
			const updatedUsers = action.payload.map(user => updateUser(user, state));
			return { ...state, ...toMapBy("id", updatedUsers) };
		}
		case "RESET":
			return initialState;
		default:
			return state;
	}
}

const getUsername = (user: CSUser) => {
	if (!user.username && user.email) {
		return user.email.replace(/@.*/, "");
	}
	return user.username;
};

const getUsers = (state: CodeStreamState) => state.users;

const getCurrentTeam = (state: CodeStreamState) => state.teams[state.context.currentTeamId];

const getCurrentUser = (state: CodeStreamState) => state.users[state.session.userId || ""];

export const isCurrentUserInternal = (state: CodeStreamState) => {
	const email = state.users[state.session.userId || ""]?.email;
	if (!email) return false;
	return ["codestream.com", "newrelic.com"].includes(email.split("@")[1]);
};

export const getActiveMemberIds = (team: CSTeam) => {
	return difference(
		difference(team.memberIds, team.removedMemberIds || []),
		team.foreignMemberIds || []
	);
};

export const isActiveMember = (team: CSTeam, userId: string) => {
	return getActiveMemberIds(team).includes(userId);
};

export const getTeamMembers = createSelector(getCurrentTeam, getUsers, (team, users) => {
	const memberIds = getActiveMemberIds(team);
	return mapFilter(memberIds, (id: string) => {
		const user: CSUser = users[id];
		return user && !user.deactivated && !user.externalUserId ? user : undefined;
	}).sort((a, b) => a?.username?.localeCompare(b?.username));
});

export const getTeamMates = createSelector(
	getTeamMembers,
	(state: CodeStreamState) => state.session.userId!,
	(members: CSUser[], userId: string) => members.filter(m => m.id !== userId && m.isRegistered)
);

// return the team tags as an array, in sort order
export const getTeamTagsArray = createSelector(getCurrentTeam, team => {
	if (team.tags == null) {
		return emptyArray;
	}

	return mapFilter(Object.entries(team.tags), ([id, tag]) =>
		tag.deactivated ? null : { id, ...tag }
	).sort((a, b) => (a.sortOrder == null || b.sortOrder == null ? -1 : a.sortOrder - b.sortOrder));
});

// return the team tags as an associative array (hash)
export const getTeamTagsHash = createSelector(getTeamTagsArray, tagsArray => {
	return toMapBy("id", tagsArray);
});

export const getAllUsers = createSelector(getUsers, (users: UsersState) => Object.values(users));
export const getUsernames = createSelector(getAllUsers, users => {
	return users.map(getUsername);
});
export const getNrAiUserId = createSelector(getAllUsers, users => {
	return users.find(u => u.username === "AI")?.id;
});

export const getUsernamesById = createSelector(getAllUsers, users => {
	const map = {};
	users.forEach(user => {
		map[user.id] = getUsername(user);
	});
	return map;
});

export const getUsernamesByIdLowerCase = createSelector(getAllUsers, users => {
	const map: { [id: string]: string } = {};
	users.forEach(user => {
		map[user.id] = getUsername(user).toLowerCase();
	});
	return map;
});

export const getNormalizedUsernames = createSelector(getUsernames, usernames => {
	return mapFilter(usernames, username => username && username.toLowerCase());
});

export const getUserByCsId = createSelector(
	(state: UsersState) => state,
	(_: any, codestreamId: string) => codestreamId,
	(users: UsersState, codestreamId: string) => {
		for (let user of Object.values(users)) {
			if (user.codestreamId === codestreamId || user.id === codestreamId) return user;
		}
		return undefined;
	}
);

export const findMentionedUserIds = (members: CSUser[], text: string) => {
	const mentionedUserIds: string[] = [];
	if (text == null || text.length === 0) {
		return mentionedUserIds;
	}

	members.forEach(user => {
		const matcher = user.username.replace(/\+/g, "\\+").replace(/\./g, "\\.");
		if (text.match("@" + matcher + "\\b")) {
			mentionedUserIds.push(user.id);
		}
	});
	return mentionedUserIds;
};

/**
 * Given an NR User Id, find a CodeStream user from it
 */
export const codestreamUserFromNrUserId = createSelector(
	(state: UsersState) => state,
	(_: any, nrUserId: number) => nrUserId,
	(users: UsersState, nrUserId: number) => {
		for (let user of Object.values(users)) {
			if (user.nrUserId === nrUserId) return user;
		}
		return undefined;
	}
);

export const currentUserIsAdminSelector = createSelector(
	(state: CodeStreamState) => state.users,
	(state: CodeStreamState) => state.teams,
	(state: CodeStreamState) => state.session,
	(state: CodeStreamState) => state.context,
	(users, teams, session, context) => {
		if (!session.userId) {
			return false;
		}
		const team = teams[context.currentTeamId];
		const user = users[session.userId];
		return (team.adminIds || []).includes(user.id);
	}
);

export const currentNrUserIdSelector = createSelector(
	(state: CodeStreamState) => state.users,
	(state: CodeStreamState) => state.session,

	(users, session) => {
		if (!session.userId) {
			return false;
		}
		const me = users[session.userId];
		return me.nrUserId;
	}
);

export const getStreamMembers = createSelector(
	state => state.users,
	(state: CodeStreamState, streamOrId: CSStream | string) => {
		return isString(streamOrId)
			? getStreamForId(state.streams, state.context.currentTeamId, streamOrId)
			: streamOrId;
	},
	(users: UsersState, stream?: CSStream) => {
		if (
			stream == undefined ||
			stream.type === StreamType.File ||
			stream.type === StreamType.Object ||
			stream.memberIds == undefined
		)
			return [];

		return mapFilter(stream.memberIds, id => {
			const user = users[id];
			if (user && user.isRegistered) return user;
			return;
		});
	}
);

export const getPreferences = createSelector(
	(state: CodeStreamState) => state.preferences,
	(preferences: PreferencesState) => preferences
);

export const getReadReplies = createSelector(
	(state: CodeStreamState) => state.preferences,
	(_: any, id: string) => id,
	(preferences: PreferencesState, id: string) => (preferences.readReplies || {})[id] || 0
);

interface Readable {
	id: string;
	numReplies: number;
	modifiedAt: number;
	creatorId: string;
}
