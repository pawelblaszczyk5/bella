import { EntityProxy } from "@effect/cluster";
import { HttpApi } from "@effect/platform";

import { Conversation } from "@bella/cluster-schema";

export const ClusterApi = HttpApi.make("ClusterApi").add(
	EntityProxy.toHttpApiGroup("conversation", Conversation).prefix("/conversation"),
);
