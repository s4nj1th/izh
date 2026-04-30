declare module "../../pkg/vizlang.js" {
  export type InitOptions = {
    module_or_path?:
      | string
      | WebAssembly.Module
      | Promise<string | WebAssembly.Module>;
    [key: string]: unknown;
  };

  export default function init(options?: InitOptions): Promise<void>;
  export function parse_and_render(input: string): string;
}
