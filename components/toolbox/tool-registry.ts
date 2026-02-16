import { Braces, FileText, Languages } from "lucide-react";
import { Base64Tool } from "./tools/base64-tool";
import { DocTranslateTool } from "./tools/doc-translate-tool";
import { TextUtilsTool } from "./tools/text-utils-tool";
import type { ToolboxToolDefinition, ToolboxToolId } from "./types";

export const TOOLBOX_TOOLS: ToolboxToolDefinition[] = [
  {
    id: "base64",
    category: "encoding",
    icon: Braces,
    component: Base64Tool,
  },
  {
    id: "text-utils",
    category: "text",
    icon: FileText,
    component: TextUtilsTool,
  },
  {
    id: "doc-translate",
    category: "document",
    icon: Languages,
    component: DocTranslateTool,
  },
];

export function isToolId(value: string): value is ToolboxToolId {
  return TOOLBOX_TOOLS.some((tool) => tool.id === value);
}
