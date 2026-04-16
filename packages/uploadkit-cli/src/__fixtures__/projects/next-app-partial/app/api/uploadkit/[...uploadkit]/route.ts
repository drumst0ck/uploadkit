import { createUploadKitHandler } from "@uploadkitdev/next";
import { ukRouter } from "../../../../lib/uploadkit";

export const { GET, POST } = createUploadKitHandler({ router: ukRouter });
