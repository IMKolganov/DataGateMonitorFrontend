import { describe, expect, it } from "vitest";
import { buildServerGroupSections, UNGROUPED_GROUP_ID } from "./serverGroups";
import { buildUngroupedMemberIds } from "../pages/GroupDetails";

describe("buildServerGroupSections", () => {
  it("orders groups and servers, then ungrouped", () => {
    const sections = buildServerGroupSections(
      [
        { id: 1, groupId: 10, sortOrder: 1 },
        { id: 2, groupId: 10, sortOrder: 0 },
        { id: 3, groupId: null, sortOrder: 5 },
        { id: 4, groupId: 20, sortOrder: 0 },
      ],
      [
        { id: 20, name: "US", sortOrder: 1, serverIds: [4] },
        { id: 10, name: "EU", sortOrder: 0, serverIds: [2, 1] },
      ],
    );

    expect(sections.map((s) => s.key)).toEqual([10, 20, UNGROUPED_GROUP_ID]);
    expect(sections[0].servers.map((s) => s.id)).toEqual([2, 1]);
    expect(sections[1].servers.map((s) => s.id)).toEqual([4]);
    expect(sections[2].servers.map((s) => s.id)).toEqual([3]);
  });

  it("keeps empty named groups and puts orphans in the named group by groupId", () => {
    const sections = buildServerGroupSections(
      [{ id: 9, groupId: 1, sortOrder: 0 }],
      [{ id: 1, name: "Empty", sortOrder: 0, serverIds: [] }],
    );
    expect(sections[0].servers.map((s) => s.id)).toEqual([9]);
    expect(sections[1].key).toBe(UNGROUPED_GROUP_ID);
    expect(sections[1].servers).toHaveLength(0);
  });
});

describe("buildUngroupedMemberIds", () => {
  it("sorts ungrouped servers by sortOrder", () => {
    const ids = buildUngroupedMemberIds(
      [
        { id: 3, name: "C", sortOrder: 2, groupId: null },
        { id: 1, name: "A", sortOrder: 0, groupId: null },
        { id: 2, name: "B", sortOrder: 1, groupId: 10 },
      ],
      [{ id: 10, name: "EU", sortOrder: 0, serverIds: [2] }],
    );
    expect(ids).toEqual([1, 3]);
  });
});
