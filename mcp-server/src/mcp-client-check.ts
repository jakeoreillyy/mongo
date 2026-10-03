// Real MCP client smoke test for "B: MCP server and demo agents" step 3
// ("Test it in one real client ... one tool call working"). Unlike
// demo-agents.ts, which calls api-client.ts directly, this spawns
// mcp-server.ts as a subprocess and drives it over the actual MCP stdio
// protocol via @modelcontextprotocol/sdk's Client, the same transport
// Claude Code and Claude Desktop use.
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const TEAM_ID = process.env.TEAM_ID ?? "demo";

async function callTool(client: Client, name: string, args: Record<string, unknown>) {
  const result = await client.callTool({ name, arguments: args });
  const text = (result.content as Array<{ type: string; text?: string }>)
    .map((c) => c.text)
    .join("");
  console.log(`[mcp] ${name}(${JSON.stringify(args)}) ->`, text);
  return JSON.parse(text);
}

async function main() {
  const transport = new StdioClientTransport({
    command: "npx",
    args: ["tsx", "src/mcp-server.ts"],
    env: { ...process.env, TEAM_ID } as Record<string, string>,
  });
  const client = new Client({ name: "phalanx-smoke-test", version: "0.1.0" });
  await client.connect(transport);

  const tools = await client.listTools();
  console.log(
    "[mcp] tools registered:",
    tools.tools.map((t) => t.name).join(", ")
  );

  await callTool(client, "claim_resource", {
    teamId: TEAM_ID, resource: "auth", agentId: "mcp-agent-1", task: "JWT auth flow",
  });
  await callTool(client, "claim_resource", {
    teamId: TEAM_ID, resource: "auth", agentId: "mcp-agent-2", task: "tweak auth",
  });
  await callTool(client, "wait_for_resource", {
    teamId: TEAM_ID, resource: "auth", agentId: "mcp-agent-2",
  });
  await callTool(client, "claim_resource", {
    teamId: TEAM_ID, resource: "login-flow", agentId: "mcp-agent-3", task: "social login",
  });
  await callTool(client, "record_decision", {
    teamId: TEAM_ID, module: "auth", agentId: "mcp-agent-1", text: "auth uses JWT, not sessions",
  });
  await callTool(client, "release_resource", {
    teamId: TEAM_ID, resource: "auth", agentId: "mcp-agent-1",
  });
  await callTool(client, "list_claims", { teamId: TEAM_ID });
  await callTool(client, "get_briefing", { teamId: TEAM_ID });

  await client.close();
}

main().catch((err) => {
  console.error("mcp client check failed:", err);
  process.exit(1);
});
