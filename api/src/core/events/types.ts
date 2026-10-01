import { MemberRecord, RoleRecord, VoiceRecord, PresenceRecord } from "../indexes/types.js";

export type EventType =
    | "MEMBER_JOIN"
    | "MEMBER_LEAVE"
    | "MEMBER_UPDATE"
    | "ROLE_CREATE"
    | "ROLE_UPDATE"
    | "ROLE_DELETE"
    | "VOICE_UPDATE"
    | "PRESENCE_UPDATE";

export interface NormalizedMemberEvent {
    type: "MEMBER_JOIN" | "MEMBER_LEAVE" | "MEMBER_UPDATE";
    guildId: string;
    userId: string;
    roleIds: string[];
    rolesBitfield: string;
    joinedTimestamp: number;
    version: number;
    timestamp: number;
}

export interface NormalizedRoleEvent {
    type: "ROLE_CREATE" | "ROLE_UPDATE" | "ROLE_DELETE";
    guildId: string;
    roleId: string;
    name: string;
    color: string;
    position: number;
    permissions: string;
    managed: boolean;
    version: number;
    timestamp: number;
}

export interface NormalizedVoiceEvent {
    type: "VOICE_UPDATE";
    guildId: string;
    userId: string;
    channelId: string | null;
    selfMute: boolean;
    selfDeaf: boolean;
    serverMute: boolean;
    serverDeaf: boolean;
    selfVideo: boolean;
    selfStream: boolean;
    timestamp: number;
}

export interface NormalizedPresenceEvent {
    type: "PRESENCE_UPDATE";
    userId: string;
    status: "online" | "idle" | "dnd" | "offline" | "unknown";
    desktop: "online" | "idle" | "dnd" | "offline" | "unknown";
    mobile: "online" | "idle" | "dnd" | "offline" | "unknown";
    web: "online" | "idle" | "dnd" | "offline" | "unknown";
    timestamp: number;
}

export type NormalizedEvent =
    | NormalizedMemberEvent
    | NormalizedRoleEvent
    | NormalizedVoiceEvent
    | NormalizedPresenceEvent;
