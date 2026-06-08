import assert from "node:assert/strict";
import test from "node:test";

import { classifyReply } from "../src/lib/emailRail/reply.mjs";

test("reply: positive interest and meeting requests stop future follow-up", () => {
  assert.equal(classifyReply({ body: "Yes, I'm interested. Please send next steps." }).stops_sequence, true);
  assert.equal(classifyReply({ body: "Can we schedule a demo call?" }).stops_sequence, true);
});
