"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { Blueprint, Member } from "@/lib/types";

export type ArtStyle = "realistic" | "virtual";
export type GroupType = "girl" | "boy";

interface SessionState {
  sessionId: string | null;
  unitName: string;
  groupType: GroupType;
  concepts: string[];
  memberCount: number;
  artStyle: ArtStyle;
  blueprint: Blueprint | null;
  memberImages: Record<string, string>;
  groupImageUrl: string | null;
  musicUrl: string | null;
  teaserUrl: string | null;
  teaserOperationId: string | null;
  isLoading: boolean;
  loadingMessage: string;
}

interface SessionActions {
  setSessionId: (id: string) => void;
  setUnitName: (name: string) => void;
  toggleConcept: (concept: string) => void;
  setConcepts: (concepts: string[]) => void;
  setMemberCount: (count: number) => void;
  setGroupType: (type: GroupType) => void;
  setArtStyle: (style: ArtStyle) => void;
  setBlueprint: (bp: Blueprint) => void;
  setMemberImage: (memberId: string, url: string) => void;
  setGroupImageUrl: (url: string) => void;
  setMusicUrl: (url: string) => void;
  setTeaserUrl: (url: string) => void;
  setTeaserOperationId: (id: string) => void;
  setLoading: (loading: boolean, message?: string) => void;
  updateMember: (memberId: string, updates: Partial<Member>) => void;
  updateBlueprintFields: (updates: Partial<Pick<Blueprint, "group_worldview" | "debut_concept_description" | "fandom_name" | "debut_statement">>) => void;
}

const SessionContext = createContext<(SessionState & SessionActions) | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>({
    sessionId: null,
    unitName: "",
    groupType: "girl" as GroupType,
    concepts: [],
    memberCount: 2,
    artStyle: "realistic" as ArtStyle,
    blueprint: null,
    memberImages: {},
    groupImageUrl: null,
    musicUrl: null,
    teaserUrl: null,
    teaserOperationId: null,
    isLoading: false,
    loadingMessage: "",
  });

  const actions: SessionActions = {
    setSessionId: (id) => setState((s) => ({ ...s, sessionId: id })),
    setUnitName: (name) => setState((s) => ({ ...s, unitName: name })),
    toggleConcept: (concept) =>
      setState((s) => ({
        ...s,
        concepts: s.concepts.includes(concept)
          ? s.concepts.filter((c) => c !== concept)
          : s.concepts.length < 4
            ? [...s.concepts, concept]
            : s.concepts,
      })),
    setConcepts: (concepts) => setState((s) => ({ ...s, concepts })),
    setMemberCount: (count) => setState((s) => ({ ...s, memberCount: count })),
    setGroupType: (type) => setState((s) => ({ ...s, groupType: type, concepts: [] })),
    setArtStyle: (style) => setState((s) => ({ ...s, artStyle: style })),
    setBlueprint: (bp) => setState((s) => ({
      ...s,
      blueprint: bp,
      groupImageUrl: bp.group_image_url || s.groupImageUrl,
    })),
    setMemberImage: (memberId, url) =>
      setState((s) => ({
        ...s,
        memberImages: { ...s.memberImages, [memberId]: url },
      })),
    setGroupImageUrl: (url) => setState((s) => ({ ...s, groupImageUrl: url })),
    setMusicUrl: (url) => setState((s) => ({ ...s, musicUrl: url })),
    setTeaserUrl: (url) => setState((s) => ({ ...s, teaserUrl: url })),
    setTeaserOperationId: (id) => setState((s) => ({ ...s, teaserOperationId: id })),
    setLoading: (loading, message = "") =>
      setState((s) => ({ ...s, isLoading: loading, loadingMessage: message })),
    updateMember: (memberId, updates) =>
      setState((s) => {
        if (!s.blueprint) return s;
        return {
          ...s,
          blueprint: {
            ...s.blueprint,
            members: s.blueprint.members.map((m) =>
              m.member_id === memberId ? { ...m, ...updates } : m
            ),
          },
        };
      }),
    updateBlueprintFields: (updates) =>
      setState((s) => {
        if (!s.blueprint) return s;
        return { ...s, blueprint: { ...s.blueprint, ...updates } };
      }),
  };

  return (
    <SessionContext.Provider value={{ ...state, ...actions }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error("useSession must be used within SessionProvider");
  return context;
}
