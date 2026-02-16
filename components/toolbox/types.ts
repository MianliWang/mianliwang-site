import type { LucideIcon } from "lucide-react";
import type { ComponentType } from "react";

export type ToolboxToolId = "base64" | "text-utils" | "doc-translate";

export type ToolboxCategoryId = "encoding" | "text" | "document";

export type ToolboxToolDefinition = {
  id: ToolboxToolId;
  category: ToolboxCategoryId;
  icon: LucideIcon;
  component: ComponentType;
};
