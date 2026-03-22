import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  // 不自动写 package.json；手动维护 exports.types，供 TypeScript bundler 解析
  exports: false,
});
