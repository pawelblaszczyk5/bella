import { EntityProxy } from "@effect/cluster";
import { HttpApi } from "@effect/platform";
import { WorkflowProxy } from "@effect/workflow";

import { Conversation, IngestKnowledge } from "@bella/cluster-schema";

export const ClusterApi = HttpApi.make("ClusterApi")
	.add(EntityProxy.toHttpApiGroup("conversation", Conversation).prefix("/conversation"))
	.add(WorkflowProxy.toHttpApiGroup("workflow", [IngestKnowledge]).prefix("/workflow"));
