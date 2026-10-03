import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import * as api from "./api-client.js";

const server = new McpServer({ name: "phalanx", version: "0.1.0" });

server.tool(
  "claim_resource",
  "Claim a resource before editing it. Always claim before editing, and call get_briefing first " +
    "to see what's already claimed. Returns blocked with the current holder if someone else has it " +
    "— call wait_for_resource rather than guessing at other work. A successful claim may still come " +
    "back with a similarTo warning if your resource is semantically close to one someone else already " +
    "holds (e.g. 'login-flow' vs 'auth'); that's a heads-up to coordinate, not a block.",
  {
    teamId: z.string(),
    resource: z.string().describe("Module-level name, e.g. 'auth', 'payments', 'ui', 'db'"),
    agentId: z.string(),
    task: z.string(),
    ttlSeconds: z.number().optional(),
  },
  async (params) => {
    const result = await api.claimResource(params);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
);

server.tool(
  "release_resource",
  "Release a resource you previously claimed, so others can claim it. If another agent was waiting " +
    "on it (via wait_for_resource), releasing hands it to them automatically.",
  { teamId: z.string(), resource: z.string(), agentId: z.string() },
  async (params) => {
    const result = await api.releaseResource(params);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
);

server.tool(
  "wait_for_resource",
  "Call this when claim_resource returns blocked, instead of guessing at other work. Registers you " +
    "to be given the resource automatically as soon as the current holder releases it.",
  { teamId: z.string(), resource: z.string(), agentId: z.string() },
  async (params) => {
    const result = await api.waitForResource(params);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
);

server.tool(
  "list_claims",
  "List all currently active (non-expired) claims for the team.",
  { teamId: z.string() },
  async ({ teamId }) => {
    const result = await api.listClaims(teamId);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
);

server.tool(
  "record_decision",
  "Record a decision about a module so other agents and teammates can see it later.",
  {
    teamId: z.string(),
    module: z.string(),
    agentId: z.string(),
    text: z.string(),
  },
  async (params) => {
    const result = await api.recordDecision(params);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
);

server.tool(
  "get_briefing",
  "Read this before starting work: returns active claims and recent decisions for the team " +
    "(optionally scoped to one module), so you know what's already in progress.",
  { teamId: z.string(), module: z.string().optional() },
  async ({ teamId, module }) => {
    const result = await api.getBriefing(teamId, module);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
