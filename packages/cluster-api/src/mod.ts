import { EntityProxy } from "@effect/cluster";
import { HttpApi } from "@effect/platform";
import { WorkflowProxy } from "@effect/workflow";

import { NumberGenerator, SendEmail } from "@bella/cluster-schema";

export const ClusterApi = HttpApi.make("ClusterApi")
	.add(EntityProxy.toHttpApiGroup("number-generator", NumberGenerator).prefix("/number-generator"))
	.add(WorkflowProxy.toHttpApiGroup("workflow", [SendEmail]).prefix("/workflow"));
